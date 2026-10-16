<?php

use Illuminate\Support\Facades\Notification;
use App\Models\User;
use Spatie\Permission\Models\Role;
use App\Models\Sheet_number;

test('Registration screen can be rendered', function () {
    $response = $this->get('/register');
    $response->assertStatus(200);
});

test('assistant can register, is left pending and redirected to login', function () {
    Role::firstOrCreate(['name' => 'Auxiliar']);
    Role::firstOrCreate(['name' => 'Supervisor']);
    $sheet = Sheet_number::create([
        'number' => '123456',
        'active' => true,
        'state' => 'active'
    ]);

    $response = $this->post('/register', [
        'type_document' => 'CC',
        'document_number' => '123456789',
        'name' => 'auxiliar',
        'email' => 'auxiliar@test.com',
        'role' => 'Auxiliar',
        'technical_sheet_id' => $sheet->id,
        'password' => 'password',
        'password_confirmation' => 'password',
    ]);

    $this->assertDatabaseHas('users', [
        'email' => 'auxiliar@test.com',
        'status' => 'pending',
    ]);

    $user = User::where('email', 'auxiliar@test.com')->first();
    $this->assertTrue($user->hasRole('Auxiliar'));

    $this->assertGuest();
    $response->assertRedirect('/login');
    $response->assertSessionHas('status', 'Auxiliar. Tu cuenta sera revisada por el supervisor de la entidad que seleccionaste');
});

test('supervisor receives notification when an assistant registers', function () {
    Notification::fake();

    Role::firstOrCreate(['name' => 'Auxiliar']);
    $roleSupervisor = Role::firstOrCreate(['name' => 'Supervisor']);
    $sheet = Sheet_number::create([
        'number' => '123456',
        'active' => true,
        'state' => 'active'
    ]);

    $supervisor = User::factory()->create([
        'type_document' => 'CC',
        'document_number' => '111111111',
    ]);
    $supervisor->assignRole($roleSupervisor);
    $supervisor->sheetNumbers()->attach($sheet);

    $this->post('/register', [
        'type_document' => 'CC',
        'document_number' => '123456789',
        'name' => 'auxiliar',
        'email' => 'auxiliar@test.com',
        'role' => 'Auxiliar',
        'technical_sheet_id' => $sheet->id,
        'password' => 'password',
        'password_confirmation' => 'password',
    ]);
    
    Notification::assertSentTo(
        [$supervisor],
        \App\Notifications\NewUserRegistered::class
    );
});

?>