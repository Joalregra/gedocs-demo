import { NotificationsContext } from "@/context/Notifications/NotificationsContext";
import React, { useContext } from "react";
import {
    ArrowUturnLeftIcon,
    UserCircleIcon,
    ArrowPathIcon,
    CheckCircleIcon,
    XCircleIcon,
} from "@heroicons/react/24/outline";
import { CheckCircleIcon as CheckCircleSolid } from "@heroicons/react/24/solid";
import { toast } from "sonner";

const NotificationCard = () => {
    const {
        loadingDetailsNotification,
        closeDetails,
        updateUserStatusFromNotification,
        deleteUserAndNotification,
        visibleDetails,
    } = useContext(NotificationsContext);

    if (loadingDetailsNotification) {
        return (
            <div className="flex h-64 items-center justify-center rounded-2xl border border-slate-200 bg-white shadow-sm">
                <div className="flex flex-col items-center gap-3 text-slate-400">
                    <ArrowPathIcon className="size-7 animate-spin" />
                    <span className="text-sm">Cargando detalles...</span>
                </div>
            </div>
        );
    }

    if (!visibleDetails) return null;

    const isActive = visibleDetails.data.user.status === "active";
    const isRejected = visibleDetails.data.user.status === "rejected";
    const roleName = visibleDetails.data.user.roles[0]?.name || "Usuario";

    const userFields = [
        { label: "Solicitante", value: visibleDetails.data.user.name },
        { label: "Tipo de Documento", value: visibleDetails.data.user.type_document },
        { label: "Número de documento", value: visibleDetails.data.user.document_number },
        { label: "Correo electrónico", value: visibleDetails.data.user.email },
        { label: "Teléfono de contacto", value: "Ninguno" },
    ];

    return (
        <div className="flex h-full flex-col gap-5 overflow-y-auto rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            {/* Back button */}
            <div>
                <button
                    onClick={closeDetails}
                    className="btn btn-ghost btn-sm gap-1.5 text-slate-500 hover:text-slate-800"
                >
                    <ArrowUturnLeftIcon className="size-4" />
                    Volver
                </button>
            </div>

            {/* Title & meta */}
            <div className="flex flex-col gap-1">
                <h2 className="text-xl font-semibold text-slate-800">
                    Solicitud de Acceso
                </h2>
                <p className="text-sm text-slate-500">
                    {visibleDetails.data.user.name} solicita acceso como{" "}
                    <span className="font-semibold text-slate-700">{roleName}</span>
                </p>
                <p className="text-xs text-slate-400">
                    {new Date(visibleDetails.created_at).toLocaleDateString("es-CO", {
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                    })}
                </p>
            </div>

            <hr className="border-slate-100" />

            {/* User info panel */}
            <div className="rounded-xl border border-slate-100 bg-slate-50 p-4">
                <h3 className="mb-4 text-xs font-semibold uppercase tracking-wider text-slate-400">
                    Información del solicitante
                </h3>
                <div className="flex items-start gap-4">
                    <div className="shrink-0">
                        <UserCircleIcon className="size-14 text-slate-300" />
                    </div>
                    <div className="grid min-w-0 flex-1 grid-cols-1 gap-x-8 gap-y-3 sm:grid-cols-2 lg:grid-cols-3">
                        {userFields.map(({ label, value }) => (
                            <div key={label} className="flex flex-col gap-0.5">
                                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                                    {label}
                                </p>
                                <p className="wrap-break-word text-sm text-slate-700">{value}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Decision section */}
            <div className="flex flex-col gap-4">
                {isRejected ? (
                    <div className="rounded-xl border border-red-100 bg-red-50 p-4">
                        <p className="text-sm font-semibold text-red-700">Usuario rechazado</p>
                        <p className="mt-1 text-sm text-red-600">
                            Este usuario ha sido rechazado, su registro se eliminará en 2 horas.{" "}
                            <strong>¿Desea darle ingreso?</strong>
                        </p>
                    </div>
                ) : (
                    <p className="text-center text-sm font-medium text-slate-600">
                        ¿Desea permitir que este usuario ingrese como{" "}
                        <span className="font-semibold text-slate-800">{roleName}</span>?
                    </p>
                )}

                {isActive ? (
                    <div className="flex items-center justify-center gap-2 rounded-xl bg-green-50 py-3 text-sm font-medium text-green-600">
                        <CheckCircleSolid className="size-5" />
                        El usuario fue aceptado exitosamente
                    </div>
                ) : (
                    <div className="flex items-center justify-center gap-4">
                        <button
                            className="btn btn-primary btn-sm gap-2 text-white"
                            onClick={async () => {
                                let toastId;
                                try {
                                    toastId = toast.loading(
                                        "Otorgando permiso a " + visibleDetails?.data?.user?.name,
                                    );
                                    await updateUserStatusFromNotification(visibleDetails?.id, "active");
                                    toast.success("Usuario aceptado con éxito");
                                } catch (err) {
                                    toast.error(
                                        err.response?.data?.message || "Error al aceptar usuario",
                                    );
                                } finally {
                                    toast.dismiss(toastId);
                                }
                            }}
                        >
                            <CheckCircleIcon className="size-4" />
                            Aceptar
                        </button>

                        {!isRejected && (
                            <button
                                className="btn btn-sm gap-2 bg-red-600 text-white hover:bg-red-700"
                                onClick={async () => {
                                    let toastId;
                                    try {
                                        toastId = toast.loading(
                                            "Rechazando a " + visibleDetails?.data?.user?.name,
                                        );
                                        await deleteUserAndNotification(
                                            visibleDetails?.id,
                                            visibleDetails?.data?.user?.id,
                                        );
                                        toast.success("Usuario rechazado y eliminado");
                                    } catch (err) {
                                        toast.error(
                                            err.response?.data?.message || "Error al rechazar usuario",
                                        );
                                    } finally {
                                        toast.dismiss(toastId);
                                    }
                                }}
                            >
                                <XCircleIcon className="size-4" />
                                Rechazar
                            </button>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default NotificationCard;