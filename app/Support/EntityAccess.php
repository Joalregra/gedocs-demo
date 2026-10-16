<?php

namespace App\Support;

use App\Enums\UserRole;
use App\Models\File;
use App\Models\Folder;
use App\Models\PQR;
use App\Models\User;

/**
 * Entity-scoped authorization for explorer content (folders and files).
 *
 * Every folder belongs to an entity (sheet_number_id). Without this check any authenticated user
 * could read or change another entity's documents just by guessing numeric IDs (broken access
 * control / IDOR). Rules:
 *  - Admin: every entity.
 *  - Supervisor / Auxiliar: only the entities they are assigned to.
 *  - Dependencia: only the entity their dependency belongs to.
 *  - Writing (create, upload, rename, move, delete) is limited to Admin and Supervisor.
 */
final class EntityAccess
{
    /** @return list<int>|null null means unrestricted (Admin) */
    public static function sheetIds(User $user): ?array
    {
        if ($user->hasRole(UserRole::Admin)) {
            return null;
        }

        $ids = $user->sheetNumbers()->pluck('sheet_numbers.id')->map(fn ($id) => (int) $id)->all();

        if ($user->dependency?->sheet_number_id) {
            $ids[] = (int) $user->dependency->sheet_number_id;
        }

        return array_values(array_unique($ids));
    }

    public static function canRead(User $user, ?int $sheetId): bool
    {
        $ids = self::sheetIds($user);

        return $ids === null || ($sheetId !== null && in_array($sheetId, $ids, true));
    }

    public static function canWrite(User $user, ?int $sheetId): bool
    {
        $isEditor = $user->hasRole(UserRole::Admin) || $user->hasRole(UserRole::Supervisor);

        return $isEditor && self::canRead($user, $sheetId);
    }

    /**
     * Same visibility rules as the inbox: Admin sees everything, Supervisor the entities they belong
     * to, Dependencia/Auxiliar their own dependency or what is assigned to them.
     */
    public static function canAccessPqr(?User $user, PQR $pqr): bool
    {
        if (! $user) {
            return false;
        }

        if ($user->hasRole(UserRole::Admin)) {
            return true;
        }

        if ($user->hasRole(UserRole::Supervisor)) {
            return $user->sheetNumbers->pluck('id')->contains($pqr->sheet_number_id);
        }

        return ($user->dependency_id && $pqr->dependency_id === $user->dependency_id)
            || $pqr->responsible_id === $user->id;
    }

    public static function authorizeRead(User $user, ?int $sheetId): void
    {
        abort_unless(self::canRead($user, $sheetId), 403, 'No tienes permisos sobre esta entidad.');
    }

    public static function authorizeWrite(User $user, ?int $sheetId): void
    {
        abort_unless(self::canWrite($user, $sheetId), 403, 'No tienes permisos para modificar esta entidad.');
    }

    public static function authorizeFolder(User $user, Folder $folder, bool $write = false): void
    {
        $write
            ? self::authorizeWrite($user, $folder->sheet_number_id)
            : self::authorizeRead($user, $folder->sheet_number_id);
    }

    public static function authorizeFile(User $user, File $file, bool $write = false): void
    {
        $sheetId = $file->folder?->sheet_number_id;

        $write
            ? self::authorizeWrite($user, $sheetId)
            : self::authorizeRead($user, $sheetId);
    }

    /**
     * Authorizes a mixed selection of folder and file IDs in one go.
     *
     * @param  array<int, int|string>  $folderIds
     * @param  array<int, int|string>  $fileIds
     */
    public static function authorizeSelection(User $user, array $folderIds, array $fileIds, bool $write = false): void
    {
        if ($folderIds) {
            Folder::whereIn('id', $folderIds)->get()->each(fn (Folder $f) => self::authorizeFolder($user, $f, $write));
        }

        if ($fileIds) {
            File::with('folder')->whereIn('id', $fileIds)->get()->each(fn (File $f) => self::authorizeFile($user, $f, $write));
        }
    }
}
