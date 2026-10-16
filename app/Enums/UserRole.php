<?php

namespace App\Enums;

/**
 * Single source of truth for role names. The string values are what spatie/laravel-permission
 * stores in `roles.name`; the same names are mirrored in resources/js/constants/roles.js.
 */
enum UserRole: string
{
    case Admin = 'Admin';
    case Supervisor = 'Supervisor';
    case Auxiliar = 'Auxiliar';
    case Dependencia = 'Dependencia';

    public function label(): string
    {
        return match ($this) {
            self::Admin => 'Administrador',
            self::Supervisor => 'Supervisor',
            self::Auxiliar => 'Auxiliar de archivo',
            self::Dependencia => 'Dependencia',
        };
    }

    /** @return list<string> */
    public static function values(): array
    {
        return array_column(self::cases(), 'value');
    }

    /** Roles a person may pick when registering by themselves (never Admin or Dependencia). */
    public static function selfRegistrable(): array
    {
        return [self::Auxiliar, self::Supervisor];
    }

    /** Builds the string for spatie's `role:` route middleware, e.g. "role:Admin|Supervisor". */
    public static function middleware(self ...$roles): string
    {
        return 'role:'.implode('|', array_map(fn (self $role) => $role->value, $roles));
    }
}
