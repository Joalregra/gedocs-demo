<?php

namespace App\Http\Controllers\Api;

use App\Enums\UserRole;
use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;
use App\Models\PQR;
use App\Models\comunication;
use App\Mail\PQRResponseMail;


class CommunicationController extends Controller
{
    //Funciones de comunicaciones
    public function createCommunication(Request $request, string $id): JsonResponse
    {

        $pqr = PQR::with(['creator', 'responsible', 'dependency'])->find($id);

        if (!$pqr) {
            return response()->json(['error' => 'PQR no encontrada'], 404);
        }

        // Verificar si ya ha sido respondida
        if ($pqr->response_status === 'responded') {
            return response()->json(['error' => 'Esta PQR ya ha sido respondida y no admite más comunicaciones de respuesta.'], 422);
        }

        $validated = $request->validate([
            'message' => 'required|string|min:10|max:2000',
            'requires_response' => 'boolean',
            'attachments' => 'nullable|array',
            'attachments.*' => 'file|mimes:pdf,doc,docx,jpg,jpeg,png|max:5120',
        ]);

        DB::beginTransaction();
        try {
            // Crear la comunicación
            $comunication = $pqr->comunications()->create([
                'message' => $validated['message'],
                'requires_response' => $validated['requires_response'] ?? false
            ]);

            // Generar UUID si requiere respuesta
            $responseUrl = null;
            if ($validated['requires_response'] ?? false) {
                $comunication->generateResponseUuid(7); // 7 días para expirar
                $comunication->save();
                $responseUrl = $comunication->getResponseUrl();
            }

            // Guardar archivos si los hay
            if ($request->hasFile('attachments')) {
                foreach ($request->file('attachments') as $file) {
                    $path = $file->store('communication_attachments', 'public');

                    $comunication->attachedSupports()->create([
                        'name' => $file->getClientOriginalName(),
                        'path' => $path,
                        'type' => $file->getClientOriginalExtension(),
                        'origin' => 'ENV',
                        'size' => $file->getSize(),
                        'pqr_id' => $pqr->id,
                        'hash' => hash('sha256', uniqid((string) $pqr->id, true)),
                        'no_radicado' => str_pad((string) $pqr->id, 3, '0', STR_PAD_LEFT),
                    ]);
                }
            }


            /*
            // Enviar email con fallback seguro
            $emailRecipient = $pqr->email ?: ($pqr->creator?->email ?? null);
            if ($emailRecipient) {
                Mail::to($emailRecipient)->send(new PQRResponseMail($pqr, $comunication, $responseUrl));
            } else {
                Log::warning('No se envio correo: PQR sin destinatario', ['pqr_id' => $pqr->id]);
            }
            */
            // Marcar la PQR como respondida y guardar el mensaje
            $pqr->update([
                'response_message' => $validated['message'],
                'response_status' => 'responded',
                'response_date' => now(),
                'state' => true
            ]);

            DB::commit();

            return response()->json([
                'data' => $comunication->load(['attachedSupports']),
                'message' => 'Comunicación enviada exitosamente',
                'response_url' => $responseUrl,
                'pqr_status' => $pqr->response_status,
                'response_date' => $pqr->response_date,
            ], 201);

        }
        catch (\Exception $e) {
            DB::rollback();
            Log::error('Error creando comunicación: ' . $e->getMessage());
            return response()->json(['error' => 'Error interno del servidor'], 500);
        }
    }

    // Metodo para archivar y desarchivar una comunicación
    public function archiveCommunication(Request $request, string $communicationId): JsonResponse
    {
        $user = $request->user();

        // Buscar la comunicación con su PQR
        $communication = comunication::with('pqr')->find($communicationId);

        if (!$communication) {
            return response()->json(['error' => 'Comunicación no encontrada'], 404);
        }

        $pqr = $communication->pqr;

        // Validar permisos: Solo Admin o la Dependencia asignada
        if (!$user->hasRole(UserRole::Admin)) {
            if (!$user->hasRole(UserRole::Dependencia) || $pqr->dependency_id !== $user->dependency_id) {
                return response()->json(['error' => 'No autorizado para archivar esta comunicación'], 403);
            }
        }

        // Alternar el estado de archivado
        if ($communication->archived) {
            $communication->unarchive();
            $message = 'Comunicación desarchivada exitosamente';
        }
        else {
            $communication->archive();
            $message = 'Comunicación archivada exitosamente';
        }

        return response()->json([
            'data' => $communication->fresh(),
            'message' => $message,
            'archived' => $communication->archived
        ], 200);
    }

    // Método para mostrar el formulario de respuesta (acceso público por UUID)
    public function showResponseForm(string $uuid): JsonResponse
    {
        $comunication = comunication::with(['pqr.dependency', 'attachedSupports'])
            ->where('response_uuid', $uuid)
            ->first();

        if (!$comunication) {
            return response()->json(['error' => 'Enlace de respuesta no válido'], 404);
        }

        // Verificar si el UUID ha expirado
        if ($comunication->response_expires_at && now()->isAfter($comunication->response_expires_at)) {
            return response()->json(['error' => 'Este enlace de respuesta ha expirado'], 410);
        }

        // Verificar si ya fue usado
        if ($comunication->response_used) {
            return response()->json(['error' => 'Este enlace de respuesta ya fue utilizado'], 410);
        }

        return response()->json([
            'data' => [
                'communication' => $comunication,
                'pqr' => $comunication->pqr,
                'dependency' => $comunication->pqr->dependency,
            ],
            'message' => 'Formulario de respuesta obtenido exitosamente'
        ], 200);
    }

    // Método para procesar la respuesta del usuario (acceso público por UUID)
    public function processResponse(Request $request, string $uuid): JsonResponse
    {
        $comunication = comunication::with('pqr')->where('response_uuid', $uuid)->first();

        if (!$comunication) {
            return response()->json(['error' => 'Enlace de respuesta no válido'], 404);
        }

        $pqr = PQR::with(['creator', 'responsible', 'dependency'])->find($comunication->pqr_id);

        // Verificar si el UUID ha expirado
        if ($comunication->response_expires_at && now()->isAfter($comunication->response_expires_at)) {
            return response()->json(['error' => 'Este enlace de respuesta ha expirado'], 410);
        }

        // Verificar si ya fue usado
        if ($comunication->response_used) {
            return response()->json(['error' => 'Este enlace de respuesta ya fue utilizado'], 410);
        }

        $validated = $request->validate([
            'message' => 'required|string|min:10|max:2000',
            'attachments' => 'nullable|array',
            'attachments.*' => 'file|mimes:pdf,doc,docx,jpg,jpeg,png|max:5120',
        ]);

        DB::beginTransaction();
        try {
            // Crear la respuesta del usuario como una nueva comunicación
            $responseComunication = $pqr->comunications()->create([
                'message' => $validated['message'],
                'requires_response' => false,
                'is_user_response' => true,
            ]);

            // Guardar archivos si los hay
            if ($request->hasFile('attachments')) {
                foreach ($request->file('attachments') as $file) {
                    $path = $file->store('communication_attachments', 'public');

                    $responseComunication->attachedSupports()->create([
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

            // Marcar el UUID como usado
            $comunication->markResponseAsUsed();

            DB::commit();

            return response()->json([
                'data' => $responseComunication->load(['attachedSupports']),
                'message' => 'Respuesta enviada exitosamente'
            ], 201);

        }
        catch (\Exception $e) {
            DB::rollback();
            Log::error('Error procesando respuesta: ' . $e->getMessage());
            return response()->json(['error' => $e->getMessage()], 500);
        }
    }

}
