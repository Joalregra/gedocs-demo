<?php

/*
|--------------------------------------------------------------------------
| Test Case
|--------------------------------------------------------------------------
|
| The closure you provide to your test functions is always bound to a specific PHPUnit test
| case class. By default, that class is "PHPUnit\Framework\TestCase". Of course, you may
| need to change it using the "pest()" function to bind a different classes or traits.
|
*/

pest()->extend(Tests\TestCase::class)
    ->use(Illuminate\Foundation\Testing\RefreshDatabase::class)
    ->in('Feature');

/*
|--------------------------------------------------------------------------
| Expectations
|--------------------------------------------------------------------------
|
| When you're writing tests, you often need to check that values meet certain conditions. The
| "expect()" function gives you access to a set of "expectations" methods that you can use
| to assert different things. Of course, you may extend the Expectation API at any time.
|
*/

expect()->extend('toBeOne', function () {
    return $this->toBe(1);
});

/*
|--------------------------------------------------------------------------
| Functions
|--------------------------------------------------------------------------
|
| While Pest is very powerful out-of-the-box, you may have some testing code specific to your
| project that you don't want to repeat in every file. Here you can also expose helpers as
| global functions to help you to reduce the number of lines of code in your test files.
|
*/

/**
 * Creates an active user with the given role, optionally attached to an entity (sheet).
 * Roles must exist first (seed RoleSeeder in beforeEach).
 */
function makeUser(App\Enums\UserRole $role, ?App\Models\Sheet_number $sheet = null, array $attributes = []): App\Models\User
{
    static $sequence = 0;
    $sequence++;

    $user = App\Models\User::create($attributes + [
        'type_document' => 'CC',
        'document_number' => 7000000 + $sequence,
        'name' => "{$role->value} Test {$sequence}",
        'email' => strtolower($role->value) . "{$sequence}@test.com",
        'password' => bcrypt('password123'),
        'status' => 'active',
    ]);
    $user->assignRole($role);

    if ($sheet) {
        $user->sheetNumbers()->attach($sheet->id);
    }

    return $user;
}
