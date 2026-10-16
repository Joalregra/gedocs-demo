<?php

// Every institution-specific value lives here, so the same code can serve any institution.
// Never call env() outside config/: with `php artisan config:cache` it returns null.

return [
    'name' => env('INSTITUTION_NAME', 'Institución Demo'),
    'short_name' => env('INSTITUTION_SHORT_NAME', 'Demo'),
    'tax_id' => env('INSTITUTION_TAX_ID', '900.000.000-0'),
    'area' => env('INSTITUTION_AREA', 'Área de gestión documental'),
    'city' => env('INSTITUTION_CITY', 'Sede Central'),
    'logo_path' => env('INSTITUTION_LOGO_PATH', 'brand/gedocs-logo.png'),
    'filing_prefix' => env('INSTITUTION_FILING_PREFIX', 'DEMO'),
];
