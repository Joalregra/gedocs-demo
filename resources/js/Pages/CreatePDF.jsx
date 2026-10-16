import React, { useRef, useState } from "react";
import { DashboardLayout } from "@/Layouts/DashboardLayout";
import { router, usePage } from "@inertiajs/react";
import { DocumentArrowDownIcon, ArrowLeftIcon, PencilIcon, XMarkIcon } from "@heroicons/react/24/outline";
import api from "@/lib/axios";
import { toast } from "sonner";

const DOCUMENT_TYPES = [
    { value: "carta", label: "Carta" },
    { value: "circular", label: "Circular" },
    { value: "acta", label: "Acta" },
    { value: "informe", label: "Informe" },
    { value: "constancia", label: "Constancia" },
];

const FALLBACK_LOGO_PATH = "/brand/gedocs-logo.png";
const ALLOWED_LOGO_TYPES = ["image/png", "image/jpeg"];
const MIN_LOGO_FILE_BYTES = 10 * 1024;
const MAX_LOGO_FILE_BYTES = 2 * 1024 * 1024;
const MIN_LOGO_DIMENSION = 64;
const MAX_LOGO_DIMENSION = 2000;
const ALLOWED_SIGNATURE_TYPES = ["image/png", "image/jpeg", "image/svg+xml"];
const MIN_SIGNATURE_FILE_BYTES = 4 * 1024;
const MAX_SIGNATURE_FILE_BYTES = 1024 * 1024;
const MIN_SIGNATURE_WIDTH = 120;
const MIN_SIGNATURE_HEIGHT = 40;
const MAX_SIGNATURE_WIDTH = 2400;
const MAX_SIGNATURE_HEIGHT = 1200;

const DocInput = ({ name, placeholder, className = "", type = "text", ...props }) => (
    <input
        name={name}
        type={type}
        placeholder={placeholder}
        autoComplete="off"
        className={`bg-transparent border-0 border-b border-dashed border-gray-400 focus:border-primary focus:outline-none placeholder-gray-300 px-1 transition-colors ${className}`}
        {...props}
    />
);

const DocArea = ({ name, placeholder, className = "", rows = 6, ...props }) => (
    <textarea
        name={name}
        rows={rows}
        placeholder={placeholder}
        className={`w-full bg-transparent border border-dashed border-gray-300 focus:border-primary focus:outline-none text-[11pt] placeholder-gray-300 p-2 resize-y leading-relaxed transition-colors ${className}`}
        style={{ fontFamily: "inherit" }}
        {...props}
    />
);

const EditableList = ({ title, items, setItems, placeholder, numbered = false, multiline = false }) => {
    const updateItem = (index, value) => {
        const clone = [...items];
        clone[index] = value;
        setItems(clone);
    };

    const addItem = () => setItems([...items, ""]);

    const removeItem = (index) => {
        if (items.length === 1) return;
        setItems(items.filter((_, i) => i !== index));
    };

    return (
        <section className="mb-6">
            <p className="text-[11pt] font-bold mb-2">{title}</p>
            <div className="space-y-2">
                {items.map((item, index) => (
                    <div key={`${title}-${index}`} className="flex items-start gap-2">
                        {numbered ? (
                            <span className="text-sm font-bold text-gray-500 pt-2 min-w-6">{index + 1}.</span>
                        ) : (
                            <span className="text-sm font-bold text-gray-400 pt-2 min-w-6">-</span>
                        )}

                        {multiline ? (
                            <textarea
                                value={item}
                                onChange={(e) => updateItem(index, e.target.value)}
                                rows={2}
                                placeholder={placeholder}
                                className="flex-1 bg-transparent border border-dashed border-gray-300 focus:border-primary focus:outline-none placeholder-gray-300 px-2 py-1 transition-colors"
                                style={{ fontFamily: "inherit" }}
                            />
                        ) : (
                            <DocInput
                                value={item}
                                onChange={(e) => updateItem(index, e.target.value)}
                                placeholder={placeholder}
                                className="flex-1 text-[11pt]"
                            />
                        )}

                        <button
                            type="button"
                            onClick={() => removeItem(index)}
                            className="text-xs px-2 py-1 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-600"
                        >
                            Quitar
                        </button>
                    </div>
                ))}
            </div>

            <button
                type="button"
                onClick={addItem}
                className="mt-2 text-xs px-3 py-1.5 rounded-lg bg-primary/10 hover:bg-primary/20 text-primary font-bold"
            >
                + Agregar linea
            </button>
        </section>
    );
};

export default function CreatePDF() {
    const { auth, institution } = usePage().props;
    const DEFAULT_LOGO_PATH = institution?.logo_url ?? FALLBACK_LOGO_PATH;
    const { targetFolderId, targetSheetId } = usePage().props;
    const initialUserLogoUrl = auth?.user?.pdf_logo_path ? `/storage/${auth.user.pdf_logo_path}` : DEFAULT_LOGO_PATH;
    const defaultFooterText = institution?.default_footer ?? `© Gedocs ${new Date().getFullYear()} Todos los derechos reservados.`;
    const [isGenerating, setIsGenerating] = useState(false);
    const [isSavingLogo, setIsSavingLogo] = useState(false);
    const [isSavingFooter, setIsSavingFooter] = useState(false);
    const [documentType, setDocumentType] = useState("carta");
    const [logoPreviewUrl, setLogoPreviewUrl] = useState(initialUserLogoUrl);
    const [customLogoFile, setCustomLogoFile] = useState(null);
    const [signaturePreviewUrl, setSignaturePreviewUrl] = useState(null);
    const [customSignatureFile, setCustomSignatureFile] = useState(null);
    const [uploadToastState, setUploadToastState] = useState(null);
    const logoInputRef = useRef(null);
    const signatureInputRef = useRef(null);
    const footerModalRef = useRef(null);
    const confirmGenerateModalRef = useRef(null);
    const pdfFormRef = useRef(null);

    const [actaAsistentes, setActaAsistentes] = useState([""]);
    const [actaInvitados, setActaInvitados] = useState([""]);
    const [actaAusentes, setActaAusentes] = useState([""]);
    const [actaOrdenDia, setActaOrdenDia] = useState([""]);
    const [actaDesarrollo, setActaDesarrollo] = useState([""]);

    const [informeElaboradoPor, setInformeElaboradoPor] = useState([""]);
    const [informeObjetivos, setInformeObjetivos] = useState([""]);
    const [informeConclusiones, setInformeConclusiones] = useState([""]);
    const [informeRecomendaciones, setInformeRecomendaciones] = useState([""]);
    const [footerText, setFooterText] = useState(auth?.user?.pdf_footer_text || defaultFooterText);
    const isUsingCustomLogo = logoPreviewUrl !== DEFAULT_LOGO_PATH;
    const isUsingCustomSignature = customSignatureFile !== null && !!signaturePreviewUrl;

    const showUploadToast = (type, message) => {
        setUploadToastState({ type, message });
        window.setTimeout(() => {
            setUploadToastState(null);
        }, 4000);
    };

    const getImageDimensions = (file) => new Promise((resolve, reject) => {
        const objectUrl = URL.createObjectURL(file);
        const image = new Image();

        image.onload = () => {
            const width = image.naturalWidth;
            const height = image.naturalHeight;
            URL.revokeObjectURL(objectUrl);
            resolve({ width, height });
        };

        image.onerror = () => {
            URL.revokeObjectURL(objectUrl);
            reject(new Error("No se pudo leer la imagen"));
        };

        image.src = objectUrl;
    });

    const handleLogoChange = async (event) => {
        const file = event.target.files?.[0];
        if (!file) return;

        if (!ALLOWED_LOGO_TYPES.includes(file.type)) {
            showUploadToast("error", "Tipo de archivo no permitido. Solo PNG o JPG.");
            event.target.value = "";
            return;
        }

        if (file.size < MIN_LOGO_FILE_BYTES) {
            showUploadToast("error", "El logo es demasiado pequeno. Minimo: 10 KB.");
            event.target.value = "";
            return;
        }

        if (file.size > MAX_LOGO_FILE_BYTES) {
            showUploadToast("error", "El logo es demasiado pesado. Maximo: 2 MB.");
            event.target.value = "";
            return;
        }

        try {
            const { width, height } = await getImageDimensions(file);
            if (
                width < MIN_LOGO_DIMENSION ||
                height < MIN_LOGO_DIMENSION ||
                width > MAX_LOGO_DIMENSION ||
                height > MAX_LOGO_DIMENSION
            ) {
                showUploadToast(
                    "error",
                    "Dimensiones invalidas. Use una imagen entre 64x64 y 2000x2000 px."
                );
                event.target.value = "";
                return;
            }
        } catch {
            showUploadToast("error", "No se pudo procesar la imagen seleccionada.");
            event.target.value = "";
            return;
        }

        if (logoPreviewUrl.startsWith("blob:")) {
            URL.revokeObjectURL(logoPreviewUrl);
        }

        setIsSavingLogo(true);
        try {
            const uploadData = new FormData();
            uploadData.set("logo_file", file);
            const response = await api.post("/pdf/logo-preference", uploadData);

            setCustomLogoFile(null);
            setLogoPreviewUrl(response.data?.logo_url || DEFAULT_LOGO_PATH);
            showUploadToast("success", "Logo guardado correctamente.");
        } catch (error) {
            const errorMessage = error?.response?.data?.error || "No se pudo guardar el logo.";
            showUploadToast("error", errorMessage);
            event.target.value = "";
        } finally {
            setIsSavingLogo(false);
        }
    };

    const resetLogo = () => {
        const run = async () => {
            setIsSavingLogo(true);
            try {
                await api.delete("/pdf/logo-preference");
                if (logoPreviewUrl.startsWith("blob:")) {
                    URL.revokeObjectURL(logoPreviewUrl);
                }
                setCustomLogoFile(null);
                setLogoPreviewUrl(DEFAULT_LOGO_PATH);
                if (logoInputRef.current) {
                    logoInputRef.current.value = "";
                }
                showUploadToast("success", "Se restauro el logo predeterminado.");
            } catch (error) {
                const errorMessage = error?.response?.data?.error || "No se pudo restablecer el logo.";
                showUploadToast("error", errorMessage);
            } finally {
                setIsSavingLogo(false);
            }
        };

        run();
    };

    const handleSignatureChange = async (event) => {
        const file = event.target.files?.[0];
        if (!file) return;

        if (!ALLOWED_SIGNATURE_TYPES.includes(file.type)) {
            showUploadToast("error", "Tipo de archivo no permitido para firma. Solo PNG, JPG o SVG.");
            event.target.value = "";
            return;
        }

        if (file.size < MIN_SIGNATURE_FILE_BYTES) {
            showUploadToast("error", "La firma es demasiado pequena. Minimo: 4 KB.");
            event.target.value = "";
            return;
        }

        if (file.size > MAX_SIGNATURE_FILE_BYTES) {
            showUploadToast("error", "La firma es demasiado pesada. Maximo: 1 MB.");
            event.target.value = "";
            return;
        }

        try {
            const { width, height } = await getImageDimensions(file);
            if (
                width < MIN_SIGNATURE_WIDTH ||
                height < MIN_SIGNATURE_HEIGHT ||
                width > MAX_SIGNATURE_WIDTH ||
                height > MAX_SIGNATURE_HEIGHT
            ) {
                showUploadToast(
                    "error",
                    "Dimensiones de firma invalidas. Use entre 120x40 y 2400x1200 px."
                );
                event.target.value = "";
                return;
            }
        } catch {
            showUploadToast("error", "No se pudo procesar la firma seleccionada.");
            event.target.value = "";
            return;
        }

        if (signaturePreviewUrl?.startsWith("blob:")) {
            URL.revokeObjectURL(signaturePreviewUrl);
        }

        setCustomSignatureFile(file);
        setSignaturePreviewUrl(URL.createObjectURL(file));
        showUploadToast("success", "Firma cargada correctamente.");
    };

    const resetSignature = () => {
        if (signaturePreviewUrl?.startsWith("blob:")) {
            URL.revokeObjectURL(signaturePreviewUrl);
        }
        setCustomSignatureFile(null);
        setSignaturePreviewUrl(null);
        if (signatureInputRef.current) {
            signatureInputRef.current.value = "";
        }
        showUploadToast("success", "Se elimino la firma cargada.");
    };

    const openLogoPicker = () => {
        logoInputRef.current?.click();
    };

    const openSignaturePicker = () => {
        signatureInputRef.current?.click();
    };

    const openFooterModal = () => {
        footerModalRef.current?.showModal();
    };

    const closeFooterModal = () => {
        footerModalRef.current?.close();
    };

    const openConfirmGenerateModal = () => {
        confirmGenerateModalRef.current?.showModal();
    };

    const closeConfirmGenerateModal = () => {
        confirmGenerateModalRef.current?.close();
    };

    const syncActaDesarrolloLength = (nextOrdenDia) => {
        setActaDesarrollo((prev) => {
            const next = [...prev];
            if (nextOrdenDia.length > next.length) {
                return [...next, ...Array(nextOrdenDia.length - next.length).fill("")];
            }
            return next.slice(0, nextOrdenDia.length);
        });
    };

    const updateActaOrdenDiaItem = (index, value) => {
        const next = [...actaOrdenDia];
        next[index] = value;
        setActaOrdenDia(next);
        syncActaDesarrolloLength(next);
    };

    const addActaOrdenDiaItem = () => {
        const next = [...actaOrdenDia, ""];
        setActaOrdenDia(next);
        syncActaDesarrolloLength(next);
    };

    const removeActaOrdenDiaItem = (index) => {
        if (actaOrdenDia.length === 1) return;
        const next = actaOrdenDia.filter((_, i) => i !== index);
        setActaOrdenDia(next);
        syncActaDesarrolloLength(next);
    };

    const updateActaDesarrolloItem = (index, value) => {
        const next = [...actaDesarrollo];
        next[index] = value;
        setActaDesarrollo(next);
    };

    const executePdfGeneration = async () => {
        setIsGenerating(true);
        const toastId = toast.loading("Generando PDF...");

        try {
            if (!targetFolderId) {
                throw new Error("No se encontro la carpeta destino para guardar el PDF.");
            }

            closeConfirmGenerateModal();

            if (!pdfFormRef.current) {
                throw new Error("No se encontro el formulario de PDF.");
            }

            const form = new FormData(pdfFormRef.current);
            form.set("footer_text", footerText);
            form.set("folder_id", targetFolderId);
            if (targetSheetId) {
                form.set("sheet_id", targetSheetId);
            }
            if (customLogoFile) {
                form.set("logo_file", customLogoFile);
            }
            if (customSignatureFile) {
                form.set("signature_file", customSignatureFile);
            }

            const response = await api.post("/generate-pdf-to-explorer", form);

            toast.dismiss(toastId);
            toast.success("PDF generado y guardado correctamente");

            const redirectFolderId = response.data?.folder_id || targetFolderId;
            const redirectSheetId = response.data?.sheet_id || targetSheetId || undefined;
            router.visit(route('explorer', {
                folder_id: redirectFolderId,
                sheet_id: redirectSheetId,
            }));
        } catch (error) {
            toast.dismiss(toastId);

            let errorMessage = "No se pudo generar el PDF";
            errorMessage = error?.response?.data?.error || error?.message || errorMessage;

            toast.error(errorMessage);
        } finally {
            setIsGenerating(false);
        }
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        if (isGenerating) return;
        openConfirmGenerateModal();
    };

    const handleSaveFooter = async () => {
        setIsSavingFooter(true);
        try {
            const response = await api.post("/pdf/footer-preference", {
                footer_text: footerText,
            });

            if (response.data?.footer_text) {
                setFooterText(response.data.footer_text);
            }
            showUploadToast("success", "Pie de pagina guardado correctamente.");
            closeFooterModal();
        } catch (error) {
            const errorMessage = error?.response?.data?.message || error?.response?.data?.error || "No se pudo guardar el pie de pagina.";
            showUploadToast("error", errorMessage);
        } finally {
            setIsSavingFooter(false);
        }
    };

    const handleResetFooter = async () => {
        setIsSavingFooter(true);
        try {
            const response = await api.post("/pdf/footer-preference", {
                footer_text: defaultFooterText,
            });

            if (response.data?.footer_text) {
                setFooterText(response.data.footer_text);
            } else {
                setFooterText(defaultFooterText);
            }

            showUploadToast("success", "Pie de pagina restablecido correctamente.");
            closeFooterModal();
        } catch (error) {
            const errorMessage = error?.response?.data?.message || error?.response?.data?.error || "No se pudo restablecer el pie de pagina.";
            showUploadToast("error", errorMessage);
        } finally {
            setIsSavingFooter(false);
        }
    };

    return (
        <DashboardLayout>
            <div className="h-full overflow-y-auto bg-gray-100 flex flex-col">
                {uploadToastState && (
                    <div className="toast toast-bottom toast-end z-80 mb-4 mr-4">
                        <div className={`alert shadow-lg ${uploadToastState.type === "error" ? "alert-error" : "bg-primary text-white border-primary"}`}>
                            <span>{uploadToastState.message}</span>
                        </div>
                    </div>
                )}

                <div className="sticky top-0 z-20 bg-white border-b border-gray-200 shadow-sm flex items-center justify-between px-6 py-3">
                    <button
                        type="button"
                        onClick={() => router.visit(route("explorer"))}
                        className="flex items-center gap-2 text-sm font-bold text-gray-500 hover:text-primary transition-colors"
                    >
                        <ArrowLeftIcon className="size-4" />
                        Volver al Explorador
                    </button>

                    <div className="flex items-center gap-3 flex-wrap justify-end">
                        <span className="text-sm font-bold text-gray-600 hidden sm:block">
                            Seleccionar tipo de documento
                        </span>
                        <select
                            name="document_type"
                            value={documentType}
                            onChange={(e) => setDocumentType(e.target.value)}
                            className="h-10 min-w-44 rounded-xl border border-gray-200 bg-white px-3 text-sm font-bold text-gray-700 focus:border-primary focus:outline-none"
                        >
                            {DOCUMENT_TYPES.map((type) => (
                                <option key={type.value} value={type.value}>{type.label}</option>
                            ))}
                        </select>

                        <button
                            type="button"
                            onClick={openFooterModal}
                            className="btn btn-sm rounded-xl bg-base-200 border-gray-200 text-gray-700 hover:bg-base-300"
                        >
                            Editar pie de pagina
                        </button>

                        <button
                            type="submit"
                            form="pdfForm"
                            disabled={isGenerating}
                            className="btn bg-primary text-white border-0 rounded-xl shadow-lg shadow-primary/20 px-6 disabled:opacity-50"
                        >
                            <DocumentArrowDownIcon className="size-5 mr-2" />
                            {isGenerating ? "Generando..." : "Generar PDF"}
                        </button>
                    </div>
                </div>

                <div className="flex-1 flex items-start justify-center p-6 sm:p-10 pb-16">
                    <form
                        ref={pdfFormRef}
                        id="pdfForm"
                        onSubmit={handleSubmit}
                        className="bg-white shadow-2xl w-full max-w-[794px] min-h-[1123px] px-14 py-12 leading-relaxed text-[11pt] text-gray-900"
                        style={{ fontFamily: "'Helvetica', 'Arial', sans-serif" }}
                    >
                        <input type="hidden" name="document_type" value={documentType} />
                        <input type="hidden" name="acta_asistentes_json" value={JSON.stringify(actaAsistentes)} />
                        <input type="hidden" name="acta_invitados_json" value={JSON.stringify(actaInvitados)} />
                        <input type="hidden" name="acta_ausentes_json" value={JSON.stringify(actaAusentes)} />
                        <input type="hidden" name="acta_orden_dia_json" value={JSON.stringify(actaOrdenDia)} />
                        <input type="hidden" name="acta_desarrollo_json" value={JSON.stringify(actaDesarrollo)} />
                        <input type="hidden" name="informe_elaborado_por_json" value={JSON.stringify(informeElaboradoPor)} />
                        <input type="hidden" name="informe_objetivos_json" value={JSON.stringify(informeObjetivos)} />
                        <input type="hidden" name="informe_conclusiones_json" value={JSON.stringify(informeConclusiones)} />
                        <input type="hidden" name="informe_recomendaciones_json" value={JSON.stringify(informeRecomendaciones)} />
                        <input
                            ref={logoInputRef}
                            type="file"
                            accept=".png,.jpg,.jpeg,image/png,image/jpeg"
                            className="hidden"
                            onChange={handleLogoChange}
                        />
                        <input
                            ref={signatureInputRef}
                            type="file"
                            accept=".png,.jpg,.jpeg,.svg,image/png,image/jpeg,image/svg+xml"
                            className="hidden"
                            onChange={handleSignatureChange}
                        />

                        <div className="mb-8">
                            <div className="relative inline-block group">
                                <button
                                    type="button"
                                    onClick={openLogoPicker}
                                    className="relative rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/40"
                                    aria-label="Cambiar logo"
                                >
                                    <img src={logoPreviewUrl} alt="Logo institucional" className="h-16 w-auto object-contain" />
                                    <span className="absolute inset-0 rounded-lg bg-black/0 group-hover:bg-black/30 transition-colors" />
                                    <span className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                        <span className="bg-white/90 rounded-full p-1.5 shadow-md">
                                            <PencilIcon className="size-4 text-gray-700" />
                                        </span>
                                    </span>
                                </button>

                                {isUsingCustomLogo && (
                                    <button
                                        type="button"
                                        disabled={isSavingLogo}
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            resetLogo();
                                        }}
                                        className="absolute -top-2 -right-2 rounded-full bg-white border border-gray-200 shadow p-1 hover:bg-gray-100 disabled:opacity-50"
                                        aria-label="Restaurar logo predeterminado"
                                    >
                                        <XMarkIcon className="size-4 text-gray-600" />
                                    </button>
                                )}
                            </div>
                        </div>

                        {documentType === "carta" && (
                            <>
                                <div className="mb-6 space-y-3">
                                    <DocInput name="codigo" placeholder="Codigo" className="w-44 text-[11pt]" />
                                    <div className="flex flex-wrap gap-4 mt-1">
                                        <DocInput name="lugar" placeholder="Lugar" className="flex-1 min-w-40 text-[11pt]" />
                                        <DocInput name="fecha" type="date" className="text-[11pt] text-gray-600" />
                                    </div>
                                </div>

                                <div className="my-8 space-y-2">
                                    <DocInput name="tratamiento" placeholder="Tratamiento" className="w-full text-[11pt]" />
                                    <DocInput name="nombres" placeholder="Nombres y apellidos" className="w-full text-[11pt] font-bold" />
                                    <DocInput name="cargo" placeholder="Cargo" className="w-full text-[11pt]" />
                                    <DocInput name="empresa" placeholder="Empresa" className="w-full text-[11pt]" />
                                    <DocInput name="direccion" placeholder="Direccion" className="w-full text-[11pt]" />
                                    <DocInput name="ciudad" placeholder="Ciudad" className="w-full text-[11pt]" />
                                </div>

                                <DocInput name="asunto" placeholder="Asunto" className="w-full text-[11pt] mb-4" />
                                <DocInput name="saludo" placeholder="Saludo" className="w-full text-[11pt] mb-4" />
                                <DocArea name="texto" rows={10} placeholder="Cuerpo de la carta" className="text-justify mb-8" />
                                <DocInput name="despedida1" placeholder="Despedida" className="w-full text-[11pt] mb-16" />

                                <div className="mt-8 mb-10">
                                    <div className="w-[250px] space-y-1">
                                        <div className="relative group mb-2">
                                            <button
                                                type="button"
                                                onClick={openSignaturePicker}
                                                className="relative rounded-md focus:outline-none focus:ring-2 focus:ring-primary/40"
                                                aria-label="Cambiar firma"
                                            >
                                                {signaturePreviewUrl ? (
                                                    <img src={signaturePreviewUrl} alt="Firma" className="h-12 w-[220px] object-contain" />
                                                ) : (
                                                    <div className="h-12 w-[220px]" />
                                                )}
                                                <span className="absolute inset-0 rounded-md bg-black/0 group-hover:bg-black/20 transition-colors" />
                                                <span className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <span className="bg-white/90 rounded-full p-1.5 shadow-md">
                                                        <PencilIcon className="size-4 text-gray-700" />
                                                    </span>
                                                </span>
                                            </button>

                                            {isUsingCustomSignature && (
                                                <button
                                                    type="button"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        resetSignature();
                                                    }}
                                                    className="absolute -top-2 -right-2 rounded-full bg-white border border-gray-200 shadow p-1 hover:bg-gray-100"
                                                    aria-label="Quitar firma"
                                                >
                                                    <XMarkIcon className="size-4 text-gray-600" />
                                                </button>
                                            )}
                                        </div>
                                        <div className="border-t border-gray-800 pt-2 space-y-1">
                                        <DocInput name="firma_nombres" placeholder="Nombres y apellidos del firmante" className="w-full text-[11pt] font-bold" />
                                        <DocInput name="firma_cargo" placeholder="Cargo del firmante" className="w-full text-[11pt]" />
                                        </div>
                                    </div>
                                </div>

                                <div className="mt-10 text-[10pt] space-y-2">
                                    <DocInput name="anexo" placeholder="Anexo" className="w-full text-[10pt]" />
                                    <DocInput name="copia" placeholder="Copia" className="w-full text-[10pt]" />
                                    <DocInput name="redactor" placeholder="Redactor" className="w-full text-[10pt]" />
                                    <DocInput name="transcriptor" placeholder="Transcriptor" className="w-full text-[10pt]" />
                                </div>
                            </>
                        )}

                        {documentType === "circular" && (
                            <>
                                <DocInput name="titulo" placeholder="Titulo" className="w-full text-center text-[13pt] font-bold mb-8" />
                                <div className="mb-6 space-y-3">
                                    <DocInput name="codigo" placeholder="Codigo" className="w-44 text-[11pt]" />
                                    <div className="flex flex-wrap gap-4 mt-1">
                                        <DocInput name="lugar" placeholder="Lugar" className="flex-1 min-w-40 text-[11pt]" />
                                        <DocInput name="fecha" type="date" className="text-[11pt] text-gray-600" />
                                    </div>
                                </div>
                                <DocInput name="grupo_destinatario" placeholder="Grupo destinatario" className="w-full text-[11pt] mb-4" />
                                <DocInput name="asunto" placeholder="Asunto" className="w-full text-[11pt] mb-4" />
                                <DocInput name="saludo" placeholder="Saludo" className="w-full text-[11pt] mb-4" />
                                <DocArea name="texto" rows={10} placeholder="Cuerpo de la circular" className="text-justify mb-8" />
                                <DocInput name="despedida1" placeholder="Despedida" className="w-full text-[11pt] mb-16" />

                                <div className="mt-8 mb-10">
                                    <div className="w-[250px] space-y-1">
                                        <div className="relative group mb-2">
                                            <button
                                                type="button"
                                                onClick={openSignaturePicker}
                                                className="relative rounded-md focus:outline-none focus:ring-2 focus:ring-primary/40"
                                                aria-label="Cambiar firma"
                                            >
                                                {signaturePreviewUrl ? (
                                                    <img src={signaturePreviewUrl} alt="Firma" className="h-12 w-[220px] object-contain" />
                                                ) : (
                                                    <div className="h-12 w-[220px]" />
                                                )}
                                                <span className="absolute inset-0 rounded-md bg-black/0 group-hover:bg-black/20 transition-colors" />
                                                <span className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <span className="bg-white/90 rounded-full p-1.5 shadow-md">
                                                        <PencilIcon className="size-4 text-gray-700" />
                                                    </span>
                                                </span>
                                            </button>

                                            {isUsingCustomSignature && (
                                                <button
                                                    type="button"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        resetSignature();
                                                    }}
                                                    className="absolute -top-2 -right-2 rounded-full bg-white border border-gray-200 shadow p-1 hover:bg-gray-100"
                                                    aria-label="Quitar firma"
                                                >
                                                    <XMarkIcon className="size-4 text-gray-600" />
                                                </button>
                                            )}
                                        </div>
                                        <div className="border-t border-gray-800 pt-2 space-y-1">
                                        <DocInput name="firma_nombres" placeholder="Nombres y apellidos del firmante" className="w-full text-[11pt] font-bold" />
                                        <DocInput name="firma_cargo" placeholder="Cargo del firmante" className="w-full text-[11pt]" />
                                        </div>
                                    </div>
                                </div>

                                <div className="mt-10 text-[10pt] space-y-2">
                                    <DocInput name="anexo" placeholder="Anexo" className="w-full text-[10pt]" />
                                    <DocInput name="copia" placeholder="Copia" className="w-full text-[10pt]" />
                                    <DocInput name="redactor" placeholder="Redactor" className="w-full text-[10pt]" />
                                    <DocInput name="transcriptor" placeholder="Transcriptor" className="w-full text-[10pt]" />
                                </div>
                            </>
                        )}

                        {documentType === "acta" && (
                            <>
                                <DocInput name="titulo" placeholder="Titulo" className="w-full text-center text-[13pt] font-bold mb-6" />
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
                                    <DocInput name="fecha" type="date" placeholder="Fecha" className="text-[11pt]" />
                                    <DocInput name="hora" type="time" placeholder="Hora" className="text-[11pt]" />
                                    <DocInput name="lugar" placeholder="Lugar" className="text-[11pt]" />
                                </div>

                                <EditableList title="Asistentes" items={actaAsistentes} setItems={setActaAsistentes} placeholder="Nombre completo" />
                                <EditableList title="Invitados" items={actaInvitados} setItems={setActaInvitados} placeholder="Nombre completo" />
                                <EditableList title="Ausentes" items={actaAusentes} setItems={setActaAusentes} placeholder="Nombre completo" />

                                <section className="mb-6">
                                    <p className="text-[11pt] font-bold mb-2">Orden del dia</p>
                                    <div className="space-y-2">
                                        {actaOrdenDia.map((item, index) => (
                                            <div key={`agenda-${index}`} className="flex items-start gap-2">
                                                <span className="text-sm font-bold text-gray-500 pt-2 min-w-6">{index + 1}.</span>
                                                <DocInput
                                                    value={item}
                                                    onChange={(e) => updateActaOrdenDiaItem(index, e.target.value)}
                                                    placeholder="Punto del orden del dia"
                                                    className="flex-1 text-[11pt]"
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => removeActaOrdenDiaItem(index)}
                                                    className="text-xs px-2 py-1 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-600"
                                                >
                                                    Quitar
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                    <button
                                        type="button"
                                        onClick={addActaOrdenDiaItem}
                                        className="mt-2 text-xs px-3 py-1.5 rounded-lg bg-primary/10 hover:bg-primary/20 text-primary font-bold"
                                    >
                                        + Agregar punto
                                    </button>
                                </section>

                                <section className="mb-6">
                                    <p className="text-[11pt] font-bold mb-2">Desarrollo</p>
                                    <div className="space-y-4">
                                        {actaOrdenDia.map((item, index) => (
                                            <div key={`desarrollo-${index}`} className="space-y-2">
                                                <p className="font-bold text-[11pt]">{item?.trim() || `Punto ${index + 1}`}</p>
                                                <DocArea
                                                    rows={3}
                                                    placeholder="Descripcion del desarrollo"
                                                    value={actaDesarrollo[index] || ""}
                                                    onChange={(e) => updateActaDesarrolloItem(index, e.target.value)}
                                                />
                                            </div>
                                        ))}
                                    </div>
                                </section>

                                <DocArea name="acta_cuerpo_informe" rows={8} placeholder="Cuerpo del informe" className="text-justify mb-6" />
                                <DocInput name="convocatoria" placeholder="Convocatoria" className="w-full text-[11pt] mb-16" />

                                <div className="mt-8 mb-10">
                                    <div className="w-[250px] space-y-1">
                                        <div className="relative group mb-2">
                                            <button
                                                type="button"
                                                onClick={openSignaturePicker}
                                                className="relative rounded-md focus:outline-none focus:ring-2 focus:ring-primary/40"
                                                aria-label="Cambiar firma"
                                            >
                                                {signaturePreviewUrl ? (
                                                    <img src={signaturePreviewUrl} alt="Firma" className="h-12 w-[220px] object-contain" />
                                                ) : (
                                                    <div className="h-12 w-[220px]" />
                                                )}
                                                <span className="absolute inset-0 rounded-md bg-black/0 group-hover:bg-black/20 transition-colors" />
                                                <span className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <span className="bg-white/90 rounded-full p-1.5 shadow-md">
                                                        <PencilIcon className="size-4 text-gray-700" />
                                                    </span>
                                                </span>
                                            </button>

                                            {isUsingCustomSignature && (
                                                <button
                                                    type="button"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        resetSignature();
                                                    }}
                                                    className="absolute -top-2 -right-2 rounded-full bg-white border border-gray-200 shadow p-1 hover:bg-gray-100"
                                                    aria-label="Quitar firma"
                                                >
                                                    <XMarkIcon className="size-4 text-gray-600" />
                                                </button>
                                            )}
                                        </div>
                                        <div className="border-t border-gray-800 pt-2 space-y-1">
                                        <DocInput name="firma_nombres" placeholder="Nombres y apellidos" className="w-full text-[11pt] font-bold" />
                                        <DocInput name="firma_cargo" placeholder="Cargo" className="w-full text-[11pt]" />
                                        </div>
                                    </div>
                                </div>

                                <div className="mt-10 text-[10pt] space-y-2">
                                    <DocInput name="anexo" placeholder="Anexo" className="w-full text-[10pt]" />
                                    <DocInput name="transcriptor" placeholder="Transcriptor" className="w-full text-[10pt]" />
                                </div>
                            </>
                        )}

                        {documentType === "informe" && (
                            <>
                                <DocInput name="codigo" placeholder="Codigo" className="w-44 text-[11pt] mb-4" />
                                <DocInput name="titulo" placeholder="Titulo" className="w-full text-center text-[13pt] font-bold mb-4" />
                                <DocInput name="fecha" type="date" placeholder="Fecha" className="text-[11pt] mb-6" />

                                <EditableList
                                    title="Elaborado por"
                                    items={informeElaboradoPor}
                                    setItems={setInformeElaboradoPor}
                                    placeholder="Nombre completo"
                                />

                                <EditableList
                                    title="Objetivos"
                                    items={informeObjetivos}
                                    setItems={setInformeObjetivos}
                                    placeholder="Objetivo"
                                    numbered
                                />

                                <p className="font-bold text-[11pt] mb-2">Titulo de la actividad</p>
                                <DocInput name="informe_titulo_actividad" placeholder="Titulo de la actividad" className="w-full text-[11pt] mb-4" />
                                <DocArea name="informe_cuerpo" rows={8} placeholder="Cuerpo del informe" className="text-justify mb-6" />

                                <EditableList
                                    title="Conclusiones"
                                    items={informeConclusiones}
                                    setItems={setInformeConclusiones}
                                    placeholder="Conclusion"
                                    numbered
                                    multiline
                                />

                                <EditableList
                                    title="Recomendaciones"
                                    items={informeRecomendaciones}
                                    setItems={setInformeRecomendaciones}
                                    placeholder="Recomendacion"
                                    numbered
                                    multiline
                                />

                                <div className="mt-8 mb-10">
                                    <div className="w-[250px] space-y-1">
                                        <div className="relative group mb-2">
                                            <button
                                                type="button"
                                                onClick={openSignaturePicker}
                                                className="relative rounded-md focus:outline-none focus:ring-2 focus:ring-primary/40"
                                                aria-label="Cambiar firma"
                                            >
                                                {signaturePreviewUrl ? (
                                                    <img src={signaturePreviewUrl} alt="Firma" className="h-12 w-[220px] object-contain" />
                                                ) : (
                                                    <div className="h-12 w-[220px]" />
                                                )}
                                                <span className="absolute inset-0 rounded-md bg-black/0 group-hover:bg-black/20 transition-colors" />
                                                <span className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <span className="bg-white/90 rounded-full p-1.5 shadow-md">
                                                        <PencilIcon className="size-4 text-gray-700" />
                                                    </span>
                                                </span>
                                            </button>

                                            {isUsingCustomSignature && (
                                                <button
                                                    type="button"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        resetSignature();
                                                    }}
                                                    className="absolute -top-2 -right-2 rounded-full bg-white border border-gray-200 shadow p-1 hover:bg-gray-100"
                                                    aria-label="Quitar firma"
                                                >
                                                    <XMarkIcon className="size-4 text-gray-600" />
                                                </button>
                                            )}
                                        </div>
                                        <div className="border-t border-gray-800 pt-2 space-y-1">
                                        <DocInput name="firma_nombres" placeholder="Nombres y apellidos" className="w-full text-[11pt] font-bold" />
                                        <DocInput name="firma_cargo" placeholder="Cargo" className="w-full text-[11pt]" />
                                        </div>
                                    </div>
                                </div>

                                <div className="mt-10 text-[10pt] space-y-2">
                                    <DocInput name="anexo" placeholder="Anexo" className="w-full text-[10pt]" />
                                    <DocInput name="transcriptor" placeholder="Transcriptor" className="w-full text-[10pt]" />
                                </div>
                            </>
                        )}

                        {documentType === "constancia" && (
                            <>
                                <DocInput name="codigo" placeholder="Codigo" className="w-44 text-[11pt] mb-4" />
                                <DocInput name="constancia_cargo_quien_consta" placeholder="Cargo de quien consta" className="w-full text-center text-[13pt] font-bold mb-6" />
                                <p className="text-center font-bold text-[13pt] mb-6">HACE CONSTAR</p>
                                <DocArea name="constancia_cuerpo" rows={10} placeholder="Cuerpo de la constancia" className="text-justify mb-10" />

                                <div className="mt-8 mb-10">
                                    <div className="w-[250px] space-y-1">
                                        <div className="relative group mb-2">
                                            <button
                                                type="button"
                                                onClick={openSignaturePicker}
                                                className="relative rounded-md focus:outline-none focus:ring-2 focus:ring-primary/40"
                                                aria-label="Cambiar firma"
                                            >
                                                {signaturePreviewUrl ? (
                                                    <img src={signaturePreviewUrl} alt="Firma" className="h-12 w-[220px] object-contain" />
                                                ) : (
                                                    <div className="h-12 w-[220px]" />
                                                )}
                                                <span className="absolute inset-0 rounded-md bg-black/0 group-hover:bg-black/20 transition-colors" />
                                                <span className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <span className="bg-white/90 rounded-full p-1.5 shadow-md">
                                                        <PencilIcon className="size-4 text-gray-700" />
                                                    </span>
                                                </span>
                                            </button>

                                            {isUsingCustomSignature && (
                                                <button
                                                    type="button"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        resetSignature();
                                                    }}
                                                    className="absolute -top-2 -right-2 rounded-full bg-white border border-gray-200 shadow p-1 hover:bg-gray-100"
                                                    aria-label="Quitar firma"
                                                >
                                                    <XMarkIcon className="size-4 text-gray-600" />
                                                </button>
                                            )}
                                        </div>
                                        <div className="border-t border-gray-800 pt-2 space-y-1">
                                        <DocInput name="firma_nombres" placeholder="Nombres y apellidos" className="w-full text-[11pt] font-bold" />
                                        </div>
                                    </div>
                                </div>

                                <div className="mt-10 text-[10pt] space-y-2">
                                    <DocInput name="anexo" placeholder="Anexo" className="w-full text-[10pt]" />
                                    <DocInput name="transcriptor" placeholder="Transcriptor" className="w-full text-[10pt]" />
                                </div>
                            </>
                        )}

                        <div className="mt-10 text-center text-[10pt] text-gray-500 leading-snug whitespace-pre-line">
                            {footerText}
                        </div>
                    </form>
                </div>
            </div>

            <dialog ref={footerModalRef} className="modal">
                <div className="modal-box max-w-xl">
                    <div className="flex items-center justify-between gap-3 mb-4">
                        <h3 className="font-bold text-lg">Personalizar pie de pagina</h3>
                        <button
                            type="button"
                            onClick={handleResetFooter}
                            disabled={isSavingFooter}
                            className="btn btn-sm btn-outline border-gray-300 text-gray-700 hover:bg-gray-100 disabled:opacity-50"
                        >
                            Reestablecer
                        </button>
                    </div>
                    <p className="text-sm text-gray-500 mb-3">
                        Este pie se guarda por cuenta y se reutiliza al volver al creador de PDF.
                    </p>
                    <textarea
                        value={footerText}
                        onChange={(e) => setFooterText(e.target.value)}
                        rows={4}
                        className="w-full textarea textarea-bordered text-sm leading-relaxed"
                        placeholder="Escribe el pie de pagina del documento"
                    />

                    <div className="modal-action">
                        <button
                            type="button"
                            onClick={closeFooterModal}
                            className="btn btn-ghost"
                        >
                            Cancelar
                        </button>
                        <button
                            type="button"
                            onClick={handleSaveFooter}
                            disabled={isSavingFooter}
                            className="btn bg-primary text-white border-0 disabled:opacity-50"
                        >
                            {isSavingFooter ? "Guardando..." : "Guardar pie de pagina"}
                        </button>
                    </div>
                </div>
                <form method="dialog" className="modal-backdrop">
                    <button>Cerrar</button>
                </form>
            </dialog>

            <dialog ref={confirmGenerateModalRef} className="modal">
                <div className="modal-box max-w-md">
                    <h3 className="font-bold text-lg mb-3">Confirmar generación</h3>
                    <p className="text-sm text-gray-600">
                        ¿Estás seguro que deseas generar este PDF?
                    </p>

                    <div className="modal-action">
                        <button
                            type="button"
                            onClick={closeConfirmGenerateModal}
                            className="btn btn-ghost"
                            disabled={isGenerating}
                        >
                            Cancelar
                        </button>
                        <button
                            type="button"
                            onClick={executePdfGeneration}
                            className="btn bg-primary text-white border-0 disabled:opacity-50"
                            disabled={isGenerating}
                        >
                            {isGenerating ? "Generando..." : "Confirmar"}
                        </button>
                    </div>
                </div>
                <form method="dialog" className="modal-backdrop">
                    <button>Cerrar</button>
                </form>
            </dialog>
        </DashboardLayout>
    );
}
