<?php

namespace Database\Seeders;

use App\Enums\UserRole;
use Illuminate\Database\Seeder;
use Spatie\Permission\Models\Role;

class RoleSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        Role::firstOrCreate(['name' => UserRole::Admin->value]);
        Role::firstOrCreate(['name' => UserRole::Supervisor->value]);
        Role::firstOrCreate(['name' => UserRole::Auxiliar->value]);
        Role::firstOrCreate(['name' => UserRole::Dependencia->value]);
    }
}
