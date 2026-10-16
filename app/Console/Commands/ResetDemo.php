<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\Storage;

final class ResetDemo extends Command
{
    protected $signature = 'demo:reset {--if-empty : Only load the demo when the database has no users yet (used on first boot)}';

    protected $description = 'Restore the demo database and uploaded files to their initial fictional state';

    /** Directories of the public disk that the app writes to (uploads, generated PDFs, photos). */
    private const UPLOAD_DIRECTORIES = [
        'folders',
        'pqr_attachments',
        'final_responses',
        'communication_attachments',
        'pdf_logos',
        'profile',
    ];

    public function handle(): int
    {
        // Safety guard: this command wipes the whole database, so it only runs where APP_DEMO=true.
        if (! config('app.demo')) {
            $this->error('Refusing to reset: APP_DEMO is not enabled.');

            return self::FAILURE;
        }

        if ($this->option('if-empty') && Schema::hasTable('users') && DB::table('users')->exists()) {
            $this->info('Demo data already present; nothing to do.');

            return self::SUCCESS;
        }

        foreach (self::UPLOAD_DIRECTORIES as $directory) {
            Storage::disk('public')->deleteDirectory($directory);
        }

        $this->call('migrate:fresh', ['--seed' => true, '--force' => true]);
        $this->info('Demo restored to its initial state.');

        return self::SUCCESS;
    }
}
