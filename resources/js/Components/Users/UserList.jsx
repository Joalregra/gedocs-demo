import { ROLES } from "@/constants/roles";
import { UserContext } from "@/context/UserContext/UserContext";
import { useContext, useEffect } from "react";
import UserDetailsPanel from "./UserDetailsPanel";
import { ArrowPathIcon } from "@heroicons/react/24/outline";
import { ChevronRightIcon } from "@heroicons/react/24/outline";
import EmptyState from "../EmptyState";

export const UserList = ({ url }) => {
    const {
        user,
        loading,
        ShowInformation,
        content,
        setContent,
        loadingSearch,
        isSearching,
        filteredUser,
        fetchUser,
    } = useContext(UserContext);

    useEffect(() => {
        fetchUser();
    }, []);

    const InfoView = isSearching ? filteredUser : user;
    useEffect(() => {
        if (url === "/users/supervisor") {
            setContent(ROLES.SUPERVISOR);
        } else if (url === "/users/auxiliar") {
            setContent(ROLES.AUXILIAR);
        } else if (url === "/users/entidades") {
            setContent("Entidad");
        }
    }, [url]);

    const isLoading = loading || loadingSearch;

    const filtered = (InfoView || []).filter((item) =>
        item.roles?.some((r) => r.name === content)
    );

    return (
        <>
            <div className="overflow-x-auto mt-2.5 md:mt-0 pb-[30px] md:pb-0 rounded-lg">
                {isLoading ? (
                    <div className="flex justify-center items-center h-40">
                        <div className="flex gap-2 items-center text-gray-500">
                            <ArrowPathIcon className="animate-spin size-6" />
                            Cargando
                        </div>
                    </div>
                ) : (
                    <>
                        <table className="w-full table-fixed md:table-auto border-collapse">
                            <thead className="sticky top-0 z-10 bg-white border-b border-gray-300">
                                <tr className="text-gray-600 uppercase text-[10px] md:text-sm">
                                    <th className="py-4 px-2 md:px-4 text-left font-bold w-[50%] md:w-auto">
                                        Nombre
                                    </th>
                                    <th className="px-2 md:px-4 text-left font-bold w-[25%] md:w-auto">
                                        Identificación
                                    </th>
                                    <th className="hidden lg:table-cell px-4 text-left font-bold">
                                        Email
                                    </th>
                                    <th className="hidden sm:table-cell px-4 text-right font-bold">
                                        Fecha de creación
                                    </th>
                                    <th className="px-2 md:px-4 text-center md:text-left font-bold w-[25%] md:w-auto">
                                        Estado
                                    </th>
                                    <th className="w-8 md:hidden"></th>
                                </tr>
                            </thead>
                            <tbody className="bg-white">
                                {filtered.map((item) => (
                                    <tr
                                        key={item.id}
                                        onClick={() => ShowInformation(item.id)}
                                        className="cursor-pointer border-b border-gray-100 transition-colors bg-white hover:bg-primary/5 select-none"
                                    >
                                        <td className="py-4 px-2 md:px-4">
                                            <div className="flex items-center gap-2 md:gap-3 min-w-0">
                                                <div className="w-8 h-8 md:w-9 md:h-9 rounded-full overflow-hidden shrink-0 ring-2 ring-gray-100">
                                                    <img
                                                        className="w-full h-full object-cover"
                                                        alt="profile pic"
                                                        src={item.profile_photo || "/images/default-user-icon.png"}
                                                    />
                                                </div>
                                                <span className="font-bold text-gray-800 truncate text-xs md:text-sm">
                                                    {item.name}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-2 md:px-4 text-left">
                                            <span className="text-xs md:text-sm text-gray-500 font-medium tabular-nums">
                                                {item.document_number}
                                            </span>
                                        </td>
                                        <td className="hidden lg:table-cell px-4 text-left">
                                            <span className="text-sm text-gray-500 truncate block">
                                                {item.email}
                                            </span>
                                        </td>
                                        <td className="hidden sm:table-cell px-4 text-right text-xs md:text-sm text-gray-500 tabular-nums">
                                            {new Date(item.created_at).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })}
                                        </td>
                                        <td className="px-2 md:px-4 text-center md:text-left">
                                            <span className={`inline-flex items-center gap-1.5 text-[10px] md:text-xs font-bold uppercase tracking-wider ${
                                                item.status === "pending"
                                                    ? "text-amber-600"
                                                    : "text-green-600"
                                            }`}>
                                                <span className={`w-1.5 h-1.5 rounded-full ${
                                                    item.status === "pending"
                                                        ? "bg-amber-500"
                                                        : "bg-green-500"
                                                }`} />
                                                {item.status === "pending" ? "Pendiente" : "Activo"}
                                            </span>
                                        </td>
                                        <td className="px-2 text-right md:hidden">
                                            <ChevronRightIcon className="w-4 h-4 text-gray-300 inline" />
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>

                        {filtered.length === 0 && isSearching && (
                            <div className="relative h-[50vh]">
                                <EmptyState text="No hay resultados para mostrar." />
                            </div>
                        )}

                        {filtered.length === 0 && !isSearching && (
                            <div className="relative h-[50vh]">
                                <EmptyState text="No hay usuarios para mostrar." />
                            </div>
                        )}
                    </>
                )}
            </div>

            <UserDetailsPanel />
        </>
    );
};
