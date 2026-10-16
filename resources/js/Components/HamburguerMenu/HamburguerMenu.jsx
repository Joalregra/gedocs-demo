import { ROLES } from "@/constants/roles";
import {
    AcademicCapIcon,
    BellIcon,
    BuildingOffice2Icon,
    DocumentTextIcon,
    ListBulletIcon,
    UserCircleIcon,
} from "@heroicons/react/24/outline";
import { useContext } from "react";
import { UserContext } from "@/context/UserContext/UserContext";
import { Link, usePage } from "@inertiajs/react";

function MobileMenuItem({ href, icon: Icon, label, active, onClick }) {
    return (
        <Link href={href} onClick={onClick} className="block w-full">
            <div
                className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                    active
                        ? "bg-primary/10 text-primary"
                        : "text-slate-600 hover:bg-primary/5 hover:text-primary"
                }`}
            >
                <Icon
                    className={`h-5 w-5 shrink-0 ${
                        active ? "text-primary" : "text-slate-400"
                    }`}
                />
                {label}
            </div>
        </Link>
    );
}

function MobileMenuSection({ title, children }) {
    return (
        <div className="flex w-full flex-col gap-1">
            <h3 className="px-3 pb-1 text-xs font-semibold uppercase tracking-wider text-slate-400">
                {title}
            </h3>
            <div className="flex w-full flex-col gap-0.5">{children}</div>
        </div>
    );
}

function HamburguerMenu() {
    const { setContent } = useContext(UserContext);
    const { url, props } = usePage();
    const { auth } = props;

    const userRole = auth.user.roles?.[0]?.name;
    const showUserManagement = userRole === ROLES.ADMIN || userRole === ROLES.SUPERVISOR;
    const isAdmin = userRole === ROLES.ADMIN;

    return (
        <div className="lg:hidden block">
            <div className="flex items-center gap-3">
                <div className="dropdown lg:hidden">
                    <div
                        tabIndex={0}
                        role="button"
                        className="btn btn-ghost btn-circle"
                    >
                        <svg
                            xmlns="http://www.w3.org/2000/svg"
                            fill="none"
                            viewBox="0 0 24 24"
                            className="inline-block h-7 w-7 stroke-current"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth="2"
                                d="M4 6h16M4 12h16M4 18h16"
                            />
                        </svg>
                    </div>

                    <ul
                        tabIndex={-1}
                        className="dropdown-content z-10 mt-3 w-72 rounded-2xl border border-slate-200 bg-white p-3 shadow-lg"
                    >
                        <div className="flex w-full flex-col gap-0.5">
                            <MobileMenuItem
                                href={route("profile.edit")}
                                icon={UserCircleIcon}
                                label="Informacion de Perfil"
                                active={url === "/profile"}
                            />
                        </div>

                        {showUserManagement && (
                            <>
                                <hr className="my-2 border-slate-100" />
                                <MobileMenuSection title="Usuarios">
                                    <MobileMenuItem
                                        href={route("auxiliar")}
                                        icon={AcademicCapIcon}
                                        label="Auxiliares"
                                        active={url === "/users/auxiliar"}
                                        onClick={() => setContent?.(ROLES.AUXILIAR)}
                                    />

                                    {isAdmin && (
                                        <MobileMenuItem
                                            href={route("supervisor")}
                                            icon={ListBulletIcon}
                                            label="Supervisores"
                                            active={url === "/users/supervisor"}
                                            onClick={() => setContent?.(ROLES.SUPERVISOR)}
                                        />
                                    )}

                                    {isAdmin && (
                                        <MobileMenuItem
                                            href={route("sheets")}
                                            icon={DocumentTextIcon}
                                            label="Entidades"
                                            active={url === "/sheets"}
                                        />
                                    )}
                                </MobileMenuSection>
                            </>
                        )}

                        {showUserManagement && (
                            <>
                                <hr className="my-2 border-slate-100" />
                                <MobileMenuSection title="Solicitudes">
                                    <MobileMenuItem
                                        href={route("notifications.index")}
                                        icon={BellIcon}
                                        label="Solicitudes"
                                        active={url === "/notifications"}
                                    />
                                </MobileMenuSection>
                            </>
                        )}

                        <hr className="my-2 border-slate-100" />
                        <MobileMenuSection title="Gestion Documental">
                            <MobileMenuItem
                                href={route("dependencies")}
                                icon={BuildingOffice2Icon}
                                label="Dependencias"
                                active={url === "/dependencies"}
                            />
                        </MobileMenuSection>
                    </ul>
                </div>
            </div>
        </div>
    );
}

export default HamburguerMenu;
