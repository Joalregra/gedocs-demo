import { ROLES } from "@/constants/roles";
import { BellIcon, PlusCircleIcon } from "@heroicons/react/24/outline";
import { useContext, useEffect, useMemo } from "react";
import { Link, router, usePage } from "@inertiajs/react";
import { NotificationsContext } from "@/context/Notifications/NotificationsContext.jsx";
import { UserCircleIcon } from "@heroicons/react/24/solid";

const NotificationDropDown = () => {
    const {
        notifications,
        markAsReadNotification,
        notificationSeleted,
        setNotificationSeleted,
        fetchNotifications,
    } = useContext(NotificationsContext);

    const { auth } = usePage().props;
    const rol = auth.user.roles[0].name;

    // Filter notifications by authenticated user role
    const roleFilteredNotifications = useMemo(() => {
        return notifications.filter((item) => {
            const notifRole = item?.data?.user?.roles?.[0]?.name || "";
            if (rol === ROLES.SUPERVISOR) return notifRole === ROLES.AUXILIAR;
            if (rol === ROLES.ADMIN) return notifRole === ROLES.SUPERVISOR;
            return false;
        });
    }, [notifications, rol]);

    const unreadNotifications = roleFilteredNotifications.filter(
        (item) => item.read_at === null
    );

    const hasUnreadNotifications = unreadNotifications.length > 0;


    useEffect(() => {
        fetchNotifications();
    }, []);

    return (
        <>
            <div className="dropdown">
                <div
                    tabIndex={0}
                    role="button"
                    className="self-center relative cursor-pointer rounded-xl p-1.5 transition-colors hover:bg-gray-100"
                >
                    <BellIcon
                        className="h-5 w-5 text-[#848484] sm:h-6 sm:w-6 md:h-7 md:w-7"
                    />

                    {hasUnreadNotifications && (
                        <PlusCircleIcon
                            className="absolute -right-0.5 -top-0.5 h-3.5 w-3.5 fill-secondary text-secondary md:h-4 md:w-4"
                        />
                    )}
                </div>

                <ul
                    className="dropdown-content fixed left-2 right-2 top-16 z-50 mt-0 w-auto overflow-hidden rounded-2xl border border-gray-200 bg-white p-0 shadow-xl sm:absolute sm:left-auto sm:right-0 sm:top-full sm:mt-3 sm:w-88 sm:max-w-[calc(100vw-1rem)]"
                    tabIndex="-1"
                >
                    <li className="flex w-full flex-col gap-0 hover:bg-transparent">
                        <div className="w-full border-b border-gray-200 px-4 py-3 text-center">
                            <h2 className="text-base font-semibold text-[#010515] md:text-lg">
                                Notificaciones
                            </h2>
                        </div>

                        {unreadNotifications.length > 0 ? (
                            <div className="max-h-96 w-full space-y-2 overflow-y-auto px-2 py-2">
                                {unreadNotifications
                                    .map((item) => (
                                        <article
                                            key={item.id}
                                            className="group relative flex w-full cursor-pointer items-start gap-3 rounded-xl border border-transparent px-3 py-3 transition hover:border-gray-200 hover:bg-gray-50"
                                            onClick={() => {
                                                if (
                                                    item.id !==
                                                        notificationSeleted &&
                                                    !item.read_at
                                                ) {
                                                    markAsReadNotification(
                                                        item.id,
                                                    );
                                                }
                                                setNotificationSeleted(
                                                    !item.id ===
                                                        notificationSeleted
                                                        ? null
                                                        : item.id,
                                                );
                                                router.visit(`/notifications`);
                                            }}
                                        >
                                            <UserCircleIcon className="h-10 w-10 shrink-0 self-center text-[#404142] md:h-11 md:w-11" />

                                            <div className="min-w-0 flex-1">
                                                <h1 className="truncate text-sm font-semibold text-[#010515] md:text-base">
                                                    Nuevo{" "}
                                                    {item.data.user.roles[0]
                                                        ?.name || "Usuario"}
                                                </h1>
                                                <p className="text-xs font-medium text-[#404142] md:text-sm">
                                                    Solicitud de Acceso:
                                                </p>
                                                <p className="line-clamp-2 text-xs text-[#606164] md:text-sm">{`${item.data.user.name} solicita un nuevo acceso con...`}</p>
                                            </div>

                                            <div className="shrink-0 pt-0.5 text-right">
                                                <p className="text-[11px] font-medium text-[#606164] md:text-xs">
                                                    {new Date(item.created_at).toLocaleDateString()}
                                                </p>
                                            </div>

                                            <PlusCircleIcon
                                                className="absolute -right-0.5 -top-0.5 h-3.5 w-3.5 fill-secondary text-secondary md:h-4 md:w-4"
                                            />
                                        </article>
                                    ))}
                            </div>
                        ) : (
                            <p className="px-4 py-8 text-center text-sm text-[#848484]">
                                No hay notificaciones pendientes sin leer
                            </p>
                        )}
                        <Link
                            className="w-full border-t border-gray-200 p-3"
                            href={route("notifications.index")}
                        >
                            <button
                                className="btn h-10 w-full rounded-xl border border-gray-300 bg-white px-4 text-sm font-semibold text-[#404142] transition hover:border-primary hover:bg-primary/5"
                            >
                                Todas las Notificaciones
                            </button>
                        </Link>
                    </li>
                </ul>
            </div>
        </>
    );
};

export default NotificationDropDown;
