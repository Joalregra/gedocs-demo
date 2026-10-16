import axios from "axios";
import { Fragment, useEffect, useState, useRef } from "react";
import { Head, Link, usePage } from "@inertiajs/react";
import { Dialog, Transition } from "@headlessui/react";
import {
    CheckCircleIcon,
    PaperClipIcon,
    ArrowPathIcon,
    ChatBubbleLeftRightIcon,
    ArrowLeftIcon,
    DocumentArrowDownIcon,
    XMarkIcon,
    FolderIcon,
    BuildingOffice2Icon
} from "@heroicons/react/24/solid";
import { toast } from "sonner";

const FALLBACK_LOGO_PATH = "/brand/gedocs-logo.png";
const ALLOWED_LOGO_TYPES = ["image/png", "image/jpeg"];

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

export default function Comunication({ pqrID }) {
    const { auth, institution } = usePage().props;
    const DEFAULT_LOGO_PATH = institution?.logo_url ?? FALLBACK_LOGO_PATH;
    const initialUserLogoUrl = auth?.user?.pdf_logo_path ? `/storage/${auth.user.pdf_logo_path}` : DEFAULT_LOGO_PATH;

    const [comunication, setComunication] = useState({});
    const [pqr, setPqr] = useState({});
    const [dependency, setDependency] = useState({});
    const [attachments, setAttachments] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submitted, setSubmitted] = useState(false);

    // PDF specific states (Strictly Carta)
    const [logoPreviewUrl, setLogoPreviewUrl] = useState(initialUserLogoUrl);
    const [customLogoFile, setCustomLogoFile] = useState(null);
    const [signaturePreviewUrl, setSignaturePreviewUrl] = useState(null);
    const [customSignatureFile, setCustomSignatureFile] = useState(null);

    // Modal de Carpeta Recursivo
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [allSheetFolders, setAllSheetFolders] = useState([]);
    const [navigationPath, setNavigationPath] = useState([]); // [{ options: [], selectedId: "" }]
    const [tempFormData, setTempFormData] = useState(null);

    const logoInputRef = useRef(null);
    const signatureInputRef = useRef(null);

    useEffect(() => {
        async function fetchInitialData() {
            try {
                const isInternalId = !isNaN(pqrID);
                const endpoint = isInternalId
                    ? `/api/pqr/response-details/${pqrID}`
                    : `/api/pqr/responder/${pqrID}`;

                const res = await axios.get(endpoint);
                const data = res.data.data;
                setComunication(data.communication || {});
                setPqr(data.pqr || {});
                setDependency(data.dependency || {});

                // Cargar todas las carpetas de la entidad ligada a la PQR
                if (data.dependency?.sheet_number_id) {
                    const foldersRes = await axios.get(`/api/folders-by-sheet?sheet_id=${data.dependency.sheet_number_id}`);
                    const folderList = foldersRes.data || [];
                    setAllSheetFolders(folderList);

                    // Inicializar jerarquía con el primer nivel: Años (parent_id = null)
                    const rootYears = folderList.filter(f => f.parent_id === null);
                    const initialPath = [{ options: rootYears, selectedId: "" }];

                    // Pre-seleccionar año actual si existe
                    const currentYearStr = new Date().getFullYear().toString();
                    const currentYearNode = rootYears.find(y => y.name === currentYearStr);

                    if (currentYearNode) {
                        initialPath[0].selectedId = currentYearNode.id.toString();
                        // Si el año tiene hijos, añadir el siguiente nivel automáticamente
                        const children = folderList.filter(f => f.parent_id === currentYearNode.id);
                        if (children.length > 0) {
                            initialPath.push({ options: children, selectedId: "" });
                        }
                    }
                    setNavigationPath(initialPath);
                }
            } catch (e) {
                console.error(e);
                toast.error("Error al cargar datos.");
            } finally {
                setIsLoading(false);
            }
        }
        fetchInitialData();
    }, [pqrID]);

    const handlePathSelect = (index, folderId) => {
        let newPath = [...navigationPath];
        newPath[index].selectedId = folderId;

        // Truncar cualquier nivel posterior al actual
        newPath = newPath.slice(0, index + 1);

        if (folderId) {
            // Buscar si la carpeta seleccionada tiene hijos
            const children = allSheetFolders.filter(f => f.parent_id === parseInt(folderId));
            if (children.length > 0) {
                newPath.push({ options: children, selectedId: "" });
            }
        }
        setNavigationPath(newPath);
    };

    const handleLogoChange = (event) => {
        const file = event.target.files?.[0];
        if (!file || !ALLOWED_LOGO_TYPES.includes(file.type)) {
            toast.error("Imagen no válida.");
            return;
        }
        setCustomLogoFile(file);
        setLogoPreviewUrl(URL.createObjectURL(file));
    };

    const handleSignatureChange = (event) => {
        const file = event.target.files?.[0];
        if (!file) return;
        setCustomSignatureFile(file);
        setSignaturePreviewUrl(URL.createObjectURL(file));
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        const data = new FormData(e.target);
        setTempFormData(data);
        setIsModalOpen(true);
    };

    const handleConfirmSave = async () => {
        // Obtenemos el ID de la última carpeta seleccionada en el camino
        const finalFolderId = [...navigationPath].reverse().find(p => p.selectedId)?.selectedId;

        if (!finalFolderId) {
            toast.error("Por favor seleccione al menos una carpeta de destino (Año o superior).");
            return;
        }

        setIsModalOpen(false);
        setIsSubmitting(true);
        const toastId = toast.loading("Fusionando PDFs y archivando...");

        try {
            const data = tempFormData;
            data.append("pqr_id", pqrID);
            data.append("folder_id", finalFolderId);

            if (customLogoFile) data.append("logo_file", customLogoFile);
            if (customSignatureFile) data.append("signature_file", customSignatureFile);

            attachments.forEach((file) => {
                const isPdf = file.name.toLowerCase().endsWith(".pdf");
                if (!isPdf) {
                    toast.error(`El archivo ${file.name} no es PDF.`);
                    throw new Error("Invalid format");
                }
                data.append("support_files[]", file);
            });

            await axios.post(`/api/pdf/generate-response`, data, {
                headers: { "Content-Type": "multipart/form-data" },
            });

            toast.dismiss(toastId);
            toast.success("Respuesta enviada y PDF archivado correctamente.");
            setSubmitted(true);
        } catch (error) {
            console.error(error);
            toast.dismiss(toastId);
            if (error.message !== "Invalid format") {
                toast.error(error.response?.data?.error || "Error al procesar.");
            }
            setIsSubmitting(false);
        }
    };

    if (isLoading) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                    <span className="loading loading-spinner loading-lg text-primary"></span>
                    <p className="text-gray-500 font-medium animate-pulse">Cargando información...</p>
                </div>
            </div>
        );
    }

    if (submitted) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
                <Head title="Respuesta Enviada" />
                <div className="bg-white rounded-3xl p-10 w-full max-w-md text-center shadow-xl border border-gray-100 animate-in fade-in zoom-in duration-300">
                    <div className="bg-green-100 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
                        <CheckCircleIcon className="w-12 h-12 text-primary" />
                    </div>
                    <h1 className="text-2xl font-bold text-gray-800 mb-2 font-outfit">¡Respuesta enviada!</h1>
                    <p className="text-gray-600 mb-8 leading-relaxed">
                        Tu respuesta ha sido registrada exitosamente en el sistema GeDocs con el documento PDF generado.
                    </p>
                    <Link href="/" className="btn btn-primary w-full text-white font-bold rounded-xl shadow-lg shadow-primary/20">
                        Volver al inicio
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-100 flex flex-col pb-10">
            <Head title={`Responder PQR #${pqr.id}`} />

            {/* Toolbar superior */}
            <div className="sticky top-0 z-30 bg-white border-b border-gray-200 shadow-sm flex flex-wrap items-center justify-between px-4 sm:px-6 py-3 gap-3">
                <div className="flex items-center gap-2 sm:gap-4 w-full sm:w-auto overflow-hidden">
                    <Link href="/" className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm font-bold text-gray-500 hover:text-primary transition-colors whitespace-nowrap">
                        <ArrowLeftIcon className="size-4" />
                        <span className="hidden xs:inline sm:inline">Volver</span>
                    </Link>
                    <div className="h-4 sm:h-6 w-[1px] bg-gray-200 flex-shrink-0" />
                    <div className="flex flex-col min-w-0">
                        <span className="text-[9px] sm:text-[10px] uppercase font-bold text-gray-400 leading-none">PQR Radicado</span>
                        <span className="font-bold text-gray-700 text-xs sm:text-sm truncate">#{pqr.id} - {pqr.affair}</span>
                    </div>
                </div>

                <div className="flex items-center gap-2 sm:gap-3 w-full sm:w-auto justify-end">
                    <div className="hidden md:block px-3 py-1 bg-primary/10 text-primary text-[10px] sm:text-xs font-bold rounded-lg uppercase tracking-wider whitespace-nowrap">
                        Formato Carta
                    </div>

                    <button
                        type="submit"
                        form="responseForm"
                        disabled={isSubmitting}
                        className="btn btn-sm h-9 bg-primary text-white border-0 rounded-lg shadow-md shadow-primary/20 px-3 sm:px-4 disabled:opacity-50 flex-1 sm:flex-none"
                    >
                        {isSubmitting ? (
                            <ArrowPathIcon className="size-4 animate-spin mr-1 sm:mr-2" />
                        ) : (
                            <DocumentArrowDownIcon className="size-4 mr-1 sm:mr-2" />
                        )}
                        <span className="text-xs sm:text-sm">{isSubmitting ? "Enviando..." : "Crear PDF y Responder"}</span>
                    </button>
                </div>
            </div>

            <div className="max-w-5xl mx-auto w-full grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-6 p-4 sm:p-6">

                {/* Editor de Documento (Fluído en Móvil) */}
                <div className="w-full pb-4">
                    <form id="responseForm" onSubmit={handleSubmit} className="flex flex-col sm:items-center w-full">
                        <div
                            className="bg-white shadow-xl sm:shadow-2xl w-full max-w-[794px] min-h-[auto] sm:min-h-[1123px] px-5 sm:px-14 py-8 sm:py-12 leading-relaxed text-sm sm:text-[11pt] text-gray-900 border border-gray-200 mx-auto transition-all rounded-2xl sm:rounded-none"
                            style={{ fontFamily: "'Helvetica', 'Arial', sans-serif" }}
                        >
                        {/* Area de Logo */}
                        <div className="mb-8 flex flex-col sm:flex-row justify-between items-start sm:items-start gap-4">
                            <div className="relative inline-block group w-full sm:w-auto text-center sm:text-left">
                                <button
                                    type="button"
                                    onClick={() => logoInputRef.current?.click()}
                                    className="relative rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/40 inline-flex justify-center sm:inline-block"
                                >
                                    <img src={logoPreviewUrl} alt="Logo" className="h-16 w-auto object-contain" />
                                    <span className="absolute inset-0 rounded-lg bg-black/0 group-hover:bg-black/10 transition-colors" />
                                </button>
                                <input ref={logoInputRef} type="file" className="hidden" onChange={handleLogoChange} accept="image/*" />
                            </div>

                            <div className="text-center sm:text-right text-xs sm:text-[10pt] text-gray-400 w-full sm:w-auto">
                                <p>SISTEMA GEDOCS</p>
                                <p>Gestión de PQRs</p>
                            </div>
                        </div>

                        {/* Contenido Formato Carta */}
                        <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                            <div className="mb-6 space-y-3 sm:space-y-4">
                                <div className="flex flex-col sm:flex-row sm:flex-wrap gap-3 sm:gap-4">
                                    <DocInput name="lugar" placeholder="Lugar (Municipio)" className="w-full sm:flex-1 sm:min-w-40 text-sm sm:text-[11pt]" defaultValue={dependency.name || ""} />
                                    <DocInput name="fecha" type="date" className="text-gray-600 w-full sm:w-auto text-sm sm:text-[11pt]" defaultValue={new Date().toISOString().split('T')[0]} />
                                </div>
                            </div>

                            <div className="my-6 sm:my-8 space-y-3">
                                <DocInput name="tratamiento" placeholder="Tratamiento (Ej: Sr, Sra, Dr)" className="w-full text-sm sm:text-[11pt]" />
                                <DocInput name="nombres" placeholder="Nombres y apellidos del destinatario" className="w-full font-bold text-sm sm:text-[11pt]" defaultValue={pqr.sender_name || ""} />
                                <DocInput name="cargo" placeholder="Cargo (Opcional)" className="w-full text-sm sm:text-[11pt]" />
                                <DocInput name="empresa" placeholder="Empresa (Opcional)" className="w-full text-sm sm:text-[11pt]" />
                                <DocInput name="direccion" placeholder="Dirección" className="w-full text-sm sm:text-[11pt]" />
                                <DocInput name="ciudad" placeholder="Ciudad" className="w-full text-sm sm:text-[11pt]" />
                            </div>

                            <div className="flex gap-2 items-center mb-4 sm:mb-6">
                                <span className="font-bold flex-shrink-0">Asunto:</span>
                                <DocInput name="asunto" placeholder="Asunto de la respuesta" className="w-full font-bold text-sm sm:text-[11pt]" defaultValue={`Respuesta a PQR #${pqr.id}`} />
                            </div>

                            <DocInput name="saludo" placeholder="Cordial saludo," className="w-full mb-4 sm:mb-6 text-sm sm:text-[11pt]" />
                            <div className="mb-8">
                                <span className="font-bold block mb-2">Respuesta:</span>
                                <DocArea name="texto" rows={12} placeholder="Redacte aquí la respuesta detallada a la solicitud..." className="text-justify text-sm sm:text-[11pt]" />
                            </div>

                            <DocInput name="despedida1" placeholder="Atentamente," className="w-full mb-10 sm:mb-16 text-sm sm:text-[11pt]" />
                        </div>

                        {/* Firma */}
                        <div className="mt-8 sm:mt-10 mb-8 sm:mb-10 border-t border-gray-100 pt-8">
                            <div className="w-full sm:w-[250px] space-y-2">
                                <div className="relative group mb-3">
                                    <button
                                        type="button"
                                        onClick={() => signatureInputRef.current?.click()}
                                        className="relative rounded-xl sm:rounded-md min-h-[60px] sm:min-h-[50px] w-full flex items-center justify-center border border-dashed border-gray-300 sm:border-gray-200 hover:bg-gray-50 transition-colors bg-gray-50/50 sm:bg-transparent"
                                    >
                                        {signaturePreviewUrl ? (
                                            <img src={signaturePreviewUrl} alt="Firma" className="h-12 w-auto object-contain" />
                                        ) : (
                                            <span className="text-[11px] sm:text-[10px] text-gray-400 font-bold uppercase tracking-widest">Subir Firma</span>
                                        )}
                                    </button>
                                    <input ref={signatureInputRef} type="file" className="hidden" onChange={handleSignatureChange} accept="image/*" />
                                </div>
                                <div className="border-t border-gray-800 pt-3 sm:pt-2 space-y-2 sm:space-y-1">
                                    <DocInput name="firma_nombres" placeholder="Nombre completo del firmante" className="w-full font-bold text-sm sm:text-[11pt]" defaultValue={auth.user?.name} />
                                    <DocInput name="firma_cargo" placeholder="Cargo del firmante" className="w-full text-sm sm:text-[11pt]" />
                                </div>
                            </div>
                        </div>

                        <div className="text-xs sm:text-[9pt] text-gray-400 space-y-2 sm:space-y-1">
                            <DocInput name="anexo" placeholder="Anexos (Opcional)" className="w-full text-xs sm:text-[9pt]" />
                            <DocInput name="copia" placeholder="Copia (Opcional)" className="w-full text-xs sm:text-[9pt]" />
                            <DocInput name="transcriptor" placeholder="Transcriptor (Opcional)" className="w-full text-xs sm:text-[9pt]" />
                            <DocInput name="redactor" placeholder="Redactor (Opcional)" className="w-full text-xs sm:text-[9pt]" />
                        </div>

                        {/* Pie de página editable y centrado */}
                        <div className="mt-8 sm:mt-16 border-t border-gray-100 pt-4">
                            <DocArea
                                name="footer_text"
                                placeholder="Pie de página corporativo..."
                                className="text-center text-[9pt] text-gray-400 border-0 italic"
                                rows={2}
                                defaultValue={institution?.default_footer_short ?? `© Gedocs ${new Date().getFullYear()}`}
                            />
                        </div>
                    </div>
                </form>
                </div>

                {/* Sidebar de Ayuda y Archivos */}
                <div className="space-y-6">

                    {/* Información de la PQR */}
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-5 space-y-4">
                        <h3 className="font-bold text-gray-800 flex items-center gap-2">
                            <ChatBubbleLeftRightIcon className="size-5 text-primary" />
                            Detalles de la PQR
                        </h3>
                        <div className="space-y-3">
                            <div className="bg-gray-50 rounded-xl p-3 border border-gray-100">
                                <span className="text-[10px] uppercase font-bold text-gray-400">Mensaje Original</span>
                                <p className="text-xs text-gray-600 mt-1 line-clamp-6 italic">"{pqr.description}"</p>
                            </div>
                            <div className="flex justify-between text-xs">
                                <span className="text-gray-400">Tipo:</span>
                                <span className="font-bold text-gray-700">{pqr.request_type}</span>
                            </div>
                        </div>
                    </div>

                    {/* Archivos de Soporte */}
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-5 space-y-4">
                        <h3 className="font-bold text-gray-800 flex items-center gap-2">
                            <PaperClipIcon className="size-5 text-gray-400" />
                            Anexar Soportes
                        </h3>
                        <p className="text-[10px] text-gray-400">Adjunte documentos adicionales (JPG, PNG, PDF).</p>

                        <input
                            type="file"
                            multiple
                            onChange={(e) => setAttachments(Array.from(e.target.files))}
                            className="block w-full text-xs text-gray-500
                                file:mr-4 file:py-2 file:px-4
                                file:rounded-full file:border-0
                                file:text-xs file:font-semibold
                                file:bg-primary/10 file:text-primary
                                hover:file:bg-primary/20
                                cursor-pointer"
                        />

                        {attachments.length > 0 && (
                            <div className="space-y-2 mt-4">
                                {attachments.map((file, idx) => (
                                    <div key={idx} className="flex items-center justify-between bg-gray-50 p-2 rounded-lg border border-gray-100 italic text-[10px] text-gray-500">
                                        <span className="truncate max-w-[150px]">{file.name}</span>
                                        <button type="button" onClick={() => setAttachments(attachments.filter((_, i) => i !== idx))}>
                                            <XMarkIcon className="size-3 text-red-400" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    <div className="bg-primary/5 rounded-2xl p-5 border border-primary/10">
                        <h4 className="text-xs font-bold text-primary uppercase tracking-wider mb-2">Ayuda</h4>
                        <p className="text-xs text-primary/80 leading-relaxed">
                            Complete los datos de la carta para generar el documento oficial de respuesta. No olvide verificar la firma antes de enviar.
                        </p>
                    </div>
                </div>
            </div>

            {/* Modal de Selección de Ubicación */}
            <Transition.Root show={isModalOpen} as={Fragment}>
                <Dialog as="div" className="relative z-50" onClose={setIsModalOpen}>
                    <Transition.Child
                        as={Fragment}
                        enter="ease-out duration-300"
                        enterFrom="opacity-0"
                        enterTo="opacity-100"
                        leave="ease-in duration-200"
                        leaveFrom="opacity-100"
                        leaveTo="opacity-0"
                    >
                        <div className="fixed inset-0 bg-gray-500/75 transition-opacity" />
                    </Transition.Child>

                    <div className="fixed inset-0 z-10 overflow-y-auto">
                        <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
                            <Transition.Child
                                as={Fragment}
                                enter="ease-out duration-300"
                                enterFrom="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
                                enterTo="opacity-100 translate-y-0 sm:scale-100"
                                leave="ease-in duration-200"
                                leaveFrom="opacity-100 translate-y-0 sm:scale-100"
                                leaveTo="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
                            >
                                <Dialog.Panel className="relative transform overflow-hidden rounded-3xl bg-white text-left shadow-2xl transition-all sm:my-8 sm:w-full sm:max-w-lg font-outfit">
                                    <div className="bg-white px-4 pb-4 pt-5 sm:p-8 sm:pb-6">
                                        <div className="sm:flex sm:items-start">
                                            <div className="mx-auto flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-primary/10 sm:mx-0 sm:h-12 sm:w-12">
                                                <FolderIcon className="h-6 w-6 text-primary" aria-hidden="true" />
                                            </div>
                                            <div className="mt-3 text-center sm:ml-6 sm:mt-0 sm:text-left w-full">
                                                <Dialog.Title as="h3" className="text-xl font-bold leading-6 text-gray-900">
                                                    Ubicación de guardado
                                                </Dialog.Title>
                                                <div className="mt-2 text-sm text-gray-500">
                                                    Navegue por la jerarquía para elegir dónde archivar este documento.
                                                </div>

                                                <div className="mt-8 space-y-5 max-h-[40vh] overflow-y-auto pr-2 custom-scrollbar">
                                                    {navigationPath.map((level, idx) => (
                                                        <div key={idx} className="space-y-2 group animate-in slide-in-from-top-2 duration-300">
                                                            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2 group-hover:text-primary transition-colors">
                                                                <div className="size-4 rounded-full bg-gray-100 flex items-center justify-center text-[8px] text-gray-400 group-hover:bg-primary/20 group-hover:text-primary">
                                                                    {idx + 1}
                                                                </div>
                                                                {idx === 0 ? "Año / Raíz" : `Subnivel ${idx}`}
                                                            </label>
                                                            <div className="relative">
                                                                <select
                                                                    value={level.selectedId}
                                                                    onChange={(e) => handlePathSelect(idx, e.target.value)}
                                                                    className="w-full bg-gray-50 border border-gray-200 rounded-2xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all appearance-none cursor-pointer hover:bg-white"
                                                                >
                                                                    <option value="">Seleccione una opción...</option>
                                                                    {level.options.map(opt => (
                                                                        <option key={opt.id} value={opt.id}>{opt.name}</option>
                                                                    ))}
                                                                </select>
                                                                <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
                                                                    <ArrowPathIcon className="size-3 animate-spin hidden" />
                                                                </div>
                                                            </div>
                                                        </div>
                                                    ))}

                                                    {navigationPath.length > 0 && navigationPath[navigationPath.length - 1].selectedId && (
                                                        <div className="p-4 bg-primary/5 rounded-2xl border border-dashed border-primary/20 animate-pulse">
                                                            <p className="text-[10px] text-primary font-bold text-center uppercase tracking-widest">
                                                                ✓ Ubicación Seleccionada
                                                            </p>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="bg-gray-50 px-6 py-5 sm:flex sm:flex-row-reverse sm:px-8 gap-3 border-t border-gray-100">
                                        <button
                                            type="button"
                                            className="inline-flex w-full justify-center rounded-2xl bg-primary px-6 py-3 text-sm font-bold text-white shadow-lg shadow-primary/20 hover:bg-primary/90 sm:ml-3 sm:w-auto transition-all transform hover:scale-[1.02] disabled:opacity-50 disabled:scale-100"
                                            onClick={handleConfirmSave}
                                        >
                                            Guardar en esta ubicación
                                        </button>
                                        <button
                                            type="button"
                                            className="mt-3 inline-flex w-full justify-center rounded-2xl bg-white px-6 py-3 text-sm font-bold text-gray-600 shadow-sm ring-1 ring-inset ring-gray-200 hover:bg-gray-50 sm:mt-0 sm:w-auto transition-all"
                                            onClick={() => setIsModalOpen(false)}
                                        >
                                            Cancelar
                                        </button>
                                    </div>
                                </Dialog.Panel>
                            </Transition.Child>
                        </div>
                    </div>
                </Dialog>
            </Transition.Root>
        </div>
    );
}

