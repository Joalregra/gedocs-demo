<?php

use App\Services\PqrAutoArchiveService;
use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

Artisan::command('pqrs:auto-archive-expired', function (PqrAutoArchiveService $service) {
    $count = $service->archiveExpiredPending();
    $this->info("PQRs archivadas por vencimiento: {$count}");
})->purpose('Archive pending PQRs that are past due date');

Schedule::command('pqrs:auto-archive-expired')
    ->everyTenMinutes()
    ->withoutOverlapping();

// Public demo only: restore the fictional data every night. The command itself refuses to run unless APP_DEMO=true.
if (config('app.demo')) {
    Schedule::command('demo:reset')
        ->dailyAt('03:00')
        ->timezone('America/Bogota')
        ->withoutOverlapping();
}
