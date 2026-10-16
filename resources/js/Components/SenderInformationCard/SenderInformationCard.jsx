import { UserCircleIcon } from "@heroicons/react/24/solid";
import {
    EnvelopeIcon,
    IdentificationIcon,
    BuildingOfficeIcon,
} from "@heroicons/react/24/outline";

export default function SenderInformationCard({ currentMail }) {
    const fields = [
        {
            icon: IdentificationIcon,
            label: "Identificación",
            value: currentMail.document
                ? `${currentMail.document_type} ${currentMail.document}`
                : "No disponible",
        },
        {
            icon: EnvelopeIcon,
            label: "Correo Electrónico",
            value: currentMail.email || "No disponible",
            breakAll: true,
        },
        {
            icon: BuildingOfficeIcon,
            label: "Dependencia destinataria",
            value: currentMail.dependency?.name || "No especificada",
        },
    ];

    return (
        <div className="w-full bg-gray-50 border border-gray-200 rounded-xl p-5">
            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">
                Información del solicitante
            </h3>

            <div className="flex gap-4 items-start">
                <UserCircleIcon className="size-12 text-primary/60 shrink-0 hidden sm:block" />

                <div className="flex-1 min-w-0">
                    <p className="text-lg font-bold text-neutral leading-tight">
                        {currentMail.sender_name}
                    </p>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-3">
                        {fields.map(({ icon: Icon, label, value, breakAll }) => (
                            <div
                                key={label}
                                className="flex items-start gap-2 min-w-0"
                            >
                                <Icon className="size-4 text-gray-400 mt-0.5 shrink-0" />
                                <div className="min-w-0">
                                    <p className="text-xs text-gray-400">
                                        {label}
                                    </p>
                                    <p
                                        className={`text-sm font-medium text-neutral ${
                                            breakAll ? "break-all" : "truncate"
                                        }`}
                                    >
                                        {value}
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
