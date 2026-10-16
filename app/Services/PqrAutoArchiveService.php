<?php

namespace App\Services;

use App\Models\PQR;
use Carbon\Carbon;

class PqrAutoArchiveService
{
    public function archiveExpiredPending(): int
    {
        return PQR::query()
            ->where('archived', false)
            ->where('response_status', 'pending')
            ->whereNotNull('response_time')
            ->whereDate('response_time', '<', Carbon::today())
            ->update(['archived' => true]);
    }
}
