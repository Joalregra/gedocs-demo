<?php

namespace App\Support;

/**
 * Single access point for the institution identity (name, footer, logo, filing number format).
 * Values come from config/institution.php so no controller or template hard-codes them.
 */
class InstitutionIdentity
{
    public static function name(): string
    {
        return (string) config('institution.name');
    }

    public static function taxId(): string
    {
        return (string) config('institution.tax_id');
    }

    public static function defaultFooter(bool $withRights = true): string
    {
        $footer = config('institution.name').' - '.config('institution.city').' - '.config('institution.area')
            ."\n© Gedocs ".date('Y');

        return $withRights ? $footer.' Todos los derechos reservados.' : $footer;
    }

    /** Absolute filesystem path of the default logo used in generated PDFs. */
    public static function logoFile(): string
    {
        return public_path((string) config('institution.logo_path'));
    }

    /** Public URL of the default logo. */
    public static function logoUrl(): string
    {
        return '/'.ltrim((string) config('institution.logo_path'), '/');
    }

    /**
     * Display format of a filing (radicado) number, e.g. DEMO-2026-000123.
     * The stored value stays numeric: queries order and cast it as a number.
     */
    public static function formatFiling(int|string|null $number, ?int $year = null): string
    {
        if ($number === null || $number === '' || $number === 'N/A' || ! ctype_digit((string) $number)) {
            return (string) $number;
        }

        return sprintf(
            '%s-%d-%06d',
            config('institution.filing_prefix'),
            $year ?? (int) date('Y'),
            (int) $number
        );
    }
}
