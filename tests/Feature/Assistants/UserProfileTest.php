<?php

use App\Models\User;
use Spatie\Permission\Models\Role;
use function Pest\Laravel\actingAs;

beforeEach(function () {
    $roles = ['Admin', 'Supervisor', 'Auxiliar', 'Dependencia'];
    foreach ($roles as $role) {
        Role::firstOrCreate(['name' => $role]);
    }

    $this->assistant = User::firstOrCreate(
        ['email' => 'assistant_profile@test.com'],
        ['name' => 'Assistant Profile', 'password' => bcrypt('password123'), 'document_type' => 'CC', 'document_number' => '300000']
    );
    $this->assistant->assignRole('Auxiliar');
});

test('assistant can access allowed web routes (profile, dependencies)', function () {
    actingAs($this->assistant)->get('/profile')->assertStatus(200);
    actingAs($this->assistant)->get('/dependencies')->assertStatus(200);
});

test('assistant can update his own profile details', function () {
    $response = actingAs($this->assistant)->patch('/profile', [
        'name' => 'New Assistant Name',
        'email' => 'assistant_new@test.com',
    ]);

    $response->assertSessionHasNoErrors();
    $response->assertRedirect('/profile');

    $this->assertDatabaseHas('users', [
        'id' => $this->assistant->id,
        'name' => 'New Assistant Name',
    ]);
});
