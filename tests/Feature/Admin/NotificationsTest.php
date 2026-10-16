<?php

namespace Tests\Feature\Admin;

use App\Models\User;
use App\Notifications\NewUserRegistered;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Database\Seeders\RoleSeeder;
use Illuminate\Support\Facades\Notification;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->seed(RoleSeeder::class);
});

function createAdminUserForNotification(string $role, array $attributes = [])
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

it('allows admin to list notifications', function () {
    $admin = createAdminUserForNotification('Admin');
    $supervisor = createAdminUserForNotification('Supervisor', ['name' => 'Nuevo Supervisor']);

    $admin->notify(new NewUserRegistered($supervisor));

    $response = $this->actingAs($admin)
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
    expect($notifications[0]['data']['user']['name'])->toBe('Nuevo Supervisor');
});

it('allows admin to filter unread and read notifications', function () {
    $admin = createAdminUserForNotification('Admin');
    $supervisor1 = createAdminUserForNotification('Supervisor', ['name' => 'Inst 1']);
    $supervisor2 = createAdminUserForNotification('Supervisor', ['name' => 'Inst 2']);
    
    $admin->notify(new NewUserRegistered($supervisor1));
    $admin->notify(new NewUserRegistered($supervisor2));

    $responseUnread = $this->actingAs($admin->fresh())->getJson('/api/notifications/filter/unread');
    $responseUnread->assertStatus(200);
    expect(count($responseUnread->json('notifications')))->toBe(2);

    $notificationId = $responseUnread->json('notifications.0.id');
    $responseMark = $this->actingAs($admin->fresh())->postJson("/api/notifications/{$notificationId}/mark-as-read");
    $responseMark->assertStatus(200);

    $responseRead = $this->actingAs($admin->fresh())->getJson('/api/notifications/filter/read');
    $responseRead->assertStatus(200);
    expect(count($responseRead->json('notifications')))->toBe(1);

    $responseUnreadRefresh = $this->actingAs($admin->fresh())->getJson('/api/notifications/filter/unread');
    $responseUnreadRefresh->assertStatus(200);
    expect(count($responseUnreadRefresh->json('notifications')))->toBe(1);
});

it('allows admin to update user status via notification', function () {
    $admin = createAdminUserForNotification('Admin');
    $supervisor = createAdminUserForNotification('Supervisor', ['name' => 'Pending Supervisor']);
    
    $admin->notify(new NewUserRegistered($supervisor));
    
    $notification = $admin->notifications()->first();

    $response = $this->actingAs($admin)
        ->putJson("/api/notifications/update/{$notification->id}/active");

    $response->assertStatus(200);
    $response->assertJsonFragment(['success' => true]);

    $this->assertDatabaseHas('users', [
        'id' => $supervisor->id,
        'status' => 'active'
    ]);

    $updatedNotification = $admin->notifications()->first();
    expect($updatedNotification->data['user']['status'])->toBe('active');
});

it('rejects an invalid state change for a user via notification', function () {
    $admin = createAdminUserForNotification('Admin');
    $supervisor = createAdminUserForNotification('Supervisor', ['name' => 'Pending Supervisor']);
    
    $admin->notify(new NewUserRegistered($supervisor));
    $notification = $admin->notifications()->first();

    $response = $this->actingAs($admin)
        ->putJson("/api/notifications/update/{$notification->id}/invalid-status");

    $response->assertStatus(400);
    $response->assertJsonFragment(['message' => 'Estado no permitido']);

    $this->assertDatabaseHas('users', [
        'id' => $supervisor->id,
        'status' => 'pending' 
    ]);
});
