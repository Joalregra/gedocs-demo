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

    $this->dependency1 = Dependency::create([
        'name' => 'Dep 1',
        'sheet_number_id' => $this->sheet1->id
    ]);

    $this->admin = User::firstOrCreate(
        ['email' => 'admin_archive@test.com'],
        ['name' => 'Admin Archive', 'password' => bcrypt('password123'), 'document_type' => 'CC', 'document_number' => '999999']
    );
    $this->admin->assignRole('Admin');

    $this->archivedPqr1 = PQR::create([
        'sender_name' => 'John Doe',
        'description' => 'Test PQR 1',
        'affair' => 'Affair 1',
        'request_type' => 'Peticion',
        'state' => true,
        'archived' => true,
        'user_id' => $this->admin->id,
        'dependency_id' => $this->dependency1->id,
        'sheet_number_id' => $this->sheet1->id,
        'response_status' => 'responded',
        'document_type' => 'CC',
        'document' => '111'
    ]);

    $this->archivedPqr2 = PQR::create([
        'sender_name' => 'Jane Doe',
        'description' => 'Test PQR 2',
        'affair' => 'Affair 2',
        'request_type' => 'Peticion',
        'state' => true,
        'archived' => true,
        'user_id' => $this->admin->id,
        'dependency_id' => $this->dependency1->id,
        'sheet_number_id' => $this->sheet2->id,
        'response_status' => 'responded',
        'document_type' => 'CC',
        'document' => '222'
    ]);

    $this->pendingPqr = PQR::create([
        'sender_name' => 'Pending Name',
        'description' => 'Test pending PQR',
        'affair' => 'Pending Affair',
        'request_type' => 'Queja',
        'state' => false,
        'archived' => false,
        'user_id' => $this->admin->id,
        'dependency_id' => $this->dependency1->id,
        'sheet_number_id' => $this->sheet1->id,
        'response_status' => 'pending',
        'document_type' => 'CC',
        'document' => '333'
    ]);
});

test('Admin can list all archived PQRS regardless of sheet or dependency', function () {
    $response = actingAs($this->admin)->getJson('/api/pqrs?archived=true');
    
    $response->assertStatus(200);
    
    $data = collect($response->json('data'));

    expect($data->pluck('id'))->toContain($this->archivedPqr1->id);
    expect($data->pluck('id'))->toContain($this->archivedPqr2->id);

    expect($data->pluck('id'))->not->toContain($this->pendingPqr->id);
});

test('Admin can unarchive a PQR', function () {
    $response = actingAs($this->admin)->patchJson('/api/pqrs/' . $this->archivedPqr1->id, [
        'archived' => false
    ]);

    $response->assertStatus(200);
    $this->assertDatabaseHas('p_q_r_s', [
        'id' => $this->archivedPqr1->id,
        'archived' => false
    ]);
});
