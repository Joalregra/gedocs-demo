<?php

use App\Support\InstitutionIdentity;

it('builds the default footer from the configured identity', function () {
    config(['institution.name' => 'Entidad Ejemplo', 'institution.city' => 'Ciudad Uno', 'institution.area' => 'Archivo']);

    expect(InstitutionIdentity::defaultFooter())
        ->toStartWith('Entidad Ejemplo - Ciudad Uno - Archivo')
        ->toContain('© Gedocs '.date('Y'))
        ->toEndWith('Todos los derechos reservados.')
        ->and(InstitutionIdentity::defaultFooter(false))->not->toContain('derechos');
});

it('formats a stored filing number for display', function () {
    config(['institution.filing_prefix' => 'DEMO']);

    expect(InstitutionIdentity::formatFiling('007', 2026))->toBe('DEMO-2026-000007')
        ->and(InstitutionIdentity::formatFiling(123, 2025))->toBe('DEMO-2025-000123')
        ->and(InstitutionIdentity::formatFiling(5))->toBe('DEMO-'.date('Y').'-000005');
});

it('leaves values that are not plain numbers untouched', function () {
    expect(InstitutionIdentity::formatFiling('N/A'))->toBe('N/A')
        ->and(InstitutionIdentity::formatFiling('RAD-ENV-123'))->toBe('RAD-ENV-123')
        ->and(InstitutionIdentity::formatFiling(null))->toBe('');
});

it('resolves the default logo shipped with the app', function () {
    expect(InstitutionIdentity::logoFile())->toBeFile()
        ->and(InstitutionIdentity::logoUrl())->toStartWith('/brand/');
});
