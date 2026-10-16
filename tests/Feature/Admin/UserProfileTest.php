<?php

use App\Models\User;
use App\Models\Sheet_number;
use App\Models\Dependency;
use Spatie\Permission\Models\Role;
use function Pest\Laravel\actingAs;

beforeEach(function () {
    $roles = ['Admin', 'Supervisor', 'Auxiliar', 'Dependencia'];
    foreach ($roles as $role) {
        Role::firstOrCreate(['name' => $role]);
    }

    $this->admin = User::firstOrCreate(
        ['email' => 'admin_profile@test.com'],
        ['name' => 'Admin Profile', 'password' => bcrypt('password123'), 'document_type' => 'CC', 'document_number' => '100000']
    );
    $this->admin->assignRole('Admin');
});

test('admin can access allowed web routes', function () {
    
    actingAs($this->admin)->get('/users/supervisor')->assertStatus(200);
    actingAs($this->admin)->get('/users/auxiliar')->assertStatus(200);
    actingAs($this->admin)->get('/sheets')->assertStatus(200);
    actingAs($this->admin)->get('/dependencies')->assertStatus(200);
});

test('admin can update his own profile details', function () {
    $response = actingAs($this->admin)->patch('/profile', [
        'name' => 'New Admin Name',
        'email' => 'admin_new@test.com',
    ]);
    
    $response->assertSessionHasNoErrors();
    $response->assertRedirect('/profile'); 

    $this->assertDatabaseHas('users', [
        'id' => $this->admin->id,
        'name' => 'New Admin Name',
        'email' => 'admin_new@test.com',
    ]);
});

test('admin can delete their own account with correct password', function () {
    $response = actingAs($this->admin)->delete('/profile', [
        'password' => 'password123'
    ]);

    $response->assertSessionHasNoErrors();
    $response->assertRedirect('/');

    $this->assertDatabaseMissing('users', [
        'id' => $this->admin->id
    ]);
});
