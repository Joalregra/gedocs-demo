import { ROLES } from "@/constants/roles";
import {
    AcademicCapIcon,
    BellIcon,
    BuildingOffice2Icon,
    DocumentTextIcon,
    ListBulletIcon,
    UserCircleIcon,
} from "@heroicons/react/24/outline";
import { Link, usePage } from "@inertiajs/react";
import { useContext } from "react";
import { UserContext } from "@/context/UserContext/UserContext";

function SidebarItem({ href, icon: Icon, label, active, onClick }) {
    return (
        <Link href={href} onClick={onClick} className="block w-full">
            <div
                className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors md:text-base ${
                    active
                        ? "bg-primary/10 text-primary"
                        : "text-slate-600 hover:bg-primary/5 hover:text-primary"
                }`}
            >
                <Icon
                    className={`h-5 w-5 shrink-0 md:h-6 md:w-6 ${
                        active ? "text-primary" : "text-slate-400"
                    }`}
                />
                {label}
            </div>
        </Link>
    );
}

function SidebarSection({ title, children }) {
    return (
        <div className="flex w-full flex-col gap-1">
            <h3 className="px-3 pb-1 text-xs font-semibold uppercase tracking-wider text-slate-400">
                {title}
            </h3>
            <div className="flex w-full flex-col gap-0.5">{children}</div>
        </div>
    );
}

export default function SettingsSidebar() {
    const { url, props } = usePage();
    const { auth } = props;
    const userRole = auth.user.roles?.[0]?.name;
    const { setContent } = useContext(UserContext);

    const showUserManagement = userRole === ROLES.ADMIN || userRole === ROLES.SUPERVISOR;
    const isAdmin = userRole === ROLES.ADMIN;

    return (
        <nav className="flex w-full flex-col gap-1 overflow-hidden rounded-2xl border border-slate-200 bg-white p-3 shadow-sm md:p-4">
            <div className="flex w-full flex-col gap-0.5">
                <SidebarItem
                    href={route("profile.edit")}
                    icon={UserCircleIcon}
                    label="Informacion de Perfil"
                    active={url === "/profile"}
                />
            </div>

            {showUserManagement && (
                <>
                    <hr className="my-2 border-slate-100" />
                    <SidebarSection title="Usuarios">
                        <SidebarItem
                            href={route("auxiliar")}
                            icon={AcademicCapIcon}
                            label="Auxiliares"
                            active={url === "/users/auxiliar"}
                            onClick={() => setContent?.(ROLES.AUXILIAR)}
                        />

                        {isAdmin && (
                            <SidebarItem
                                href={route("supervisor")}
                                icon={ListBulletIcon}
                                label="Supervisores"
                                active={url === "/users/supervisor"}
                                onClick={() => setContent?.(ROLES.SUPERVISOR)}
                            />
                        )}

                        {isAdmin && (
                            <SidebarItem
                                href={route("sheets")}
                                icon={DocumentTextIcon}
                                label="Entidades"
                                active={url === "/sheets"}
                            />
                        )}
                    </SidebarSection>
                </>
            )}

            {showUserManagement && (
                <>
                    <hr className="my-2 border-slate-100" />
                    <SidebarSection title="Solicitudes">
                        <SidebarItem
                            href={route("notifications.index")}
                            icon={BellIcon}
                            label="Notificaciones"
                            active={url === "/notifications"}
                        />
                    </SidebarSection>
                </>
            )}

            <hr className="my-2 border-slate-100" />
            <SidebarSection title="Gestion Documental">
                <SidebarItem
                    href={route("dependencies")}
                    icon={BuildingOffice2Icon}
                    label="Dependencias"
                    active={url === "/dependencies"}
                />
            </SidebarSection>
        </nav>
    );
}