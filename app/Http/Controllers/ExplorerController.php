<?php

namespace App\Http\Controllers;

use App\Enums\UserRole;
use App\Models\File;
use App\Models\Folder;
use App\Models\Sheet_number;
use Illuminate\Http\Request;
use Inertia\Inertia;

class ExplorerController extends Controller
{
    public function index(Request $request)
    {
        $folderId = $request->query('folder_id');
        $sheetId = $request->query('sheet_id');
        $dependencyId = $request->query('dependency_id');
        $buscador = $request->query('buscador');
        $permissionError = null;

        // 1. Validar Entidad (Sheet) si se proporciona
        if ($sheetId) {
            $sheet = Sheet_number::find($sheetId);
            if (!$sheet) {
                $permissionError = "esta entidad no existe";
            } else {
                $user = auth()->user();
                if ($user->hasRole(UserRole::Supervisor) || $user->hasRole(UserRole::Auxiliar)) {
                    if (!$user->sheetNumbers()->where('sheet_number_id', $sheetId)->exists()) {
                        $permissionError = "no tienes permiso para visualizar esta entidad";
                    }
                }
            }
        }

        // 2. Validar Carpeta (Folder) si se proporciona
        $currentFolder = null;
        if (!$permissionError && $folderId) {
            $currentFolder = Folder::where('id', $folderId)->where('active', true)->first();
            if (!$currentFolder) {
                $permissionError = "esta carpeta no existe";
            } else {
                // Verificar que la carpeta pertenezca a la entidad (si se dio entidad)
                if ($sheetId && $currentFolder->sheet_number_id != $sheetId) {
                    $permissionError = "esta carpeta no pertenece a la entidad seleccionada";
                } else {
                    // Si no se dio sheetId, validar permiso sobre la entidad de la carpeta
                    $validationSheetId = $currentFolder->sheet_number_id;
                    $user = auth()->user();
                    if ($user->hasRole(UserRole::Supervisor) || $user->hasRole(UserRole::Auxiliar)) {
                        if (!$user->sheetNumbers()->where('sheet_number_id', $validationSheetId)->exists()) {
                            $permissionError = "no tienes permiso para visualizar esta carpeta";
                        }
                    }
                }
            }
        }

        // Automatic creation of current year folder if at root of a valid sheet
        if (!$permissionError && $sheetId && !$folderId && !$buscador && !$dependencyId) {
            $currentYear = date('Y');
            $yearExists = Folder::where('sheet_number_id', $sheetId)
                ->where('year', $currentYear)
                ->whereNull('parent_id')
                ->where('active', true)
                ->exists();

            if (!$yearExists) {
                \App\Services\FolderStructureService::createDefaultStructure($sheetId, (int) $currentYear);
            }
        }

        // Base queries
        $foldersQuery = Folder::where("active", true);
        $filesQuery = File::where("active", true);

        if ($permissionError) {
            $foldersQuery->whereRaw('1 = 0');
            $filesQuery->whereRaw('1 = 0');
        } elseif ($buscador) {
            $foldersQuery->where('name', 'LIKE', "%{$buscador}%");
            $filesQuery->where('name', 'LIKE', "%{$buscador}%");

            if ($sheetId) {
                $foldersQuery->where('sheet_number_id', $sheetId);
                $filesQuery->whereHas('folder', function ($q) use ($sheetId) {
                    $q->where('sheet_number_id', $sheetId);
                });
            }
        } elseif ($dependencyId) {
            // Filter by dependency: show active files linked to active PQRs of this dependency
            $foldersQuery->whereRaw('1 = 0'); // Hide folders

            // Get IDs of active (non-archived) PQRs for this dependency
            $pqrQuery = \App\Models\PQR::where('dependency_id', $dependencyId)
                ->where('archived', false);
            if ($sheetId) {
                $pqrQuery->where('sheet_number_id', $sheetId);
            }
            $pqrIds = $pqrQuery->pluck('id');

            // Zero-pad IDs to match the file_code format (e.g. 1 => "001")
            $pqrCodes = $pqrIds->map(fn($id) => str_pad((string)$id, 3, '0', STR_PAD_LEFT))->values()->toArray();

            if (empty($pqrCodes)) {
                $filesQuery->whereRaw('1 = 0');
            } else {
                $filesQuery->whereIn('file_code', $pqrCodes);
            }
        } else {
            if ($folderId) {
                $foldersQuery->where('parent_id', $folderId);
                $filesQuery->where('folder_id', $folderId);
            } elseif ($sheetId) {
                $foldersQuery->where('sheet_number_id', $sheetId)
                    ->whereNull('parent_id');
                $filesQuery->whereRaw('1 = 0');
            } else {
                $foldersQuery->whereRaw('1 = 0');
                $filesQuery->whereRaw('1 = 0');
            }
        }

        $allFolders = Folder::where("active", true);
        if ($permissionError) {
            $allFolders->whereRaw('1 = 0');
        } elseif ($sheetId) {
            $allFolders->where('sheet_number_id', $sheetId);
        }

        return Inertia::render('Explorer', [
            "folders" => $foldersQuery->get(),
            "files" => $filesQuery->get()->map(function ($file) {
                $pureName = $file->name;
                $fileYear = date('Y');

                if (str_contains($file->name, '-ENV-')) {
                    $parts = explode('-ENV-', $file->name);
                    $suffix = $parts[1];
                    $suffixParts = explode('-', $suffix, 4);
                    if (count($suffixParts) >= 3) {
                        $fileYear = $suffixParts[0];

                        if (count($suffixParts) >= 4) {
                            $pureName = $suffixParts[3];

                            // Remove extension if present in pureName for easier editing
                            $ext = $file->extension;
                            if (str_ends_with($pureName, '.' . $ext)) {
                                $pureName = substr($pureName, 0, -(strlen($ext) + 1));
                            }
                        } else {
                            $pureName = ""; // No original name part
                        }
                    }
                }

                return [
                    "id" => $file->id,
                    "name" => $file->name,
                    "pure_name" => $pureName,
                    "year" => $fileYear,
                    "extension" => $file->extension,
                    "size" => $file->size,
                    "url" => asset("storage/" . $file->path),
                    "folder_id" => $file->folder_id,
                    "file_code" => $file->file_code,
                    "hash" => $file->hash,
                    "mime_type" => $file->mime_type,
                    "created_at" => $file->created_at ? $file->created_at->toISOString() : null,
                    "updated_at" => $file->updated_at ? $file->updated_at->toISOString() : null,
                    "is_pdf" => $file->extension === 'pdf',
                    "is_image" => in_array($file->extension, ['jpg', 'jpeg', 'png', 'gif', 'svg']),
                    "can_edit_name" => str_contains($file->name, '-ENV-')
                ];
            }),
            "allFolders" => $allFolders->get(),
            "currentFolder" => $currentFolder,
            "filters" => $request->only(['buscador', 'folder_id', 'sheet_id', 'dependency_id']),
            "permissionError" => $permissionError
        ]);
    }

}
