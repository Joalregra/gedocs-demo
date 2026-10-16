import { Link } from "@inertiajs/react";
import { useState } from "react";
import { XMarkIcon } from "@heroicons/react/24/outline";

const STORAGE_KEY = "gedocs-demo-tour-dismissed";

const STEPS = [
    { title: "Radica una PQRSD", text: "Completa el formulario y mira cómo se le asigna el número de radicado.", href: "/form", action: "Abrir el formulario" },
    { title: "Archiva un documento", text: "Abre el explorador y revisa las carpetas según la tabla de retención.", href: "/explorer", action: "Abrir el explorador" },
    { title: "Genera un acta en PDF", text: "Redacta el acta y descárgala con el pie y el logo de la entidad.", href: "/create-pdf", action: "Crear un documento" },
];

const wasDismissed = () => {
    try {
        return window.localStorage.getItem(STORAGE_KEY) === "1";
    } catch {
        return false;
    }
};

// Short guided tour for first-time visitors of the demo. Remembers the dismissal when storage is available.
export default function DemoTour() {
    const [open, setOpen] = useState(() => !wasDismissed());

    if (!open) return null;

    const dismiss = () => {
        setOpen(false);
        try {
            window.localStorage.setItem(STORAGE_KEY, "1");
        } catch {
            // Storage can be blocked; the tour simply shows again next time.
        }
    };

    return (
        <aside
            aria-label="Recorrido de la demo"
            className="fixed bottom-4 right-4 z-40 w-[calc(100vw-2rem)] max-w-sm rounded-2xl border border-slate-200 bg-white p-4 shadow-xl"
        >
            <div className="flex items-start justify-between gap-3">
                <div>
                    <h2 className="text-sm font-semibold text-slate-900">Recorrido de 3 pasos</h2>
                    <p className="mt-0.5 text-xs text-slate-600">Lo esencial de Gedocs en un par de minutos.</p>
                </div>
                <button
                    type="button"
                    onClick={dismiss}
                    aria-label="Cerrar el recorrido"
                    className="rounded-md p-1 text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 focus-visible:outline-2 focus-visible:outline-primary"
                >
                    <XMarkIcon className="size-5" />
                </button>
            </div>

            <ol className="mt-3 space-y-3">
                {STEPS.map((step, index) => (
                    <li key={step.href} className="flex gap-3">
                        <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-accent text-xs font-semibold text-white">
                            {index + 1}
                        </span>
                        <div className="min-w-0">
                            <p className="text-sm font-medium text-slate-900">{step.title}</p>
                            <p className="text-xs text-slate-600">{step.text}</p>
                            <Link href={step.href} className="mt-1 inline-block text-xs font-semibold text-primary hover:underline">
                                {step.action}
                            </Link>
                        </div>
                    </li>
                ))}
            </ol>
        </aside>
    );
}
