<?php

namespace App\Exports\Concerns;

use App\Models\File;
use App\Support\InstitutionIdentity;
use Carbon\Carbon;

/**
 * Helpers shared by the Received and Sended report sheets to show a filing (radicado) number
 * and to find the folder code that goes with it.
 */
trait ResolvesFilings
{
    // Cache to avoid repeated DB lookups per $noRadicado during one export run
    protected array $radicadoFolderCache = [];

    /**
     * Display format of a filing number (DEMO-2026-000123), using the year of the PQR.
     * The stored value is numeric; only the exported text carries the institution prefix.
     */
    protected function displayFiling(?string $number, $row): string
    {
        $year = ! empty($row->created_at) ? (int) Carbon::parse($row->created_at)->format('Y') : null;

        return InstitutionIdentity::formatFiling($number, $year);
    }

    /**
     * Resolve folder_code via $noRadicado using files.file_code -> files.folder_id -> folders.folder_code
     */
    protected function resolveFolderCodeByNoRadicado(?string $noRadicado): ?string
    {
        try {
            if (! $noRadicado || $noRadicado === 'N/A') {
                return null;
            }
            if (isset($this->radicadoFolderCache[$noRadicado])) {
                return $this->radicadoFolderCache[$noRadicado];
            }
            $file = File::with('folder')
                ->where('file_code', $noRadicado)
                ->first();
            $code = $file?->folder?->folder_code;
            // Cache even nulls to minimize repeated misses
            $this->radicadoFolderCache[$noRadicado] = $code;

            return $code;
        } catch (\Throwable $e) {
            return null;
        }
    }
}
