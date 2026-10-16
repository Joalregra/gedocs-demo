import { XMarkIcon, CalendarDaysIcon, UserIcon, TagIcon, EnvelopeIcon } from "@heroicons/react/24/outline";

export default function ArchiveMailModal({ mail, onClose }) {
    return (
        <div
            className="fixed inset-0 z-50 bg-black/45 backdrop-blur-[2px] px-3 sm:px-6 py-4 sm:py-8 flex items-center justify-center"
            onClick={onClose}
        >
            <div
                className="relative w-full max-w-2xl max-h-[92vh] overflow-y-auto rounded-2xl bg-white border border-gray-100 shadow-2xl"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="sticky top-0 z-10 bg-white/95 backdrop-blur border-b border-gray-100 px-5 sm:px-7 py-4 flex items-start justify-between gap-4">
                    <div className="space-y-1 min-w-0">
                        <span className="inline-flex items-center rounded-full bg-primary/10 text-primary text-[11px] font-bold uppercase tracking-wider px-2.5 py-1">
                            Vencida
                        </span>
                        <h2 className="text-lg sm:text-xl font-extrabold text-neutral wrap-break-word">
                            PQR #{mail.id}
                        </h2>
                        <p className="text-sm text-gray-500 wrap-break-word">{mail.affair || "Sin asunto"}</p>
                    </div>

                    <button
                        onClick={onClose}
                        className="btn btn-ghost btn-sm rounded-lg text-gray-500 hover:text-primary"
                        aria-label="Cerrar modal"
                    >
                        <XMarkIcon className="size-5" />
                    </button>
                </div>

                <div className="px-5 sm:px-7 py-5 sm:py-6 space-y-5">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                        <InfoItem
                            icon={<UserIcon className="size-4" />}
                            label="Solicitante"
                            value={mail.sender_name || "Sin nombre"}
                        />
                        <InfoItem
                            icon={<TagIcon className="size-4" />}
                            label="Tipo"
                            value={mail.request_type || "Sin tipo"}
                        />
                        <InfoItem
                            icon={<CalendarDaysIcon className="size-4" />}
                            label="Fecha límite"
                            value={mail.response_time ? new Date(mail.response_time).toLocaleDateString() : "Sin fecha"}
                        />
                        <InfoItem
                            icon={<EnvelopeIcon className="size-4" />}
                            label="Correo"
                            value={mail.email || "Sin correo"}
                        />
                    </div>

                    <section className="rounded-xl border border-gray-200 bg-gray-50/70 p-4 sm:p-5">
                        <h3 className="text-xs font-bold uppercase tracking-widest text-gray-500 mb-2">Descripción</h3>
                        <p className="text-sm text-neutral/90 leading-relaxed wrap-break-word whitespace-pre-wrap">
                            {mail.description || "Sin descripción"}
                        </p>
                    </section>
                </div>

                <div className="sticky bottom-0 bg-white/95 backdrop-blur border-t border-gray-100 px-5 sm:px-7 py-3 sm:py-4 flex justify-end">
                    <button
                        onClick={onClose}
                        className="btn btn-sm bg-primary text-white hover:bg-primary/90 border-none rounded-lg px-5"
                    >
                        Entendido
                    </button>
                </div>
            </div>
        </div>
    );
}

function InfoItem({ icon, label, value }) {
    return (
        <div className="rounded-xl border border-gray-200 bg-white px-3 py-2.5">
            <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-gray-500">
                <span className="text-primary">{icon}</span>
                {label}
            </div>
            <p className="mt-1 text-sm text-neutral/90 wrap-break-word">{value}</p>
        </div>
    );
}
