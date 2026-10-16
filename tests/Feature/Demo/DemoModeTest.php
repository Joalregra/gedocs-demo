<?php

use App\Enums\UserRole;
use App\Models\File;
use App\Models\PQR;
use App\Models\User;
use Database\Seeders\DatabaseSeeder;
use Database\Seeders\RoleSeeder;
use Illuminate\Support\Facades\Storage;

use function Pest\Laravel\actingAs;
use function Pest\Laravel\artisan;
use function Pest\Laravel\assertAuthenticatedAs;
use function Pest\Laravel\post;

beforeEach(function () {
    $this->seed(RoleSeeder::class);
    Storage::fake('public');
});

function demoAccount(UserRole $role): User
{
    $email = collect(config('demo.accounts'))->search(fn ($account) => $account['role'] === $role->value);

    return makeUser($role, null, ['email' => $email, 'name' => ucfirst($role->value).' Demo']);
}

// ---- One-click login ----------------------------------------------------------------------------

it('does not exist outside demo mode', function () {
    config(['app.demo' => false]);
    demoAccount(UserRole::Admin);

    post('/demo-login/Admin')->assertNotFound();
    $this->assertGuest();
});

it('signs in the fictional account of the chosen role in demo mode', function () {
    config(['app.demo' => true]);
    $admin = demoAccount(UserRole::Admin);

    post('/demo-login/Admin')->assertRedirect(route('inbox'));
    assertAuthenticatedAs($admin);
});

it('rejects roles that are not demo roles', function () {
    config(['app.demo' => true]);

    post('/demo-login/Hacker')->assertNotFound();
});

it('shares the demo flag with the frontend only when enabled', function () {
    config(['app.demo' => true]);
    expect($this->get('/login')->viewData('page')['props']['demo'])->toBeTrue();

    config(['app.demo' => false]);
    expect($this->get('/login')->viewData('page')['props']['demo'])->toBeFalse();
});

// ---- Protected accounts -------------------------------------------------------------------------

it('stops a demo account from changing its own profile', function () {
    config(['app.demo' => true]);
    $supervisor = demoAccount(UserRole::Supervisor);

    actingAs($supervisor)
        ->patch('/profile', ['name' => 'Otro Nombre', 'email' => 'otro@demo.test'])
        ->assertSessionHas('error');

    expect($supervisor->fresh()->email)->toBe('supervisor@demo.test');
});

it('stops anyone from deleting a demo account', function () {
    config(['app.demo' => true]);
    $admin = demoAccount(UserRole::Admin);
    $supervisor = demoAccount(UserRole::Supervisor);

    actingAs($admin)->deleteJson("/api/users/{$supervisor->id}")->assertForbidden();

    $this->assertDatabaseHas('users', ['id' => $supervisor->id]);
});

it('does not protect accounts when demo mode is off', function () {
    config(['app.demo' => false]);
    $outsider = makeUser(UserRole::Supervisor, null, ['email' => 'supervisor@demo.test']);

    actingAs($outsider)->patch('/profile', ['name' => 'Nombre Nuevo', 'email' => 'supervisor@demo.test'])
        ->assertSessionDoesntHaveErrors();

    expect($outsider->fresh()->name)->toBe('Nombre Nuevo');
});

// ---- Reset command ------------------------------------------------------------------------------

it('refuses to reset anything unless demo mode is on', function () {
    config(['app.demo' => false]);
    makeUser(UserRole::Admin);

    artisan('demo:reset')->expectsOutputToContain('Refusing to reset')->assertFailed();

    expect(User::count())->toBe(1); // nothing was wiped
});

// ---- Seeded story -------------------------------------------------------------------------------

it('does not seed fictional accounts outside demo mode', function () {
    config(['app.demo' => false]);

    $this->seed(DatabaseSeeder::class);

    expect(User::count())->toBe(0);
});

it('seeds the whole fictional story in demo mode', function () {
    config(['app.demo' => true]);

    $this->seed(DatabaseSeeder::class);

    // One account per role, all with the published demo password.
    foreach (config('demo.accounts') as $email => $account) {
        $user = User::where('email', $email)->firstOrFail();
        expect($user->hasRole($account['role']))->toBeTrue()
            ->and(Hash::check(config('demo.password'), $user->password))->toBeTrue();
    }

    // Every PQR state is represented (received, responded, closed, expired and archived).
    expect(PQR::where('response_status', 'pending')->where('archived', false)->exists())->toBeTrue()
        ->and(PQR::where('response_status', 'responded')->exists())->toBeTrue()
        ->and(PQR::where('response_status', 'closed')->exists())->toBeTrue()
        ->and(PQR::where('response_status', 'pending')->where('archived', true)->exists())->toBeTrue();

    // Documents exist both in the database and on disk, and nothing mentions a real person or institution.
    $file = File::firstOrFail();
    Storage::disk('public')->assertExists($file->path);
    expect(User::pluck('email')->every(fn ($email) => str_ends_with($email, '@demo.test')))->toBeTrue();
});
