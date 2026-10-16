<?php

/**
 * Defines the namespace where this controller belongs.
 * All HTTP controllers in Laravel are usually placed here.
 */
namespace App\Http\Controllers;

/**
 * Generic Exception class used to catch unexpected errors.
 */
use Exception;

/**
 * Represents the incoming HTTP request.
 * Provides access to input data, files, headers, etc.
 */
use Illuminate\Http\Request;
use Inertia\Inertia;

/**
 * Folder Eloquent model.
 * Represents the "folders" table and its relationships.
 */
use App\Models\Folder;

/**
 * File Eloquent model.
 * Represents the "files" table and its relationships.
 */
use App\Models\File;
use App\Models\Sheet_number;
use App\Support\EntityAccess;
use Illuminate\Support\Str;

/**
 * Storage facade.
 * Used to interact with Laravel's filesystem abstraction.
 */
use Storage;

/**
 * Native PHP class used to create and manipulate ZIP files.
 */
use ZipArchive;


/**
 * FolderController
 *
 * This controller is responsible for handling all operations related to:
 * - Folder listing and navigation
 * - File uploads and downloads
 * - Logical deletion (trash system using "active" flag)
 * - Recursive folder operations
 * - Mixed ZIP downloads (folders + files)
 *
 * It acts as the bridge between the frontend (React/Inertia)
 * and the backend (database + filesystem).
 */
class FolderController extends Controller
{
    /**
     * Display a list of root folders.
     *
     * Only returns folders:
     * - That do not have a parent (root level)
     * - That are marked as active
     * - Ordered by newest first
     */





    /**
     * Create a new folder.
     *
     * Validates input and stores folder metadata in the database.
     */
    public function store(Request $request)
    {
        // Validate incoming data
        $validated = $request->validate([
            "name" => "required|string",
            "parent_id" => "nullable|exists:folders,id",
            "folder_code" => "nullable|string",
            "department" => "required|string",
            "sheet_number_id" => "nullable|exists:sheet_numbers,id",
        ]);

        // A subfolder always belongs to its parent's entity (the client cannot pick another one).
        if ($validated["parent_id"]) {
            $parent = Folder::find($validated["parent_id"]);
            if ($parent) {
                $validated["sheet_number_id"] = $parent->sheet_number_id;
            }
        }

        // Security: only editors of that entity may create folders in it.
        EntityAccess::authorizeWrite($request->user(), $validated["sheet_number_id"] ?? null);

        // Create the folder record
        $data = [
            "name" => $validated["name"],
            "parent_id" => $validated["parent_id"] ?? null,
            "folder_code" => $validated["folder_code"] ?? null,
            "department" => $validated["department"],
            "sheet_number_id" => $validated["sheet_number_id"] ?? null,
        ];

        // If it's a root folder for a sheet, it's a Year folder
        if (!$data["parent_id"] && $data["sheet_number_id"]) {
            $data["year"] = is_numeric($data["name"]) ? (int) $data["name"] : date('Y');
            $data["department"] = "Año";

            // Check for duplicates
            $exists = Folder::where('sheet_number_id', $data["sheet_number_id"])
                ->where('year', $data["year"])
                ->whereNull('parent_id')
                ->where('active', true)
                ->exists();

            if ($exists) {
                return back()->withErrors(['name' => 'Este año ya existe para esta entidad.']);
            }
        }

        $folder = Folder::create($data);

        // If it was a Year folder, seed the structure
        if (!$data["parent_id"] && $data["sheet_number_id"]) {
            $this->seedYearStructure($data["sheet_number_id"], $folder->id);
        }

        return back();
    }


    /**
     * Upload one or multiple files into a folder.
     *
     * Responsibilities:
     * - Validate files
     * - Generate standardized filenames
     * - Store files on disk
     * - Persist file metadata in database
     */
    public function upload(Request $request, $folderId)
    {
        try {
            // Retrieve the folder where files will be uploaded
            $folder = Folder::findOrFail($folderId);
            EntityAccess::authorizeWrite($request->user(), $folder->sheet_number_id);

            // Validate uploaded files: allow-listed document/image types, 10MB each. The type is
            // checked on the file content, never on the client-supplied name (blocks .php/.html uploads).
            $request->validate([
                "files.*" => "required|file|mimes:pdf,doc,docx,xls,xlsx,odt,ods,jpg,jpeg,png,txt,csv|max:10240",
            ]);

            $uploadedFiles = [];

            // If no files are provided, return an error
            if (!$request->hasFile('files')) {
                return back()->withErrors(['files' => 'No files provided']);
            }

            // Build folder prefix using hierarchical and specialized separators
            $folderPrefix = $folder->getFullHierarchyCode();

            /**
             * Loop through each uploaded file
             * and store it individually.
             */
            foreach ($request->file('files') as $file) {
                // Used to build a standardized file name
                $fileYear = date("Y");
                // Safe name: slug of the client name + extension guessed from the file content.
                $safeExtension = $file->extension() ?: 'bin';
                $baseName = Str::limit(Str::slug(pathinfo($file->getClientOriginalName(), PATHINFO_FILENAME)), 80, '') ?: 'documento';
                $originalName = "{$baseName}.{$safeExtension}";

                // Generate sequence (max of all files)
                $maxCode = (int) \App\Models\File::max('file_code');
                $sequence = str_pad($maxCode + 1, 3, "0", STR_PAD_LEFT);

                // Generate hash following REAL file content
                $hash = hash_file('sha256', $file->getRealPath());
                $shortHash = substr($hash, 0, 10);

                // New file name format including sequence and short hash
                $newName = "{$folderPrefix}-ENV-{$fileYear}-{$sequence}-{$shortHash}-{$originalName}";

                // Store file in public disk
                $path = $file->storeAs("folders/{$folderId}", $newName, 'public');

                // Create database record
                $newFile = File::create([
                    "name" => $newName,
                    "path" => $path,
                    "extension" => $safeExtension,
                    "mime_type" => $file->getMimeType(),
                    "size" => $file->getSize(),
                    "folder_id" => $folderId,
                    "active" => true,
                    "file_code" => $sequence,
                    "hash" => $hash,
                ]);

                // Prepare response data
                $uploadedFiles[] = [
                    "id" => $newFile->id,
                    "folder_id" => $folderId,
                    "name" => $newFile->name,
                    "extension" => $newFile->extension,
                    "mime_type" => $newFile->mime_type,
                    "size" => $newFile->size,
                    "is_pdf" => $newFile->extension === 'pdf',
                    "created_at" => $newFile->created_at,
                    "updated_at" => $newFile->updated_at,
                    "url" => asset("storage/" . $newFile->path),
                    "file_code" => $newFile->file_code,
                    "hash" => $newFile->hash,
                ];
            }

            return back();

        } catch (\Illuminate\Database\Eloquent\ModelNotFoundException $e) {
            return back()->withErrors(['error' => 'Folder not found']);
        } catch (\Illuminate\Validation\ValidationException $e) {
            return back()->withErrors($e->errors());
        } catch (\Symfony\Component\HttpKernel\Exception\HttpException $e) {
            // Authorization failures (403) must reach the client as such, not as a flash error.
            throw $e;
        } catch (Exception $e) {
            return back()->withErrors(['error' => $e->getMessage()]);
        }
    }

    /**
     * Download a single file.
     *
     * Checks if the file exists in storage before sending it.
     */
    public function download(Request $request, $fileId)
    {
        $file = File::with('folder')->findOrFail($fileId);
        EntityAccess::authorizeFile($request->user(), $file);

        if (!Storage::disk('public')->exists($file->path)) {
            return back()->withErrors(['error' => 'File not found on disk']);
        }

        return response()->download(
            Storage::disk('public')->path($file->path),
            $file->name
        );
    }


    /**
     * Logically delete (send to trash) files and folders.
     *
     * Uses "active = false" instead of physical deletion.
     * Supports mixed selection (files + folders).
     */
    public function deleteMixed(Request $request)
    {
        // Validate incoming IDs
        $request->validate([
            'folders' => 'array',
            'folders.*' => 'integer|exists:folders,id',
            'files' => 'array',
            'files.*' => 'integer|exists:files,id',
        ]);

        // Retrieve IDs from request
        $fileIds = $request->input('files', []);
        $folderIds = $request->input('folders', []);

        // Security: every selected item must belong to an entity the user can edit.
        EntityAccess::authorizeSelection($request->user(), $folderIds, $fileIds, write: true);

        // Deactivate files
        if (!empty($fileIds)) {
            File::whereIn('id', $fileIds)
                ->update(['active' => false]);
        }

        // Deactivate folders recursively
        $folders = Folder::whereIn('id', $folderIds)->get();

        foreach ($folders as $folder) {
            $this->deactivateFolderRecursively($folder);
        }

        return back();
    }


    /**
     * Recursively deactivate a folder.
     */
    private function deactivateFolderRecursively($folder)
    {
        $folder->files()->update(['active' => false]);
        foreach ($folder->children as $child) {
            $this->deactivateFolderRecursively($child);
        }
        $folder->update(['active' => false]);
    }

    /**
     * Move files and folders to a new target folder.
     */
    public function moveMixed(Request $request)
    {
        $request->validate([
            'folders' => 'array',
            'folders.*' => 'integer|exists:folders,id',
            'files' => 'array',
            'files.*' => 'integer|exists:files,id',
            'target_folder_id' => 'required|integer|exists:folders,id',
        ]);

        $folderIds = $request->input('folders', []);
        $fileIds = $request->input('files', []);
        $targetFolderId = $request->input('target_folder_id');

        $targetFolder = Folder::findOrFail($targetFolderId);
        $targetFolderCode = $targetFolder->folder_code ?? "000";

        // Security: both the items and the destination must belong to entities the user can edit.
        EntityAccess::authorizeFolder($request->user(), $targetFolder, write: true);
        EntityAccess::authorizeSelection($request->user(), $folderIds, $fileIds, write: true);

        if (!empty($folderIds)) {
            Folder::whereIn('id', $folderIds)
                ->update([
                    'parent_id' => $targetFolderId,
                    'sheet_number_id' => $targetFolder->sheet_number_id
                ]);
        }

        if (!empty($fileIds)) {
            // Build target folder prefix using specialized separators
            $targetFolderPrefix = $targetFolder->getFullHierarchyCode();

            $files = File::whereIn('id', $fileIds)->get();
            foreach ($files as $file) {
                $originalName = $file->name;

                // Try to extract original name from new format (PREFIX-ENV-YEAR-SEQUENCE-HASH-ORIGINALNAME)
                if (strpos($file->name, '-ENV-') !== false) {
                    $parts = explode('-ENV-', $file->name, 2);
                    if (count($parts) === 2) {
                        $afterSub = explode('-', $parts[1], 4); // [YEAR, SEQUENCE, HASH, ORIGINALNAME]
                        if (count($afterSub) === 4) {
                            $originalName = $afterSub[3];
                        } elseif (count($afterSub) === 3) {
                            // If it has only 3 parts, there is no original name part (e.g. system generated)
                            $originalName = "";
                        }
                    }
                }
                // Try to extract from old format (YEAR-Ex-CODE-ORIGINALNAME)
                else {
                    $parts = explode('-', $file->name, 4);
                    if (count($parts) >= 4 && is_numeric($parts[0]) && $parts[1] === 'Ex') {
                        $originalName = $parts[3];
                    }
                }

                $fileYear = $file->created_at->format('Y');
                $shortHash = substr($file->hash, 0, 10);
                $newName = "{$targetFolderPrefix}-ENV-{$fileYear}-{$file->file_code}-{$shortHash}";
                
                // Only append original name if it's not empty, to avoid trailing dash
                if ($originalName !== "") {
                    $newName = "{$newName}-{$originalName}";
                }

                $oldPath = $file->path;
                $newPath = "folders/{$targetFolderId}/{$newName}";

                Storage::disk('public')->move($oldPath, $newPath);


                $file->update([
                    'folder_id' => $targetFolderId,
                    'name' => $newName,
                    'path' => $newPath
                ]);
            }
        }

        return back();
    }

    /**
     * Logically restore (send back from trash) files and folders.
     */
    public function restoreMixed(Request $request)
    {
        $request->validate([
            'folders' => 'array',
            'folders.*' => 'integer|exists:folders,id',
            'files' => 'array',
            'files.*' => 'integer|exists:files,id',
        ]);

        $fileIds = $request->input('files', []);
        $folderIds = $request->input('folders', []);

        EntityAccess::authorizeSelection($request->user(), $folderIds, $fileIds, write: true);

        if (!empty($fileIds)) {
            File::whereIn('id', $fileIds)->update(['active' => true]);
        }

        $folders = Folder::whereIn('id', $folderIds)->get();
        foreach ($folders as $folder) {
            $this->activateFolderRecursively($folder);
        }

        return back();
    }

    private function activateFolderRecursively($folder)
    {
        $folder->files()->update(['active' => true]);
        foreach ($folder->children as $child) {
            $this->activateFolderRecursively($child);
        }
        $folder->update(['active' => true]);
    }

    /**
     * Get archived items (active = false)
     */
    public function archived(Request $request)
    {
        $sheetId = $request->query('sheet_id');

        // Security: a requested entity must be readable; with no entity, non-admins only see their own.
        $allowedSheetIds = EntityAccess::sheetIds($request->user());
        if ($sheetId) {
            EntityAccess::authorizeRead($request->user(), (int) $sheetId);
        }

        // Folders archivados
        $foldersQuery = Folder::where('active', false);

        if ($sheetId) {
            $foldersQuery->where('sheet_number_id', $sheetId);
        } elseif ($allowedSheetIds !== null) {
            $foldersQuery->whereIn('sheet_number_id', $allowedSheetIds);
        }

        // Solo mostrar la raíz del árbol archivado (año o carpeta sin padre activo)
        $foldersQuery->where(function ($q) {
            $q->whereNull('parent_id')
                ->orWhereHas('parent', function ($pq) {
                    $pq->where('active', true);
                });
        });

        $folders = $foldersQuery->orderBy('updated_at', 'desc')->get();

        // Files archivados, filtrando por sheet si aplica
        $filesQuery = File::where('active', false)
            ->whereHas('folder', function ($q) use ($sheetId, $allowedSheetIds) {
                $q->where('active', true); // carpeta padre activa
                if ($sheetId) {
                    $q->where('sheet_number_id', $sheetId);
                } elseif ($allowedSheetIds !== null) {
                    $q->whereIn('sheet_number_id', $allowedSheetIds);
                }
            });

        $files = $filesQuery->orderBy('updated_at', 'desc')->get();

        return response()->json([
            "success" => true,
            "folders" => $folders,
            "files" => $files
        ]);
    }


    /**
     * Update folder metadata.
     *
     * Allows partial updates using "sometimes" validation rules.
     */
    public function updateFolder(Request $request, $folderId)
    {
        $folder = Folder::find($folderId);

        if (!$folder) {
            return back()->withErrors(['error' => 'Folder not found']);
        }

        EntityAccess::authorizeFolder($request->user(), $folder, write: true);

        // Validate fields only if they are present
        $validated = $request->validate([
            "name" => "sometimes|required|string",
            "parent_id" => "sometimes|nullable|exists:folders,id",
            "folder_code" => "sometimes|nullable|string",
            "department" => "sometimes|required|string",
            "year" => "sometimes|nullable|integer"
        ]);

        // If updating a Year folder, check for duplicates
        if (!$folder->parent_id && $folder->sheet_number_id && isset($validated['name'])) {
            $newYear = is_numeric($validated['name']) ? (int) $validated['name'] : null;
            if ($newYear) {
                $exists = Folder::where('sheet_number_id', $folder->sheet_number_id)
                    ->where('year', $newYear)
                    ->where('id', '!=', $folderId)
                    ->whereNull('parent_id')
                    ->where('active', true)
                    ->exists();

                if ($exists) {
                    return back()->withErrors(['name' => 'Este año ya existe para esta entidad.']);
                }
                $validated['year'] = $newYear;
            }
        }

        // Calculate original prefix to detect changes
        $originalPrefix = $folder->getFullHierarchyCode();

        // Apply updates
        $folder->update($validated);

        // If prefix has changed, sync all files recursively
        if ($originalPrefix !== $folder->getFullHierarchyCode()) {
            $this->syncFolderPathRecursively($folder);
        }

        return back();
    }


    /**
     * Download multiple folders and/or files as a ZIP archive.
     *
     * This method:
     * - Validates input
     * - Collects folders and files
     * - Creates a temporary ZIP
     * - Streams it to the client
     */
    public function downloadMixedZip(Request $request)
    {
        try {
            $request->validate([
                'folders' => 'array',
                'folders.*' => 'integer|exists:folders,id',
                'files' => 'array',
                'files.*' => 'integer|exists:files,id',
            ]);

            $folderIds = $request->input('folders', []);
            $fileIds = $request->input('files', []);

            // Security: reading is enough for a download, but only within the user's own entities.
            EntityAccess::authorizeSelection($request->user(), $folderIds, $fileIds);

            $folders = Folder::whereIn('id', $folderIds)->get();
            $files = File::whereIn('id', $fileIds)->get();

            if ($folders->isEmpty() && $files->isEmpty()) {
                return back()->withErrors(['error' => 'No items to download']);
            }

            // Create temporary directory if it does not exist
            $tempDir = storage_path('app/temp');
            if (!file_exists($tempDir)) {
                mkdir($tempDir, 0777, true);
            }

            // Generate ZIP name
            $zipName = 'descarga_' . now()->format('Ymd_His') . '.zip';
            $zipPath = $tempDir . DIRECTORY_SEPARATOR . $zipName;

            $zip = new ZipArchive;

            // Open ZIP file
            if ($zip->open($zipPath, ZipArchive::CREATE | ZipArchive::OVERWRITE) !== true) {
                throw new Exception('Failed to create ZIP file');
            }

            // Add folders recursively
            foreach ($folders as $folder) {
                $this->addFolderToZip($zip, $folder, $folder->name);
            }

            // Add individual files
            foreach ($files as $file) {
                $filePath = Storage::disk('public')->path($file->path);

                if (file_exists($filePath)) {
                    $zip->addFile($filePath, $file->name);
                }
            }

            $zip->close();

            // Download and delete ZIP after sending
            return response()->download($zipPath)->deleteFileAfterSend(true);

        } catch (\Illuminate\Validation\ValidationException $e) {
            return back()->withErrors($e->errors());
        } catch (Exception $e) {
            return back()->withErrors(['error' => 'ZIP generation error: ' . $e->getMessage()]);
        }
    }





    /**
     * Seeds the default folder structure inside a specific year folder.
     */
    private function seedYearStructure($sheetId, $yearFolderId)
    {
        // Default structure for a new year folder
        $folders = [
            // [tempKey, name, parentTempKey|null, folder_code, department]
            [1, Folder::VENTANILLA_NAME, null, null, 'sección'],
        ];

        $map = [];

        foreach ($folders as [$tempKey, $name, $parentTempKey, $folderCode, $department]) {
            $parentId = $parentTempKey ? ($map[$parentTempKey] ?? $yearFolderId) : $yearFolderId;

            $folder = Folder::create([
                'name' => $name,
                'parent_id' => $parentId,
                'folder_code' => $folderCode,
                'department' => $department,
                'sheet_number_id' => $sheetId,
                'active' => true,
            ]);

            $map[$tempKey] = $folder->id;
        }
    }

    private function addFolderToZip(ZipArchive $zip, $folder, $zipPath)
    {
        // Create empty directory inside ZIP
        $zip->addEmptyDir($zipPath);

        // Add files inside the folder
        foreach ($folder->files as $file) {
            $filePath = Storage::disk('public')->path($file->path);

            if (file_exists($filePath)) {
                $zip->addFile(
                    $filePath,
                    $zipPath . '/' . $file->name
                );
            } else {
                \Log::warning('File not found during ZIP creation: ' . $filePath);
            }
        }

        // Recursively add child folders
        foreach ($folder->children as $child) {
            $this->addFolderToZip(
                $zip,
                $child,
                $zipPath . '/' . $child->name
            );
        }
    }
    /**
     * Retorna todas las carpetas activas de una entidad (Sheet) específica.
     * GET /api/folders-by-sheet?sheet_id=X
     */
    public function getFoldersBySheet(Request $request)
    {
        $sheetId = $request->query('sheet_id');
        if (!$sheetId)
            return response()->json([], 200);

        EntityAccess::authorizeRead($request->user(), (int) $sheetId);

        $folders = Folder::where('sheet_number_id', $sheetId)
            ->where('active', true)
            ->orderBy('name', 'asc')
            ->get();

        return response()->json($folders);
    }

    /**
     * Update file metadata (specifically the name).
     */
    public function updateFile(Request $request, $fileId)
    {
        $file = File::with('folder')->findOrFail($fileId);
        EntityAccess::authorizeFile($request->user(), $file, write: true);

        // The new name ends up in a storage path: forbid separators and reserved characters.
        $validated = $request->validate([
            "name" => ['required', 'string', 'max:150', 'regex:/^[^\\/\\\\:*?"<>|\\x00-\\x1F]+$/u'],
        ]);

        $pureName = $validated['name'];

        // Extract parts from current name: {prefix}-ENV-{year}-{fileCode}-{hash}-{originalName}
        $currentName = $file->name;
        if (!str_contains($currentName, '-ENV-')) {
            return back()->withErrors(['name' => 'Este archivo no usa la nomenclatura estandar y no se puede editar de esta manera.']);
        }

        $parts = explode('-ENV-', $currentName);
        $prefix = $parts[0];
        $suffix = $parts[1];
        $suffixParts = explode('-', $suffix, 4);

        if (count($suffixParts) < 3) {
            return back()->withErrors(['name' => 'Nomenclatura corrupta.']);
        }

        // $oldYear = $suffixParts[0];
        $fileCode = $suffixParts[1];
        $hash = $suffixParts[2];
        // $oldPureName = count($suffixParts) >= 4 ? $suffixParts[3] : "";

        // Ensure extension
        $extension = $file->extension;
        if (!str_ends_with($pureName, '.' . $extension)) {
            $pureName .= '.' . $extension;
        }

        // Reconstruct name: PREFIX-ENV-YEAR-FILECODE-HASH-PURENAME
        $year = $file->year ?? $file->created_at->format('Y');
        $newName = "{$prefix}-ENV-{$year}-{$fileCode}-{$hash}";

        if ($pureName !== "") {
            $newName .= "-{$pureName}";
        }

        if ($file->name !== $newName) {
            $oldPath = $file->path;
            $newPath = "folders/{$file->folder_id}/{$newName}";

            if (Storage::disk('public')->exists($oldPath)) {
                // Ensure no collision
                if (Storage::disk('public')->exists($newPath)) {
                    return back()->withErrors(['name' => 'Ya existe un archivo con ese nombre en esta carpeta.']);
                }
                Storage::disk('public')->move($oldPath, $newPath);
            }

            $file->update([
                'name' => $newName,
                'path' => $newPath
            ]);
        }

        return back();
    }

    /**
     * Recursively syncs file names and paths when a parent folder's code or name changes.
     */
    private function syncFolderPathRecursively($folder)
    {
        foreach ($folder->files as $file) {
            $currentName = $file->name;
            $pureName = "";
            $tag = "";

            if (str_contains($currentName, '-ENV-')) {
                $tag = '-ENV-';
            } elseif (str_contains($currentName, '-SUB-')) {
                $tag = '-SUB-';
            }

            if ($tag !== "") {
                $parts = explode($tag, $currentName, 2);
                if (count($parts) < 2) continue;
                
                $suffix = $parts[1];
                $suffixParts = explode('-', $suffix, 4);
                
                if (count($suffixParts) >= 4) {
                    $pureName = $suffixParts[3];
                }

                $folderPrefix = $folder->getFullHierarchyCode();
                $fileYear = $file->created_at->format('Y');
                $shortHash = substr($file->hash ?? '0000000000', 0, 10);
                
                $newName = "{$folderPrefix}{$tag}{$fileYear}-{$file->file_code}-{$shortHash}";
                if ($pureName !== "") {
                    $newName .= "-{$pureName}";
                }

                if ($currentName !== $newName) {
                    $oldPath = $file->path;
                    $newPath = "folders/{$file->folder_id}/{$newName}";
                    
                    if (Storage::disk('public')->exists($oldPath)) {
                        // Ensure target doesn't exist to avoid collisions
                        if ($oldPath !== $newPath && !Storage::disk('public')->exists($newPath)) {
                             Storage::disk('public')->move($oldPath, $newPath);
                        }
                    }
                    
                    $file->update([
                        'name' => $newName,
                        'path' => $newPath
                    ]);
                }
            }
        }

        foreach ($folder->children as $child) {
            $this->syncFolderPathRecursively($child);
        }
    }
}
