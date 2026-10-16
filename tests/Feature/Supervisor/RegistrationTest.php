<?php

use Illuminate\Support\Facades\Notification;
use App\Models\User;
use Spatie\Permission\Models\Role;

test('Registration screen can be rendered', function () {
    $response = $this->get('/register');
    $response->assertStatus(200);
});

test('supervisor can register, is left pending and redirected to login', function () {
    Role::firstOrCreate(['name' => 'Supervisor']);
    Role::firstOrCreate(['name' => 'Admin']);

    $response = $this->post('/register', [
        'type_document' => 'CC',
        'document_number' => '123456789',
        'name' => 'Supervisor',
        'email' => 'supervisor@test.com',
        'role' => 'Supervisor',
        'password' => 'password',
        'password_confirmation' => 'password',
    ]);

    $this->assertDatabaseHas('users', [
        'email' => 'supervisor@test.com',
        'status' => 'pending',
    ]);
    
    $user = User::where('email', 'supervisor@test.com')->first();
    $this->assertTrue($user->hasRole('Supervisor'));
    
    $this->assertGuest();
    $response->assertRedirect('/login');
    $response->assertSessionHas('status', 'Supervisor. Tu cuenta sera revisada por el administrador');
});

test('admin receives notification when an supervisor registers', function () {
    Notification::fake();

    Role::firstOrCreate(['name' => 'Supervisor']);
    $roleAdmin = Role::firstOrCreate(['name' => 'Admin']);

    $admin = User::factory()->create([
        'type_document' => 'CC',
        'document_number' => '111111111',
    ]);
    $admin->assignRole($roleAdmin);

    $this->post('/register', [
        'type_document' => 'CC',
        'document_number' => '123456789',
        'name' => 'Supervisor',
        'email' => 'supervisor@test.com',
        'role' => 'Supervisor',
        'password' => 'password',
        'password_confirmation' => 'password',
    ]);
    
    Notification::assertSentTo(
        [$admin],
        \App\Notifications\NewUserRegistered::class
    );
});

?>
