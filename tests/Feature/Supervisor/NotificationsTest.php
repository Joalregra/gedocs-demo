<?php

namespace Tests\Feature\Supervisor;

use App\Models\User;
use App\Models\Sheet_number;
use App\Notifications\NewUserRegistered;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Database\Seeders\RoleSeeder;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->seed(RoleSeeder::class);
});

function createSupervisorUserForNotification(string $role, array $attributes = [])
{
    $defaultAttributes = [
        'type_document' => 'CC',
        'document_number' => (string)rand(10000000, 99999999),
        'status' => 'pending'
    ];

    $user = User::factory()->create(array_merge($defaultAttributes, $attributes));
    $user->assignRole($role);
    return $user;
}

it('allows supervisor to list notifications', function () {
    $supervisor = createSupervisorUserForNotification('Supervisor');
    $auxiliar = createSupervisorUserForNotification('Auxiliar', ['name' => 'Nuevo Auxiliar']);

    $supervisor->notify(new NewUserRegistered($auxiliar));

    $response = $this->actingAs($supervisor)
        ->getJson('/api/notifications');

    $response->assertStatus(200);
    $response->assertJsonStructure([
        'success',
        'notifications' => [
            '*' => [
                'id',
                'type',
                'data' => [
                    'role',
                    'user' => [
                        'id',
                        'name',
                        'email'
                    ]
                ],
                'read_at',
                'created_at'
            ]
        ]
    ]);
    
    $notifications = $response->json('notifications');
    expect(count($notifications))->toBe(1);
    expect($notifications[0]['data']['user']['name'])->toBe('Nuevo Auxiliar');
});

it('allows supervisor to filter unread and read notifications', function () {
    $supervisor = createSupervisorUserForNotification('Supervisor');
    $auxiliar1 = createSupervisorUserForNotification('Auxiliar', ['name' => 'Apr 1']);
    $auxiliar2 = createSupervisorUserForNotification('Auxiliar', ['name' => 'Apr 2']);
    
    $supervisor->notify(new NewUserRegistered($auxiliar1));
    $supervisor->notify(new NewUserRegistered($auxiliar2));

    $responseUnread = $this->actingAs($supervisor->fresh())->getJson('/api/notifications/filter/unread');
    $responseUnread->assertStatus(200);
    expect(count($responseUnread->json('notifications')))->toBe(2);

    $notificationId = $responseUnread->json('notifications.0.id');
    $responseMark = $this->actingAs($supervisor->fresh())->postJson("/api/notifications/{$notificationId}/mark-as-read");
    $responseMark->assertStatus(200);

    $responseRead = $this->actingAs($supervisor->fresh())->getJson('/api/notifications/filter/read');
    $responseRead->assertStatus(200);
    expect(count($responseRead->json('notifications')))->toBe(1);

    $responseUnreadRefresh = $this->actingAs($supervisor->fresh())->getJson('/api/notifications/filter/unread');
    $responseUnreadRefresh->assertStatus(200);
    expect(count($responseUnreadRefresh->json('notifications')))->toBe(1);
});

it('allows supervisor to update assistant status via notification', function () {
    $supervisor = createSupervisorUserForNotification('Supervisor');
    $auxiliar = createSupervisorUserForNotification('Auxiliar', ['name' => 'Pending Auxiliar']);
    
    $supervisor->notify(new NewUserRegistered($auxiliar));
    
    $notification = $supervisor->notifications()->first();

    $response = $this->actingAs($supervisor)
        ->putJson("/api/notifications/update/{$notification->id}/active");

    $response->assertStatus(200);
    $response->assertJsonFragment(['success' => true]);

    $this->assertDatabaseHas('users', [
        'id' => $auxiliar->id,
        'status' => 'active'
    ]);

    $updatedNotification = $supervisor->notifications()->first();
    expect($updatedNotification->data['user']['status'])->toBe('active');
});

it('rejects an invalid state change for an assistant via notification', function () {
    $supervisor = createSupervisorUserForNotification('Supervisor');
    $auxiliar = createSupervisorUserForNotification('Auxiliar', ['name' => 'Pending Auxiliar']);
    
    $supervisor->notify(new NewUserRegistered($auxiliar));
    $notification = $supervisor->notifications()->first();

    $response = $this->actingAs($supervisor)
        ->putJson("/api/notifications/update/{$notification->id}/invalid-status");

    $response->assertStatus(400);
    $response->assertJsonFragment(['message' => 'Estado no permitido']);

    $this->assertDatabaseHas('users', [
        'id' => $auxiliar->id,
        'status' => 'pending' 
    ]);
});
