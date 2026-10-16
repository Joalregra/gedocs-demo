<?php

namespace App\Http\Controllers\Auth;

use App\Enums\UserRole;
use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

/**
 * One-click sign in for the public demo. Only exists while APP_DEMO=true and only for the
 * fictional demo accounts listed in config/demo.php; never for arbitrary users.
 */
class DemoLoginController extends Controller
{
    public function __invoke(Request $request, string $role): RedirectResponse
    {
        abort_unless(config('app.demo'), 404);

        $role = UserRole::tryFrom($role) ?? abort(404);

        $email = collect(config('demo.accounts'))->search(fn (array $account) => $account['role'] === $role->value);
        $user = $email ? User::where('email', $email)->first() : null;

        abort_unless($user, 404);

        Auth::login($user);
        $request->session()->regenerate();

        return redirect()->intended(route('inbox'));
    }
}
