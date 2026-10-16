import ToastMessage from '@/Components/ToastMessage.jsx';

export default function GuestLayout({ children }) {
    return (
        <div className="min-h-dvh bg-base-200 lg:bg-white">
            <div className="grid min-h-dvh grid-cols-1 lg:grid-cols-[1.1fr_1fr] xl:grid-cols-[1.25fr_1fr]">
                {/* Brand panel: ink desk with the illustration on a sheet of paper. */}
                <aside className="hidden flex-col justify-between gap-8 bg-primary p-10 text-primary-content lg:flex xl:p-14">
                    <img src="/brand/gedocs-logo-white.svg" alt="Gedocs" className="h-12 w-auto self-start" />

                    <div className="mx-auto w-full max-w-xl rounded-3xl bg-white p-6 shadow-2xl shadow-black/20 xl:p-8">
                        <img
                            src="/images/OBJECTS.svg"
                            alt=""
                            className="mx-auto h-auto max-h-[46dvh] w-full object-contain"
                        />
                    </div>

                    <div className="max-w-md">
                        <p className="text-2xl font-semibold leading-snug">Archivo documental y PQRSD en un solo lugar.</p>
                        <p className="mt-2 text-sm leading-relaxed text-primary-content/80">
                            Radica solicitudes, organiza los documentos según la tabla de retención y genera tus oficios en PDF.
                        </p>
                    </div>
                </aside>

                <main className="flex items-center justify-center p-4 sm:p-8 lg:p-12">
                    <div className="w-full max-w-md xl:max-w-lg">
                        <div className="mb-6 flex justify-center lg:hidden">
                            <img src="/brand/gedocs-logo.svg" alt="Gedocs" className="h-10 w-auto" />
                        </div>

                        <div className="rounded-2xl border border-base-300 bg-white p-5 shadow-sm sm:p-7 xl:p-8">
                            {children}
                        </div>
                    </div>
                </main>
            </div>
            <ToastMessage />
        </div>
    );
}
