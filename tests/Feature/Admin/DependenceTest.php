<?php

namespace Tests\Feature\Admin;

use App\Models\User;
use App\Models\Sheet_number;
use App\Models\Dependency;
use App\Models\Folder;
use Database\Seeders\RoleSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->seed(RoleSeeder::class);
});

function createAdminUserForDependencyTest()
{
    $user = User::factory()->create([
        'type_document' => 'CC',
        'document_number' => (string) rand(10000000, 99999999),
        'status' => 'active'
    ]);
    $user->assignRole('Admin');
    return $user;
}

it('allows admin to list dependencies with their sheet numbers', function () {
    $admin = createAdminUserForDependencyTest();
    
    $sheet = Sheet_number::create(['number' => '111222']);
    $dependency = Dependency::create([
        'name' => 'Biblioteca',
        'sheet_number_id' => $sheet->id
    ]);

    $response = $this->actingAs($admin)->getJson('/api/dependency');

    $response->assertStatus(200);
    $response->assertJsonStructure([
        'message',
        'dependencies' => [
            '*' => [
                'id',
                'name',
                'sheet_number_id',
                'sheet_number' => [
                    'id',
                    'number'
                ]
            ]
        ]
    ]);
});

it('allows admin to create a new dependency and automatically generates its folders', function () {
    $admin = createAdminUserForDependencyTest();
    $sheet = Sheet_number::create(['number' => '333444']);

    $payload = [
        'name' => 'Recursos Humanos',
        'sheet_number_id' => $sheet->id,
        'folder_code' => 'RH-01'
    ];

    $response = $this->actingAs($admin)->postJson('/api/dependency', $payload);

    $response->assertStatus(200);
    $this->assertDatabaseHas('dependencies', [
        'name' => 'Recursos Humanos',
        'sheet_number_id' => $sheet->id
    ]);

    $currentYear = date('Y');
    $this->assertDatabaseHas('folders', [
        'name' => $currentYear,
        'year' => $currentYear,
        'department' => 'Año',
        'sheet_number_id' => $sheet->id,
    ]);

    $yearFolder = Folder::where('name', $currentYear)->where('sheet_number_id', $sheet->id)->first();

    $this->assertDatabaseHas('folders', [
        'name' => 'Recursos Humanos',
        'parent_id' => $yearFolder->id,
        'department' => 'sección',
        'folder_code' => 'RH-01',
        'sheet_number_id' => $sheet->id,
    ]);
});

it('prevents creating a dependency with a duplicate name in the same sheet', function () {
    $admin = createAdminUserForDependencyTest();
    $sheet = Sheet_number::create(['number' => '555666']);

    Dependency::create([
        'name' => 'Finanzas',
        'sheet_number_id' => $sheet->id
    ]);

    $payload = [
        'name' => 'Finanzas',
        'sheet_number_id' => $sheet->id
    ];

    $response = $this->actingAs($admin)->postJson('/api/dependency', $payload);

    $response->assertStatus(422);
    $response->assertJsonValidationErrors(['name']);
});

it('allows admin to update a dependency name', function () {
    $admin = createAdminUserForDependencyTest();
    $sheet = Sheet_number::create(['number' => '777888']);
    
    $dependency = Dependency::create([
        'name' => 'Logistica Vieja',
        'sheet_number_id' => $sheet->id
    ]);

    $response = $this->actingAs($admin)->putJson("/api/dependency/{$dependency->id}", [
        'name' => 'Logistica Nueva'
    ]);

    $response->assertStatus(200);
    $this->assertDatabaseHas('dependencies', [
        'id' => $dependency->id,
        'name' => 'Logistica Nueva'
    ]);
});

it('prevents renaming Ventanilla Unica', function () {
    $admin = createAdminUserForDependencyTest();
    $sheet = Sheet_number::create(['number' => '999000']);
    
    $dependency = Dependency::create([
        'name' => 'Ventanilla Unica',
        'sheet_number_id' => $sheet->id
    ]);

    $response = $this->actingAs($admin)->putJson("/api/dependency/{$dependency->id}", [
        'name' => 'Otra Ventanilla'
    ]);

    $response->assertStatus(403);
    $this->assertDatabaseHas('dependencies', [
        'id' => $dependency->id,
        'name' => 'Ventanilla Unica'
    ]);
});

it('prevents deleting Ventanilla Unica', function () {
    $admin = createAdminUserForDependencyTest();
    $sheet = Sheet_number::create(['number' => '111333']);
    
    $dependency = Dependency::create([
        'name' => 'Ventanilla Unica',
        'sheet_number_id' => $sheet->id
    ]);

    $response = $this->actingAs($admin)->deleteJson("/api/dependency/{$dependency->id}");

    $response->assertStatus(403);
    $this->assertDatabaseHas('dependencies', [
        'id' => $dependency->id
    ]);
});

it('allows admin to delete a dependency', function () {
    $admin = createAdminUserForDependencyTest();
    $sheet = Sheet_number::create(['number' => '222444']);
    
    $dependency = Dependency::create([
        'name' => 'Area Temporal',
        'sheet_number_id' => $sheet->id
    ]);

    $response = $this->actingAs($admin)->deleteJson("/api/dependency/{$dependency->id}");

    $response->assertStatus(200);
    $this->assertDatabaseMissing('dependencies', [
        'id' => $dependency->id
    ]);
});
