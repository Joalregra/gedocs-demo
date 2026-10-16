<?php

use App\Models\User;
use App\Models\PQR;
use App\Models\Dependency;
use App\Models\Sheet_number;
use Spatie\Permission\Models\Role;
use function Pest\Laravel\actingAs;

beforeEach(function () {
    
    $roles = ['Admin', 'Supervisor', 'Auxiliar', 'Dependencia'];
    foreach ($roles as $role) {
        Role::firstOrCreate(['name' => $role]);
    }

    $this->sheet = Sheet_number::create([
        'number' => '123456',
        'start_date' => now()->subMonths(6),
        'end_date' => now()->addMonths(6),
        'state' => 'Activa',
        'ventanilla_unica_id' => 1 
    ]);

    $this->dependency = Dependency::create([
        'name' => 'Ventanilla Unica Test Administrador',
        'sheet_number_id' => $this->sheet->id
    ]);
    
    $this->sheet->update(['ventanilla_unica_id' => $this->dependency->id]);

    $this->admin = User::firstOrCreate(
        ['email' => 'admin_sent@test.com'],
        ['name' => 'Admin Sent Test', 'password' => bcrypt('password123'), 'document_type' => 'CC', 'document_number' => '111222']
    );
    $this->admin->assignRole('Admin');

    $this->archivedPqr = PQR::create([
        'sender_name' => 'Admin Test Sender',
        'description' => 'Test PQR admin view - ARCHIVED',
        'affair' => 'Test Affair Responded',
        'request_type' => 'Peticion',
        'state' => true,
        'archived' => true, 
        'user_id' => $this->admin->id,
        'dependency_id' => $this->dependency->id,
        'sheet_number_id' => $this->sheet->id,
        'response_status' => 'responded',
        'document_type' => 'CC',
        'document' => '555'
    ]);

    $this->pendingPqr = PQR::create([
        'sender_name' => 'Pending Sender',
        'description' => 'Test PQR admin view - PENDING',
        'affair' => 'Test Affair Pending',
        'request_type' => 'Queja',
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

test('Admin can list only responded (archived) PQRS via sent module endpoint', function () {
    
    $response = actingAs($this->admin)->getJson('/api/pqrs?archived=true');
    
    $response->assertStatus(200);
    $response->assertJsonStructure([
        'data' => [
            '*' => ['id', 'sender_name', 'description']
        ],
        'message'
    ]);
    
    $data = collect($response->json('data'));

    expect($data->pluck('id'))->toContain($this->archivedPqr->id);

    expect($data->pluck('id'))->not->toContain($this->pendingPqr->id);
    
    expect($response->json('message'))->toBe('PQRs archivadas obtenidas exitosamente');
});
