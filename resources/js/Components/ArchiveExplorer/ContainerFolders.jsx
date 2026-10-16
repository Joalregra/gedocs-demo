// ContainerFolders is the main component for displaying and managing the folder and file explorer UI. It handles navigation, folder history, and renders folders and files in the archive explorer.

import { useEffect } from "react";
import {
    ArrowPathIcon,
    ArrowLeftIcon,
} from "@heroicons/react/24/solid";

import Folder from "@/Components/ArchiveExplorer/Folder.jsx";
import FileExplorer from "@/Components/ArchiveExplorer/FileExplorer.jsx"
import SelectionActionBar from "./SelectionActionBar";
import { useExplorerData, useExplorerUI } from "@/Hooks/useExplorer";
import EmptyState from "../EmptyState";
import ElectronicIndex from "@/Pages/ElectronicIndex";
import { Link, usePage } from "@inertiajs/react";


// Main ArchiveExplorer component

export default function ContainerFolders() {
    const { props } = usePage();
    const sheets = props?.sheets || [];

    const {
        folders,
        allFolders,
        loading,
        goBack,
        historyStack,
        currentFolder,
        files,
        fetchFolders,
        setHistoryStack,
        selectedItems,
        activeSheetId,
        setIsMultipleSelection,
        pendingMoveItems,
        cancelMoveItems,
        performMoveItems
    } = useExplorerData();

    const {
        gridView,
        inputSearchTerm
    } = useExplorerUI();

    const extractYearFromFolder = (folder) => {
        if (!folder) return null;

        if (folder?.year && !Number.isNaN(Number(folder.year))) {
            return Number(folder.year);
        }

        if (/^\d{4}$/.test(String(folder?.name || ""))) {
            return Number(folder.name);
        }

        return null;
    };

    const findYearFromCurrentPath = () => {
        if (!currentFolder || !Array.isArray(allFolders) || allFolders.length === 0) {
            return null;
        }

        const folderById = new Map(allFolders.map((folder) => [folder.id, folder]));
        let cursor = currentFolder;

        while (cursor) {
            const year = extractYearFromFolder(cursor);
            if (year) return year;

            cursor = cursor.parent_id ? folderById.get(cursor.parent_id) : null;
        }

        return null;
    };

    const handleHomeClick = () => {
        if (!currentFolder || !Array.isArray(allFolders) || allFolders.length === 0) {
            localStorage.removeItem("folder_id");
            fetchFolders(null, activeSheetId);
            setHistoryStack([]);
            return;
        }

        const folderById = new Map(allFolders.map(f => [f.id, f]));
        let rootFolder = currentFolder;

        while (rootFolder && rootFolder.parent_id) {
            const parent = folderById.get(rootFolder.parent_id);
            if (!parent) break;
            rootFolder = parent;
        }

        if (rootFolder) {
            localStorage.setItem("folder_id", JSON.stringify([rootFolder.id]));
            fetchFolders(rootFolder.id, activeSheetId);
            setHistoryStack([rootFolder.id]);
        } else {
            localStorage.removeItem("folder_id");
            fetchFolders(null, activeSheetId);
            setHistoryStack([]);
        }
    };

    const activeSheet = sheets.find((sheet) => sheet.id === activeSheetId);

    const isDependencyFolder = (() => {
        if (!currentFolder || !Array.isArray(allFolders) || allFolders.length === 0) {
            return false;
        }

        const folderById = new Map(allFolders.map((folder) => [folder.id, folder]));
        const parent = currentFolder.parent_id ? folderById.get(currentFolder.parent_id) : null;
        return Boolean(parent && extractYearFromFolder(parent));
    })();

    const currentYear = findYearFromCurrentPath()
        || Number(localStorage.getItem("active_sheet_year"))
        || new Date().getFullYear();

    const electronicIndexHref = route("electronic-index", {
        sheet_id: activeSheetId || undefined,
        sheet_number: activeSheet?.number || undefined,
        year: currentYear || undefined,
        dependency_folder_id: isDependencyFolder ? currentFolder?.id : undefined,
    });


    useEffect(() => {
        if (selectedItems.length > 1) {
            setIsMultipleSelection(true)
        }

        if (selectedItems.length === 0) {
            setIsMultipleSelection(false)
        }
    }, [selectedItems]);


    if (loading) {
        return (
            <div className="flex flex-col justify-center items-center h-64">
                <div className="animate-spin">
                    <ArrowPathIcon className="w-12 h-12 text-gray-600" />
                </div>
                <p className="text-gray-500 text-sm">Cargando...</p>
            </div>
        );
    }


    return (
        <div className="relative flex-1 flex flex-col">
            {/* ESTÁTICO / STICKY HEADER */}
            <div className="sticky top-0 z-10 bg-white px-2 lg:px-6 pt-0 pb-1 -mt-2">
                {/* It displays the current folder where it is located. */}
                {(selectedItems.length === 0 && pendingMoveItems.length === 0) &&
                    <div className="w-full flex justify-between items-center p-2">
                        <h1 className="font-bold text-lg my-2">
                            {
                                inputSearchTerm === "" ?
                                    <>
                                        {currentFolder?.name || "Raíz"}
                                    </>
                                    :
                                    "Modo busqueda "
                            }
                        </h1>
                        {isDependencyFolder && (
                            <Link
                                href={electronicIndexHref}
                                className="bg-none text-primary font-semibold underline py-2 px-4"
                                onClick={() => {
                                    if (activeSheetId) {
                                        localStorage.setItem("active_sheet_id", String(activeSheetId));
                                    }

                                    if (activeSheet?.number) {
                                        localStorage.setItem("active_sheet_number", String(activeSheet.number));
                                    }

                                    if (currentYear) {
                                        localStorage.setItem("active_sheet_year", String(currentYear));
                                    }

                                    if (currentFolder?.id) {
                                        localStorage.setItem("active_dependency_folder_id", String(currentFolder.id));
                                    }
                                }}
                            >
                                Indice
                            </Link>
                        )}
                    </div>
                }

                {(selectedItems.length > 0 && pendingMoveItems.length === 0) &&
                    <SelectionActionBar />
                }
                {(pendingMoveItems?.length > 0) &&
                    <div className="fixed bottom-14 left-1/2 transform -translate-x-1/2 z-50 bg-white border border-gray-300 shadow-2xl rounded-full px-6 py-4 flex flex-col lg:flex-row items-center gap-4 w-[90%] lg:w-max">
                        <span className="font-semibold text-gray-700 whitespace-nowrap hidden lg:inline-block">
                            Moviendo {pendingMoveItems.length} elemento{pendingMoveItems.length !== 1 && 's'}
                        </span>
                        <div className="flex items-center gap-2">

                            <button onClick={cancelMoveItems} className="bg-gray-100 text-gray-700 font-medium px-4 py-2 rounded-full hover:bg-gray-200 transition-colors shadow-sm cursor-pointer">
                                Cancelar
                            </button>

                            <button onClick={performMoveItems} className="bg-primary text-white font-medium px-4 py-2 rounded-full hover:bg-primary/70 transition-colors shadow-sm cursor-pointer">
                                Mover aquí ({currentFolder.name})
                            </button>
                        </div>
                    </div>
                }
                {(historyStack.length > 1 || (historyStack.length === 1 && (!pendingMoveItems || pendingMoveItems.length === 0))) &&
                    <div className="flex gap-3 items-center bg-white py-2 mb-2">
                        <button
                            className="p-2.5 rounded-xl bg-gray-100/80 hover:bg-gray-200 text-gray-600 transition-colors shadow-sm"
                            onClick={goBack}
                            title="Atrás"
                        >
                            <ArrowLeftIcon className="w-5 h-5" />
                        </button>
                        <button
                            className="text-sm font-semibold text-gray-500 hover:text-primary transition-colors px-3 py-1.5 rounded-lg hover:bg-primary/5"
                            onClick={handleHomeClick}
                        >
                            Ir a Inicio
                        </button>
                    </div>
                }

                {!gridView && (
                    <>
                        {(folders?.length !== 0 && files.length !== 0) &&
                            <div className="flex justify-between px-4 py-3 bg-gray-50 rounded-t-xl border border-gray-100 mt-2">
                                <div className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                                    <div className="truncate w-full max-w-[50vw]">
                                        <div className="flex">
                                            <span>Codigo /&nbsp;</span>
                                            <div className="flex flex-col lg:flex-row">
                                                <span>Nombre</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-8 text-xs font-bold text-gray-500 uppercase tracking-wider">
                                    <strong className="truncate max-w-[50vw] hidden lg:inline-block">Clasificación</strong>
                                    <strong className="truncate max-w-[50vw]">Fecha de Creación</strong>
                                </div>
                            </div>
                        }
                    </>
                )}
            </div>

            {/* CONTENT */}
            <div className={`px-2 lg:px-6 pb-8 ${folders?.length === 0 && files.length === 0 ? 'flex-1 flex flex-col justify-center' : ''}`}>
                {folders?.length === 0 && files.length === 0 && (
                     <EmptyState text={"No hay carpetas o archivos disponibles."} />
                )}
                <div className={`${gridView ? 'grid grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-3' : 'flex flex-col gap-1'} min-w-0 mt-3 pt-1 px-3`}>
                    {(folders || []).map((folder) => (
                        <Folder key={folder.id} folder={folder} />
                    ))}
                    {(files || []).map((file) => (
                        <FileExplorer key={file.id} file={file} />
                    ))}
                </div>
            </div>
        </div>


    );
}
