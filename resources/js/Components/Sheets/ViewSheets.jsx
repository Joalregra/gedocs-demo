import React, { useState, useContext } from "react";
import EditSheets from "@/Components/Sheets/EditSheets.jsx";
import DeleteSheets from "./DeleteSheets";
import { SheetsContext } from "@/context/SheetsContext/SheetsContext";
import useTimeout from "@/Hooks/useTimeout";

export default function ViewSheets({ sheet }) {
    const { deleteSheet } = useContext(SheetsContext);
    const [sheetToDelete, setSheetToDelete] = useState(null);
    const later = useTimeout();

    const openEditModal = () => {
        document.getElementById("my_modal_3")?.close();
        later(() => {
            document.getElementById("my_modal_4")?.showModal();
        }, 100);
    };

    const openDeleteModal = () => {
        document.getElementById("my_modal_3")?.close();
        setSheetToDelete(sheet);
        later(() => {
            document.getElementById("delete_modal")?.showModal();
        }, 100);
    };

    return (
        <div>
            <dialog id="my_modal_4" className="modal">
                <div className="modal-box max-w-lg p-0 rounded-2xl overflow-hidden">
                    <EditSheets sheet={sheet} />
                </div>
                <form method="dialog" className="modal-backdrop"><button>close</button></form>
            </dialog>

            <DeleteSheets
                sheetToDelete={sheetToDelete}
                deleteSheet={deleteSheet}
            />

            <h2 className="font-bold text-lg sm:text-xl text-gray-800 mb-5">Detalles de Entidad</h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
                <div className="bg-gray-50 rounded-xl p-4">
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">Número Entidad</p>
                    <p className="text-sm font-semibold text-gray-800">{sheet?.number}</p>
                </div>
                <div className="bg-gray-50 rounded-xl p-4">
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">Estado</p>
                    <span className={`inline-flex items-center gap-1.5 text-sm font-semibold ${
                        sheet?.state?.toLowerCase() === "activa" ? "text-green-600" : "text-amber-600"
                    }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${
                            sheet?.state?.toLowerCase() === "activa" ? "bg-green-500" : "bg-amber-500"
                        }`} />
                        {sheet?.state}
                    </span>
                </div>
                <div className="bg-gray-50 rounded-xl p-4">
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">Auxiliares</p>
                    <p className="text-sm font-semibold text-gray-800">{sheet?.assistants_count ?? 0}</p>
                </div>
            </div>

            <div className="flex justify-end gap-3">
                <button
                    onClick={openDeleteModal}
                    className="px-4 py-2 rounded-lg text-sm font-medium border border-red-200 text-red-600 hover:bg-red-50 transition-colors"
                >
                    Borrar
                </button>
                <button
                    onClick={openEditModal}
                    className="px-4 py-2 rounded-lg text-sm font-medium bg-primary text-white hover:opacity-90 transition-opacity"
                >
                    Editar
                </button>
            </div>
        </div>
    );
}
