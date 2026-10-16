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

    $this->sheetAssigned = Sheet_number::create([
        'number' => '123456',
        'start_date' => now()->subMonths(6),
        'end_date' => now()->addMonths(6),
        'state' => 'Activa',
        'ventanilla_unica_id' => 1
    ]);

    $this->sheetUnassigned = Sheet_number::create([
        'number' => '999999',
        'start_date' => now()->subMonths(6),
        'end_date' => now()->addMonths(6),
        'state' => 'Activa',
        'ventanilla_unica_id' => 1
    ]);

    $this->dependency = Dependency::create([
        'name' => 'Ventanilla Unica Supervisor',
        'sheet_number_id' => $this->sheetAssigned->id
    ]);
    
    $this->sheetAssigned->update(['ventanilla_unica_id' => $this->dependency->id]);
    $this->sheetUnassigned->update(['ventanilla_unica_id' => $this->dependency->id]);

    $this->supervisor = User::firstOrCreate(
        ['email' => 'supervisor_sent@test.com'],
        ['name' => 'Supervisor Sent Test', 'password' => bcrypt('password123'), 'document_type' => 'CC', 'document_number' => '222333']
    );
    $this->supervisor->assignRole('Supervisor');

    $this->supervisor->sheetNumbers()->sync([$this->sheetAssigned->id]);

    $this->archivedAssignedPqr = PQR::create([
        'sender_name' => 'Assigned Sender',
        'description' => 'Test PQR Supervisor - ASSIGNED ARCHIVED',
        'affair' => 'Test Affair Responded',
        'request_type' => 'Peticion',
        'state' => true,
        'archived' => true,
        'user_id' => $this->supervisor->id,
        'dependency_id' => $this->dependency->id,
        'sheet_number_id' => $this->sheetAssigned->id,
        'response_status' => 'responded',
        'document_type' => 'CC',
        'document' => '555'
    ]);

    $this->archivedUnassignedPqr = PQR::create([
        'sender_name' => 'Unassigned Sender',
        'description' => 'Test PQR Supervisor - UNASSIGNED ARCHIVED',
        'affair' => 'Test Affair Unassigned',
        'request_type' => 'Peticion',
        'state' => true,
        'archived' => true,
        'user_id' => 1,
        'dependency_id' => $this->dependency->id,
        'sheet_number_id' => $this->sheetUnassigned->id,
        'response_status' => 'responded',
        'document_type' => 'CC',
        'document' => '555'
    ]);
});

test('Supervisor can list only archived PQRS corresponding to their assigned sheets', function () {
    $response = actingAs($this->supervisor)->getJson('/api/pqrs?archived=true');
    
    $response->assertStatus(200);
    $data = collect($response->json('data'));

    expect($data->pluck('id'))->toContain($this->archivedAssignedPqr->id);

    expect($data->pluck('id'))->not->toContain($this->archivedUnassignedPqr->id);
});
