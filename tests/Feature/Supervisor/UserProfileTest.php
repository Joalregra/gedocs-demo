<?php

use App\Models\User;
use Spatie\Permission\Models\Role;
use function Pest\Laravel\actingAs;

beforeEach(function () {
    $roles = ['Admin', 'Supervisor', 'Auxiliar', 'Dependencia'];
    foreach ($roles as $role) {
        Role::firstOrCreate(['name' => $role]);
    }

    $this->supervisor = User::firstOrCreate(
    ['email' => 'supervisor_profile@test.com'],
    ['name' => 'Supervisor Profile', 'password' => bcrypt('password123'), 'document_type' => 'CC', 'document_number' => '200000']
    );
    $this->supervisor->assignRole('Supervisor');
});

test('supervisor can update his own profile details', function () {
    $response = actingAs($this->supervisor)->patch('/profile', [
        'name' => 'New Supervisor Name',
        'email' => 'supervisor_new@test.com',
    ]);

    $response->assertSessionHasNoErrors();
    $response->assertRedirect('/profile');

    $this->assertDatabaseHas('users', [
        'id' => $this->supervisor->id,
        'name' => 'New Supervisor Name',
    ]);
});
