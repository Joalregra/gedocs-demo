<?php

namespace App\Http\Controllers;

// Importa la fachada de DOMPDF para generar PDFs
use Barryvdh\DomPDF\Facade\Pdf;

// Importa Request para poder recibir datos de formularios
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use App\Models\PQR;
use App\Models\comunication;
use App\Models\AttachedSupport;
use App\Models\Folder;
use App\Models\File;
use App\Support\EntityAccess;
use App\Support\InstitutionIdentity;
use Illuminate\Support\Str;
use Illuminate\Support\Facades\Mail;
use App\Mail\PQRResponseMail;
use SimpleSoftwareIO\QrCode\Facades\QrCode;


// Controlador encargado de generar el PDF
class PdfController extends Controller
{
    // Método que recibe la petición del frontend y genera el PDF
    public function generate(Request $request)
    {
        try {
            // Obtiene todos los datos enviados desde el formulario React
            // Se convierte en un array asociativo con todos los campos
            $data = $request->all();
            $documentType = $data['document_type'] ?? 'documento';
            $safeDocumentType = preg_replace('/[^a-z0-9_-]/i', '', $documentType);
            $fileName = ($safeDocumentType ?: 'documento') . '.pdf';
            $logoDataUri = $this->resolveLogoDataUri($request);
            $signatureDataUri = $this->resolveSignatureDataUri($request);

            $defaultFooter = InstitutionIdentity::defaultFooter();
            $requestedFooter = trim((string) ($data['footer_text'] ?? ''));
            $savedFooter = trim((string) ($request->user()?->pdf_footer_text ?? ''));
            $resolvedFooter = $requestedFooter !== '' ? $requestedFooter : ($savedFooter !== '' ? $savedFooter : $defaultFooter);
            $data['footer_text'] = $resolvedFooter;

            // Keep footer preference in sync with current user's account.
            if ($request->user() && $requestedFooter !== '' && $request->user()->pdf_footer_text !== $requestedFooter) {
                $request->user()->update(['pdf_footer_text' => $requestedFooter]);
            }

            // Carga la vista 'pdf.template' (Blade) y le pasa la variable $data
            $pdf = Pdf::loadView('pdf.template', [
                'data' => $data,
                'logoDataUri' => $logoDataUri,
                'signatureDataUri' => $signatureDataUri,
            ]);

            // Retorna el PDF descargable con el nombre "acta.pdf"
            return $pdf->download($fileName);

        } catch (\InvalidArgumentException $e) {
            return response()->json([
                'error' => $e->getMessage()
            ], 422);

        } catch (\Exception $e) {
            // Si ocurre algún error (por ejemplo, la vista no existe)
            // responde con un JSON de error y código HTTP 500
            return response()->json([
                'error' => $e->getMessage()
            ], 500);
        }
    }

    public function generateToExplorer(Request $request)
    {
        $validated = $request->validate([
            'folder_id' => 'required|exists:folders,id',
            'sheet_id' => 'nullable|integer',
            'document_type' => 'nullable|string|max:100',
            'footer_text' => 'nullable|string|max:2000',
        ]);

        // Security: the generated document is stored in this folder, so the user must be able to edit its entity.
        // Done before the try block so the 403 is not swallowed by the generic catch below.
        $folder = Folder::where('id', $validated['folder_id'])
            ->where('active', true)
            ->firstOrFail();
        EntityAccess::authorizeWrite($request->user(), $folder->sheet_number_id);

        try {
            $data = $request->all();
            $documentType = $data['document_type'] ?? 'documento';
            $safeDocumentType = preg_replace('/[^a-z0-9_-]/i', '', $documentType);
            $logoDataUri = $this->resolveLogoDataUri($request);
            $signatureDataUri = $this->resolveSignatureDataUri($request);

            $defaultFooter = InstitutionIdentity::defaultFooter();
            $requestedFooter = trim((string) ($data['footer_text'] ?? ''));
            $savedFooter = trim((string) ($request->user()?->pdf_footer_text ?? ''));
            $resolvedFooter = $requestedFooter !== '' ? $requestedFooter : ($savedFooter !== '' ? $savedFooter : $defaultFooter);
            $data['footer_text'] = $resolvedFooter;

            $nextEnvNumber = $this->getNextEnvConsecutive();
            $pqrNumber = str_pad((string) $nextEnvNumber, 3, '0', STR_PAD_LEFT);
            $data['no_radicado'] = $pqrNumber;
            $data['is_env'] = true;

            $pdf = Pdf::loadView('pdf.template', [
                'data' => $data,
                'logoDataUri' => $logoDataUri,
                'signatureDataUri' => $signatureDataUri,
            ]);

            $fileYear = date('Y');
            
            // Build folder prefix using hierarchical and specialized separators
            $folderPrefix = $folder->getFullHierarchyCode();

            $hash = substr(md5(uniqid()), 0, 8);
            $newName = "{$folderPrefix}-ENV-{$fileYear}-{$pqrNumber}-{$hash}.pdf";
            $path = "folders/{$folder->id}/{$newName}";

            Storage::disk('public')->put($path, $pdf->output());

            $newFile = File::create([
                'name' => $newName,
                'path' => $path,
                'extension' => 'pdf',
                'mime_type' => 'application/pdf',
                'size' => Storage::disk('public')->size($path),
                'folder_id' => $folder->id,
                'file_code' => $pqrNumber,
                'hash' => $hash,
                'active' => true,
            ]);

            return response()->json([
                'message' => 'PDF generado y guardado correctamente.',
                'folder_id' => $folder->id,
                'sheet_id' => $validated['sheet_id'] ?? null,
                'file' => [
                    'id' => $newFile->id,
                    'name' => $newFile->name,
                    'url' => asset('storage/' . $newFile->path),
                    'created_at' => $newFile->created_at,
                    'updated_at' => $newFile->updated_at,
                ],
            ]);
        } catch (\InvalidArgumentException $e) {
            return response()->json(['error' => $e->getMessage()], 422);
        } catch (\Exception $e) {
            return response()->json(['error' => $e->getMessage()], 500);
        }
    }

    public function saveLogoPreference(Request $request)
    {
        $user = $request->user();

        if (!$request->hasFile('logo_file')) {
            return response()->json(['error' => 'Debe seleccionar un archivo de logo.'], 422);
        }

        try {
            $file = $request->file('logo_file');
            $this->validateLogoFile($file);

            $previousLogoPath = $user->pdf_logo_path;
            // Security: extension from the file content (png/jpg only), never from the client name.
            $extension = $file->extension() ?: 'png';
            $newLogoPath = $file->storeAs(
                'pdf_logos',
                'user_' . $user->id . '_' . now()->timestamp . '.' . $extension,
                'public'
            );

            $user->update(['pdf_logo_path' => $newLogoPath]);

            if ($previousLogoPath && $previousLogoPath !== $newLogoPath && Storage::disk('public')->exists($previousLogoPath)) {
                Storage::disk('public')->delete($previousLogoPath);
            }

            return response()->json([
                'message' => 'Logo guardado correctamente.',
                'logo_url' => Storage::url($newLogoPath),
                'logo_path' => $newLogoPath,
            ]);
        } catch (\InvalidArgumentException $e) {
            return response()->json(['error' => $e->getMessage()], 422);
        } catch (\Exception $e) {
            return response()->json(['error' => 'No se pudo guardar el logo.'], 500);
        }
    }

    public function resetLogoPreference(Request $request)
    {
        $user = $request->user();
        $previousLogoPath = $user->pdf_logo_path;

        if ($previousLogoPath && Storage::disk('public')->exists($previousLogoPath)) {
            Storage::disk('public')->delete($previousLogoPath);
        }

        $user->update(['pdf_logo_path' => null]);

        return response()->json([
            'message' => 'Logo restablecido correctamente.',
            'logo_url' => InstitutionIdentity::logoUrl(),
        ]);
    }

    public function saveFooterPreference(Request $request)
    {
        $validated = $request->validate([
            'footer_text' => 'nullable|string|max:2000',
        ]);

        $defaultFooter = InstitutionIdentity::defaultFooter();
        $footerText = trim((string) ($validated['footer_text'] ?? ''));

        $request->user()->update([
            'pdf_footer_text' => $footerText !== '' ? $footerText : $defaultFooter,
        ]);

        return response()->json([
            'message' => 'Pie de pagina guardado correctamente.',
            'footer_text' => $request->user()->pdf_footer_text,
        ]);
    }

    private function resolveLogoDataUri(Request $request): string
    {
        if ($request->hasFile('logo_file')) {
            $file = $request->file('logo_file');
            $this->validateLogoFile($file);

            $content = base64_encode(file_get_contents($file->getPathname()));
            $mimeType = $file->getMimeType();
            return "data:{$mimeType};base64,{$content}";
        }

        $savedLogoPath = $request->user()?->pdf_logo_path;
        if ($savedLogoPath && Storage::disk('public')->exists($savedLogoPath)) {
            $fullSavedLogoPath = Storage::disk('public')->path($savedLogoPath);
            $savedMimeType = mime_content_type($fullSavedLogoPath) ?: 'image/png';
            $savedContent = base64_encode(file_get_contents($fullSavedLogoPath));
            return "data:{$savedMimeType};base64,{$savedContent}";
        }

        $defaultLogoPath = InstitutionIdentity::logoFile();
        if (!file_exists($defaultLogoPath)) {
            throw new \InvalidArgumentException('No se encontro el logo predeterminado de la institucion.');
        }

        $content = base64_encode(file_get_contents($defaultLogoPath));
        return "data:image/png;base64,{$content}";
    }

    private function validateLogoFile($file): void
    {
        $minFileBytes = 10 * 1024;
        $maxFileBytes = 2 * 1024 * 1024;
        $minDimension = 64;
        $maxDimension = 2000;

        $mimeType = $file->getMimeType();
        // Security: SVG is not accepted for the stored logo (script-capable file served from /storage).
        $allowedMimeTypes = ['image/png', 'image/jpeg'];

        if (!in_array($mimeType, $allowedMimeTypes, true)) {
            throw new \InvalidArgumentException('Tipo de archivo no permitido. Solo PNG o JPG.');
        }

        $fileSize = $file->getSize() ?? 0;
        if ($fileSize < $minFileBytes) {
            throw new \InvalidArgumentException('El logo es demasiado pequeno. Minimo: 10 KB.');
        }

        if ($fileSize > $maxFileBytes) {
            throw new \InvalidArgumentException('El logo es demasiado pesado. Maximo: 2 MB.');
        }

        [$width, $height] = $this->extractDimensionsFromUploadedFile($file);
        if (
            $width < $minDimension ||
            $height < $minDimension ||
            $width > $maxDimension ||
            $height > $maxDimension
        ) {
            throw new \InvalidArgumentException('Dimensiones invalidas. Use una imagen entre 64x64 y 2000x2000 px.');
        }
    }

    private function resolveSignatureDataUri(Request $request): ?string
    {
        $minFileBytes = 4 * 1024;
        $maxFileBytes = 1024 * 1024;
        $minWidth = 120;
        $minHeight = 40;
        $maxWidth = 2400;
        $maxHeight = 1200;

        if (!$request->hasFile('signature_file')) {
            return null;
        }

        $file = $request->file('signature_file');
        $mimeType = $file->getMimeType();
        $allowedMimeTypes = ['image/png', 'image/jpeg', 'image/svg+xml'];

        if (!in_array($mimeType, $allowedMimeTypes, true)) {
            throw new \InvalidArgumentException('Tipo de archivo no permitido para firma. Solo PNG, JPG o SVG.');
        }

        $fileSize = $file->getSize() ?? 0;
        if ($fileSize < $minFileBytes) {
            throw new \InvalidArgumentException('La firma es demasiado pequena. Minimo: 4 KB.');
        }

        if ($fileSize > $maxFileBytes) {
            throw new \InvalidArgumentException('La firma es demasiado pesada. Maximo: 1 MB.');
        }

        [$width, $height] = $this->extractDimensionsFromUploadedFile($file);
        if (
            $width < $minWidth ||
            $height < $minHeight ||
            $width > $maxWidth ||
            $height > $maxHeight
        ) {
            throw new \InvalidArgumentException('Dimensiones de firma invalidas. Use entre 120x40 y 2400x1200 px.');
        }

        $content = base64_encode(file_get_contents($file->getPathname()));
        return "data:{$mimeType};base64,{$content}";
    }

    private function extractDimensionsFromUploadedFile($file): array
    {
        $mimeType = $file->getMimeType();

        if ($mimeType === 'image/svg+xml') {
            $svg = file_get_contents($file->getPathname());

            preg_match('/width=["\']([0-9.]+)(px)?["\']/i', $svg, $widthMatch);
            preg_match('/height=["\']([0-9.]+)(px)?["\']/i', $svg, $heightMatch);

            if (!empty($widthMatch[1]) && !empty($heightMatch[1])) {
                return [(int) ceil((float) $widthMatch[1]), (int) ceil((float) $heightMatch[1])];
            }

            preg_match('/viewBox=["\']\s*[0-9.\-]+\s+[0-9.\-]+\s+([0-9.\-]+)\s+([0-9.\-]+)\s*["\']/i', $svg, $viewBoxMatch);
            if (!empty($viewBoxMatch[1]) && !empty($viewBoxMatch[2])) {
                return [(int) ceil((float) $viewBoxMatch[1]), (int) ceil((float) $viewBoxMatch[2])];
            }

            throw new \InvalidArgumentException('No se pudieron determinar las dimensiones del SVG.');
        }

        $imageSize = @getimagesize($file->getPathname());
        if (!$imageSize) {
            throw new \InvalidArgumentException('No se pudieron leer las dimensiones de la imagen.');
        }

        return [(int) $imageSize[0], (int) $imageSize[1]];
    }

    /**
     * Genera un PDF de comunicación oficial, lo guarda en storage
     * y lo registra como AttachedSupport vinculado a una comunicación/PQR.
     *
     * POST /api/pdf/generate-response
     */
    public function generateAndStore(Request $request)
    {
        // Reglas de validación para el formato CARTA (único permitido para respuestas PQR)
        $validated = $request->validate([
            'pqr_id' => 'required|exists:p_q_r_s,id',
            // Datos del documento
            'codigo' => 'nullable|string',
            'fecha' => 'nullable|string',
            'lugar' => 'nullable|string',
            // Destinatario
            'tratamiento' => 'nullable|string',
            'nombres' => 'nullable|string',
            'cargo' => 'nullable|string',
            'empresa' => 'nullable|string',
            'direccion' => 'nullable|string',
            'ciudad' => 'nullable|string',
            // Contenido
            'asunto' => 'nullable|string',
            'saludo' => 'nullable|string',
            'texto' => 'nullable|string',
            // Despedida y Firma
            'despedida1' => 'nullable|string',
            'despedida2' => 'nullable|string',
            'despedida3' => 'nullable|string',
            'firma_nombres' => 'nullable|string',
            'firma_cargo' => 'nullable|string',
            'anexo' => 'nullable|string',
            'copia' => 'nullable|string',
            'redactor' => 'nullable|string',
            'transcriptor' => 'nullable|string',
            'footer_text' => 'nullable|string',
            'pie_pagina' => 'nullable|string',
            // Archivos adjuntos y personalización
            'logo_file' => 'nullable|image|max:2048',
            'signature_file' => 'nullable|image|max:2048',
            'support_files' => 'nullable|array',
            'support_files.*' => 'file|mimes:pdf|max:10240',
            'folder_id' => 'nullable|integer|exists:folders,id',
        ]);

        try {
            // Verificar existencia y estado de la PQR
            $pqr = PQR::find($validated['pqr_id']);
            if (!$pqr) {
                return response()->json(['error' => 'PQR no encontrada'], 404);
            }

            // Security: only users who can see this PQR in their inbox may answer it.
            if (!EntityAccess::canAccessPqr($request->user(), $pqr)) {
                return response()->json(['error' => 'No autorizado'], 403);
            }

            if ($pqr->response_status === 'responded') {
                return response()->json(['error' => 'Esta PQR ya ha sido respondida.'], 422);
            }

            // Preparar datos base
            $data = $request->all();

            // 1. Resolve Location Information and Prefixes automatically
            $folderPrefix = $pqr->dependency_id ?? '000';

            if (!empty($validated['folder_id'])) {
                // Only folders of the PQR's own entity are used for the archive location.
                $folder = \App\Models\Folder::with('parent')
                    ->where('sheet_number_id', $pqr->sheet_number_id)
                    ->find($validated['folder_id']);
                if ($folder) {
                    $folderPrefix = $folder->getFullHierarchyCode();
                    
                    $tempFolder = $folder;
                    $folderNames = [];
                    while ($tempFolder) {
                        $folderNames[] = $tempFolder->name;
                        $tempFolder = $tempFolder->parent;
                    }
                    $data['archivado_en'] = implode(' / ', array_reverse($folderNames));
                }
            }

            // Definir nombre y ruta del archivo de forma definitiva
            $year = now()->year;
            $nextEnvNumber = $this->getNextEnvConsecutive();
            $pqrNumber = str_pad((string) $nextEnvNumber, 3, '0', STR_PAD_LEFT);
            $hash = substr(md5(uniqid()), 0, 8);
            $fileName = "{$folderPrefix}-ENV-{$year}-{$pqrNumber}-{$hash}.pdf";

            $storagePath = 'pdf_responses/' . $fileName;
            $absolutePath = storage_path('app/public/' . $storagePath);

            // 2. Preparar datos para el template forzando CARTA
            $data['document_type'] = 'carta';
            // Agregar datos para el QR
            $data['no_radicado'] = $pqrNumber;
            $data['is_env'] = true;
            $data['atendido'] = $pqr->responsible ? $pqr->responsible->name : ($request->user() ? $request->user()->name : '');
            $data['hora'] = now()->format('H:i:s');


            // Resolución de Logotipo y Firma (Base64)
            $logoDataUri = $this->resolveLogoDataUri($request);
            $signatureDataUri = $this->resolveSignatureDataUri($request);

            // Pie de página
            $defaultFooter = InstitutionIdentity::defaultFooter(false);
            $savedFooter = trim((string) ($request->user()?->pdf_footer_text ?? ''));

            // Preferimos footer_text (editable en el form) -> pie_pagina -> savedFooter -> default
            $finalFooter = $validated['footer_text'] ?? ($validated['pie_pagina'] ?? ($savedFooter ?: $defaultFooter));
            $data['footer_text'] = $finalFooter;
            $data['pie_pagina'] = $finalFooter;

            // Numero de radicado
            $qrCodeDataUri = null;

            // 1. Generar la CARTA (PDF Principal usando la vista template)
            $pdf = Pdf::loadView('pdf.template', [
                'data' => $data,
                'logoDataUri' => $logoDataUri,
                'signatureDataUri' => $signatureDataUri,
                'qrCodeDataUri' => $qrCodeDataUri,
            ]);
            $pdf->setPaper('letter', 'portrait');
            $mainPdfContent = $pdf->output();

            // Guardar temporalmente la carta para la fusión
            $tempMainPath = storage_path('app/temp_main_' . uniqid() . '.pdf');
            file_put_contents($tempMainPath, $mainPdfContent);

            // 2. Inicializar el Fusionador (PDFMerger)
            $oMerger = \Webklex\PDFMerger\Facades\PDFMergerFacade::init();
            $oMerger->addPDF($tempMainPath, 'all');

            // 3. Añadir archivos de soporte si existen
            if ($request->hasFile('support_files')) {
                foreach ($request->file('support_files') as $file) {
                    $oMerger->addPDF($file->getRealPath(), 'all');
                }
            }

            // 4. Ejecutar la fusión y guardar el archivo final
            $oMerger->merge();


            // Asegurar que el directorio existe
            if (!file_exists(dirname($absolutePath))) {
                mkdir(dirname($absolutePath), 0755, true);
            }

            $oMerger->save($absolutePath);

            // Limpiar archivo temporal
            if (file_exists($tempMainPath))
                unlink($tempMainPath);

            // 5. Registrar el PDF FUSIONADO como único AttachedSupport con origin 'ENV'
            $pqr->attachedSupports()->create([
                'name' => 'Respuesta Radicado ' . str_pad((string) $pqr->id, 3, '0', STR_PAD_LEFT),
                'path' => $storagePath,
                'type' => 'pdf',
                'origin' => 'ENV',
                'size' => filesize($absolutePath),
                'hash' => hash_file('sha256', $absolutePath),
                'no_radicado' => $pqrNumber,
            ]);

            // Si se seleccionó una carpeta en el modal, registrar el archivo en el explorador (Files)
            if (!empty($validated['folder_id'])) {
                $hash = hash_file('sha256', $absolutePath);
                $fileCode = $pqrNumber;
                $shortHash = substr($hash, 0, 10);

                \App\Models\File::create([
                    'name' => str_replace('.pdf', '', $fileName) . "-{$shortHash}",
                    'path' => $storagePath,
                    'extension' => 'pdf',
                    'mime_type' => 'application/pdf',
                    'size' => filesize($absolutePath),
                    'active' => true,
                    'folder_id' => $validated['folder_id'],
                    'file_code' => $fileCode,
                    'hash' => $shortHash,
                ]);
            }

            // Actualizar PQR
            $pqr->update([
                'response_date' => now(),
                'response_status' => 'responded',
                'state' => true
            ]);

            // Cargar adjuntos para el correo (el PDF fusionado)
            $pqr->load('attachedSupports');

            // Enviar notificación por correo
            $emailRecipient = $pqr->email ?: ($pqr->creator?->email ?? null);
            if ($emailRecipient) {
                Mail::to($emailRecipient)->send(new PQRResponseMail($pqr));
            }

            return response()->json([
                'message' => 'Respuesta enviada y PDFs fusionados exitosamente.',
                'pdf_url' => Storage::url($storagePath),
                'pqr_status' => 'responded'
            ]);

        } catch (\Exception $e) {
            Log::error('Error en generateAndStore (Carta): ' . $e->getMessage());
            return response()->json(['error' => 'Error al generar la respuesta: ' . $e->getMessage()], 500);
        }
    }
    
    /**
     * Genera el siguiente número consecutivo global para documentos salientes (ENV).
     */
    private function getNextEnvConsecutive()
    {
        // 1. Buscar el máximo en Soportes de PQR (origen ENV)
        $maxAttached = \App\Models\AttachedSupport::where('origin', 'ENV')
            ->whereNotNull('no_radicado')
            ->where('no_radicado', 'REGEXP', '^[0-9]+$')
            ->orderByRaw('CAST(no_radicado AS UNSIGNED) DESC')
            ->first();
        
        $num1 = $maxAttached ? (int)$maxAttached->no_radicado : 0;

        // 2. Buscar el máximo en Archivos del Explorador (file_code)
        $maxFile = \App\Models\File::whereNotNull('file_code')
            ->where('file_code', 'REGEXP', '^[0-9]+$')
            ->orderByRaw('CAST(file_code AS UNSIGNED) DESC')
            ->first();
            
        $num2 = $maxFile ? (int)$maxFile->file_code : 0;

        return max($num1, $num2) + 1;
    }
}
