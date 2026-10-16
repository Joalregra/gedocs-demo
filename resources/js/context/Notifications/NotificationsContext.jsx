import {
    createContext,
    useState,
    useEffect,
    useCallback,
    useMemo,
} from "react";
import api from "@/lib/axios";

export const NotificationsContext = createContext();

export function NotificationsProvider({ children }) {
    const [notifications, setNotifications] = useState([]);
    const [loading, setLoading] = useState(false);
    const [loadingDetailsNotification, setLoadingDetailsNotification] =
        useState(false);
    const [notificationSeleted, setNotificationSeleted] = useState(null);

    const fetchNotifications = useCallback(async () => {
        setLoading(true);
        try {
            const res = await api.get("/api/notifications");

            if (!res.data || res.data.success === false) {
                console.log(
                    "ERROR AL OBTENER NOTIFICACIONES!",
                    res.data?.message || "",
                );
                setNotifications([]);
                setLoading(false);
                return;
            }

            setNotifications(res.data.notifications || []);
        } catch (error) {
            console.error(
                "Error fetching notifications:",
                error?.response?.data || error.message || error,
            );
            setNotifications([]);
        } finally {
            setLoading(false);
        }
    }, []);



    const visibleDetails = useMemo(() => {
        if (!notificationSeleted) return null;
        return notifications.find((n) => n.id === notificationSeleted);
    });
    const markAsReadNotification = useCallback(
        async (id) => {
            setLoadingDetailsNotification(true);
            setNotifications((prev) =>
                prev.map((notification) =>
                    notification.id === id
                        ? { ...notification, read_at: new Date().toISOString() }
                        : notification,
                ),
            );

            try {
                const res = await api.post(
                    `/api/notifications/${id}/mark-as-read`,
                );
                if (!res.data || res.data.success === false) {
                    console.log(
                        "ERROR AL MARCAR NOTIFICACIONES LEIDAS!",
                        res.data?.message || "",
                    );
                }
            } catch (error) {
                console.error(error?.response?.data || error.message || error);
            } finally {
                setLoadingDetailsNotification(false);
            }
        },
        [notificationSeleted],
    );

    const updateUserStatusFromNotification = async (notificationId, status) => {
        const notification = notifications.find((n) => n.id === notificationId);
        if (!notification) return;

        try {
            await api.put(
                `/api/notifications/update/${notificationId}/${status}`,
            );

            setNotifications((prev) =>
                prev.map((n) =>
                    n.id === notificationId
                        ? {
                            ...n,
                            data: {
                                ...n.data,
                                user: {
                                    ...n.data.user,
                                    status,
                                },
                            },
                        }
                        : n,
                ),
            );
        } catch (err) {
            console.error(
                err?.response?.data ||
                err.message ||
                err ||
                "Error actualizando estado del usuario",
            );
        }
    };

    const deleteUserAndNotification = async (notificationId, userId) => {
        try {
            const response = await api.delete(`/api/users/${userId}`);

            if (response.data.success) {
                setNotifications((prev) =>
                    prev.filter((n) => n.id !== notificationId)
                );
                setNotificationSeleted(null);
            }
        } catch (err) {
            console.error(
                err?.response?.data || err.message || err || "Error eliminando usuario y notificación"
            );
            throw err;
        }
    };

    const closeDetails = () => setNotificationSeleted(null);

    return (
        <NotificationsContext.Provider
            value={{
                notifications,
                markAsReadNotification,
                loading,
                loadingDetailsNotification,
                closeDetails,
                visibleDetails,
                fetchNotifications,
                notificationSeleted,
                setNotificationSeleted,
                updateUserStatusFromNotification,
                deleteUserAndNotification,
            }}
        >
            {children}
        </NotificationsContext.Provider>
    );
}
