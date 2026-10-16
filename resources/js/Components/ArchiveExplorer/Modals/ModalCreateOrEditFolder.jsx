import { useExplorerData } from '@/Hooks/useExplorer';
import React, { useState, useEffect } from 'react'
import { toast } from 'sonner';
import { FolderIcon, HashtagIcon, TagIcon, PencilSquareIcon, DocumentDuplicateIcon } from '@heroicons/react/24/outline';

const ModalCreateOrEditFolder = () => {

    const {
        currentFolder,
        createFolder,
        updateFolder,
        selectedItems,
        folders,
        activeSheetId
    } = useExplorerData();

    const [loading, setLoading] = useState(false);

    const [formData, setFormData] = useState({
        name: "",
        folder_code: "",
        department: "",
    });

    const selected =
        selectedItems.length === 1 && selectedItems[0].type === 'folder'
            ? folders.find(f => f.id === selectedItems[0].id)
            : null;

    const options = ["sección", "subsección", "serie", "subserie"];

    const currentIndex = options.indexOf(currentFolder?.department);

    const validOptions =
        currentFolder
            ? options.slice(currentIndex + 1)
            : ["sección"];

    useEffect(() => {
        if (!selected) {
            if (validOptions.length > 0) {
                setFormData(prev => ({
                    ...prev,
                    department: validOptions[0]
                }));
            } else {
                setFormData(prev => ({
                    ...prev,
                    department: ""
                }));
            }
        }
    }, [currentFolder]);

    useEffect(() => {
        if (selected) {
            setFormData({
                name: selected.name || "",
                folder_code: selected.folder_code || "",
                department: selected.department || "",
            });
        } else {
            setFormData({
                name: "",
                folder_code: "",
                department: "",
            });
        }
    }, [selected]);

    // Reset form when modal closes to reflect current folder state next time it opens
    useEffect(() => {
        const modal = document.getElementById("createFolder");
        if (!modal) return;

        const onClosed = () => {
            if (selected) {
                setFormData({
                    name: selected.name || "",
                    folder_code: selected.folder_code || "",
                    department: selected.department || "",
                });
            } else {
                setFormData({
                    name: "",
                    folder_code: "",
                    department: "",
                });
            }
        };

        modal.addEventListener("close", onClosed);
        return () => modal.removeEventListener("close", onClosed);
    }, [selected]);

    const createFolderSubmit = async (e) => {
        e.preventDefault();

        if (validOptions.length === 0) {
            toast.error("No se pueden crear más niveles aquí");
            return;
        }

        setLoading(true);

        try {
            const data = {
                name: formData.name,
                folder_code: formData.folder_code,
                parent_id: currentFolder?.id || null,
                department: formData.department,
                sheet_number_id: currentFolder ? null : activeSheetId,
            };

            await createFolder({ data });

            setFormData({ name: "", folder_code: "", department: "" });

            document.getElementById('createFolder').close();

        } catch (err) {
            toast.error("Error al crear la carpeta: " + err.message);
        } finally {
            setLoading(false);
        }
    };

    const editFolderSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);

        try {
            const data = {
                name: formData.name,
                folder_code: formData.folder_code,
                parent_id: currentFolder?.id || null,
                department: formData.department,
            };

            await updateFolder({
                data,
                folderId: selected.id,
            });

            document.getElementById('createFolder').close();

        } catch (err) {
            toast.error(err?.message || "Error al editar la carpeta");
        } finally {
            setLoading(false);
        }
    };

    const handleCancel = () => {
        setLoading(false);
        document.getElementById('createFolder').close();
    };

    return (
        <dialog id='createFolder' className='modal'>
            <div className='modal-box rounded-3xl p-8 max-w-md bg-white overflow-visible'>
                <form method="dialog">
                    <button className="btn btn-sm btn-circle btn-ghost absolute right-4 top-4" onClick={handleCancel}>✕</button>
                </form>

                <div className="flex items-center gap-3 mb-6">
                    <div className="size-12 bg-primary/10 rounded-2xl flex items-center justify-center">
                        {selected ? (
                            <PencilSquareIcon className="size-6 text-primary" />
                        ) : (
                            <FolderIcon className="size-6 text-primary" />
                        )}
                    </div>
                    <div>
                        <h3 className="font-black text-xl text-gray-800 tracking-tight">
                            {selected ? "Editar Carpeta" : "Crear Carpeta"}
                        </h3>
                        <p className="text-xs text-gray-500 font-medium italic">
                            {selected ? "Modifica los detalles de la carpeta." : "Define una nueva ubicación en el sistema."}
                        </p>
                    </div>
                </div>

                <form
                    onSubmit={selected ? editFolderSubmit : createFolderSubmit}
                    className="space-y-5"
                >
                    {/* NOMBRE */}
                    <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1">
                            Nombre de la Carpeta
                        </label>
                        <div className="relative group">
                            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                <DocumentDuplicateIcon className="size-5 text-gray-400 group-focus-within:text-primary transition-colors" />
                            </div>
                            <input
                                required
                                type="text"
                                className="block w-full pl-11 pr-4 py-3 bg-gray-50 border-0 ring-1 ring-gray-200 focus:ring-2 focus:ring-primary rounded-2xl text-sm font-bold text-gray-700 transition-all placeholder:text-gray-400"
                                placeholder="Ej: Correspondencia 2024"
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            />
                        </div>
                    </div>

                    {/* CODIGO */}
                    <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1">
                            Código de Identificación
                        </label>
                        <div className="relative group">
                            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                <HashtagIcon className="size-5 text-gray-400 group-focus-within:text-primary transition-colors" />
                            </div>
                            <input
                                required
                                type="text"
                                className="block w-full pl-11 pr-4 py-3 bg-gray-50 border-0 ring-1 ring-gray-200 focus:ring-2 focus:ring-primary rounded-2xl text-sm font-bold text-gray-700 transition-all placeholder:text-gray-400"
                                placeholder="Ej: 001"
                                value={formData.folder_code}
                                onChange={(e) => setFormData({ ...formData, folder_code: e.target.value })}
                            />
                        </div>
                    </div>

                    {/* CLASIFICACION */}
                    <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1">
                            Clasificación Documental
                        </label>
                        <div className="relative group">
                            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                <TagIcon className="size-5 text-gray-400 group-focus-within:text-primary transition-colors" />
                            </div>
                            {validOptions.length > 0 ? (
                                <select
                                    required
                                    className="block w-full pl-11 pr-4 py-3 bg-gray-50 border-0 ring-1 ring-gray-200 focus:ring-2 focus:ring-primary rounded-2xl text-sm font-bold text-gray-700 transition-all appearance-none cursor-pointer"
                                    value={formData.department}
                                    onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                                >
                                    {validOptions.map((item) => (
                                        <option key={item} value={item} className="font-bold">
                                            {item.charAt(0).toUpperCase() + item.slice(1)}
                                        </option>
                                    ))}
                                </select>
                            ) : (
                                <div className="block w-full pl-11 pr-4 py-3 bg-red-50 text-red-500 rounded-2xl text-[10px] font-bold ring-1 ring-red-100">
                                    Nivel máximo alcanzado (subserie)
                                </div>
                            )}
                            <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none">
                                <svg className="size-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                </svg>
                            </div>
                        </div>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-3 pt-4">
                        <button
                            type="button"
                            onClick={handleCancel}
                            className="btn btn-ghost flex-1 rounded-2xl font-bold order-2 sm:order-1 h-12"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            disabled={loading || validOptions.length === 0}
                            className="btn bg-primary hover:bg-primary/90 text-white flex-1 rounded-2xl border-0 shadow-lg shadow-primary/20 font-bold order-1 sm:order-2 h-12"
                        >
                            {loading ? (
                                <span className="loading loading-spinner loading-sm"></span>
                            ) : (
                                selected ? "Guardar Cambios" : "Crear Carpeta"
                            )}
                        </button>
                    </div>
                </form>
            </div>
            <form method="dialog" className="modal-backdrop bg-black/20 backdrop-blur-sm" onClick={handleCancel}>
                <button>close</button>
            </form>
        </dialog>
    );
};

export default ModalCreateOrEditFolder;