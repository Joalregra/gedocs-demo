import { router, usePage } from "@inertiajs/react";
import { ROLES } from "@/constants/roles";

const ACCESS = [
    { role: ROLES.ADMIN, label: "Administrador", hint: "Ve todas las entidades" },
    { role: ROLES.SUPERVISOR, label: "Supervisor", hint: "Gestiona sus entidades" },
    { role: ROLES.AUXILIAR, label: "Auxiliar", hint: "Consulta y archiva" },
    { role: ROLES.DEPENDENCIA, label: "Dependencia", hint: "Responde las PQRSD" },
];

// One-click sign in for the public demo. Rendered only while the backend reports demo mode.
export default function DemoAccess() {
    const { demo } = usePage().props;

    if (!demo) return null;

    return (
        <section aria-labelledby="demo-access-title" className="mt-6 border-t border-slate-200 pt-5">
            <h2 id="demo-access-title" className="text-sm font-semibold text-slate-900">
                Entrar sin registrarte
            </h2>
            <p className="mt-1 text-xs leading-relaxed text-slate-600">
                Elige un rol para recorrer el sistema. Los datos son ficticios y se reinician cada día a las 3:00 a. m. (hora de Colombia).
            </p>

            <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
                {ACCESS.map(({ role, label, hint }) => (
                    <button
                        key={role}
                        type="button"
                        onClick={() => router.post(route("demo.login", role))}
                        className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-left transition hover:border-primary hover:bg-primary/5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                    >
                        <span className="block text-sm font-semibold text-slate-900">Entrar como {label}</span>
                        <span className="block text-xs text-slate-600">{hint}</span>
                    </button>
                ))}
            </div>
        </section>
    );
}
