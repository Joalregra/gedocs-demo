<?php

use App\Models\Dependency;
use App\Models\PQR;
use App\Models\Sheet_number;
use App\Models\User;
use Spatie\Permission\Models\Role;
use function Pest\Laravel\actingAs;
use function Pest\Laravel\artisan;

beforeEach(function () {
    foreach (['Admin', 'Supervisor', 'Auxiliar', 'Dependencia'] as $role) {
        Role::firstOrCreate(['name' => $role]);
    }

    $this->sheet = Sheet_number::create([
        'number' => '333333',
        'state' => 'Activa',
        'ventanilla_unica_id' => 1,
    ]);

    $this->dependency = Dependency::create([
        'name' => 'Dep Auto Archive',
        'sheet_number_id' => $this->sheet->id,
    ]);

    $this->admin = User::firstOrCreate(
        ['email' => 'admin_auto_archive@test.com'],
        [
            'name' => 'Admin Auto Archive',
            'password' => bcrypt('password123'),
            'document_type' => 'CC',
            'document_number' => '12345678',
        ]
    );
    $this->admin->assignRole('Admin');
});

test('overdue pending pqr is auto archived when listing pqrs', function () {
    $overdue = PQR::create([
        'sender_name' => 'Overdue Sender',
        'description' => 'PQR overdue test',
        'affair' => 'Overdue Affair',
        'request_type' => 'Peticion',
        'response_time' => now()->subDay()->toDateString(),
        'state' => false,
        'archived' => false,
        'user_id' => $this->admin->id,
        'responsible_id' => $this->admin->id,
        'dependency_id' => $this->dependency->id,
        'sheet_number_id' => $this->sheet->id,
        'response_status' => 'pending',
        'document_type' => 'CC',
        'document' => '999001',
    ]);

    actingAs($this->admin)->getJson('/api/pqrs')->assertStatus(200);

    $this->assertDatabaseHas('p_q_r_s', [
        'id' => $overdue->id,
        'archived' => true,
    ]);

    $archiveResponse = actingAs($this->admin)->getJson('/api/pqrs?archived=true');
    $archiveResponse->assertStatus(200);

    $archivedIds = collect($archiveResponse->json('data'))->pluck('id');
    expect($archivedIds)->toContain($overdue->id);
});

test('pqr due today is not archived before end of day', function () {
    $dueToday = PQR::create([
        'sender_name' => 'Due Today Sender',
        'description' => 'PQR due today test',
        'affair' => 'Due Today Affair',
        'request_type' => 'Queja',
        'response_time' => now()->toDateString(),
        'state' => false,
        'archived' => false,
        'user_id' => $this->admin->id,
        'responsible_id' => $this->admin->id,
        'dependency_id' => $this->dependency->id,
        'sheet_number_id' => $this->sheet->id,
        'response_status' => 'pending',
        'document_type' => 'CC',
        'document' => '999002',
    ]);

    $inboxResponse = actingAs($this->admin)->getJson('/api/pqrs');
    $inboxResponse->assertStatus(200);

    $this->assertDatabaseHas('p_q_r_s', [
        'id' => $dueToday->id,
        'archived' => false,
    ]);

    $inboxIds = collect($inboxResponse->json('data'))->pluck('id');
    expect($inboxIds)->toContain($dueToday->id);
});

test('scheduler command archives overdue pending pqrs', function () {
    $overdue = PQR::create([
        'sender_name' => 'Cron Sender',
        'description' => 'PQR for scheduler command',
        'affair' => 'Cron Affair',
        'request_type' => 'Reclamo',
        'response_time' => now()->subDays(2)->toDateString(),
        'state' => false,
        'archived' => false,
        'user_id' => $this->admin->id,
        'responsible_id' => $this->admin->id,
        'dependency_id' => $this->dependency->id,
        'sheet_number_id' => $this->sheet->id,
        'response_status' => 'pending',
        'document_type' => 'CC',
        'document' => '999003',
    ]);

    artisan('pqrs:auto-archive-expired')->assertExitCode(0);

    $this->assertDatabaseHas('p_q_r_s', [
        'id' => $overdue->id,
        'archived' => true,
    ]);
});
