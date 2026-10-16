<?php

use App\Enums\UserRole;

// Public demo accounts. They are created by DemoSeeder, shown as one-click logins and protected
// from edits/deletes by the ProtectDemoAccounts middleware while APP_DEMO=true.
// The password is public on purpose: the demo has no real data and resets every night.

return [
    'password' => env('DEMO_PASSWORD', 'demo1234'),

    'accounts' => [
        'admin@demo.test' => ['name' => 'Administrador Demo', 'role' => UserRole::Admin->value, 'document_number' => 9000001],
        'supervisor@demo.test' => ['name' => 'Supervisor Demo', 'role' => UserRole::Supervisor->value, 'document_number' => 9000002],
        'auxiliar@demo.test' => ['name' => 'Auxiliar Demo', 'role' => UserRole::Auxiliar->value, 'document_number' => 9000003],
        'dependencia@demo.test' => ['name' => 'Dependencia Demo', 'role' => UserRole::Dependencia->value, 'document_number' => 9000004],
    ],
];
