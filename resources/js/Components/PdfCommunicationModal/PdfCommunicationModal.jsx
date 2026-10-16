import { useState } from "react";
import axios from "axios";
import {
    XMarkIcon,
    DocumentTextIcon,
    UserIcon,
    PencilSquareIcon,
    HandRaisedIcon,
    BuildingOfficeIcon,
} from "@heroicons/react/24/outline";

/**
 * Modal para generar un PDF de comunicación oficial como respuesta a una PQR.
 *
 *   isOpen      - boolean, controla visibilidad del modal
 *   onClose     - función para cerrar el modal
 *   pqrId       - ID de la PQR a la que se responde
 *   communicationId - (opcional) ID de la comunicación a vincular
 *   onSuccess   - callback(url) cuando el PDF se genera exitosamente
 */
export function PdfCommunicationModal({
    isOpen,
    onClose,
    pqrId,
    communicationId = null,
    onSuccess,
}) {
    const initialForm = {
        // Documento
        codigo: "",
        fecha: "",
        lugar: "",
        // Destinatario
        tratamiento: "",
        nombres: "",
        cargo: "",
        empresa: "",
        direccion: "",
        ciudad: "",
        // Contenido
        asunto: "",
        saludo: "",
        texto: "",
        // Despedida
        despedida1: "",
        despedida2: "",
        despedida3: "",
        // Firma
        firma_nombres: "",
        firma_cargo: "",
        // Información adicional (opcionales)
        anexo: "",
        copia: "",
        redactor: "",
        transcriptor: "",
        // Pie de página
        pie_pagina: "",
    };

    const [form, setForm] = useState(initialForm);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setForm((prev) => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            const payload = {
                pqr_id: pqrId,
                communication_id: communicationId,
                ...form,
            };

            const response = await axios.post("/api/pdf/generate-response", payload);

            if (onSuccess) {
                onSuccess(response.data);
            }

            // Resetear y cerrar
            setForm(initialForm);
            onClose();
        } catch (err) {
            const msg =
                err.response?.data?.error ||
                err.response?.data?.message ||
                "Error al generar el PDF. Intente nuevamente.";
            setError(msg);
        } finally {
            setLoading(false);
        }
    };

    const handleClose = () => {
        setForm(initialForm);
        setError(null);
        onClose();
    };

    if (!isOpen) return null;

    // Clases reutilizables
    const inputClass =
        "w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/30 transition bg-white";
    const labelClass = "block text-xs font-semibold text-gray-500 mb-1";
    const sectionHeaderClass =
        "flex items-center gap-2 text-sm font-bold text-gray-700 mb-3 border-b border-gray-100 pb-2";

    return (
        // Overlay
        <div
            className="fixed inset-0 z-50 flex items-center justify-center px-4"
            style={{ backgroundColor: "rgba(0,0,0,0.45)" }}
            onClick={(e) => {
                if (e.target === e.currentTarget) handleClose();
            }}
        >
            {/* Modal container */}
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[92vh] flex flex-col overflow-hidden">
                {/* Header del modal */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 shrink-0">
                    <div className="flex items-center gap-2">
                        <DocumentTextIcon className="w-5 h-5 text-primary" />
                        <h2 className="text-base font-bold text-gray-800">
                            Generar Comunicación PDF
                        </h2>
                    </div>
                    <button
                        onClick={handleClose}
                        className="text-gray-400 hover:text-gray-600 transition"
                        aria-label="Cerrar modal"
                    >
                        <XMarkIcon className="w-5 h-5" />
                    </button>
                </div>

                <p className="text-xs text-primary text-center pt-3 px-6 shrink-0">
                    Complete los campos para generar el documento de comunicación oficial.
                </p>

                {/* Cuerpo scrollable */}
                <form
                    onSubmit={handleSubmit}
                    className="flex-1 overflow-y-auto px-6 py-4 space-y-6"
                >
                    {/* ── Información del Documento ── */}
                    <section>
                        <p className={sectionHeaderClass}>
                            <DocumentTextIcon className="w-4 h-4 text-primary" />
                            Información del Documento
                        </p>
                        <div className="grid grid-cols-3 gap-3">
                            <div>
                                <label className={labelClass}>Fecha de Elaboración</label>
                                <input
                                    type="date"
                                    name="fecha"
                                    value={form.fecha}
                                    onChange={handleChange}
                                    className={inputClass}
                                />
                            </div>
                            <div>
                                <label className={labelClass}>Lugar</label>
                                <input
                                    type="text"
                                    name="lugar"
                                    placeholder="Ej: Bogotá D.C."
                                    value={form.lugar}
                                    onChange={handleChange}
                                    className={inputClass}
                                />
                            </div>
                        </div>
                    </section>

                    {/* ── Destinatario ── */}
                    <section>
                        <p className={sectionHeaderClass}>
                            <UserIcon className="w-4 h-4 text-primary" />
                            Destinatario
                        </p>
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className={labelClass}>Tratamiento</label>
                                <input
                                    type="text"
                                    name="tratamiento"
                                    placeholder="Ej: Señor(a), Doctor(a)"
                                    value={form.tratamiento}
                                    onChange={handleChange}
                                    className={inputClass}
                                />
                            </div>
                            <div>
                                <label className={labelClass}>Nombres y Apellidos</label>
                                <input
                                    type="text"
                                    name="nombres"
                                    placeholder="Nombre completo del destinatario"
                                    value={form.nombres}
                                    onChange={handleChange}
                                    className={inputClass}
                                />
                            </div>
                            <div>
                                <label className={labelClass}>Cargo</label>
                                <input
                                    type="text"
                                    name="cargo"
                                    placeholder="Cargo del destinatario"
                                    value={form.cargo}
                                    onChange={handleChange}
                                    className={inputClass}
                                />
                            </div>
                            <div>
                                <label className={labelClass}>Empresa</label>
                                <input
                                    type="text"
                                    name="empresa"
                                    placeholder="Nombre de la empresa"
                                    value={form.empresa}
                                    onChange={handleChange}
                                    className={inputClass}
                                />
                            </div>
                            <div>
                                <label className={labelClass}>Dirección</label>
                                <input
                                    type="text"
                                    name="direccion"
                                    placeholder="Dirección de correspondencia"
                                    value={form.direccion}
                                    onChange={handleChange}
                                    className={inputClass}
                                />
                            </div>
                            <div>
                                <label className={labelClass}>Ciudad</label>
                                <input
                                    type="text"
                                    name="ciudad"
                                    placeholder="Ciudad de destino"
                                    value={form.ciudad}
                                    onChange={handleChange}
                                    className={inputClass}
                                />
                            </div>
                        </div>
                    </section>

                    {/* ── Contenido de la Comunicación ── */}
                    <section>
                        <p className={sectionHeaderClass}>
                            <PencilSquareIcon className="w-4 h-4 text-primary" />
                            Contenido de la Comunicación
                        </p>
                        <div className="grid grid-cols-2 gap-3 mb-3">
                            <div>
                                <label className={labelClass}>Asunto</label>
                                <input
                                    type="text"
                                    name="asunto"
                                    placeholder="Asunto de la comunicación"
                                    value={form.asunto}
                                    onChange={handleChange}
                                    className={inputClass}
                                />
                            </div>
                            <div>
                                <label className={labelClass}>Saludo</label>
                                <input
                                    type="text"
                                    name="saludo"
                                    placeholder="Ej: Cordial saludo"
                                    value={form.saludo}
                                    onChange={handleChange}
                                    className={inputClass}
                                />
                            </div>
                        </div>
                        <div>
                            <label className={labelClass}>Texto</label>
                            <textarea
                                name="texto"
                                rows={5}
                                placeholder="Escriba el cuerpo de la comunicación..."
                                value={form.texto}
                                onChange={handleChange}
                                className={`${inputClass} resize-none`}
                            />
                        </div>
                    </section>

                    {/* ── Despedida ── */}
                    <section>
                        <p className={sectionHeaderClass}>
                            <HandRaisedIcon className="w-4 h-4 text-primary" />
                            Despedida
                        </p>
                        <div className="grid grid-cols-3 gap-3">
                            <div>
                                <label className={labelClass}>Línea 1</label>
                                <input
                                    type="text"
                                    name="despedida1"
                                    placeholder="Ej: Atentamente,"
                                    value={form.despedida1}
                                    onChange={handleChange}
                                    className={inputClass}
                                />
                            </div>
                            <div>
                                <label className={labelClass}>Línea 2</label>
                                <input
                                    type="text"
                                    name="despedida2"
                                    placeholder="Segunda línea (opcional)"
                                    value={form.despedida2}
                                    onChange={handleChange}
                                    className={inputClass}
                                />
                            </div>
                            <div>
                                <label className={labelClass}>Línea 3</label>
                                <input
                                    type="text"
                                    name="despedida3"
                                    placeholder="Tercera línea (opcional)"
                                    value={form.despedida3}
                                    onChange={handleChange}
                                    className={inputClass}
                                />
                            </div>
                        </div>
                    </section>

                    {/* ── Firma ── */}
                    <section>
                        <p className={sectionHeaderClass}>
                            <UserIcon className="w-4 h-4 text-primary" />
                            Firma
                        </p>
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className={labelClass}>Nombres y Apellidos</label>
                                <input
                                    type="text"
                                    name="firma_nombres"
                                    placeholder="Nombre completo del firmante"
                                    value={form.firma_nombres}
                                    onChange={handleChange}
                                    className={`${inputClass} border-primary ring-1 ring-primary/20`}
                                />
                            </div>
                            <div>
                                <label className={labelClass}>Cargo</label>
                                <input
                                    type="text"
                                    name="firma_cargo"
                                    placeholder="Cargo del firmante"
                                    value={form.firma_cargo}
                                    onChange={handleChange}
                                    className={inputClass}
                                />
                            </div>
                        </div>
                    </section>

                    {/* ── Información Adicional (opcional) ── */}
                    <section>
                        <p className={sectionHeaderClass}>
                            <BuildingOfficeIcon className="w-4 h-4 text-primary" />
                            Información Adicional
                            <span className="text-xs font-normal text-gray-400">
                                (solo aparece si se diligencia)
                            </span>
                        </p>
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className={labelClass}>Anexo</label>
                                <input
                                    type="text"
                                    name="anexo"
                                    placeholder="Documentos anexos"
                                    value={form.anexo}
                                    onChange={handleChange}
                                    className={inputClass}
                                />
                            </div>
                            <div>
                                <label className={labelClass}>Copia</label>
                                <input
                                    type="text"
                                    name="copia"
                                    placeholder="Destinatarios en copia"
                                    value={form.copia}
                                    onChange={handleChange}
                                    className={inputClass}
                                />
                            </div>
                            <div>
                                <label className={labelClass}>Redactor</label>
                                <input
                                    type="text"
                                    name="redactor"
                                    placeholder="Nombre del redactor"
                                    value={form.redactor}
                                    onChange={handleChange}
                                    className={inputClass}
                                />
                            </div>
                            <div>
                                <label className={labelClass}>Transcriptor</label>
                                <input
                                    type="text"
                                    name="transcriptor"
                                    placeholder="Iniciales del transcriptor"
                                    value={form.transcriptor}
                                    onChange={handleChange}
                                    className={inputClass}
                                />
                            </div>
                        </div>
                    </section>

                    {/* ── Pie de Página ── */}
                    <section>
                        <p className={sectionHeaderClass}>
                            <DocumentTextIcon className="w-4 h-4 text-gray-400" />
                            Pie de Página
                        </p>
                        <textarea
                            name="pie_pagina"
                            rows={2}
                            placeholder="Ej: Calle 27 No. 6AW-240 Tuluá – Teléfono (57) 2 2302487"
                            value={form.pie_pagina}
                            onChange={handleChange}
                            className={`${inputClass} resize-none`}
                        />
                    </section>

                    {/* Error */}
                    {error && (
                        <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm">
                            {error}
                        </div>
                    )}
                </form>

                {/* Footer fijo con botones */}
                <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-100 shrink-0 bg-white">
                    <button
                        type="button"
                        onClick={handleClose}
                        className="px-5 py-2 rounded-lg border border-gray-200 text-sm text-gray-600 font-medium hover:bg-gray-50 transition"
                        id="pdf-modal-cancel-btn"
                    >
                        Cancelar
                    </button>
                    <button
                        type="submit"
                        form="pdf-communication-form"
                        onClick={handleSubmit}
                        disabled={loading}
                        className="flex items-center gap-2 px-5 py-2 rounded-lg bg-primary text-white text-sm font-semibold hover:bg-primary/90 transition disabled:opacity-60 disabled:cursor-not-allowed shadow-sm"
                        id="pdf-modal-submit-btn"
                    >
                        <DocumentTextIcon className="w-4 h-4" />
                        {loading ? "Generando..." : "Generar PDF"}
                    </button>
                </div>
            </div>
        </div>
    );
}
