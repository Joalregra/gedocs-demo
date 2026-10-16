import { useContext, useEffect, useMemo, useState } from "react";
import {
    EllipsisVerticalIcon,
    ExclamationTriangleIcon,
} from "@heroicons/react/24/outline";
import { ElectronicIndexContext } from "@/context/ElectronicIndexContext/ElectronicIndexContext";
import { useExplorer } from "@/Hooks/useExplorer";

export default function IndexTable() {
    const {
        scopedFiles,
        loading,
        error,
        openFileInExplorerById,
    } = useContext(ElectronicIndexContext);
    const { deleteSelectionItemsMixed, setSelectedItems, downloadZip } = useExplorer();
    const [menuOpen, setMenuOpen] = useState(false);
    const [menuPosition, setMenuPosition] = useState({ top: 0, left: 0 });
    const [selectedFileId, setSelectedFileId] = useState(null);
    const [optimisticHiddenFileIds, setOptimisticHiddenFileIds] = useState([]);

    const formatDate = (dateValue) => {
        if (!dateValue) return "-";
        const date = new Date(dateValue);
        if (Number.isNaN(date.getTime())) return "-";

        return new Intl.DateTimeFormat("es-CO", {
            year: "numeric",
            month: "2-digit",
            day: "2-digit",
        }).format(date);
    };

    const rows = useMemo(() => {
        return (scopedFiles || []).map((file) => ({
            id: file.id,
            radicado: file.name || `Archivo-${file.id}`,
            createdAt: formatDate(file.created_at),
            incorporatedAt: formatDate(file.updated_at),
            managementNumber: file.folder_code || "Sin codigo",
            dependency: file.root_dependency_name || "Sin dependencia",
            hash: file.hash || "-",
        }));
    }, [scopedFiles]);

    const visibleRows = useMemo(
        () => rows.filter((row) => !optimisticHiddenFileIds.includes(row.id)),
        [rows, optimisticHiddenFileIds],
    );

    useEffect(() => {
        const currentFileIds = new Set((scopedFiles || []).map((file) => Number(file.id)));
        setOptimisticHiddenFileIds((prev) => prev.filter((id) => currentFileIds.has(Number(id))));
    }, [scopedFiles]);

    const toggleMenu = (event) => {
        event.stopPropagation();

        const rect = event.currentTarget.getBoundingClientRect();
        const menuWidth = 160;
        const viewportPadding = 8;
        const left = Math.min(
            Math.max(rect.right - menuWidth, viewportPadding),
            window.innerWidth - menuWidth - viewportPadding,
        );

        setMenuPosition({
            top: rect.bottom + 8,
            left,
        });

        const fileId = event.currentTarget.getAttribute("data-file-id");
        const numericFileId = fileId ? Number(fileId) : null;

        if (!numericFileId) {
            setMenuOpen(false);
            setSelectedFileId(null);
            return;
        }

        setSelectedFileId(numericFileId);
        setMenuOpen((prev) => (prev && selectedFileId === numericFileId ? false : true));
    };

    const handleDownload = async () => {
        if (!selectedFileId) return;
        setSelectedItems([{ id: selectedFileId, type: "file" }]);
        await downloadZip();
        setMenuOpen(false);
    };

    const handleGoToFile = () => {
        if (!selectedFileId) return;
        openFileInExplorerById(selectedFileId);
        setMenuOpen(false);
    };

    const handleMoveToTrash = () => {
        if (!selectedFileId) return;
        const deleteModal = document.getElementById("confirmDeleteIndexFile");
        if (deleteModal && !deleteModal.open) {
            deleteModal.showModal();
        }
        setMenuOpen(false);
    };

    const confirmMoveToTrash = async () => {
        if (!selectedFileId) return;
        const fileIdToDelete = selectedFileId;

        setOptimisticHiddenFileIds((prev) => (
            prev.includes(fileIdToDelete) ? prev : [...prev, fileIdToDelete]
        ));

        try {
            await deleteSelectionItemsMixed(
                [{ id: fileIdToDelete, type: "file" }],
                {
                    skipExplorerRefresh: true,
                    onUndo: () => {
                        setOptimisticHiddenFileIds((prev) => prev.filter((id) => id !== fileIdToDelete));
                    },
                    onError: () => {
                        setOptimisticHiddenFileIds((prev) => prev.filter((id) => id !== fileIdToDelete));
                    },
                },
            );
        } catch {
            // The rollback is handled in onError.
        }

        document.getElementById("confirmDeleteIndexFile")?.close();
    };

    const selectedFile = rows.find((row) => row.id === selectedFileId) || null;

    return (
        <div className="w-full overflow-x-auto">
            <table className="min-w-full table-auto border-collapse pb-3">
                <thead className="sticky top-0 z-10 bg-white border-b border-gray-300">
                    <tr className="text-gray-600 uppercase text-[10px] md:text-sm">
                        <th className="py-4 px-4 text-left font-bold whitespace-nowrap">
                            Radicado
                        </th>
                        <th className="px-4 text-left font-bold whitespace-nowrap">
                            Fecha Creacion
                        </th>
                        <th className="px-4 text-left font-bold whitespace-nowrap">
                            Fecha Incorporacion
                        </th>
                        <th className="px-4 text-left font-bold whitespace-nowrap">
                            Numero de gestion
                        </th>
                        <th className="px-4 text-left font-bold whitespace-nowrap">
                            Dependencia
                        </th>
                        <th className="px-4 text-left font-bold whitespace-nowrap">
                            Hash
                        </th>
                        <th className="px-4 text-left font-bold whitespace-nowrap"></th>
                    </tr>
                </thead>
                <tbody className="bg-white">
                    {loading && (
                        <tr>
                            <td colSpan={7} className="py-8 text-center text-gray-500">
                                Cargando archivos...
                            </td>
                        </tr>
                    )}

                    {!loading && error && (
                        <tr>
                            <td colSpan={7} className="py-8 text-center text-red-500">
                                {error}
                            </td>
                        </tr>
                    )}

                    {!loading && !error && visibleRows.length === 0 && (
                        <tr>
                            <td colSpan={7} className="py-8 text-center text-gray-500">
                                No hay archivos para la entidad y año seleccionados.
                            </td>
                        </tr>
                    )}

                    {!loading && !error && visibleRows.map((row) => (
                        <tr key={row.id} className="cursor-pointer border-b border-gray-100 transition-colors bg-white hover:bg-primary/5 select-none">
                            <td className="py-4 px-4 whitespace-nowrap">
                                <div className="flex items-center text-sm gap-2 font-semibold md:gap-3">
                                    {row.radicado}
                                </div>
                            </td>
                            <td className="px-4 text-left text-sm text-gray-500 whitespace-nowrap">
                                {row.createdAt}
                            </td>
                            <td className="px-4 text-left text-sm text-gray-500 whitespace-nowrap">
                                {row.incorporatedAt}
                            </td>
                            <td className="px-4 text-left text-sm text-gray-500 whitespace-nowrap">
                                {row.managementNumber}
                            </td>
                            <td className="px-4 text-left text-sm text-gray-500 whitespace-nowrap">
                                {row.dependency}
                            </td>
                            <td className="px-4 text-left text-sm text-gray-500 whitespace-nowrap">
                                {row.hash && (
                                    <>
                                        {row.hash.substring(0, 12)}...
                                    </>
                                )}
                            </td>
                            <td className="px-4 text-right whitespace-nowrap">
                                <button
                                    type="button"
                                    data-file-id={row.id}
                                    className="p-1 rounded-md hover:bg-gray-100 transition-colors inline-flex"
                                    onClick={toggleMenu}
                                >
                                    <EllipsisVerticalIcon className="size-5 text-gray-400" />
                                </button>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>

            {menuOpen && (
                <>
                    <button
                        type="button"
                        className="fixed inset-0 z-40 cursor-default"
                        onClick={() => setMenuOpen(false)}
                        aria-label="Cerrar menú"
                    />
                    <ul
                        className="fixed z-50 menu bg-white rounded-lg w-40 p-1 shadow-lg border border-gray-100"
                        style={{
                            top: menuPosition.top,
                            left: menuPosition.left,
                        }}
                    >
                        <li>
                            <button
                                className="text-sm flex items-center gap-2"
                                onClick={handleGoToFile}
                            >
                                Ir al archivo
                            </button>
                        </li>

                        <li>
                            <button
                                className="text-sm flex items-center gap-2"
                                onClick={handleDownload}
                            >
                                Descargar
                            </button>
                        </li>
                        <li>
                            <button
                                className="text-sm text-red-600 flex items-center gap-2"
                                onClick={handleMoveToTrash}
                            >
                                Mover a la papelera
                            </button>
                        </li>
                    </ul>
                </>
            )}

            <dialog id="confirmDeleteIndexFile" className="modal">
                <div className="modal-box rounded-3xl p-8 max-w-sm bg-white">
                    <div className="size-16 bg-red-50 rounded-2xl flex items-center justify-center mx-auto mb-6">
                        <ExclamationTriangleIcon className="size-10 text-red-500 animate-pulse" />
                    </div>
                    <h3 className="font-black text-xl text-gray-800 text-center mb-2 tracking-tight">
                        Confirmar eliminacion
                    </h3>
                    <p className="text-sm text-gray-500 text-center font-medium leading-relaxed">
                        ¿Estas seguro de que deseas enviar
                        {" "}
                        <span className="font-bold text-gray-700">{selectedFile?.radicado || "este archivo"}</span>
                        {" "}
                        a la papelera?
                    </p>
                    <div className="modal-action flex flex-col sm:flex-row gap-3 mt-8">
                        <form method="dialog" className="w-full">
                            <button className="btn btn-ghost w-full rounded-2xl font-bold">Mantener</button>
                        </form>
                        <button
                            className="btn bg-red-600 hover:bg-red-700 text-white w-full rounded-2xl border-0 shadow-lg shadow-red-200 font-bold"
                            onClick={confirmMoveToTrash}
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
    );
}
