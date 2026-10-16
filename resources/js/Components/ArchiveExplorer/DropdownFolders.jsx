// DropdownFolders provides a collapsible tree view for navigating all folders in the archive. It allows users to expand/collapse folder hierarchies and quickly jump between folders.
import React, { useEffect, useState } from "react";
import { useExplorer } from "@/Hooks/useExplorer";
import { FolderIcon } from "@heroicons/react/24/solid";
import { ArrowLeftCircleIcon, ChevronRightIcon } from "@heroicons/react/24/outline";
import { usePage } from "@inertiajs/react";

const DropdownFolders = () => {
    const { 
        showDropFolders, 
        toggleDropFolders, 
        allFolders, 
        openFolder, 
        currentFolder, 
        loadingAllFolders, 
        activeSheetId 
    } = useExplorer();
    const { url } = usePage();

    const [expandedFolders, setExpandedFolders] = useState(new Set());

    const toggleFolder = (folderId) => {
        setExpandedFolders((prev) => {
            const next = new Set(prev);
            next.has(folderId) ? next.delete(folderId) : next.add(folderId);
            return next;
        });
    };

    useEffect(() => {
        if (!currentFolder || !allFolders?.length) return;

        const expanded = new Set();

        let parentId = currentFolder.parent_id;

        while (parentId) {
            expanded.add(parentId);
            const parent = allFolders.find(f => f.id === parentId);
            parentId = parent?.parent_id || null;
        }

        setExpandedFolders(prev => new Set([...prev, ...expanded]));
    }, [currentFolder, allFolders]);

    const renderFolders = (parentId = null) => {
        return (allFolders || [])
            .filter(folder => {
                if (parentId === null) {
                    // Root level: filter by active sheet
                    return folder.parent_id === null && folder.sheet_number_id === activeSheetId;
                }
                return folder.parent_id === parentId;
            })
            .map(folder => {
                const isExpanded = expandedFolders.has(folder.id);
                const hasChildren = allFolders.some(f => f.parent_id === folder.id);

                return (
                    <div
                        key={folder.id}
                        className={`ml-4 border-l pl-2 whitespace-nowrap w-max ${currentFolder?.id === folder.id
                            ? "border-primary/90 rounded-xl"
                            : "border-gray-300"
                            }`}
                    >
                        <div className="flex items-center gap-1 my-1">

                            {hasChildren ? (
                                <button
                                    type="button"
                                    onClick={() => toggleFolder(folder.id)}
                                    className="p-1 rounded hover:bg-gray-200"
                                >
                                    <ChevronRightIcon
                                        className={`w-4 transition-transform ${isExpanded ? "rotate-90" : ""
                                            }`}
                                    />
                                </button>
                            ) : (
                                <span className="w-6" />
                            )}

                            <div
                                onClick={() => openFolder(folder.id, true)}
                                className={`flex items-center gap-1 w-full  cursor-pointer p-1 rounded-md transition-all ${currentFolder?.id === folder.id
                                    ? "bg-primary/90 text-white"
                                    : "text-gray-500 hover:bg-gray-200 hover:pl-2"
                                    }`}
                            >
                                <FolderIcon className="w-4" />
                                <span className="text-sm whitespace-nowrap">
                                    {folder.name}
                                </span>
                            </div>
                        </div>

                        {isExpanded && renderFolders(folder.id)}
                    </div>
                );
            });
    };

    return (
        <>
            {url.startsWith("/explorer") && (
                <div
                    className={`${showDropFolders ? "left-0 w-screen lg:w-full" : "-left-full lg:w-0 overflow-hidden"
                        } transition-all origin-left lg:pt-16 pb-2 lg:max-w-[400px] z-10 duration-300 h-screen fixed z-50 lg:static w-full top-0 background-[url(/gedocs-logo.svg)]  bg-transparent`}
                >
                    <div
                        className={`bg-white p-2  rounded-lg w-full h-full mb-2  ${showDropFolders ? "overflow-auto " : "overflow-hidden"
                            }`}
                    >
                        <div className="flex gap-5 items-center lg:justify-between border-b border-base-300 my-3 p-2">

                            <span className="lg:order-1 lg:cursor-pointer active:bg-primary/30 rounded-full" onClick={() => {
                                toggleDropFolders()
                            }}>
                                <ArrowLeftCircleIcon className="size-8" />
                            </span>
                            <p className="border-b py-2 font-medium">Carpetas</p>
                        </div>
                        {loadingAllFolders ? (
                            <div className="p-2 flex items-center justify-center text-sm text-gray-500">Cargando Carpetas...</div>
                        ) : !activeSheetId ? (
                            <div className="p-6 text-center flex flex-col items-center justify-center h-40">
                                <p className="text-sm text-gray-500 font-bold italic leading-relaxed">
                                    Por favor, selecciona una entidad para visualizar sus carpetas.
                                </p>
                            </div>
                        ) : (
                            <>
                                {renderFolders()}
                            </>
                        )}
                    </div>
                </div>
            )}
        </>
    );
};

export default DropdownFolders;
