
import api from "@/lib/axios";
import React from "react";
import { toast } from "sonner";
import {
    DocumentTextIcon,
    CalendarDaysIcon,
    MapPinIcon,
    UserIcon,
    BuildingOfficeIcon,
    EnvelopeIcon,
    PencilSquareIcon,
    HandRaisedIcon,
} from "@heroicons/react/24/outline";

const SectionHeader = ({ icon: Icon, title }) => (
    <div className="flex items-center gap-2 mb-4 pb-2 border-b border-base-300">
        <Icon className="w-5 h-5 text-primary" />
        <h3 className="text-base font-semibold text-base-content">{title}</h3>
    </div>
);

const Field = ({ label, children }) => (
    <div className="flex flex-col gap-1">
        <label className="label-text text-sm font-medium text-gray-600">{label}</label>
        {children}
    </div>
);

const DependencyScheme = ({ onPdfGenerated }) => {
    const handleGeneratePdf = async (e) => {
        e.preventDefault();
        document.getElementById("my_modal_1").close();

        const toastId = toast.loading("Generando PDF...");

        try {
            const form = new FormData(e.target);
            const data = Object.fromEntries(form.entries());

            const response = await api.post("/generate-pdf", data, {
                responseType: "blob",
            });

            if (response.data.type === "application/json") {
                const text = await response.data.text();
                const errorData = JSON.parse(text);
                throw new Error(errorData.error || "Error desconocido en el servidor");
            }

            const url = window.URL.createObjectURL(new Blob([response.data]));
            const a = document.createElement("a");
            a.href = url;
            a.download = "acta.pdf";
            a.click();

            if (onPdfGenerated) onPdfGenerated();

            toast.dismiss(toastId);
            toast.success("PDF generado correctamente");
        } catch (error) {
            toast.dismiss(toastId);
            console.error("Error generando el PDF:", error);

            let errorMessage = "No se pudo generar el PDF";
            if (error.response && error.response.data instanceof Blob) {
                const text = await error.response.data.text();
                try {
                    const json = JSON.parse(text);
                    errorMessage = json.error || errorMessage;
                } catch (e) {
                    errorMessage = text || errorMessage;
                }
            } else {
                errorMessage = error.message || errorMessage;
            }

            toast.error(errorMessage);
        }
    };

    return (
        <form id="pdfForm" onSubmit={handleGeneratePdf} className="space-y-6">
            {/* Section 1: Document Info */}
            <section>
                <SectionHeader icon={DocumentTextIcon} title="Información del Documento" />
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <Field label="Código">
                        <input name="codigo" placeholder="Ej: GD-001" className="input input-bordered w-full" />
                    </Field>
                    <Field label="Fecha de Elaboración">
                        <input type="date" name="fecha" className="input input-bordered w-full" />
                    </Field>
                    <Field label="Lugar">
                        <input name="lugar" placeholder="Ej: Bogotá D.C." className="input input-bordered w-full" />
                    </Field>
                </div>
            </section>

            {/* Section 2: Recipient */}
            <section>
                <SectionHeader icon={UserIcon} title="Destinatario" />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Field label="Tratamiento">
                        <input name="tratamiento" placeholder="Ej: Señor(a), Doctor(a)" className="input input-bordered w-full" />
                    </Field>
                    <Field label="Nombres y Apellidos">
                        <input name="nombres" placeholder="Nombre completo del destinatario" className="input input-bordered w-full" />
                    </Field>
                    <Field label="Cargo">
                        <input name="cargo" placeholder="Cargo del destinatario" className="input input-bordered w-full" />
                    </Field>
                    <Field label="Empresa">
                        <input name="empresa" placeholder="Nombre de la empresa" className="input input-bordered w-full" />
                    </Field>
                    <Field label="Dirección">
                        <input name="direccion" placeholder="Dirección de correspondencia" className="input input-bordered w-full" />
                    </Field>
                    <Field label="Ciudad">
                        <input name="ciudad" placeholder="Ciudad de destino" className="input input-bordered w-full" />
                    </Field>
                </div>
            </section>

            {/* Section 3: Content */}
            <section>
                <SectionHeader icon={PencilSquareIcon} title="Contenido de la Comunicación" />
                <div className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <Field label="Asunto">
                            <input name="asunto" placeholder="Asunto de la comunicación" className="input input-bordered w-full" />
                        </Field>
                        <Field label="Saludo">
                            <input name="saludo" placeholder="Ej: Cordial saludo" className="input input-bordered w-full" />
                        </Field>
                    </div>
                    <Field label="Texto">
                        <textarea
                            name="texto"
                            rows={5}
                            placeholder="Escriba el cuerpo de la comunicación..."
                            className="textarea textarea-bordered w-full leading-relaxed"
                        />
                    </Field>
                </div>
            </section>

            {/* Section 4: Farewell */}
            <section>
                <SectionHeader icon={HandRaisedIcon} title="Despedida" />
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <Field label="Línea 1">
                        <input name="despedida1" placeholder="Ej: Atentamente," className="input input-bordered w-full" />
                    </Field>
                    <Field label="Línea 2">
                        <input name="despedida2" placeholder="Segunda línea (opcional)" className="input input-bordered w-full" />
                    </Field>
                    <Field label="Línea 3">
                        <input name="despedida3" placeholder="Tercera línea (opcional)" className="input input-bordered w-full" />
                    </Field>
                </div>
            </section>

            {/* Section 5: Signature */}
            <section>
                <SectionHeader icon={EnvelopeIcon} title="Firma" />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Field label="Nombres y Apellidos">
                        <input name="firma_nombres" placeholder="Nombre completo del firmante" className="input input-bordered w-full" />
                    </Field>
                    <Field label="Cargo">
                        <input name="firma_cargo" placeholder="Cargo del firmante" className="input input-bordered w-full" />
                    </Field>
                </div>
            </section>

            {/* Section 6: Additional Info */}
            <section>
                <SectionHeader icon={BuildingOfficeIcon} title="Información Adicional" />
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <Field label="Anexo">
                        <input name="anexo" placeholder="Documentos anexos" className="input input-bordered w-full" />
                    </Field>
                    <Field label="Copia">
                        <input name="copia" placeholder="Destinatarios en copia" className="input input-bordered w-full" />
                    </Field>
                    <Field label="Transcriptor">
                        <input name="transcriptor" placeholder="Iniciales del transcriptor" className="input input-bordered w-full" />
                    </Field>
                </div>
            </section>
        </form>
    );
};

export default DependencyScheme;

