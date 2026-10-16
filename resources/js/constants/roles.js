// Role names exactly as stored in `roles.name` (see app/Enums/UserRole.php). Keep both files in sync.
export const ROLES = Object.freeze({
    ADMIN: "Admin",
    SUPERVISOR: "Supervisor",
    AUXILIAR: "Auxiliar",
    DEPENDENCIA: "Dependencia",
});

export const ROLE_LABELS = Object.freeze({
    [ROLES.ADMIN]: "Administrador",
    [ROLES.SUPERVISOR]: "Supervisor",
    [ROLES.AUXILIAR]: "Auxiliar de archivo",
    [ROLES.DEPENDENCIA]: "Dependencia",
});
