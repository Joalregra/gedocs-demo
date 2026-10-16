<?php

use App\Models\User;
use Spatie\Permission\Models\Role;

test('login screen can be rendered', function () {
    $response = $this->get('/login');

    $response->assertStatus(200);
});

test('admin can login successfully', function () {
    Role::firstOrCreate(['name' => 'Admin']);
    $user = User::factory()->create([
        'type_document' => 'CC',
        'document_number' => '111111111',
    ]);
    $user->assignRole('Admin');

    $response = $this->post('/login', [
        'email' => $user->email,
        'password' => 'password',
    ]);

    $this->assertAuthenticated();
    $response->assertRedirect('/');
});

test('users can not authenticate with invalid password', function () {
    $user = User::factory()->create([
        'type_document' => 'CC',
        'document_number' => '333333333',
    ]);

    $response = $this->post('/login', [
        'email' => $user->email,
        'password' => 'wrong-password',
    ]);

    $this->assertGuest();
    $response->assertSessionHasErrors(['email']);
});

test('users can not authenticate with non-existent email', function () {
    $response = $this->post('/login', [
        'email' => 'no_existe@test.com',
        'password' => 'password',
    ]);

    $this->assertGuest();
    $response->assertSessionHasErrors(['email']);
});

test('login requires email and password', function () {
    $response = $this->post('/login', [
        'email' => '',
        'password' => '',
    ]);

    $this->assertGuest();
    $response->assertSessionHasErrors(['email', 'password']);
});

?>