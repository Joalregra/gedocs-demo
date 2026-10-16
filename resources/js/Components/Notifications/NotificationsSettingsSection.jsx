import { ROLES } from "@/constants/roles";
import React, { useContext, useMemo } from "react";
import { NotificationsContext } from "@/context/Notifications/NotificationsContext.jsx";
import { ArrowPathIcon, BellIcon } from "@heroicons/react/24/outline";
import NotificationsCard from "@/Components/Notifications/NotificationsCard.jsx";
import { usePage } from "@inertiajs/react";

const NotificationsSettingsSection = () => {
    const {
        notifications,
        markAsReadNotification,
        loading,
        notificationSeleted,
        setNotificationSeleted,
        fetchNotifications,
    } = useContext(NotificationsContext);

    const { auth } = usePage().props;

    const rol = auth.user.roles[0].name;

    const filteredNotifications = useMemo(() => {
        return notifications.filter((item) => {
            const notifRole = item?.data?.user?.roles?.[0]?.name || "";
            if (rol === ROLES.SUPERVISOR) return notifRole === ROLES.AUXILIAR;
            if (rol === ROLES.ADMIN) return notifRole === ROLES.SUPERVISOR;
            return false;
        });
    }, [notifications, rol]);

    if (loading) {
        return (
            <div className="flex h-64 items-center justify-center">
                <div className="flex flex-col items-center gap-3 text-slate-400">
                    <ArrowPathIcon className="size-7 animate-spin" />
                    <span className="text-sm">Cargando notificaciones...</span>
                </div>
            </div>
        );
    }

    return (
        <div className={`flex w-full h-full gap-4 ${notificationSeleted ? "flex-row" : "flex-col"}`}>
            {/* Notification list panel */}
            <div className={`flex flex-col gap-4 ${notificationSeleted ? "hidden md:flex md:w-80 lg:w-96 shrink-0" : "w-full"}`}>
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <BellIcon className="size-5 text-slate-500" />
                        <h2 className="text-base font-semibold text-slate-800">
                            Notificaciones
                        </h2>
                        {filteredNotifications.length > 0 && (
                            <span className="inline-flex items-center rounded-full bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">
                                {filteredNotifications.length}
                            </span>
                        )}
                    </div>
                    <button
                        onClick={fetchNotifications}
                        className="btn btn-ghost btn-sm gap-1.5 text-slate-500 hover:text-slate-800"
                        title="Refrescar notificaciones"
                    >
                        <ArrowPathIcon className="size-4" />
                        <span className="hidden sm:inline text-xs">Refrescar</span>
                    </button>
                </div>

                {/* List */}
                {filteredNotifications.length > 0 ? (
                    <ul className="flex flex-col gap-2 overflow-y-auto">
                        {filteredNotifications.map((item) => {
                            const isSelected = item.id === notificationSeleted;
                            const isRead = !!item.read_at;
                            const isActive = item.data?.user?.status === "active";
                            const isRejected = item.data?.user?.status === "rejected";
                            const roleName = item?.data?.user?.roles[0]?.name || "Usuario";

                            return (
                                <li
                                    key={item.id}
                                    onClick={() => {
                                        if (!isSelected && !isRead) {
                                            markAsReadNotification(item.id);
                                        }
                                        setNotificationSeleted(isSelected ? null : item.id);
                                    }}
                                    className={`relative flex flex-col gap-1.5 cursor-pointer rounded-xl border px-4 py-3 transition-all
                                        ${isSelected
                                            ? "border-primary/40 bg-primary/10 shadow-sm"
                                            : "border-slate-200 bg-white hover:border-primary/30 hover:bg-slate-50 shadow-xs"
                                        }`}
                                >
                                    {/* Unread indicator dot */}
                                    {!isRead && (
                                        <span className="absolute right-3 top-3 size-2 rounded-full bg-primary" />
                                    )}

                                    <div className="flex items-center justify-between pr-4">
                                        <p className={`text-sm leading-snug ${isRead ? "font-normal text-slate-500" : "font-semibold text-slate-800"}`}>
                                            Nuevo {roleName}
                                        </p>
                                        <span className="shrink-0 text-xs text-slate-400">
                                            {new Date(item.created_at).toLocaleDateString()}
                                        </span>
                                    </div>

                                    <p className="line-clamp-2 text-xs text-slate-500">
                                        <span className="font-medium text-slate-600">{item.data.user.name}</span>{" "}
                                        solicita acceso con rol {roleName}
                                    </p>

                                    {!notificationSeleted && (
                                        <span className={`w-fit rounded-full px-2 py-0.5 text-xs font-medium
                                            ${isRejected
                                                ? "bg-red-50 text-red-500"
                                                : isActive
                                                    ? "bg-green-50 text-green-600"
                                                    : "bg-slate-100 text-slate-500"
                                            }`}
                                        >
                                            {isRejected ? "Rechazada" : isActive ? "Aceptada" : "Pendiente"}
                                        </span>
                                    )}
                                </li>
                            );
                        })}
                    </ul>
                ) : (
                    <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-slate-200 bg-slate-50 py-16 text-center">
                        <BellIcon className="size-10 text-slate-300" />
                        <p className="text-sm text-slate-400">No hay notificaciones pendientes</p>
                    </div>
                )}
            </div>

            {/* Detail panel */}
            {notificationSeleted && (
                <div className="min-w-0 flex-1">
                    <NotificationsCard />
                </div>
            )}
        </div>
    );
};

export default NotificationsSettingsSection;