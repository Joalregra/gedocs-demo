<?php

namespace App\Http\Controllers\Api;

use App\Enums\UserRole;
use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use App\Models\PQR;
use App\Models\User;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Log;
use App\Mail\PQRResponseMail;
use App\Models\Dependency;
use Carbon\Carbon;
use Illuminate\Support\Arr;
use Illuminate\Support\Facades\DB;
use App\Models\comunication;
use App\Models\AttachedSupport;
use App\Models\Sheet_number as SheetNumber;
use Barryvdh\DomPDF\Facade\Pdf;
use App\Models\Folder;
use App\Models\File;
use App\Services\PqrAutoArchiveService;
use App\Support\EntityAccess;
use App\Support\InstitutionIdentity;
use Illuminate\Support\Facades\Storage;
use SimpleSoftwareIO\QrCode\Facades\QrCode;
use setasign\Fpdi\Fpdi;


class PQRController extends Controller
{
    /**
     * LISTAR TODAS LAS PQRS (INBOX = NO ARCHIVADAS)
     */
    public function index(Request $request): JsonResponse
    {
        $user = $request->user();

        if (!$user) {
            return response()->json(['message' => 'No autenticado'], 401);
        }

        app(PqrAutoArchiveService::class)->archiveExpiredPending();

        // Read ?archived=true|false (default: false → inbox)
        $archived = filter_var(
            $request->query('archived', false),
            FILTER_VALIDATE_BOOLEAN
        );

        // Base query (shared by all roles)
        $query = PQR::with([
            'creator',
            'responsible',
            'dependency',
            'attachedSupports',
            'sheetNumber'
        ])->where('archived', $archived);

        // Non-admin: role-based visibility with archive-specific assistant restriction.
        if (!$user->hasRole(UserRole::Admin)) {
            $query->where(function ($q) use ($user, $archived) {
                if ($user->hasRole(UserRole::Dependencia)) {
                    if ($user->dependency_id) {
                        $q->where('dependency_id', $user->dependency_id);
                    } else {
                        $q->whereRaw('1=0');
                    }

                    // Keep merge behavior: also include items assigned directly to the user.
                    $q->orWhere('responsible_id', $user->id);
                    return;
                }

                if ($user->hasRole(UserRole::Auxiliar)) {
                    if ($archived) {
                        // Keep previous behavior: archive is restricted to own dependency only.
                        if ($user->dependency_id) {
                            $q->where('dependency_id', $user->dependency_id);
                        } else {
                            $q->whereRaw('1=0');
                        }
                        return;
                    }

                    // Keep merge behavior for inbox/non-archived flow.
                    if ($user->dependency_id) {
                        $q->where('dependency_id', $user->dependency_id);
                    } else {
                        $q->whereRaw('1=0');
                    }
                    $q->orWhere('responsible_id', $user->id);
                    return;
                }

                if ($user->hasRole(UserRole::Supervisor)) {
                    $sheetIds = $user->sheetNumbers->pluck('id');
                    $q->whereIn('sheet_number_id', $sheetIds);
                }
            });
        }

        $pqrs = $query->orderBy("created_at", "DESC")->get();

        return response()->json([
            'data' => $pqrs,
            'message' => $archived
                ? 'PQRs archivadas obtenidas exitosamente'
                : 'PQRs obtenidas exitosamente'
        ], 200);
    }


    /**
     * CREAR UNA PQR
     */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'sender_name' => 'required|string|max:255',
            'description' => 'required|string|max:1000',
            'affair' => 'required|string|max:255',
            'request_type' => 'required|string|in:Peticion,Queja,Reclamo,Sugerencia,Otro',
            'response_time' => 'nullable|date|after_or_equal:today',
            'response_days' => 'nullable|in:10,15,30',
            'number' => 'required|string',
            'attachments' => 'nullable|array',
            'attachments.*' => 'file|mimes:pdf,doc,docx,jpg,jpeg,png|max:5120',
            'email' => 'nullable|email|string',
            'document_type' => 'required|string|in:CC,TI,CE',
            'document' => 'nullable|string|max:100',
            'dependency_id' => 'nullable|exists:dependencies,id',
        ]);

        if (!empty($validated['response_days']) && !empty($validated['response_time'])) {
            return response()->json([
                'error' => 'No se pueden enviar response_days y response_time al mismo tiempo.'
            ], 422);
        }

        $sheetNumber = SheetNumber::active()->where('number', $validated['number'])->first();
        if (!$sheetNumber) {
            return response()->json(['error' => 'Entidad técnica no encontrada o no se encuentra activa'], 404);
        }


        if (!empty($validated['dependency_id'])) {
            $targetDependencyId = $validated['dependency_id'];
        } else {
            $ventanillaUnica = Dependency::find($sheetNumber->ventanilla_unica_id);
            if (!$ventanillaUnica) {
                return response()->json(['error' => 'Ventanilla única no encontrada'], 404);
            }
            $targetDependencyId = $ventanillaUnica->id;
        }

        $userId = optional($request->user())->id;

        if (!empty($validated['response_days']) && empty($validated['response_time'])) {
            $validated['response_time'] = Carbon::now()
                ->addDays((int) $validated['response_days'])
                ->toDateString();
        }

        $pqr = PQR::create([
            'sender_name' => $validated['sender_name'],
            'description' => $validated['description'],
            'affair' => $validated['affair'],
            'response_time' => $validated['response_time'] ?? null,
            'response_days' => $validated['response_days'] ?? null,
            'state' => false,
            'archived' => false,
            'user_id' => $userId,
            'responsible_id' => null,
            'dependency_id' => $targetDependencyId,
            'request_type' => $validated['request_type'],
            'sheet_number_id' => $sheetNumber->id,
            'response_status' => 'pending',
            'email' => $validated['email'] ?? null,
            'document' => $validated['document'] ?? null,
            'document_type' => $validated['document_type'],
        ]);

        if ($request->hasFile('attachments')) {
            foreach ($request->file('attachments') as $file) {
                $path = $file->store('pqr_attachments', 'public');

                // Si es un PDF, generamos la carátula con QR y lo guardamos en el explorador
                if ($file->getClientOriginalExtension() === 'pdf') {
                    $this->mergeCoverPageWithQr($path, $pqr);
                    $this->saveAttachmentToExplorer($path, $pqr, $file->getClientOriginalName());
                }

                $hash = hash('adler32', time());

                $pqrID = $pqr->id;
                if ($pqrID <= 99) {
                    if($pqrID <=9){
                    $pqrID = "00$pqrID";
                    }
                    else{
                        $pqrID = "0$pqrID";
                    }
                }

                $pqr->attachedSupports()->create([
                    'name' => $file->getClientOriginalName(),
                    'path' => $path,
                    'type' => $file->getClientOriginalExtension(),
                    'size' => Storage::disk('public')->size($path), // Usamos el tamaño final (post-QR)
                    'origin' => 'REC',
                    'hash' => $hash,
                    'no_radicado' => $pqrID,
                ]);

            }
        }

        return response()->json([
            'data' => $pqr->load([
                'creator',
                'responsible',
                'dependency',
                'attachedSupports',
                'sheetNumber'
            ]),
            'message' => 'PQR creada exitosamente'
        ], 201);
    }

    /** Same visibility rules as the inbox (see index() and EntityAccess::canAccessPqr()). */
    private function userCanAccess(?User $user, PQR $pqr): bool
    {
        return EntityAccess::canAccessPqr($user, $pqr);
    }

    /**
     * OBTENER EL HILO DE COMUNICACION DE UNA PQR
     */
    public function show(Request $request, string $id): JsonResponse
    {
        $pqr = PQR::with([
            'creator',
            'responsible',
            'dependency',
            'attachedSupports', // Soportes generales
            'sheetNumber',
            'comunications' => function ($query) {
                $query->orderBy('created_at', 'asc')->with('attachedSupports');
            }
        ])->find($id);

        if (!$pqr) {
            return response()->json(['error' => 'PQR no encontrada'], 404);
        }

        if (!$this->userCanAccess($request->user(), $pqr)) {
            return response()->json(['error' => 'No autorizado'], 403);
        }

        return response()->json([
            'data' => $pqr,
            'message' => 'Hilo de comunicación de la PQR obtenido con éxito'
        ], 200);
    }

    /**
     * MOSTRAR PQRS DE UNA ENTIDAD (NO ARCHIVADAS)
     */
    public function sheetShow(Request $request): JsonResponse
    {
        $user = $request->user();

        // Archiva PQRs vencidas como fallback en lecturas.
        app(PqrAutoArchiveService::class)->archiveExpiredPending();

        if ($user && $user->hasRole(UserRole::Supervisor)) {
            $pqrs = PQR::with(['creator', 'responsible', 'dependency', 'attachedSupports', 'sheetNumber'])
                ->whereIn('sheet_number_id', $user->sheetNumbers->pluck('id'))
                ->where('archived', false) // archived items are excluded here
                ->get();

            return response()->json($pqrs);
        }

        if (!$user) {
            return response()->json(['message' => 'No autenticado'], 401);
        }

        return response()->json([
            'message' => 'PQRs obtenidas exitosamente',
        ], 200);
    }

    /**
     * ACTUALIZAR UNA PQR (ARCHIVAR / DESARCHIVAR)
     */
    public function update(Request $request, string $id): JsonResponse
    {
        $input = $request->only([
            'response_time',
            'response_days',
            'state',
            'archived',
            'dependency_id',
            'responsible_id'
        ]);

        $validated = validator($input, [
            'response_time' => 'nullable|date|after:today',
            'response_days' => 'nullable|in:10,15,30',
            'state' => 'boolean',
            'archived' => 'boolean',
            'dependency_id' => 'exists:dependencies,id',
            'responsible_id' => 'exists:users,id'
        ])->validated();

        $pqr = PQR::find($id);

        if (!$pqr) {
            return response()->json(['message' => 'PQR no encontrada'], 404);
        }

        // Security: only users who see this PQR may change it, and it can only be reassigned
        // to a dependency of its own entity.
        if (!$this->userCanAccess($request->user(), $pqr)) {
            return response()->json(['message' => 'No autorizado'], 403);
        }

        if (isset($validated['dependency_id'])
            && !Dependency::where('id', $validated['dependency_id'])->where('sheet_number_id', $pqr->sheet_number_id)->exists()) {
            return response()->json(['message' => 'La dependencia no pertenece a la entidad de la PQR'], 422);
        }

        if (isset($validated['response_days'])) {
            $pqr->response_days = (int) $validated['response_days'];
            $pqr->response_time = Carbon::now()
                ->addDays($pqr->response_days)
                ->toDateString();

            unset($validated['response_days']);
        }

        $pqr->fill($validated);
        $pqr->save();

        if (isset($validated['dependency_id'])) {
            $this->syncPqrReceiptPdf($pqr, $request);
        }

        return response()->json([
            'message' => 'PQR actualizada exitosamente',
            'data' => $pqr->fresh()->load([
                'creator',
                'responsible',
                'dependency',
                'attachedSupports',
                'sheetNumber'
            ])
        ], 200);
    }

    /**
     * RESPONDER UNA PQR
     */
    public function respond(Request $request, string $id): JsonResponse
    {
        try {
            $user = $request->user();
            $roleName = $user->getRoleNames()->first();

            $pqr = PQR::with(['creator', 'responsible', 'dependency'])->find($id);
            if (!$pqr) {
                return response()->json(['error' => 'PQR no encontrada'], 404);
            }

            if (!in_array($roleName, [UserRole::Admin->value, UserRole::Dependencia->value], true)) {
                return response()->json(['error' => 'No autorizado'], 403);
            }

            if ($roleName === UserRole::Dependencia->value && $pqr->responsible_id !== $user->id) {
                return response()->json(['error' => 'Solo puedes responder tus PQRs'], 403);
            }

            if (in_array($pqr->response_status, ['responded', 'closed'])) {
                return response()->json(['error' => 'Esta PQR ya fue respondida'], 422);
            }

            $validated = $request->validate([
                'response_message' => 'required|string|min:10|max:2000',
                'response_status' => 'sometimes|in:responded,closed'
            ]);

            // Actualizar
            $pqr->update([
                'response_message' => $validated['response_message'],
                'response_date' => now(),
                'response_status' => $validated['response_status'] ?? 'responded',
                'state' => true
            ]);

            // Enviar correo al creador - CORREGIDO
            try {
                $emailRecipient = $pqr->creator ? $pqr->creator->email : $pqr->email;

                if ($emailRecipient) {
                    Mail::to($emailRecipient)->send(new PQRResponseMail($pqr, null, null));
                    Log::info('Email enviado exitosamente a: ' . $emailRecipient);
                } else {
                    //Log::warning('No hay email para enviar la respuesta de PQR ID: ' . $pqr->id);
                }
            } catch (\Exception $e) {
                Log::error('Error enviando email: ' . $e->getMessage());
            }

            return response()->json([
                'data' => $pqr->fresh()->load(['creator', 'responsible', 'dependency', 'attachedSupports', 'sheetNumber']),
                'message' => 'Respuesta enviada exitosamente',
                'pqr_status' => $pqr->response_status,
                'response_date' => $pqr->response_date,
            ], 200);

        } catch (\Exception $e) {
            return response()->json(['error' => 'Error interno: ' . $e->getMessage()], 500);
        }
    }

    /**
     * ELIMINAR PQR (NO PERMITIDO)
     */
    public function destroy(string $id)
    {
        return response()->json(['message' => 'No está permitido eliminar PQRs'], 405);
    }
    //Dar respuesta final y cerrar la pqr
    public function finalizeResponse(Request $request, string $id): JsonResponse
    {
        $user = $request->user();
        $roleName = $user->getRoleNames()->first();

        $pqr = PQR::with(['creator', 'responsible', 'dependency', 'comunications'])->find($id);

        if (!$pqr) {
            return response()->json(['error' => 'PQR no encontrada'], 404);
        }

        // Validar permisos: Solo Admin o Dependencia asignada
        if (!in_array($roleName, [UserRole::Admin->value, UserRole::Dependencia->value], true)) {
            return response()->json(['error' => 'No autorizado'], 403);
        }

        // Si es Dependencia, verificar que sea la dependencia asignada a esta PQR
        if ($roleName === UserRole::Dependencia->value && $pqr->dependency_id !== $user->dependency_id) {
            return response()->json(['error' => 'Solo puedes finalizar PQRs de tu dependencia'], 403);
        }

        //Verificar que ya no este cerrada
        if ($pqr->response_status === 'closed') {
            return response()->json(['error' => 'Esta PQR ya está cerrada'], 422);
        }

        $validated = $request->validate([
            'response_message' => 'required|string|min:10|max:2000',
            'attachments' => 'nullable|array',
            'attachments.*' => 'file|mimes:pdf,doc,docx,jpg,jpeg,png|max:5120',
        ]);
        DB::beginTransaction();
        try {
            // Actualizar PQR como cerrada
            $pqr->update([
                'response_message' => $validated['response_message'],
                'response_date' => now(),
                'response_status' => 'closed',
                'state' => true
            ]);

            // Crear comunicación final (sin requerir respuesta)
            $finalCommunication = $pqr->comunications()->create([
                'message' => $validated['response_message'],
                'requires_response' => false
            ]);

            // Guardar archivos adjuntos si los hay
            if ($request->hasFile('attachments')) {
                foreach ($request->file('attachments') as $file) {
                    $path = $file->store('final_responses', 'public');

                    $finalCommunication->attachedSupports()->create([
                        'name' => $file->getClientOriginalName(),
                        'path' => $path,
                        'type' => $file->getClientOriginalExtension(),
                        'size' => $file->getSize(),
                        'pqr_id' => $pqr->id,
                        'hash' => hash('sha256', uniqid((string) $pqr->id, true)),
                        'no_radicado' => str_pad((string) $pqr->id, 3, '0', STR_PAD_LEFT),
                    ]);
                }
            }
            // Enviar email final al creador
            $emailRecipient = $pqr->creator ? $pqr->creator->email : $pqr->email;

            if ($emailRecipient) {
                Mail::to($emailRecipient)->send(new PQRResponseMail($pqr, null, null));
                Log::info('Email de cierre enviado a: ' . $emailRecipient);
            }

            DB::commit();

            return response()->json([
                'data' => $pqr->fresh()->load(['creator', 'responsible', 'dependency', 'attachedSupports', 'sheetNumber', 'comunications.attachedSupports']),
                'message' => 'PQR finalizada y cerrada exitosamente'
            ], 200);

        } catch (\Exception $e) {
            DB::rollback();
            Log::error('Error finalizando PQR: ' . $e->getMessage());
            return response()->json(['error' => 'Error interno del servidor: ' . $e->getMessage()], 500);
        }

    }

    /**
     * Retorna datos específicos para construir el formulario de respuesta interna (Carta/Acta)
     * GET /api/pqr/response-details/{id}
     */
    public function getResponseData(Request $request, string $id): JsonResponse
    {
        $pqr = PQR::with([
            'dependency',
            'comunications' => function ($q) {
                $q->orderBy('created_at', 'desc');
            }
        ])->find($id);

        if (!$pqr) {
            return response()->json(['error' => 'PQR no encontrada'], 404);
        }

        if (!$this->userCanAccess($request->user(), $pqr)) {
            return response()->json(['error' => 'No autorizado'], 403);
        }

        return response()->json([
            'data' => [
                'communication' => $pqr->comunications->first() ?? (object) [],
                'pqr' => $pqr,
                'dependency' => $pqr->dependency,
            ],
            'message' => 'Detalles de respuesta obtenidos'
        ]);
    }

    /**
     * Sincroniza (crea o mueve/actualiza) el PDF de constancia de recibido de la PQR.
     */
    private function syncPqrReceiptPdf(PQR $pqr, Request $request)
    {
        try {
            $pqr->load(['sheetNumber', 'dependency', 'attachedSupports']);

            // 1. Identificar si ya existe un recibo previo
            $receiptSupport = $pqr->attachedSupports()->where('origin', 'RECIBO')->first();
            $oldPath = $receiptSupport ? $receiptSupport->path : null;

            // 2. Encontrar la carpeta de la dependencia para el año actual
            $sheetId = $pqr->sheet_number_id;
            $currentYear = now()->year;

            $yearFolder = Folder::where('sheet_number_id', $sheetId)
                ->where('year', $currentYear)
                ->whereNull('parent_id')
                ->where('active', true)
                ->first() ?: Folder::where('sheet_number_id', $sheetId)
                    ->whereNull('parent_id')
                    ->where('active', true)
                    ->latest()
                    ->first();

            $targetFolder = null;
            if ($yearFolder && $pqr->dependency) {
                $targetFolder = Folder::where('parent_id', $yearFolder->id)
                    ->where('name', $pqr->dependency->name)
                    ->where('active', true)
                    ->first() ?: Folder::where('parent_id', $yearFolder->id)
                        ->where('name', Folder::VENTANILLA_NAME)
                        ->where('active', true)
                        ->first();
            }

            if (!$targetFolder) return;

            $folderPrefix = $targetFolder->getFullHierarchyCode();
            $year = now()->year;
            $pqrNumber = str_pad((string) $pqr->id, 3, '0', STR_PAD_LEFT);
            $fileName = "{$folderPrefix}-REC-{$year}-{$pqrNumber}.pdf";
            $storagePath = "folders/{$targetFolder->id}/{$fileName}";
            $absolutePath = storage_path('app/public/' . $storagePath);

            // 3. Preparar datos para el template (siempre refrescar contenido)
            $attachmentsNames = $pqr->attachedSupports()->where('origin', 'REC')->get()->pluck('name')->implode(', ');
            
            $data = [
                'document_type' => 'carta',
                'codigo' => "REC-{$pqrNumber}",
                'lugar' => config('institution.city'),
                'fecha' => now()->format('d/m/Y'),
                'tratamiento' => "Ciudadano(a)",
                'nombres' => $pqr->sender_name,
                'cargo' => 'Solicitante',
                'empresa' => 'N/A',
                'direccion' => $pqr->email ?? 'No proporcionado',
                'ciudad' => 'N/A',
                'asunto' => "CONSTANCIA DE RECIBIDO DE PQR - " . strtoupper($pqr->request_type),
                'saludo' => "Cordial saludo,",
                'texto' => "Se confirma el recibido satisfactorio de su solicitud con los siguientes detalles:\n\n" .
                           "Radicado No: " . InstitutionIdentity::formatFiling($pqrNumber) . "\n" .
                           "Tipo de Solicitud: " . $pqr->request_type . "\n" .
                           "Asunto: " . $pqr->affair . "\n" .
                           "Asignado a: " . ($pqr->dependency ? $pqr->dependency->name : 'Ventanilla Única') . "\n\n" .
                           "Descripción: " . $pqr->description . "\n\n" .
                           "Puede consultar el estado de su solicitud con el número de radicado proporcionado.",
                'firma_nombres' => 'SISTEMA GEDOCS',
                'firma_cargo' => 'Gestión Documental',
                'anexo' => $attachmentsNames ? "Soportes adjuntos: " . $attachmentsNames : "",
                'pie_pagina' => optional($request->user())->pdf_footer_text ?? InstitutionIdentity::defaultFooter(false),
                'no_radicado' => $pqrNumber,
                'atendido' => 'Sistema Automático',
                'hora' => now()->format('H:i:s'),
                'archivado_en' => $targetFolder->name
            ];

            $logoDataUri = $this->resolveLogoDataUri($request);

            // Asegurar directorio
            if (!file_exists(dirname($absolutePath))) {
                mkdir(dirname($absolutePath), 0755, true);
            }

            $qrUrl = asset('storage/' . $storagePath);
            $qrCodeDataUri = 'data:image/svg+xml;base64,' . base64_encode(QrCode::format('svg')->size(100)->margin(0)->generate($qrUrl));

            // Generar PDF
            $pdf = Pdf::loadView('pdf.template', [
                'data' => $data,
                'logoDataUri' => $logoDataUri,
                'qrCodeDataUri' => $qrCodeDataUri,
            ]);
            $pdf->setPaper('letter', 'portrait');
            $pdfContent = $pdf->output();

            // 4. Manejo de archivos (Eliminar antiguo si cambió de ubicación)
            if ($oldPath && $oldPath !== $storagePath && Storage::disk('public')->exists($oldPath)) {
                Storage::disk('public')->delete($oldPath);
            }

            Storage::disk('public')->put($storagePath, $pdfContent);
            $hashString = hash('sha256', $pdfContent);

            // 5. Sincronizar AttachedSupport (origin='RECIBO')
            $pqr->attachedSupports()->updateOrCreate(
                ['origin' => 'RECIBO'],
                [
                    'name' => 'Constancia de Recibido ' . $pqrNumber,
                    'path' => $storagePath,
                    'type' => 'pdf',
                    'size' => strlen($pdfContent),
                    'hash' => $hashString,
                    'no_radicado' => $pqrNumber,
                ]
            );

            // 6. Sincronizar File en el Explorer
            $explorerFile = $oldPath ? File::where('path', $oldPath)->first() : null;
            
            if ($explorerFile) {
                $explorerFile->update([
                    'folder_id' => $targetFolder->id,
                    'name' => str_replace('.pdf', '', $fileName) . "-" . substr($hashString, 0, 10),
                    'path' => $storagePath,
                    'size' => strlen($pdfContent),
                    'hash' => $hashString,
                ]);
            } else {
                File::create([
                    'name' => str_replace('.pdf', '', $fileName) . "-" . substr($hashString, 0, 10),
                    'path' => $storagePath,
                    'extension' => 'pdf',
                    'mime_type' => 'application/pdf',
                    'size' => strlen($pdfContent),
                    'active' => true,
                    'folder_id' => $targetFolder->id,
                    'file_code' => $pqrNumber,
                    'hash' => substr($hashString, 0, 10),
                ]);
            }

        } catch (\Exception $e) {
            Log::error('Error syncing PQR receipt PDF: ' . $e->getMessage());
        }
    }

    /**
     * Resuelve el Logo de la institución para el PDF.
     */
    private function resolveLogoDataUri(Request $request): string
    {
        $savedLogoPath = optional($request->user())->pdf_logo_path;
        if ($savedLogoPath && Storage::disk('public')->exists($savedLogoPath)) {
            $fullSavedLogoPath = Storage::disk('public')->path($savedLogoPath);
            $savedMimeType = mime_content_type($fullSavedLogoPath) ?: 'image/png';
            $savedContent = base64_encode(file_get_contents($fullSavedLogoPath));
            return "data:{$savedMimeType};base64,{$savedContent}";
        }

        $defaultLogoPath = InstitutionIdentity::logoFile();
        if (file_exists($defaultLogoPath)) {
            $content = base64_encode(file_get_contents($defaultLogoPath));
            return "data:image/png;base64,{$content}";
        }
        return "";
    }

    /**
     * Sobrepone el QR e información de radicado en la primera página del PDF
     */
    private function mergeCoverPageWithQr(string $path, PQR $pqr)
    {
        try {
            $absolutePath = Storage::disk('public')->path($path);
            if (!file_exists($absolutePath)) return;

            $qrUrl = asset('storage/' . $path);
            $pqrNumber = str_pad((string) $pqr->id, 3, '0', STR_PAD_LEFT);
            $requestType = strtoupper($pqr->request_type);
            $loadDate = now()->format('d/m/Y H:i:s');

            // 1. Generar un "sello" PDF miniatura usando DomPDF
            $qrCodeDataUri = 'data:image/svg+xml;base64,' . base64_encode(QrCode::format('svg')->size(100)->margin(0)->generate($qrUrl));
            
            $stampHtml = "
            <html>
            <head>
                <style>
                    @page { margin: 0; }
                    body { 
                        font-family: 'Helvetica', 'Arial', sans-serif; 
                        margin: 0; padding: 0; 
                        background-color: transparent; 
                    }
                    .main-container { 
                        border: none; 
                        border-radius: 4px; 
                        background-color: white;
                        padding: 7px;
                        display: table;
                        width: 215px;
                        border-spacing: 0;
                        border-collapse: collapse;
                    }
                    .content-row { display: table-row; }
                    .qr-cell { 
                        display: table-cell; 
                        width: 70px; 
                        vertical-align: middle; 
                        text-align: center;
                    }
                    .info-cell { 
                        display: table-cell; 
                        vertical-align: middle; 
                        text-align: left;
                        padding-left: 8px;
                    }
                    .text { font-size: 8.5pt; color: #1a1a1a; line-height: 1.35; }
                    .bold { font-weight: bold; font-size: 9.5pt; }
                </style>
            </head>
            <body>
                <div class='main-container'>
                    <div class='content-row'>
                        <div class='qr-cell'>
                            <img src='$qrCodeDataUri' style='width: 62px; height: 62px;'>
                        </div>
                        <div class='info-cell'>
                            <div class='text'><span class='bold'>Radicado No. " . InstitutionIdentity::formatFiling($pqrNumber) . "</span></div>
                            <div class='text'><b>Tipo:</b> $requestType</div>
                            <div class='text'><b>Fecha:</b> " . explode(' ', $loadDate)[0] . "</div>
                            <div class='text'><b>Hora:</b> " . explode(' ', $loadDate)[1] . "</div>
                        </div>
                    </div>
                </div>
            </body>
            </html>";

            // Medidas en puntos (pt)
            $stampPdfCreator = \Barryvdh\DomPDF\Facade\Pdf::loadHTML($stampHtml)->setPaper([0, 0, 230, 90]);
            $stampPath = storage_path('app/temp_stamp_' . uniqid() . '.pdf');
            file_put_contents($stampPath, $stampPdfCreator->output());

            // 2. Usar FPDI para sobreponer el sello en la primera página
            $pdf = new \setasign\Fpdi\Fpdi();
            
            // IMPORTAR SELLO UNA SOLA VEZ AL INICIO (EVITA DOBLE CUADRO/GHOSTING)
            $pdf->setSourceFile($stampPath);
            $stampTemplateId = $pdf->importPage(1);
            $stampSize = $pdf->getTemplateSize($stampTemplateId);

            // VOLVER AL ARCHIVO ORIGINAL
            $pageCount = $pdf->setSourceFile($absolutePath);
            
            for ($pageNo = 1; $pageNo <= $pageCount; $pageNo++) {
                $templateId = $pdf->importPage($pageNo);
                $size = $pdf->getTemplateSize($templateId);
                
                $pdf->AddPage($size['orientation'], ($size['orientation'] === 'P' ? [$size['width'], $size['height']] : [$size['height'], $size['width']]));
                $pdf->useTemplate($templateId);
                
                if ($pageNo === 1) {
                    // Posición pegada a la Derecha
                    $marginRight = 3; 
                    $marginTop = 5;
                    $x = max(0, $size['width'] - $stampSize['width'] - $marginRight);
                    $y = $marginTop;
                    
                    $pdf->useTemplate($stampTemplateId, $x, $y, $stampSize['width'], $stampSize['height']);
                }
            }

            // Guardar el PDF modificado sobrescribiendo el original
            $pdf->Output($absolutePath, 'F');

            // Limpieza
            if (file_exists($stampPath)) unlink($stampPath);

        } catch (\Exception $e) {
            Log::error('Error al estampar QR en la primera página: ' . $e->getMessage());
        }
    }

    /**
     * Guarda una copia del adjunto en el Explorador de Archivos (Carpeta Ventanilla Única).
     */
    private function saveAttachmentToExplorer(string $path, PQR $pqr, string $originalName)
    {
        try {
            $sheetId = $pqr->sheet_number_id;
            $currentYear = now()->year;

            // 1. Localizar carpeta del año para esta entidad
            $yearFolder = Folder::where('sheet_number_id', $sheetId)
                ->where('year', $currentYear)
                ->whereNull('parent_id')
                ->where('active', true)
                ->first();

            if (!$yearFolder) return;

            // 2. Localizar carpeta Ventanilla Única o la del destinatario
            $targetFolder = Folder::where('parent_id', $yearFolder->id)
                ->where('name', 'like', '%ventanilla%') // Búsqueda flexible
                ->where('active', true)
                ->first() ?: Folder::where('parent_id', $yearFolder->id)
                    ->where('name', Folder::VENTANILLA_NAME)
                    ->where('active', true)
                    ->first();

            // Si no existe, intentamos buscarla de forma genérica
            if (!$targetFolder) {
                $targetFolder = Folder::where('parent_id', $yearFolder->id)
                    ->where('active', true)
                    ->where(function($q) {
                        $q->where('name', 'like', '%ventanilla%')
                          ->orWhere('name', 'like', '%unica%');
                    })
                    ->first();
            }

            if (!$targetFolder) return;

            $folderPrefix = $targetFolder->getFullHierarchyCode();
            $pqrNumber = str_pad((string) $pqr->id, 3, '0', STR_PAD_LEFT);
            $hash = hash_file('sha256', Storage::disk('public')->path($path));
            $shortHash = substr($hash, 0, 10);
            
            // Construir nombre siguiendo patrón: CODCARPETAS-REC-AÑO-RADICADO-HASH.pdf
            $explorerFileName = "{$folderPrefix}-REC-{$currentYear}-{$pqrNumber}-{$shortHash}.pdf";
            $storagePath = "folders/{$targetFolder->id}/{$explorerFileName}";
            
            // Asegurar directorio
            if (!file_exists(dirname(Storage::disk('public')->path($storagePath)))) {
                mkdir(dirname(Storage::disk('public')->path($storagePath)), 0755, true);
            }

            // Copiar el archivo (que ya tiene el QR)
            Storage::disk('public')->copy($path, $storagePath);

            // Registrar en la tabla Files (Explorador)
            File::create([
                'name' => str_replace('.pdf', '', $explorerFileName),
                'path' => $storagePath,
                'extension' => 'pdf',
                'mime_type' => 'application/pdf',
                'size' => Storage::disk('public')->size($storagePath),
                'active' => true,
                'folder_id' => $targetFolder->id,
                'file_code' => $pqrNumber,
                'hash' => $shortHash,
            ]);

        } catch (\Exception $e) {
            Log::error('Error guardando adjunto de PQR en el explorador: ' . $e->getMessage());
        }
    }
}

