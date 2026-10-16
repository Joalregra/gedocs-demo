// InputSearch provides the search input and related controls for filtering files and folders in the archive explorer. It also includes view toggles and quick actions.
import { ROLES } from "@/constants/roles";
import { ArrowUpTrayIcon, Bars3Icon, BuildingOfficeIcon, DocumentPlusIcon, MagnifyingGlassIcon, PlusIcon, XMarkIcon, TableCellsIcon } from "@heroicons/react/24/outline";
import React from "react";
import { usePage, router } from "@inertiajs/react";
import { Squares2X2Icon } from "@heroicons/react/24/solid";
import axios from "axios";

import { toast } from "sonner";
import { useExplorerData, useExplorerUI } from "@/Hooks/useExplorer";

export const InputSearch = ({ handleSearch }) => {
    const { gridView, toggleGridView, showDropFolders, toggleDropFolders, setInputSearchTerm, inputSearchTerm } = useExplorerUI()
    const { currentFolder, activeSheetId, deleteSelection, globalSearch } = useExplorerData();
    const { url, props } = usePage();
    const hasExcelPermission = props.auth?.user?.roles?.some(role => role.name === ROLES.ADMIN || role.name === ROLES.SUPERVISOR);
    // Get dependencies for the active sheet
    const activeDependencies = activeSheetId
        ? (props.sheets?.find(s => s.id === activeSheetId)?.dependencies ?? [])
        : [];
    const currentDependencyId = props.filters?.dependency_id ?? "";

    const handleDependencyChange = (e) => {
        const depId = e.target.value;
        const params = { sheet_id: activeSheetId };
        if (depId) params.dependency_id = depId;
        router.get(route('explorer'), params, { preserveState: true });
    };

    return (
        <div id="inbox-search" className="flex w-full flex-col md:flex-row justify-between items-center gap-4">
            {/* Search + Dependency filter group */}
            <div className="flex flex-col sm:flex-row items-stretch gap-2 w-full md:w-auto">
                {/* Search field */}
                <form onSubmit={(e) => {
                    e.preventDefault();
                    globalSearch(inputSearchTerm);
                }} className="flex items-center bg-white border border-gray-300 px-3 py-2 rounded-lg w-full sm:w-72 shadow-sm focus-within:border-primary focus-within:ring-1 focus-within:ring-primary/20 transition-all">
                    <MagnifyingGlassIcon className="size-5 text-gray-500 mr-2 shrink-0" />
                    <input
                        placeholder="Buscar..."
                        type="text"
                        className="bg-transparent border-none focus:outline-none w-full text-sm"
                        value={inputSearchTerm}
                        onChange={(e) => {
                            setInputSearchTerm(e.target.value);
                            if (e.target.value.trim() === "") {
                                globalSearch("");
                            }
                        }}
                    />
                    {inputSearchTerm && (
                        <XMarkIcon
                            className="size-5 text-gray-400 hover:text-gray-600 cursor-pointer shrink-0"
                            onClick={() => {
                                setInputSearchTerm("");
                                globalSearch("");
                            }}
                        />
                    )}
                </form>

                {/* Dependency select — only visible when a sheet is selected */}
                {activeSheetId && activeDependencies.length > 0 && (
                    <div className="flex items-center bg-white border border-gray-300 px-3 py-2 rounded-lg w-full sm:w-56 shadow-sm focus-within:border-primary focus-within:ring-1 focus-within:ring-primary/20 transition-all">
                        <BuildingOfficeIcon className="size-5 text-gray-400 mr-2 shrink-0" />
                        <select
                            id="dependency-filter"
                            value={currentDependencyId}
                            onChange={handleDependencyChange}
                            className="bg-transparent border-none focus:outline-none w-full text-sm text-gray-700 cursor-pointer outline-none ring-0 h-full"
                        >
                            <option value="">Todas las dependencias</option>
                            {activeDependencies.map((dep) => (
                                <option key={dep.id} value={dep.id}>{dep.name}</option>
                            ))}
                        </select>
                    </div>
                )}
            </div>


            {url.startsWith("/explorer") &&
                <div className="w-full lg:w-auto lg:flex-1 flex items-center justify-between">
                    <div className="flex  gap-2">
                        {/* Filter button */}
                        <button
                            className={`p-4 rounded-md hover:cursor-pointer transition-colors duration-300 inline-block
                            ${showDropFolders
                                    ? "text-white bg-primary active:bg-primary/50"
                                    : "bg-base-200  active:bg-gray-300 hover:bg-gray-300"
                                }`}
                            onClick={toggleDropFolders}
                        >
                            <Bars3Icon
                                className={`size-7  ${showDropFolders
                                    ? "text-white"
                                    : "text-gray-400"
                                    }`}
                            />
                        </button>

                        <button
                            className={`p-4 rounded-md hover:cursor-pointer transition-colors duration-300
                            ${gridView
                                    ? "bg-primary text-white active:bg-primary/50 lg:hover:bg-primary"
                                    : "bg-base-200  active:bg-gray-300 lg:hover:bg-gray-300"
                                }`}
                            onClick={toggleGridView}
                        >
                            <Squares2X2Icon
                                className={`size-7 ${gridView
                                    ? "text-white"
                                    : "text-gray-400"
                                    }`}
                            />
                        </button>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 justify-end  lg:w-max ">
                        <div className="dropdown dropdown-end">
                            <div tabIndex={0} role="button" className="btn bg-primary text-white">Acciones</div>
                            <ul tabIndex="-1" className="dropdown-content bg-base-200 p-2 rounded-box z-50 w-52 shadow-sm">

                                <button
                                    className="p-3 flex items-center gap-5 hover:bg-base-300/30 w-full rounded-md border-b border-gray-100"
                                    onClick={() => {
                                        deleteSelection();
                                        document.getElementById('createFolder').showModal();
                                    }
                                    }>
                                    <PlusIcon className="size-5" />

                                    Nueva Carpeta
                                </button>

                                <button
                                    className={`p-3 flex items-center gap-5 hover:bg-base-300/30 w-full rounded-md border-b border-gray-100 ${currentFolder ? "" : "opacity-20"}`}
                                    onClick={() => {
                                        if (currentFolder) {
                                            document.getElementById('uploadFile').showModal()
                                        } else {
                                            toast.warning("No se pueden subir archivos en la ubicación raíz");
                                        }


                                    }}
                                >
                                    <ArrowUpTrayIcon className="size-5" />
                                    Subir Archivo
                                </button>


                                <button
                                    className="p-3 flex items-center gap-5 hover:bg-base-300/30 w-full rounded-md border-b border-gray-100"
                                    onClick={() => {
                                        const history = JSON.parse(localStorage.getItem("folder_id") || "[]");
                                        const fallbackFolderId = history.length > 0 ? history[history.length - 1] : null;
                                        const targetFolderId = currentFolder?.id ?? fallbackFolderId;
                                        const targetSheetId = activeSheetId ?? localStorage.getItem("active_sheet_id");

                                        if (!targetFolderId) {
                                            toast.warning("Ubicate en una carpeta para guardar el PDF.");
                                            return;
                                        }

                                        router.visit(route("create-pdf", {
                                            folder_id: targetFolderId,
                                            sheet_id: targetSheetId || undefined,
                                        }));
                                    }}
                                >
                                    <DocumentPlusIcon className="size-5" />

                                    Crear PDF
                                </button>

                                {hasExcelPermission && (
                                    <button
                                        className="p-3 flex items-center gap-5 hover:bg-base-300/30 w-full rounded-md border-b border-gray-100"
                                        onClick={async () => {
                                            const toastId = toast.loading("Generando Excel...");
                                            try {
                                                const response = await axios.get('/api/export', { responseType: 'blob' });
                                                const fileUrl = window.URL.createObjectURL(new Blob([response.data]));
                                                const link = document.createElement('a');
                                                link.href = fileUrl;
                                                link.setAttribute('download', `pqrs_report_${new Date().toISOString().slice(0, 10)}.xlsx`);
                                                document.body.appendChild(link);
                                                link.click();
                                                link.remove();
                                                toast.dismiss(toastId);
                                                toast.success("Excel generado exitosamente");
                                            } catch (error) {
                                                console.error(error);
                                                toast.dismiss(toastId);
                                                toast.error("Error al generar Excel: Válida que poseas permisos y la información exista.");
                                            }
                                        }}
                                    >
                                        <TableCellsIcon className="size-5" />
                                        Generar TRD
                                    </button>
                                )}
                            </ul>
                        </div>

                    </div>
                </div>
            }
        </div>
    );
};
