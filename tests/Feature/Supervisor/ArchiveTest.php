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

    $this->sheet1 = Sheet_number::create([
        'number' => '111111',
        'start_date' => now()->subMonths(6),
        'end_date' => now()->addMonths(6),
        'state' => 'Activa',
        'ventanilla_unica_id' => 1
    ]);

    $this->sheet2 = Sheet_number::create([
        'number' => '222222',
        'start_date' => now()->subMonths(6),
        'end_date' => now()->addMonths(6),
        'state' => 'Activa',
        'ventanilla_unica_id' => 1
    ]);

    $this->dependency = Dependency::create([
        'name' => 'Dep Test',
        'sheet_number_id' => $this->sheet1->id
    ]);

    $this->supervisor = User::firstOrCreate(
        ['email' => 'supervisor_archive@test.com'],
        ['name' => 'Supervisor Archive', 'password' => bcrypt('password123'), 'document_type' => 'CC', 'document_number' => '888888']
    );
    $this->supervisor->assignRole('Supervisor');

    $this->supervisor->sheetNumbers()->attach($this->sheet1->id);

    $this->archivedPqrAssigned = PQR::create([
        'sender_name' => 'Assigned Sender',
        'description' => 'Belongs to assigned sheet',
        'affair' => 'Assigned',
        'request_type' => 'Peticion',
        'state' => true,
        'archived' => true,
        'user_id' => $this->supervisor->id,
        'dependency_id' => $this->dependency->id,
        'sheet_number_id' => $this->sheet1->id,
        'response_status' => 'responded',
        'document_type' => 'CC',
        'document' => '111'
    ]);

    $this->archivedPqrUnassigned = PQR::create([
        'sender_name' => 'Unassigned Sender',
        'description' => 'Does not belong to assigned sheet',
        'affair' => 'Unassigned',
        'request_type' => 'Peticion',
        'state' => true,
        'archived' => true,
        'user_id' => $this->supervisor->id,
        'dependency_id' => $this->dependency->id,
        'sheet_number_id' => $this->sheet2->id,
        'response_status' => 'responded',
        'document_type' => 'CC',
        'document' => '222'
    ]);
});

test('Supervisor can only list archived PQRS of their assigned sheets', function () {
    $response = actingAs($this->supervisor)->getJson('/api/pqrs?archived=true');
    
    $response->assertStatus(200);
    
    $data = collect($response->json('data'));

    expect($data->pluck('id'))->toContain($this->archivedPqrAssigned->id);

    expect($data->pluck('id'))->not->toContain($this->archivedPqrUnassigned->id);
});
