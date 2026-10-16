import { ROLES } from "@/constants/roles";
import { useEffect, useState } from "react";
import { usePage } from "@inertiajs/react";
import ArchiveMailModal from "@/Components/ArchiveMailModal/ArchiveMailModal";
import api from "@/lib/axios.js";
import { ArrowPathIcon, MagnifyingGlassIcon, DocumentTextIcon } from "@heroicons/react/24/solid";
import { XMarkIcon, ChevronRightIcon } from "@heroicons/react/24/outline";
import EmptyState from "../EmptyState";
import SelectDependecyOrNumberSheet from "../SelectDependecyOrNumberSheet";

export default function ArchiveTable() {
    const { auth } = usePage().props;
    const role = auth?.user?.roles?.[0]?.name;
    const userDependencyId = auth?.user?.dependency_id;

    const [mails, setMails] = useState([]);
    const [filteredMails, setFilteredMails] = useState([]);
    const [searchTerm, setSearchTerm] = useState("");
    const [activeScopeFilter, setActiveScopeFilter] = useState(null);
    const [selectedMail, setSelectedMail] = useState(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        setLoading(true);
        api.get("/api/pqrs?archived=true")
            .then(res => {
                const data = res.data.data ?? res.data;
                setMails(data);
                setFilteredMails(data);
                setLoading(false);
            })
            .catch(err => {
                console.error(err);
                setLoading(false);
            });
    }, []);

    useEffect(() => {
        const lowerSearch = searchTerm.toLowerCase().trim();
        const filtered = mails.filter((mail) => {
            const matchesSearch =
                lowerSearch === "" ||
                mail.affair?.toLowerCase().includes(lowerSearch) ||
                mail.description?.toLowerCase().includes(lowerSearch) ||
                mail.id?.toString().includes(lowerSearch) ||
                mail.sender_name?.toLowerCase().includes(lowerSearch);

            if (!matchesSearch) return false;

            if (role === ROLES.AUXILIAR) {
                return userDependencyId ? mail.dependency_id === userDependencyId : false;
            }

            if (!activeScopeFilter) return true;

            if (activeScopeFilter.type === "sheet") {
                return mail.sheet_number_id === activeScopeFilter.id;
            }

            if (activeScopeFilter.type === "dependency") {
                return mail.dependency_id === activeScopeFilter.id;
            }

            return true;
        });

        setFilteredMails(filtered);
    }, [searchTerm, mails, activeScopeFilter, role, userDependencyId]);

    return (
        <>
            <div className="mb-4 w-full flex flex-col md:flex-row justify-between items-center gap-4">
                <div className="flex items-center bg-white border border-gray-300 px-3 py-2 rounded-lg w-full md:w-96 shadow-sm focus-within:border-primary focus-within:ring-1 focus-within:ring-primary/20 transition-all">
                    <MagnifyingGlassIcon className="size-5 text-gray-500 mr-2" />
                    <input
                        placeholder="Buscar por asunto, id o solicitante..."
                        type="text"
                        className="bg-transparent border-none focus:outline-none w-full text-sm"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                    {searchTerm && (
                        <XMarkIcon
                            className="size-5 text-gray-400 hover:text-gray-600 cursor-pointer"
                            onClick={() => setSearchTerm("")}
                        />
                    )}
                </div>
                <div className="w-full md:w-auto flex md:block justify-end">
                    <SelectDependecyOrNumberSheet
                        activeScopeFilter={activeScopeFilter}
                        setActiveScopeFilter={setActiveScopeFilter}
                        showOnRoutes={["archive"]}
                    />
                </div>
            </div>


            <div className="overflow-x-auto mt-2.5 md:mt-0 pb-[30px] md:pb-0 rounded-lg">
                {loading ?
                    <div className={"flex justify-center items-center h-40"}>

                        <div className={"flex gap-2 items-center text-gray-500"}>
                            <ArrowPathIcon className={"animate-spin size-6"} />
                            Cargando
                        </div>
                    </div>

                    :
                    <>
                        <table className="w-full table-fixed md:table-auto border-collapse">
                            <thead className="sticky top-0 z-10 bg-white border-b border-gray-300">
                                <tr className="text-gray-600 uppercase text-[10px] md:text-sm">
                                    <th className="py-4 px-2 md:px-4 text-left font-bold w-[75%] md:w-auto">Asunto / ID</th>
                                    <th className="hidden lg:table-cell px-4 text-left font-bold">Solicitante / Tipo</th>
                                    <th className="hidden sm:table-cell px-4 text-right font-bold">Fecha</th>
                                    <th className="w-8 md:hidden"></th>
                                </tr>
                            </thead>
                            <tbody className="bg-white">
                                {filteredMails.map(mail => (
                                    <tr
                                        key={mail.id}
                                        onClick={() => setSelectedMail(mail)}
                                        className="cursor-pointer border-b border-gray-100 transition-colors bg-white hover:bg-primary/5 select-none"
                                    >
                                        <td className="py-4 px-2 md:px-4">
                                            <div className="flex items-center gap-2 md:gap-3">
                                                <div className="p-1.5 md:p-2 bg-gray-50 rounded text-gray-400 shrink-0 hidden xs:block">
                                                    <DocumentTextIcon className="size-4 md:size-5" />
                                                </div>
                                                <div className="flex flex-col min-w-0">
                                                    <div className="flex items-center gap-1.5 md:gap-2">
                                                        <span className="font-bold text-gray-800 truncate text-xs md:text-sm">
                                                            {mail.affair}
                                                        </span>
                                                        <span className="text-[10px] text-gray-400 font-medium shrink-0">#{mail.id}</span>
                                                    </div>
                                                    <span className="text-[10px] text-gray-500 lg:hidden truncate opacity-80">
                                                        {mail.sender_name?.split(' ')[0]} • {mail.request_type}
                                                    </span>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="hidden lg:table-cell text-left px-4">
                                            <div className="flex flex-col min-w-0">
                                                <span className="text-sm font-medium text-gray-600 truncate">{mail.sender_name || 'Sin nombre'}</span>
                                                <span className="text-[10px] text-gray-400 capitalize truncate">{mail.request_type}</span>
                                            </div>
                                        </td>
                                        <td className="hidden sm:table-cell px-4 text-right text-xs md:text-sm text-gray-500 tabular-nums">
                                            {new Date(mail.created_at).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}
                                        </td>
                                        <td className="px-2 text-right md:hidden">
                                            <ChevronRightIcon className="w-4 h-4 text-gray-300 inline" />
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        {filteredMails.length === 0 && mails.length > 0 &&
                            <div className="relative h-[40vh]">
                                <EmptyState text={`No se encontraron resultados para "${searchTerm}"`} />
                            </div>
                        }
                        {mails.length === 0 &&
                            <div className=" relative h-[50vh]">
                                <EmptyState text={"No hay email archivados"} />
                            </div>
                        }
                    </>

                }

            </div>

            {selectedMail && (
                <ArchiveMailModal
                    mail={selectedMail}
                    onClose={() => setSelectedMail(null)}
                />
                
            )}
        </>
    );
}
