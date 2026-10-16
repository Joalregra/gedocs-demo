<?php

use App\Models\User;
use App\Models\PQR;
use App\Models\Dependency;
use App\Models\Sheet_number;
use Spatie\Permission\Models\Role;
use function Pest\Laravel\actingAs;

beforeEach(function () {
    Role::firstOrCreate(['name' => 'Supervisor']);

    $this->sheetAssigned = Sheet_number::create([
        'number' => '123456',
        'active' => 1,
        'state' => 'active'
    ]);

    $this->sheetNotAssigned = Sheet_number::create([
        'number' => '654321',
        'active' => 1,
        'state' => 'active'
    ]);

    $this->dependency = Dependency::create([
        'name' => 'Supervisor Area',
        'sheet_number_id' => $this->sheetAssigned->id
    ]);

    $this->supervisor = User::firstOrCreate(
        ['email' => 'supervisor@test.com'],
        ['name' => 'Supervisor Test', 'password' => bcrypt('password123'), 'document_type' => 'CC', 'document_number' => '222']
    );
    $this->supervisor->assignRole('Supervisor');
    $this->supervisor->sheetNumbers()->attach($this->sheetAssigned->id);

    $this->pqrAssigned = PQR::create([
        'sender_name' => 'Sender 1',
        'description' => 'Test PQR assigned',
        'affair' => 'Test Affair',
        'request_type' => 'Peticion',
        'state' => false,
        'archived' => false,
        'user_id' => $this->supervisor->id,
        'dependency_id' => $this->dependency->id,
        'sheet_number_id' => $this->sheetAssigned->id,
        'response_status' => 'pending',
        'document_type' => 'CC',
        'document' => '555'
    ]);

    $this->pqrNotAssigned = PQR::create([
        'sender_name' => 'Sender 2',
        'description' => 'Test PQR not assigned',
        'affair' => 'Test Affair',
        'request_type' => 'Peticion',
        'state' => false,
        'archived' => false,
        'user_id' => $this->supervisor->id,
        'dependency_id' => $this->dependency->id,
        'sheet_number_id' => $this->sheetNotAssigned->id,
        'response_status' => 'pending',
        'document_type' => 'CC',
        'document' => '333'
    ]);
});

test('Supervisor can list ONLY assigned PQRS using sheetShow endpoint', function () {
    $response = actingAs($this->supervisor)->getJson('/api/pqrs/supervisor');
    $response->assertStatus(200);
    
    $data = collect($response->json());
    expect($data->pluck('id'))->toContain($this->pqrAssigned->id);
    expect($data->pluck('id'))->not->toContain($this->pqrNotAssigned->id);
});

test('Supervisor can list ONLY assigned PQRS from the main index filtering', function () {
    $response = actingAs($this->supervisor)->getJson('/api/pqrs');
    $response->assertStatus(200);
    
    $data = collect($response->json('data'));
    expect($data->pluck('id'))->toContain($this->pqrAssigned->id);
    expect($data->pluck('id'))->not->toContain($this->pqrNotAssigned->id);
});