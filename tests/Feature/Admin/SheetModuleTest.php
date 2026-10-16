<?php

namespace Tests\Feature\Admin;

use App\Models\User;
use App\Models\Sheet_number;
use App\Models\Dependency;
use App\Models\Folder;
use Database\Seeders\RoleSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Carbon\Carbon;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->seed(RoleSeeder::class);
});

function createUserAdminWithRole(string $role, array $attributes = [])
{
    $defaultAttributes = [
        'type_document' => 'CC',
        'document_number' => (string) rand(10000000, 99999999), 
        'status' => 'active'
    ];
    
    $user = User::factory()->create(array_merge($defaultAttributes, $attributes));
    $user->assignRole($role);
    return $user;
}

it('prevents non-admin users from creating, editing or deleting sheets', function () {
    $supervisor = createUserAdminWithRole('Supervisor');
    $auxiliar = createUserAdminWithRole('Auxiliar');

    $responsePostInst = $this->actingAs($supervisor)->postJson('/api/sheets', ['number' => '12345']);
    $responsePostApr = $this->actingAs($auxiliar)->postJson('/api/sheets', ['number' => '12345']);

    $responsePostInst->assertForbidden(); 
    $responsePostApr->assertForbidden(); 

    $sheet = Sheet_number::create(['number' => '99999']);
    $responseDeleteInst = $this->actingAs($supervisor)->deleteJson("/api/sheets/{$sheet->id}");

    $responseDeleteInst->assertForbidden();
});

it('allows admin to create a sheet and automatically generates dependencies and folders', function () {
    $admin = createUserAdminWithRole('Admin');
    
    $payload = [
        'number' => '250100'
    ];

    $response = $this->actingAs($admin)
        ->postJson('/api/sheets', $payload);

    $response->assertStatus(201);

    $createdSheetId = $response->json('id');

    $this->assertDatabaseHas('sheet_numbers', [
        'id' => $createdSheetId,
        'number' => '250100',
    ]);

    $this->assertDatabaseHas('dependencies', [
        'name' => 'Ventanilla Unica',
        'sheet_number_id' => $createdSheetId
    ]);

    $ventanilla = Dependency::where('sheet_number_id', $createdSheetId)->first();
    $this->assertDatabaseHas('sheet_numbers', [
        'id' => $createdSheetId,
        'ventanilla_unica_id' => $ventanilla->id
    ]);

    $currentYear = date('Y');
    
    $this->assertDatabaseHas('folders', [
        'name' => $currentYear,
        'year' => $currentYear,
        'department' => 'Año',
        'sheet_number_id' => $createdSheetId,
    ]);

    $yearFolder = Folder::where('name', $currentYear)->where('sheet_number_id', $createdSheetId)->first();

    $this->assertDatabaseHas('folders', [
        'name' => 'Ventanilla Única',
        'parent_id' => $yearFolder->id,
        'department' => 'sección',
        'sheet_number_id' => $createdSheetId,
    ]);
});

it('prevents creating a sheet with a duplicate number', function () {
    $admin = createUserAdminWithRole('Admin');

    Sheet_number::create(['number' => '111222']);

    $response = $this->actingAs($admin)
        ->postJson('/api/sheets', ['number' => '111222']);

    $response->assertStatus(422)
             ->assertJsonValidationErrors(['number']);
});

it('allows admin to edit an existing sheet number and state', function () {
    $admin = createUserAdminWithRole('Admin');
    $sheet = Sheet_number::create(['number' => '555555']);

    $response = $this->actingAs($admin)
        ->putJson("/api/sheets/{$sheet->id}", [
            'number' => '666666',
            'active' => true,
            'state' => 'terminada'
        ]);

    $response->assertStatus(200);

    $this->assertDatabaseHas('sheet_numbers', [
        'id' => $sheet->id,
        'number' => '666666',
        'active' => true,
        'state' => 'terminada'
    ]);
});

it('allows admin to successfully delete a sheet', function () {
    $admin = createUserAdminWithRole('Admin');
    $sheet = Sheet_number::create(['number' => '777777']);

    $response = $this->actingAs($admin)
        ->deleteJson("/api/sheets/{$sheet->id}");

    $response->assertStatus(200);
    $this->assertSoftDeleted('sheet_numbers', [
        'id' => $sheet->id
    ]);
});
