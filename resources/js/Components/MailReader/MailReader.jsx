import { ROLES } from "@/constants/roles";
import SenderInformationCard from "@/Components/SenderInformationCard/SenderInformationCard";
import PdfThumbnail from "@/Components/PdfThumbnail/PdfThumbnail";

import { MailContext } from "@/context/MailContext/MailContext";
import { useContext, useMemo, useRef, useState } from "react";
import { ArrowLeftIcon } from "@heroicons/react/24/solid";
import axios from "axios";
import api from "@/lib/axios.js";
import {
    PaperAirplaneIcon,
    CheckCircleIcon,
    ExclamationTriangleIcon,
} from "@heroicons/react/24/outline";
import { usePage, router, Link } from "@inertiajs/react";

export function MailReader() {
    // ─── Context ───────────────────────────────────────────────────────────────
    const {
        mailCards,
        selectedMail,
        setSelectedMail,
        setMailCards,
    } = useContext(MailContext);

    // ─── Page props (hooks must be before any early return) ────────────────────
    const { auth, dependencies = [] } = usePage().props;
    const userRole = auth?.user?.roles?.[0]?.name;
    const isSupervisor = userRole === ROLES.SUPERVISOR;
    const isAdmin = userRole === ROLES.ADMIN;

    // ─── Derived state ─────────────────────────────────────────────────────────
    const currentMail = mailCards.find((mail) => mail.id === selectedMail);

    const relevantDependencies = useMemo(() => {
        if (!currentMail) return [];
        return dependencies.filter(
            (dep) => dep.sheet_number_id === currentMail.sheet_number_id
        );
    }, [dependencies, currentMail]);

    // ─── Local state ───────────────────────────────────────────────────────────
    const [responseText, setResponseText] = useState("");
    const [sending, setSending] = useState(false);
    const [responseUrl, setResponseUrl] = useState("");

    // ─── Helpers ───────────────────────────────────────────────────────────────
    const getDeadlineColor = (createdDateStr, responseDateStr, responseDays) => {
        if (!responseDateStr) return "text-gray-700";
        const now = new Date();
        const deadline = new Date(responseDateStr);
        let totalDuration;
        if (responseDays) {
            totalDuration = responseDays * 24 * 60 * 60 * 1000;
        } else if (createdDateStr) {
            const created = new Date(createdDateStr);
            totalDuration = deadline.getTime() - created.getTime();
        } else {
            return "text-gray-700";
        }
        const timeRemaining = deadline.getTime() - now.getTime();
        const remainingPct = totalDuration > 0 ? (timeRemaining / totalDuration) * 100 : 0;
        if (remainingPct > 80) return "text-primary";
        if (remainingPct > 40 && remainingPct <= 80) return "text-[#F0DA30]";
        return "text-red-600";
    };

    // ─── Handlers ──────────────────────────────────────────────────────────────
    const handleRespond = async () => {
        if (!responseText.trim()) return;
        try {
            setSending(true);

            const respondRes = await axios.post(`/api/pqrs/${currentMail.id}/respond`, {
                response_message: responseText,
            });

            // Actualizar el estado de la PQR
            setMailCards((prev) =>
                prev.map((mail) =>
                    mail.id === currentMail.id
                        ? { ...mail, ...respondRes.data.data }
                        : mail
                )
            );

            await axios
                .post(`/api/pqr/${currentMail.id}/comunicaciones`, {
                    message: responseText,
                    requires_response: true,
                })
                .then((response) => {
                    setResponseUrl(response.data.response_url);
                });
            // Optional UX improvements

            const formData = new FormData();
            formData.append("message", responseText);
            formData.append("requires_response", "0");

            const commResponse = await api.post(
                `/api/pqr/${currentMail.id}/comunicaciones`,
                formData,
                { headers: { "Content-Type": "multipart/form-data" } }
            );
            setResponseUrl(commResponse.data.response_url);
            setMailCards((prev) =>
                prev.map((mail) =>
                    mail.id === currentMail.id
                        ? {
                              ...mail,
                              response_status: commResponse.data.pqr_status,
                              response_date: commResponse.data.response_date,
                          }
                        : mail
                )
            );
            alert("Respuesta enviada correctamente");
            router.visit(route('outbox'));
        } catch (error) {
            console.error("Respond error:", error);
            const msg =
                error.response?.data?.error ||
                error.response?.data?.message ||
                "Error al enviar la respuesta";
            alert(msg);
        } finally {
            setSending(false);
            setResponseText("");
        }
    };

    const handleAssignDate = async (days) => {
        try {
            const response = await axios.patch(`/api/pqrs/${currentMail.id}`, {
                response_days: days,
            });
            setMailCards((prev) =>
                prev.map((mail) =>
                    mail.id === currentMail.id
                        ? { ...mail, response_time: response.data.data.response_time }
                        : mail
                )
            );
            const elem = document.activeElement;
            if (elem) elem.blur();
        } catch (error) {
            console.error("Assign date error:", error);
            const msg =
                error.response?.data?.message ||
                error.response?.data?.error ||
                "Error al asignar fecha";
            alert(msg);
        }
    };

    const handleAssignDependency = async (dependencyId) => {
        try {
            const response = await axios.patch(`/api/pqrs/${currentMail.id}`, {
                dependency_id: dependencyId,
            });
            setMailCards((prev) =>
                prev.map((mail) =>
                    mail.id === currentMail.id
                        ? { ...mail, ...response.data.data }
                        : mail
                )
            );
            const elem = document.activeElement;
            if (elem) elem.blur();
        } catch (error) {
            console.error("Assign dependency error:", error);
            const msg =
                error.response?.data?.message ||
                error.response?.data?.error ||
                "Error al asignar dependencia";
            alert(msg);
        }
    };

    // ─── Early return (AFTER all hooks) ────────────────────────────────────────
    if (!currentMail) {
        return (
            <div className="h-full w-full hidden lg:flex items-center justify-center text-gray-500">
                <img className="h-110 opacity-60" src="/images/OBJECTS.svg" alt="" />
            </div>
        );
    }

    const disableActions = 
        currentMail.response_status === "responded" || 
        currentMail.response_status === "closed" || 
        !!currentMail.response_date || 
        (currentMail.response_time && !currentMail.response_date && new Date() > new Date(currentMail.response_time));

    // ─── Render ────────────────────────────────────────────────────────────────
    return (
        <div
            className={`h-full w-full lg:flex-1 lg:min-w-0 rounded-lg overflow-y-auto bg-white transition-all duration-300 ease-in-out flex flex-col ${
                selectedMail ? "flex" : "hidden"
            } lg:flex`}
        >
            {/* Sticky top bar */}
            <div className="sticky top-0 z-10 bg-white border-b border-gray-100 px-6 py-3 flex items-center justify-between shrink-0">
                <button
                    className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-primary transition-colors cursor-pointer"
                    onClick={() => setSelectedMail(null)}
                >
                    <ArrowLeftIcon className="w-4" />
                    Volver
                </button>
            </div>
            

            {/* Scrollable content */}
            <div className="flex-1 overflow-y-auto p-6 pb-[50px] md:pb-6 space-y-5">

                {/* Header: tag + metadata */}
                <div className="flex flex-wrap justify-between items-center gap-3">
                    <div className="flex items-center gap-2 ">

                    <span className="px-3 py-1 bg-primary text-white text-xs font-bold rounded-full uppercase tracking-wide">
                            {currentMail.request_type}
                        </span>
                    <span className="text-sm text-gray-400 font-medium">
                            ID: {currentMail.id}
                        </span>
                        
                        {(currentMail.response_status === "responded" ||
                            currentMail.response_status === "closed") && (
                            <span className="px-2 py-0.5 bg-green-100 text-green-700 text-[10px] font-bold rounded border border-green-200 uppercase">
                                    Respondida
                                </span>
                        )}
                    <span className="text-sm text-gray-400">
                            {new Date(currentMail.created_at).toLocaleDateString()}
                        </span>
                    </div>

                    <div className="flex flex-col sm:flex-row sm:items-center gap-3 w-full sm:w-auto mt-3 sm:mt-0">
                        {/* Assign dependency (Supervisor / Admin only) */}
                        {(isSupervisor || isAdmin) && relevantDependencies.length > 0 && (
                            <div className={`dropdown dropdown-bottom dropdown-end w-full sm:w-auto ${disableActions ? 'pointer-events-none opacity-60' : ''}`}>
                                <div
                                    tabIndex={0}
                                    role="button"
                                    className="btn btn-sm btn-outline border-gray-200 text-gray-600 hover:bg-gray-50 hover:text-primary w-full sm:w-auto flex justify-between sm:justify-center px-4"
                                >
                                    <span className="truncate">
                                        {currentMail.dependency
                                            ? currentMail.dependency.name
                                            : "Asignar Dependencia"}
                                    </span>
                                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="size-4 sm:hidden">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
                                    </svg>
                                </div>
                                <ul
                                    tabIndex={0}
                                    className="dropdown-content z-[20] menu p-2 shadow-lg bg-base-100 rounded-box w-full sm:w-64 max-h-60 overflow-y-auto border border-gray-100"
                                >
                                    <li className="menu-title">Seleccionar Dependencia</li>
                                    {relevantDependencies.map((dep) => (
                                        <li key={dep.id}>
                                            <a
                                                className={
                                                    currentMail.dependency_id === dep.id
                                                        ? "bg-primary/10 text-primary font-medium"
                                                        : ""
                                                }
                                                onClick={(  ) => handleAssignDependency(dep.id)}
                                            >
                                                {dep.name}
                                            </a>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}

                        {/* Deadline */}
                        {currentMail.response_date ? (
                            <span className="text-sm font-medium text-[#34A853]">
                                {/* ¡PQR respondida con éxito! */}
                            </span>
                        ) : currentMail.response_time ? (
                            new Date() > new Date(currentMail.response_time) ? (
                                <span className="text-sm font-medium text-red-600">
                                    Vencida
                                </span>
                            ) : (
                                <span
                            className={`text-sm font-medium ${getDeadlineColor(
                                    currentMail.created_at,
                                    currentMail.response_time,
                                    currentMail.response_days
                                )}`}
                            >
                                    Fecha límite:{" "}
                                {new Date(currentMail.response_time).toLocaleDateString()}
                                </span>
                            )
                        ) : (
                            <div className="dropdown dropdown-end">
                                <div
                                    tabIndex={0}
                                    role="button"
                                className="btn btn-sm btn-primary text-white"
                                >
                                    Asignar fecha límite
                                </div>
                                <ul
                                    tabIndex={0}
                                    className="dropdown-content z-[1] menu p-2 shadow bg-base-100 rounded-box w-52"
                                >
                                    <li>
                                        <a onClick={() => handleAssignDate(10)}>10 días</a>
                                    </li>
                                    <li>
                                        <a onClick={() => handleAssignDate(15)}>15 días</a>
                                    </li>
                                    <li>
                                        <a onClick={() => handleAssignDate(30)}>30 días</a>
                                    </li>
                                </ul>
                            </div>
                        )}
                    </div>
                </div>

                {/* Subject */}
                <h1 className="text-xl font-bold text-neutral leading-snug">
                    {currentMail.affair}
                </h1>

                {/* Sender card */}
                <SenderInformationCard currentMail={currentMail} />

                {/* Description */}
                <div>
                    <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-2">
                        Descripción
                    </h3>
                    <p className="text-sm text-neutral/80 leading-relaxed text-justify">
                        {currentMail.description}
                    </p>
                </div>

                {/* Actions row: assign dependency + deadline */}
                

                {/* Attachments */}
                <div className="space-y-6">
                    {/* Original PQR files */}
                    <div>
                        <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3 flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-blue-400" />
                            Soportes de la PQR
                        </h3>
                        {currentMail.attached_supports?.filter(
                            (f) => f.origin === "REC" || f.origin === "pqr" || !f.origin
                        ).length === 0 ? (
                            <p className="text-gray-400 text-xs italic ml-4">
                                No hay archivos originales
                            </p>
                        ) : (
                            <div className="flex flex-wrap gap-3">
                                {currentMail.attached_supports
                                    ?.filter(
                                        (f) =>
                                            f.origin === "REC" ||
                                            f.origin === "pqr" ||
                                            !f.origin
                                    )
                                    .map((file) => (
                                        <FileCard key={file.id} file={file} />
                                    ))}
                            </div>
                        )}
                    </div>

                    {/* Response files */}
                    {currentMail.attached_supports?.filter(
                        (f) => f.origin === "ENV" || f.origin === "response"
                    ).length > 0 && (
                        <div>
                            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3 flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full bg-green-500" />
                                Soportes de Respuesta
                            </h3>
                            <div className="flex flex-wrap gap-3">
                                {currentMail.attached_supports
                                    ?.filter(
                                        (f) =>
                                            f.origin === "ENV" || f.origin === "response"
                                    )
                                    .map((file) => (
                                        <FileCard key={file.id} file={file} />
                                    ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* Response area */}
                <div className="border-t border-gray-100 pt-4 space-y-4">
                    <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">
                        Responder
                    </h3>

                    {currentMail.response_status === "responded" ||
                    currentMail.response_status === "closed" ? (
                        <div className="bg-gray-50 border border-gray-100 rounded-xl p-6 text-center space-y-2">
                            <div className="inline-flex items-center justify-center w-12 h-12 bg-green-100 rounded-full text-green-600 mb-2">
                                <CheckCircleIcon className="w-6 h-6" />
                            </div>
                            <h4 className="text-sm font-bold text-gray-800">PQR Respondida</h4>
                            <p className="text-xs text-gray-500 max-w-sm mx-auto">
                                Esta solicitud ya ha sido atendida y no permite más respuestas
                                oficiales.
                                {currentMail.response_date && (
                                    <span className="block mt-1">
                                        Fecha:{" "}
                                        {new Date(currentMail.response_date).toLocaleString()}
                                    </span>
                                )}
                            </p>
                        </div>
                    ) : currentMail.response_time && !currentMail.response_date && new Date() > new Date(currentMail.response_time) ? (
                        <div className="p-4 bg-white border border-red-200 rounded-lg flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-red-50 flex items-center justify-center shrink-0">
                                <ExclamationTriangleIcon className="size-6 text-red-500" aria-hidden="true" />
                            </div>
                            <div>
                                <h3 className="text-red-700 font-medium mb-0.5">¡Tiempo de Respuesta Excedido!</h3>
                                <p className="text-sm font-medium">Esta PQR excedió el tiempo de respuesta y ya no puede ser respondida.</p>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            <textarea
                                className="textarea w-full bg-gray-50 border border-gray-200 rounded-lg focus:border-primary focus:outline-none resize-none min-h-[100px] text-sm"
                                placeholder="Escribe tu respuesta final aquí..."
                                value={responseText}
                                onChange={(e) => setResponseText(e.target.value)}
                            />

                            <div className="flex justify-end items-center gap-3">
                                {responseUrl && (
                                    <a
                                        target="_blank"
                                        href={responseUrl}
                                        className="text-xs text-primary underline"
                                        rel="noopener noreferrer"
                                    >
                                        Enlace de respuesta
                                    </a>
                                )}
                                <Link
                                    href={`/pqr/responder/${currentMail.id}`}
                                    className="btn btn-sm bg-primary text-white hover:bg-primary/90 border-none rounded-lg gap-1.5"
                                >
                                    <PaperAirplaneIcon className="w-4" />
                                    Generar Respuesta (PDF)
                                </Link>

                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}


/** Internal component — file attachment card */
function FileCard({ file }) {
    return (
        <a
            href={file.url}
            target="_blank"
            rel="noopener noreferrer"
            className="group w-28 p-2 bg-gray-50 border border-gray-200 rounded-lg hover:border-primary/40 hover:shadow-sm transition text-center overflow-hidden"
        >
            {["jpg", "jpeg", "png"].includes(file.type?.toLowerCase()) ? (
                <img
                    src={file.url}
                    alt={file.name}
                    className="w-full h-20 object-cover rounded"
                />
            ) : file.type?.toLowerCase() === "pdf" ? (
                <PdfThumbnail
                    url={file.url}
                    alt={file.name}
                    className="w-full h-20 object-cover rounded"
                />
            ) : (
                <div className="w-full h-20 flex items-center justify-center bg-gray-100 rounded text-gray-400 text-xs font-bold">
                    {file.type?.toUpperCase()}
                </div>
            )}
            <p className="text-[10px] mt-1.5 truncate text-gray-600 group-hover:text-primary">
                {file.name}
            </p>
        </a>
    );
}