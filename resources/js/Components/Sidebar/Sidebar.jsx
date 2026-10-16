import { ROLES } from "@/constants/roles";
import {
    FolderIcon,
    InboxIcon,
    PlusCircleIcon,
    InboxArrowDownIcon,
    ArchiveBoxXMarkIcon
} from "@heroicons/react/24/solid";
import NavLink from "../NavLink";
import { Link, usePage } from "@inertiajs/react";



export default function Sidebar() {
    const { props } = usePage();
    const user = props.auth.user;

    const isAuxiliar = user.roles?.some(role => role.name === ROLES.AUXILIAR);

    const links = [
        { id: "inbox", href: "inbox", icon: InboxIcon, name: "Bandeja de Entrada" },
        { id: "outbox", href: "outbox", icon: InboxArrowDownIcon, name: "Enviados" },
        { id: "archive", href: "archive", icon: ArchiveBoxXMarkIcon, name: "Vencidos" },
        { id: "explorer", href: "explorer", icon: FolderIcon, name: "Explorador" },
    ];

    const filteredLinks = links.filter(link => {
        if (!link.roles) return true;
        return !isAuxiliar;
    });

    return (
        <>
            {/* Desktop */}
            <aside className="hidden md:flex h-screen px-2 bg-primary flex-col justify-between items-center pt-16 pb-4">
                <div className="flex flex-col items-center gap-3">
                    {filteredLinks.map(link => (
                        <div key={link.id} className="tooltip tooltip-right z-20" data-tip={link.name}>
                            <NavLink
                                href={route(link.href)}
                                active={route().current(link.href)}

                            >
                                <link.icon className="size-10" />
                            </NavLink>
                        </div>
                    ))}
                </div>

                <Link href={route('form')} className="hover:cursor-pointer rounded-md">
                    <PlusCircleIcon className="size-10 fill-white" />
                </Link>
            </aside>

            {/* Mobile */}
            <div className="md:hidden fixed bottom-0 left-0 w-full bg-primary flex justify-around items-center py-1 z-20">
                {filteredLinks.map(link => (
                    <NavLink
                        key={link.id}
                        href={route(link.href)}
                        active={route().current(link.href)}

                    >
                        <link.icon className="size-8" />
                    </NavLink>
                ))}

                <Link href={route('form')} className="hover:cursor-pointer rounded-md">
                    <PlusCircleIcon className="size-8 fill-white" />
                </Link>
            </div>
        </>
    );
}
