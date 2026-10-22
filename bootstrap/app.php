<?php

use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Symfony\Component\HttpFoundation\Response;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__ . '/../routes/web.php',
        api: __DIR__ . '/../routes/api.php',
        commands: __DIR__ . '/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware): void {

        // Known risk: every address is trusted, so a visitor can forge X-Forwarded-For (see docs/security-review.md).
        $middleware->trustProxies(at: '*');

        $middleware->api(prepend: [
            \Laravel\Sanctum\Http\Middleware\EnsureFrontendRequestsAreStateful::class,
        ]);

        $middleware->web(append: [
            \App\Http\Middleware\HandleInertiaRequests::class,
            \Illuminate\Http\Middleware\AddLinkHeadersForPreloadedAssets::class,
        ]);

        $middleware->alias([
            'role' => \Spatie\Permission\Middleware\RoleMiddleware::class,
            'permission' => \Spatie\Permission\Middleware\PermissionMiddleware::class,
            'role_or_permission' => \Spatie\Permission\Middleware\RoleOrPermissionMiddleware::class,
            'roleCheck' => \App\Http\Middleware\RedirectIfNotPermission::class,
            'demo.protect' => \App\Http\Middleware\ProtectDemoAccounts::class,
        ]);
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        // Friendly error pages instead of the framework's default ones. Local and testing
        // keep Laravel's own debug output so development is not affected.
        $exceptions->respond(function (Response $response, Throwable $exception, Request $request) {
            $handled = [403, 404, 419, 500, 503];

            if (! $request->expectsJson()
                && ! app()->environment(['local', 'testing'])
                && in_array($response->getStatusCode(), $handled, true)) {
                return Inertia::render('Error', ['status' => $response->getStatusCode()])
                    ->toResponse($request)
                    ->setStatusCode($response->getStatusCode());
            }

            return $response;
        });
    })->create();
