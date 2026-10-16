<?php

use App\Models\User;
use App\Models\PQR;
use App\Models\Dependency;
use App\Models\Sheet_number;
use Spatie\Permission\Models\Role;
use function Pest\Laravel\actingAs;

beforeEach(function () {
    Role::firstOrCreate(['name' => 'Auxiliar']);

    $this->sheet = Sheet_number::create([
        'number' => '123456',
        'active' => 1,
        'state' => 'active'
    ]);

    $this->dependencyAssigned = Dependency::create([
        'name' => 'Auxiliar Dependency',
        'sheet_number_id' => $this->sheet->id
    ]);

    $this->dependencyOther = Dependency::create([
        'name' => 'Another Dependency',
        'sheet_number_id' => $this->sheet->id
    ]);

    $this->auxiliar = User::firstOrCreate(
        ['email' => 'auxiliar@test.com'],
        ['name' => 'Auxiliar Test', 'password' => bcrypt('password123'), 'document_type' => 'CC', 'document_number' => '333']
    );
    $this->auxiliar->assignRole('Auxiliar');
    $this->auxiliar->dependency_id = $this->dependencyAssigned->id;
    $this->auxiliar->save();

    $this->pqrAssigned = PQR::create([
        'sender_name' => 'Sender 1',
        'description' => 'Test PQR assigned to my dependency',
        'affair' => 'Test Affair',
        'request_type' => 'Peticion',
        'state' => false,
        'archived' => false,
        'user_id' => $this->auxiliar->id,
        'dependency_id' => $this->dependencyAssigned->id,
        'sheet_number_id' => $this->sheet->id,
        'response_status' => 'pending',
        'document_type' => 'CC',
        'document' => '555'
    ]);

    $this->pqrOther = PQR::create([
        'sender_name' => 'Sender 2',
        'description' => 'Test PQR isolated',
        'affair' => 'Test Affair',
        'request_type' => 'Peticion',
        'state' => false,
        'archived' => false,
        'user_id' => $this->auxiliar->id,
        'dependency_id' => $this->dependencyOther->id,
        'sheet_number_id' => $this->sheet->id,
        'response_status' => 'pending',
        'document_type' => 'CC',
        'document' => '444'
    ]);
});

test('Assistant can see their PQRS ONLY if part of dependency or responsible', function () {
    $response = actingAs($this->auxiliar)->getJson('/api/pqrs');
    $response->assertStatus(200);
    
    $data = collect($response->json('data'));
    expect($data->pluck('id'))->toContain($this->pqrAssigned->id);
    expect($data->pluck('id'))->not->toContain($this->pqrOther->id);
});
