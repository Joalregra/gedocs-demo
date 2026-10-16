<?php

use App\Models\User;
use App\Models\PQR;
use App\Models\Dependency;
use App\Models\Sheet_number;
use App\Models\Folder;
use Spatie\Permission\Models\Role;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use function Pest\Laravel\actingAs;

beforeEach(function () {
    $roles = ['Admin', 'Dependencia'];
    foreach ($roles as $role) {
        Role::firstOrCreate(['name' => $role]);
    }

    $this->sheet = Sheet_number::create([
        'number' => '123456',
        'active' => 1,
        'state' => 'active'
    ]);

    $this->dependency = Dependency::create([
        'name' => 'Ventanilla Unica Test Administrador',
        'sheet_number_id' => $this->sheet->id
    ]);

    $this->sheet->ventanilla_unica_id = $this->dependency->id;
    $this->sheet->save();

    $this->admin = User::firstOrCreate(
    ['email' => 'admin@test.com'],
    ['name' => 'Admin Test', 'password' => bcrypt('password123'), 'document_type' => 'CC', 'document_number' => '111']
    );
    $this->admin->assignRole('Admin');

    $this->pqr = PQR::create([
        'sender_name' => 'Admin Test Sender',
        'description' => 'Test PQR admin view',
        'affair' => 'Test Affair',
        'request_type' => 'Peticion',
        'state' => false,
        'archived' => false,
        'user_id' => $this->admin->id,
        'dependency_id' => $this->dependency->id,
        'sheet_number_id' => $this->sheet->id,
        'response_status' => 'pending',
        'document_type' => 'CC',
        'document' => '555'
    ]);
});

test('Admin can list all PQRS', function () {
    $response = actingAs($this->admin)->getJson('/api/pqrs');
    $response->assertStatus(200);
    $response->assertJsonStructure([
        'data' => [
            '*' => ['id', 'sender_name', 'description']
        ],
        'message'
    ]);

    $data = collect($response->json('data'));
    expect($data->pluck('id'))->toContain($this->pqr->id);
});

test('Admin can view detailed thread of a PQR', function () {
    $response = actingAs($this->admin)->getJson('/api/pqrs/' . $this->pqr->id);
    $response->assertStatus(200);
    expect($response->json('data.id'))->toBe($this->pqr->id);
});