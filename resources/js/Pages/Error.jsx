import { Head, Link } from "@inertiajs/react";

const MESSAGES = {
    403: { title: "No tienes acceso a esta página", text: "Tu rol no permite ver este contenido. Si crees que es un error, pide acceso a un administrador." },
    404: { title: "No encontramos esa página", text: "El enlace puede estar mal escrito o el contenido ya no existe." },
    419: { title: "La sesión expiró", text: "Por seguridad cerramos las sesiones inactivas. Vuelve a cargar la página para continuar." },
    500: { title: "Algo salió mal de nuestro lado", text: "Ya quedó registrado. Intenta de nuevo en unos minutos." },
    503: { title: "Estamos en mantenimiento", text: "Volvemos en unos minutos." },
};

// Friendly page for HTTP errors (see withExceptions in bootstrap/app.php). The status sits inside a
// filing seal, the same mark as the logo.
export default function Error({ status = 500 }) {
    const { title, text } = MESSAGES[status] ?? MESSAGES[500];
    const canRetry = [419, 500, 503].includes(status);

    return (
        <main className="flex min-h-dvh items-center justify-center bg-base-200 px-4 py-10">
            <Head title={title} />

            <div className="w-full max-w-md rounded-2xl border border-base-300 bg-white p-8 text-center shadow-sm">
                <img src="/brand/gedocs-logo.svg" alt="Gedocs" className="mx-auto h-9" />

                <div
                    className="mx-auto mt-8 flex size-32 -rotate-6 items-center justify-center rounded-full border-4 border-accent text-accent"
                    aria-hidden="true"
                >
                    <span className="flex size-[6.5rem] items-center justify-center rounded-full border border-accent text-3xl font-bold tabular-nums">
                        {status}
                    </span>
                </div>

                <h1 className="mt-8 text-xl font-bold text-base-content">{title}</h1>
                <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-slate-600">{text}</p>

                <div className="mt-8 flex flex-col gap-2 sm:flex-row sm:justify-center">
                    <Link href="/" className="btn btn-primary">
                        Ir al inicio
                    </Link>
                    {canRetry && (
                        <button type="button" className="btn btn-outline btn-primary" onClick={() => window.location.reload()}>
                            Intentar de nuevo
                        </button>
                    )}
                </div>
            </div>
        </main>
    );
}
