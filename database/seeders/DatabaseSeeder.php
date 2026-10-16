<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    /**
     * Seed the application's database.
     *
     * Roles are always created. The fictional demo data (public demo accounts with a published
     * password) is only created when APP_DEMO=true, so a normal install never gets those accounts.
     */
    public function run(): void
    {
        $this->call(RoleSeeder::class);

        if (config('app.demo')) {
            $this->call(DemoSeeder::class);
        } else {
            $this->command?->warn('APP_DEMO is false: demo data was not seeded. Set APP_DEMO=true to load it.');
        }
    }
}
