import "../css/app.css";
import "./bootstrap";

import { createInertiaApp } from "@inertiajs/react";
import { resolvePageComponent } from "laravel-vite-plugin/inertia-helpers";
import { createRoot } from "react-dom/client";

import '@szhsin/react-menu/dist/index.css';
import '@szhsin/react-menu/dist/transitions/zoom.css';

import { NotificationsProvider } from "@/context/Notifications/NotificationsContext.jsx";
import { UserProvider } from "./context/UserContext/UserContext";
import { SheetsProvider } from "@/context/SheetsContext/SheetsContext.jsx";
import { DependenciesProvider } from "./context/DependenciesContext/DependenciesContext";
import { Toaster } from "sonner";
import { ElectronicIndexProvider } from "./context/ElectronicIndexContext/ElectronicIndexContext";

const appName = "GeDocs"

createInertiaApp({
    title: (title) => ` ${appName}`,
    resolve: (name) => {
        return resolvePageComponent(
            `./Pages/${name}.jsx`,
            import.meta.glob("./Pages/**/*.jsx"),
        );
    },

    setup({ el, App, props }) {
        const root = createRoot(el);
        const authUserId = props?.initialPage?.props?.auth?.user?.id ?? null;
        const authUserRole = props?.initialPage?.props?.auth?.user?.roles?.[0]?.name ?? null;
        const inertiaVersion = props?.initialPage?.version ?? null;

        root.render(
            <NotificationsProvider>
                <UserProvider>
                    <SheetsProvider>
                        <DependenciesProvider>
                            <ElectronicIndexProvider
                                authUserId={authUserId}
                                authUserRole={authUserRole}
                                inertiaVersion={inertiaVersion}
                            >
                                <Toaster position="top-center" richColors closeButton expand={false} />

                                <App {...props} />
                            </ElectronicIndexProvider>
                        </DependenciesProvider>
                    </SheetsProvider>
                </UserProvider>
            </NotificationsProvider>
        );
    },

    progress: {
        color: "#4B5563",
    },
});
