<?php

use App\Models\User;
use App\Models\Dependency;
use Database\Seeders\RoleSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->seed(RoleSeeder::class);
});

function createUserWithRole(string $role, array $extra = [])
{
    $user = User::factory()->create(array_merge([
        'type_document' => 'CC',
        'document_number' => (string)rand(10000000, 99999999),
        'status' => 'active',
    ], $extra));
    $user->assignRole($role);
    return $user;
}

it('denies access to assistant users for user management routes', function () {
    $assistant = createUserWithRole('Auxiliar');

    $this->actingAs($assistant)
        ->getJson('/api/users')
        ->assertForbidden(); 
});

it('lists users according to role permissions', function (string $role) {

    $sheet = \App\Models\Sheet_number::create(['number' => (string)rand(10000, 99999)]);
    $dependency = Dependency::create(['name' => 'IT Department', 'sheet_number_id' => $sheet->id]);

    $authUser = createUserWithRole($role);

    $assistant = createUserWithRole('Auxiliar');

    $authUser->sheetNumbers()->attach($sheet->id);
    $assistant->sheetNumbers()->attach($sheet->id);

    $otherAdmin = createUserWithRole('Admin');

    $response = $this->actingAs($authUser)->getJson('/api/users');

    $response->assertStatus(200);

    if ($role === 'Admin') {
        
        $response->assertJsonFragment(['email' => $assistant->email]);
        $response->assertJsonFragment(['email' => $otherAdmin->email]);
    }
    else {
        
        $response->assertJsonFragment(['email' => $assistant->email]);
        $response->assertJsonMissing(['email' => $otherAdmin->email]);
    }
})->with(['Admin', 'Supervisor']);

it('shows detailed info of a user', function (string $role) {
    $authUser = createUserWithRole($role);
    $assistant = createUserWithRole('Auxiliar');

    $response = $this->actingAs($authUser)
        ->getJson("/api/users/{$assistant->id}");

    $response->assertStatus(200)
        ->assertJsonFragment(['email' => $assistant->email]);
})->with(['Admin', 'Supervisor']);

it('filters users correctly', function (string $role) {
    $authUser = createUserWithRole($role);

    $targetUser = createUserWithRole('Auxiliar', ['name' => 'John Doe Filter']);

    createUserWithRole('Auxiliar', ['name' => 'Jane Smith']); 

    $response = $this->actingAs($authUser)
        ->getJson('/api/users/search/filter?name=Doe');

    $response->assertStatus(200)
        ->assertJsonFragment(['name' => 'John Doe Filter'])
        ->assertJsonMissing(['name' => 'Jane Smith']);
})->with(['Admin', 'Supervisor']);

it('edits an assistant profile successfully', function (string $role) {
    $authUser = createUserWithRole($role);

    $assistant = createUserWithRole('Auxiliar', ['name' => 'Old Name']);

    $response = $this->actingAs($authUser)
        ->putJson("/api/users/{$assistant->id}", [
        'name' => 'New Name Edited',
    ]);

    $response->assertStatus(200);
    $this->assertDatabaseHas('users', ['id' => $assistant->id, 'name' => 'New Name Edited']);
})->with(['Admin', 'Supervisor']);

it('prevents supervisor from editing an admin user', function () {
    $supervisor = createUserWithRole('Supervisor');
    $admin = createUserWithRole('Admin', ['name' => 'Super Admin']);

    $response = $this->actingAs($supervisor)
        ->putJson("/api/users/{$admin->id}", [
        'name' => 'Hacked Admin',
    ]);

    $response->assertStatus(302);
    $this->assertDatabaseHas('users', ['id' => $admin->id, 'name' => 'Super Admin']);
});

it('allows deleting an assistant', function (string $role) {
    $authUser = createUserWithRole($role);

    $assistant = createUserWithRole('Auxiliar');

    $response = $this->actingAs($authUser)
        ->deleteJson("/api/users/{$assistant->id}");

    $response->assertStatus(200);
    $this->assertDatabaseMissing('users', ['id' => $assistant->id]);
})->with(['Admin', 'Supervisor']);
?>