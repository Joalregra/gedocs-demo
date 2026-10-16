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

    $this->dependency1 = Dependency::create([
        'name' => 'Dep 1',
        'sheet_number_id' => $this->sheet1->id
    ]);

    $this->dependency2 = Dependency::create([
        'name' => 'Dep 2',
        'sheet_number_id' => $this->sheet1->id
    ]);

    $this->assistant = User::firstOrCreate(
        ['email' => 'assistant_archive@test.com'],
        [
            'name' => 'Assistant Archive', 
            'password' => bcrypt('password123'), 
            'document_type' => 'CC', 
            'document_number' => '777777',
            'dependency_id' => $this->dependency1->id 
        ]
    );
    $this->assistant->assignRole('Auxiliar');

    $this->archivedPqrAssigned = PQR::create([
        'sender_name' => 'Assigned Sender',
        'description' => 'Belongs to assigned dependency',
        'affair' => 'Assigned Dep',
        'request_type' => 'Peticion',
        'state' => true,
        'archived' => true,
        'user_id' => $this->assistant->id,
        'dependency_id' => $this->dependency1->id,
        'sheet_number_id' => $this->sheet1->id,
        'response_status' => 'responded',
        'document_type' => 'CC',
        'document' => '111'
    ]);

    $this->archivedPqrUnassigned = PQR::create([
        'sender_name' => 'Unassigned Sender',
        'description' => 'Does not belong to assigned dependency',
        'affair' => 'Unassigned Dep',
        'request_type' => 'Peticion',
        'state' => true,
        'archived' => true,
        'user_id' => $this->assistant->id,
        'dependency_id' => $this->dependency2->id,
        'sheet_number_id' => $this->sheet1->id,
        'response_status' => 'responded',
        'document_type' => 'CC',
        'document' => '222'
    ]);
});

test('Assistant can only list archived PQRS of their assigned dependency', function () {
    $response = actingAs($this->assistant)->getJson('/api/pqrs?archived=true');
    
    $response->assertStatus(200);
    
    $data = collect($response->json('data'));

    expect($data->pluck('id'))->toContain($this->archivedPqrAssigned->id);

    expect($data->pluck('id'))->not->toContain($this->archivedPqrUnassigned->id);
});
