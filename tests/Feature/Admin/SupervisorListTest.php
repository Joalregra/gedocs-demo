<?php

namespace Tests\Feature\Admin;

use App\Models\User;
use App\Models\Sheet_number;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Database\Seeders\RoleSeeder;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->seed(RoleSeeder::class);
});

function createAdminUserWithRole(string $role, array $attributes = [])
{
    $defaultAttributes = [
        'type_document' => 'CC',
        'document_number' => (string)rand(10000000, 99999999),
        'status' => 'pending'
    ];

    $user = User::factory()->create(array_merge($defaultAttributes, $attributes));
    $user->assignRole($role);
    return $user;
}

it('allows admin to list supervisors', function () {
    $admin = createAdminUserWithRole('Admin');
    $supervisor1 = createAdminUserWithRole('Supervisor', ['name' => 'El Profe']);
    $supervisor2 = createAdminUserWithRole('Supervisor', ['name' => 'La Profe']);

    $response = $this->actingAs($admin)
        ->getJson('/api/users');

    $response->assertStatus(200);
    $response->assertJsonFragment(['name' => 'El Profe']);
    $response->assertJsonFragment(['name' => 'La Profe']);
});
it('allows admin to edit supervisor and assign sheet numbers', function () {
    $admin = createAdminUserWithRole('Admin');
    $supervisor = createAdminUserWithRole('Supervisor');

    $sheet1 = Sheet_number::create(['number' => '1001001']);
    $sheet2 = Sheet_number::create(['number' => '2002002']);

    $payload = [
        'name' => 'Supervisor Editado',
        'type_document' => 'CC',
        'document_number' => '12345678',
        'email' => 'nuevo_inst@demo.test',
        'status' => 'active',

        'sheet_numbers' => [$sheet1->id, $sheet2->id]
    ];

    $response = $this->actingAs($admin)
        ->putJson("/api/users/{$supervisor->id}", $payload);

    $response->assertStatus(200);

    $this->assertDatabaseHas('users', [
        'id' => $supervisor->id,
        'name' => 'Supervisor Editado',
        'status' => 'active',
    ]);

    $this->assertDatabaseHas('sheet_number_user', [
        'user_id' => $supervisor->id,
        'sheet_number_id' => $sheet1->id
    ]);

    $this->assertDatabaseHas('sheet_number_user', [
        'user_id' => $supervisor->id,
        'sheet_number_id' => $sheet2->id
    ]);
});

it('allows admin to delete an supervisor', function () {
    $admin = createAdminUserWithRole('Admin');
    $supervisor = createAdminUserWithRole('Supervisor');

    $response = $this->actingAs($admin)
        ->deleteJson("/api/users/{$supervisor->id}");

    $response->assertStatus(200);
    $this->assertDatabaseMissing('users', ['id' => $supervisor->id]);
});
