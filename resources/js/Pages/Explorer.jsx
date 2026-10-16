import { InputSearch } from "@/Components/ArchiveExplorer/InputSearch";
import EmptyState from "@/Components/EmptyState";
import { useEffect, useState } from "react";
import { DashboardLayout } from "@/Layouts/DashboardLayout";
import ContainerFolders from "@/Components/ArchiveExplorer/ContainerFolders";
import UploadModal from "@/Components/ArchiveExplorer/Modals/UploadModal";
import { ModalDetails } from "@/Components/ArchiveExplorer/Modals/ModalDetails";
import ModalCreateOrEditFolder from "@/Components/ArchiveExplorer/Modals/ModalCreateOrEditFolder";
import { ArrowLeftCircleIcon, CalendarIcon, DocumentTextIcon, ExclamationTriangleIcon, FolderIcon, ArchiveBoxIcon, PencilIcon, TrashIcon, ArrowPathIcon, DocumentArrowDownIcon } from "@heroicons/react/24/outline";
import InformationDrawer from "@/Components/ArchiveExplorer/InformationDrawer";
import { useExplorerData } from "@/Hooks/useExplorer";
import { usePage, router } from "@inertiajs/react";
import ModalCreateYear from "@/Components/ArchiveExplorer/Modals/ModalCreateYear";
import ModalEditYear from "@/Components/ArchiveExplorer/Modals/ModalEditYear";
import DependencyScheme from "@/Components/DependencyScheme/DependencyScheme";
import DropdownFolders from "@/Components/ArchiveExplorer/DropdownFolders";
import ModalEditFile from "@/Components/ArchiveExplorer/Modals/ModalEditFile";

export default function Explorer() {
    const {
        setHistoryStack,
        fetchFolders,
        deleteSelectionItemsMixed,
        selectedItems,
        activeSheetId,
        setActiveSheetId,
        folders,
        openFolder,
        currentFolder,
        loading,
        archivedMode,
        setArchivedMode,
        archivedFolders,
        archivedFiles,
        restoreSelection,
        setSelectedItems,
        cancelMoveItems,
        goBack,
        pendingMoveItems,
    } = useExplorerData();
    const [editingYear, setEditingYear] = useState(null);
    const [showPdfToast, setShowPdfToast] = useState(false);
    const { sheets, filters, auth, permissionError } = usePage().props;

    const handleSelectSheet = (sheetId) => {
        setActiveSheetId(sheetId);
        fetchFolders(null, sheetId);
        cancelMoveItems();
        localStorage.setItem("active_sheet_id", sheetId);
        localStorage.removeItem("folder_id"); // Clear folder_id when selecting a new sheet
        setHistoryStack([]);
    };

    const handleBackToSheets = () => {
        localStorage.removeItem("active_sheet_id");
        localStorage.removeItem("folder_id"); // Clear folder_id when going back to sheets
        router.get(route('explorer'), {}, {
            onSuccess: () => {
                setActiveSheetId(null);
                setArchivedMode(false);
                setHistoryStack([]);
            }
        });
    };

    useEffect(() => {
        // Restore history stack for UI breadcrumbs from localStorage
        const savedHistory = JSON.parse(localStorage.getItem("folder_id"));
        if (savedHistory?.length > 0) {
            setHistoryStack(savedHistory);
        }
        // Clear active_sheet_id from localStorage if it's not set in props (e.g., after logout or direct navigation to explorer without sheet)
        if (!activeSheetId && localStorage.getItem("active_sheet_id")) {
            localStorage.removeItem("active_sheet_id");
            localStorage.removeItem("folder_id");
        }
    }, [activeSheetId]); // Depend on activeSheetId to re-evaluate when it changes

    return (
        <>
            <DashboardLayout>
                <div className="bg-transparent h-full relative flex flex-col min-h-0 overflow-hidden space-y-4">

                    <div className={`lg:hidden flex justify-between items-center relative bg-white border border-gray-100 rounded-2xl p-2 shadow-sm z-10 shrink-0 mx-2 mt-2 ${pendingMoveItems?.length > 0 ? 'hidden' : ''}`}>
                        {activeSheetId ? (
                            <button
                                className="p-2 -ml-2 rounded-xl text-gray-500 hover:text-primary hover:bg-primary/5 transition-all"
                                onClick={() => {
                                    if (currentFolder || archivedMode) {
                                        if (archivedMode) setArchivedMode(false);
                                        else goBack();
                                    } else if (activeSheetId) {
                                        handleBackToSheets();
                                    }
                                }}
                            >
                                <ArrowLeftCircleIcon className="w-6 h-6" />
                            </button>
                        ) : (
                            <div className="w-8" />
                        )}
                        <h1 className="font-bold text-gray-800 text-sm tracking-wide truncate text-center w-full">
                            {archivedMode ? "Papelera" : currentFolder ? currentFolder.name : (activeSheetId ? "Periodos Anuales" : "Selecciona una Entidad")}
                        </h1>
                        <div className="w-8" /> {/* Spacer for centering */}
                    </div>

                    {(
                        /* ====== DUAL COLUMN SELECTION VIEW ====== */
                        <div className="flex flex-col lg:flex-row flex-1 min-h-0 border border-gray-100 lg:rounded-3xl bg-white lg:shadow-xl overflow-hidden lg:mx-4 lg:mb-4 relative">
                            {/* LEFT COLUMN: Sheets (Entidades) List */}
                            <div className={`w-full lg:w-[280px] xs:w-[320px] border-b lg:border-b-0 lg:border-r border-gray-100 bg-gray-50/50 flex flex-col shrink-0 transition-all duration-300 ${activeSheetId ? 'hidden lg:flex' : 'flex-1 lg:flex-none'}`}>
                                <div className="p-5 lg:p-6 border-b border-gray-100 bg-white/80 backdrop-blur-sm shrink-0 sticky top-0 z-10">
                                    <h3 className="font-extrabold text-base lg:text-xs text-gray-800 flex items-center gap-3">
                                        <div className="size-8 bg-primary/10 rounded-xl flex items-center justify-center">
                                            <FolderIcon className="size-4 lg:size-5 text-primary" />
                                        </div>
                                        Mis Entidades
                                    </h3>
                                    <p className="text-[11px] lg:text-xs text-gray-500 mt-2 font-medium leading-relaxed">Selecciona una entidad para explorar sus archivos.</p>
                                </div>

                                <div className="flex-1 overflow-x-hidden overflow-y-auto px-4 py-4 flex flex-col gap-2 custom-scrollbar">
                                    {sheets.map((sheet) => (
                                        <button
                                            key={sheet.id}
                                            onClick={() => {
                                                handleSelectSheet(sheet.id);
                                                if (archivedMode) {
                                                    setArchivedMode(false);
                                                }

                                            }}
                                            className={`w-full text-sm m-0 xs:text-base group flex items-center justify-between p-1 lg:p-3 rounded-xl transition-all duration-300 text-start ${activeSheetId === sheet.id
                                                ? "bg-primary text-white"
                                                : "bg-white hover:bg-white hover:shadow-md text-gray-700 border border-gray-100"
                                                }`}
                                        >
                                            <div className={`size-8 xs:size-10 flex items-center justify-center rounded-xl font-black text-sm transition-colors ${activeSheetId === sheet.id ? "bg-white/20 text-white" : "bg-gray-100 text-gray-400 group-hover:bg-primary/10 group-hover:text-primary"
                                                }`}>
                                                #
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <div className="flex items-center gap-4">
                                                    <span className="font-bold whitespace-nowrap">Entidad {sheet.number}</span>

                                                </div>
                                                {activeSheetId === sheet.id && (
                                                    <div className="w-2 h-2 bg-white rounded-full animate-pulse shadow-glow"></div>
                                                )}
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* RIGHT COLUMN: Years List */}
                            {(!currentFolder || archivedMode) && !filters?.dependency_id && (
                                <div className="flex-1 flex flex-col h-full bg-white relative">
                                    {permissionError ? (
                                        <div className="flex-1 flex flex-col items-center justify-center text-gray-400 p-12 text-center bg-gray-50/20">
                                            <div className="size-20 bg-red-50 rounded-3xl shadow-soft flex items-center justify-center mb-6 animate-float">
                                                <ExclamationTriangleIcon className="size-10 text-red-500" />
                                            </div>
                                            <h4 className="font-black text-xl text-red-600 uppercase tracking-widest">Error de Acceso</h4>
                                            <p className="max-w-xs mt-3 text-sm font-bold text-gray-600 leading-relaxed bg-red-50 px-4 py-2 rounded-xl">
                                                {permissionError}
                                            </p>
                                            <button
                                                onClick={handleBackToSheets}
                                                className="mt-6 flex items-center gap-2 text-xs font-black uppercase tracking-widest text-primary hover:underline"
                                            >
                                                <ArrowLeftCircleIcon className="size-5" />
                                                Volver a la selección
                                            </button>
                                        </div>
                                    ) : !activeSheetId ? (
                                        <div className="flex-1 flex flex-col items-center justify-center text-gray-400 p-12 text-center bg-gray-50/20">
                                            <div className="size-20 bg-white/80 rounded-3xl shadow-soft flex items-center justify-center mb-6 animate-float">
                                                <FolderIcon className="size-10 text-gray-200" />
                                            </div>
                                            <h4 className="font-black text-xl text-gray-300 uppercase tracking-widest">Panel de Archivos</h4>
                                            <p className="max-w-xs mt-3 text-sm font-medium leading-relaxed">
                                                Elige una entidad del panel izquierdo para comenzar a explorar sus periodos anuales y documentos.
                                            </p>
                                        </div>
                                    ) : (
                                        <div className="flex flex-col flex-1 min-h-0 animate-fade-in text-gray-800">
                                            <div className="p-5 lg:p-6 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between bg-white z-10 backdrop-blur-md shrink-0 sticky top-0 gap-4">
                                                <div>
                                                    <h3 className="font-extrabold text-base lg:text-xs text-gray-800 flex items-center gap-3">
                                                        <div className="size-5 xs:size-8 bg-primary/10 rounded-xs flex items-center justify-center">
                                                            {archivedMode ? <ArchiveBoxIcon className="text-primary" /> : <CalendarIcon className="text-primary" />}
                                                        </div>
                                                        {archivedMode ? "Archivo / Papelera" : "Periodos Anuales"}
                                                    </h3>
                                                    <p className="text-xs text-gray-500 mt-2 font-medium">
                                                        {archivedMode
                                                            ? "Elementos desactivados que pueden ser restaurados."
                                                            : <>Mostrando años disponibles para la <span className="text-primary font-bold italic">Entidad {sheets.find(s => s.id === activeSheetId)?.number}</span></>
                                                        }
                                                    </p>
                                                </div>
                                                {/* ARCHIVE BUTTON */}
                                                <div className="flex items-center justify-end my-3 xs:m-0 xs:justify-start gap-3">
                                                    <button
                                                        onClick={() => setArchivedMode(!archivedMode, activeSheetId)}
                                                        className={`flex items-center justify-center flex-1 sm:flex-none gap-2 px-4 py-2.5 rounded-xl text-xs font-bold uppercase tracking-widest transition-all ${archivedMode
                                                            ? "bg-primary text-white shadow-md shadow-primary/20 hover:bg-primary/90"
                                                            : "bg-gray-50 text-gray-600 hover:bg-gray-100 border border-gray-200 hover:border-gray-300"
                                                            }`}
                                                    >
                                                        <ArchiveBoxIcon className="size-4" />
                                                        {archivedMode ? "Volver" : "Papelera"}
                                                    </button>
                                                </div>
                                            </div>

                                            <div className="flex-1 overflow-x-hidden overflow-y-auto p-4 lg:p-8 custom-scrollbar">
                                                {loading ? (
                                                    <div className="flex items-center justify-center h-40">
                                                        <div className="loading loading-spinner text-primary"></div>
                                                    </div>
                                                ) : archivedMode ? (
                                                    <div className="space-y-6">
                                                        {archivedFolders.length === 0 && archivedFiles.length === 0 ? (
                                                            <div className="flex flex-col items-center justify-center py-20 text-gray-400">
                                                                <ArchiveBoxIcon className="size-16 mb-4 opacity-20" />
                                                                <p className="font-bold">No hay elementos archivados</p>
                                                            </div>
                                                        ) : (
                                                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xs:grid-cols-4 gap-4">
                                                                {archivedFolders.map(folder => (
                                                                    <div
                                                                        key={folder.id}
                                                                        className={`p-4 rounded-3xl border-2 transition-all flex items-center justify-between ${selectedItems.some(i => i.id === folder.id && i.type === 'folder')
                                                                            ? "border-primary bg-primary/5"
                                                                            : "border-gray-100 bg-white"
                                                                            }`}
                                                                        onClick={() => setSelectedItems([{ id: folder.id, type: 'folder' }])}
                                                                    >
                                                                        <div className="flex items-center gap-3 truncate">
                                                                            <FolderIcon className="size-8 text-amber-400 shrink-0" />
                                                                            <span className="font-bold text-sm truncate">{folder.name}</span>
                                                                        </div>
                                                                        <button
                                                                            onClick={(e) => { e.stopPropagation(); setSelectedItems([{ id: folder.id, type: 'folder' }]); restoreSelection(); }}
                                                                            className="p-2 hover:bg-green-50 text-green-600 rounded-xl transition-colors lg:tooltip lg:tooltip-top"
                                                                            data-tip="Restaurar"
                                                                        >
                                                                            <ArrowPathIcon className="size-5" />
                                                                        </button>
                                                                    </div>
                                                                ))}
                                                                {archivedFiles.map(file => (
                                                                    <div
                                                                        key={file.id}
                                                                        className={`p-4 rounded-3xl border-2 transition-all flex items-center justify-between ${selectedItems.some(i => i.id === file.id && i.type === 'file')
                                                                            ? "border-primary bg-primary/5"
                                                                            : "border-gray-100 bg-white"
                                                                            }`}
                                                                        onClick={() => setSelectedItems([{ id: file.id, type: 'file' }])}
                                                                    >
                                                                        <div className="flex items-center gap-3 truncate">
                                                                            <DocumentTextIcon className="size-8 text-blue-400 shrink-0" />
                                                                            <span className="font-bold text-sm truncate">{file.name}</span>
                                                                        </div>
                                                                        <button
                                                                            onClick={(e) => { e.stopPropagation(); setSelectedItems([{ id: file.id, type: 'file' }]); restoreSelection(); }}
                                                                            className="p-2 hover:bg-green-50 text-green-600 rounded-xl transition-colors"
                                                                            title="Restaurar"
                                                                        >
                                                                            <ArrowPathIcon className="size-5" />
                                                                        </button>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        )}
                                                    </div>
                                                ) : (
                                                    <div className="grid grid-cols-2 lg:flex flex-wrap gap-4 lg:gap-6 pb-32">
                                                        {folders.filter(f => !f.parent_id && (f.year || !isNaN(f.name))).map((yearFolder) => (
                                                            <div key={yearFolder.id} className="relative p-10 px-14 flex flex-col items-center justify-center gap-4  rounded-3xl border-2 border-gray-100 bg-white hover:border-primary hover:bg-primary/[0.02] transition-all duration-500 shadow-sm hover:shadow-2xl hover:-translate-y-2"
                                                                onClick={() => openFolder(yearFolder.id, true)}

                                                            >
                                                                <button>
                                                                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-all duration-500 transform group-hover:scale-150 group-hover:rotate-12">
                                                                        <CalendarIcon className="size-16 text-primary" />
                                                                    </div>
                                                                    <div className="size-16 bg-primary/5 rounded-2xl flex items-center justify-center group-hover:scale-110 group-hover:bg-primary/10 transition-all duration-500 shadow-inner">
                                                                        <CalendarIcon className="size-8 text-primary" />
                                                                    </div>
                                                                    <div className="text-center">
                                                                        <span className="block text-2xl font-black text-gray-800 group-hover:text-primary transition-colors tracking-tight">
                                                                            {yearFolder.name}
                                                                        </span>
                                                                        <span className="text-[10px] uppercase font-black text-gray-400 group-hover:text-primary/70 tracking-[0.2em] mt-1 block">
                                                                            Periodo
                                                                        </span>
                                                                    </div>
                                                                </button>

                                                                {/* Year Actions */}
                                                                <div className="absolute top-4 left-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-all duration-300 translate-y-2 group-hover:translate-y-0">
                                                                    <button
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            setEditingYear(yearFolder);
                                                                            document.getElementById('editYearModal').showModal();
                                                                        }}
                                                                        className="size-8 bg-white shadow-soft rounded-xs flex items-center justify-center text-gray-400 hover:text-primary hover:scale-110 transition-all"
                                                                        title="Editar Año"
                                                                    >
                                                                        <PencilIcon className="size-4" />
                                                                    </button>
                                                                    <button
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            deleteSelectionItemsMixed([{ id: yearFolder.id, type: 'folder' }]);
                                                                        }}
                                                                        className="size-8 bg-white shadow-soft rounded-xs flex items-center justify-center text-gray-400 hover:text-red-500 hover:scale-110 transition-all"
                                                                        title="Archivar"
                                                                    >
                                                                        <TrashIcon className="size-4" />
                                                                    </button>
                                                                </div>
                                                            </div>
                                                        ))}

                                                        {/* Option to create a new year manually */}
                                                        <button
                                                            onClick={() => document.getElementById('createYearModal').showModal()}
                                                            className="group flex flex-col items-center justify-center gap-4 p-10 rounded-3xl border-2 border-dashed border-gray-200 bg-gray-50/30 hover:border-primary hover:bg-primary/[0.02] transition-all duration-500 shadow-sm hover:shadow-xl hover:-translate-y-1"
                                                        >
                                                            <div className="size-14 flex items-center justify-center rounded-2xl bg-white shadow-soft group-hover:bg-primary/20 transition-all duration-500">
                                                                <span className="text-3xl text-gray-400 group-hover:text-primary font-light transition-transform duration-500 group-hover:rotate-90">
                                                                    +
                                                                </span>
                                                            </div>
                                                            <span className="text-sm font-black text-gray-400 group-hover:text-primary transition-colors uppercase tracking-widest">
                                                                Añadir Año
                                                            </span>
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                            <DropdownFolders />



                            { /* ====== FOLDER EXPLORER VIEW ====== */}
                            {((currentFolder || filters?.buscador || filters?.dependency_id) && !archivedMode) && (
                                <div className="min-w-1/2 flex flex-col flex-1 min-h-0 bg-white">
                                    <div className="hidden lg:flex items-center justify-between mb-0 p-4 shrink-0 border-b border-gray-100 sticky top-0 bg-white z-20">
                                        <div className="flex items-center gap-3">
                                            <button
                                                onClick={() => {
                                                    localStorage.removeItem("folder_id");
                                                    fetchFolders(null, activeSheetId);
                                                    setHistoryStack([]);
                                                }}
                                                className="flex items-center py-1.5 px-3 rounded-xl gap-2 text-xs font-bold uppercase tracking-wider text-gray-500 hover:text-primary hover:bg-primary/5 transition-all group"
                                            >
                                                <ArrowLeftCircleIcon className="size-5 transition-transform group-hover:-translate-x-1" />
                                                Panel Selección
                                            </button>
                                            <div className="h-4 w-px bg-gray-100"></div>
                                            <div className="flex items-center gap-2">
                                                <span className="text-xs font-black text-primary px-2 py-1 bg-primary/5 rounded-xs border border-primary/10">
                                                    Entidad {sheets.find(s => s.id === activeSheetId)?.number}
                                                </span>
                                                {currentFolder && (
                                                    <>
                                                        <span className="text-gray-300 text-xs">/</span>
                                                        <span className="text-xs font-black text-gray-400 truncate max-w-[200px]">
                                                            {currentFolder.name}
                                                        </span>
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <button
                                                onClick={() => setArchivedMode(true, activeSheetId)}
                                                className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest bg-gray-50 text-gray-500 hover:bg-gray-100 transition-all"
                                            >
                                                <ArchiveBoxIcon className="size-4" />
                                                Papelera
                                            </button>
                                        </div>
                                    </div>

                                    <div className="flex-1 overflow-y-auto flex flex-col min-h-0 bg-white overflow-x-hidden custom-scrollbar relative">
                                        <div className="px-4 lg:px-6 pt-4 pb-2 shrink-0">
                                            <InputSearch />
                                        </div>

                                        <div className="bg-white overflow-hidden pb-10 flex-1 overflow-y-auto">
                                            <ContainerFolders />
                                        </div>
                                    </div>

                                    <dialog id="my_modal_1" className="modal w-full">
                                        <div className="modal-box w-[95vw] sm:w-auto sm:max-w-xl lg:max-w-2xl xs:max-w-4xl xl:max-w-5xl h-auto max-h-[90vh] overflow-y-auto rounded-3xl shadow-2xl border-0 ring-1 ring-gray-100 bg-white">
                                            <form method="dialog">
                                                <button className="btn btn-sm btn-circle btn-ghost absolute right-4 top-4 z-10 hover:rotate-90 transition-transform">✕</button>
                                            </form>

                                            <div className="flex items-center justify-center gap-3 mb-6">
                                                <div className="size-12 bg-primary/10 rounded-2xl flex items-center justify-center">
                                                    <DocumentTextIcon className="size-6 text-primary" />
                                                </div>
                                                <h2 className="text-xl font-black text-gray-800 tracking-tight">
                                                    Generar Comunicación
                                                </h2>
                                            </div>
                                            <p className="text-sm text-gray-500 text-center mb-8 font-medium">
                                                Complete la información necesaria para crear el documento oficial.
                                            </p>

                                            <DependencyScheme onPdfGenerated={() => setShowPdfToast(true)} />

                                            <div className="modal-action border-t border-gray-50 pt-6 mt-8">
                                                <form method="dialog">
                                                    <button className="btn btn-ghost rounded-xl font-bold">Cancelar</button>
                                                </form>
                                                <button
                                                    type="submit"
                                                    form="pdfForm"
                                                    className="btn bg-primary hover:bg-primary-focus text-white rounded-xl shadow-xs shadow-primary/20 px-8 border-0"
                                                >
                                                    <DocumentArrowDownIcon className="size-5 mr-2" />
                                                    Generar PDF
                                                </button>
                                            </div>
                                        </div>
                                        <form method="dialog" className="modal-backdrop bg-black/20 backdrop-blur-sm">
                                            <button>close</button>
                                        </form>
                                    </dialog>

                                    <UploadModal />
                                    <ModalDetails />
                                    <InformationDrawer />

                                    <dialog id="confirmDeleteFolder" className="modal">
                                        <div className="modal-box rounded-3xl p-8 max-w-sm bg-white">
                                            <div className="size-16 bg-red-50 rounded-2xl flex items-center justify-center mx-auto mb-6">
                                                <ExclamationTriangleIcon className="size-10 text-red-500 animate-pulse" />
                                            </div>
                                            <h3 className="font-black text-xl text-gray-800 text-center mb-2 tracking-tight">
                                                Confirmar Eliminación
                                            </h3>
                                            <p className="text-sm text-gray-500 text-center font-medium leading-relaxed">
                                                ¿Estás seguro de que deseas enviar {selectedItems.length > 1 ? "estos elementos" : "este elemento"} a la papelera?
                                            </p>
                                            <div className="modal-action flex flex-col sm:flex-row gap-3 mt-8">
                                                <form method="dialog" className="w-full">
                                                    <button className="btn btn-ghost w-full rounded-2xl font-bold">Mantener</button>
                                                </form>
                                                <button
                                                    className="btn bg-red-600 hover:bg-red-700 text-white w-full rounded-2xl border-0 shadow-xs shadow-red-200 font-bold"
                                                    onClick={deleteSelectionItemsMixed}
                                                >
                                                    Mover a papelera
                                                </button>
                                            </div>
                                        </div>
                                        <form method="dialog" className="modal-backdrop bg-black/20 backdrop-blur-sm">
                                            <button>close</button>
                                        </form>
                                    </dialog>
                                </div>
                            )}
                        </div>
                    )}

                    {/* STATIC MODALS (Outside conditional for proper DOM mounting) */}
                    <ModalCreateOrEditFolder />
                    <ModalCreateYear />
                    <ModalEditYear yearData={editingYear} />
                    <ModalEditFile />


                </div>

            </DashboardLayout>
        </>
    );
}
