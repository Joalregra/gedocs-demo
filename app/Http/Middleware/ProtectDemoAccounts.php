<?php

namespace App\Http\Middleware;

use App\Models\User;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Keeps the public demo accounts usable for the next visitor while APP_DEMO=true.
 *
 * Usage: `demo.protect:self` on routes that change the signed-in user (profile, password),
 * `demo.protect:target` on routes that change another user identified by the {id} parameter.
 * It does nothing when demo mode is off.
 */
class ProtectDemoAccounts
{
    public function handle(Request $request, Closure $next, string $mode = 'self'): Response
    {
        if (! config('app.demo')) {
            return $next($request);
        }

        $email = $mode === 'target'
            ? User::whereKey($request->route('id'))->value('email')
            : $request->user()?->email;

        if ($email && array_key_exists($email, config('demo.accounts'))) {
            $message = 'Las cuentas de demostración no se pueden modificar ni eliminar.';

            if ($request->expectsJson()) {
                return response()->json(['message' => $message], 403);
            }

            return back()->with('error', $message);
        }

        return $next($request);
    }
}
