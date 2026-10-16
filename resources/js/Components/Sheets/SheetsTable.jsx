import React, { useContext, useState } from "react";
import { SheetsContext } from "@/context/SheetsContext/SheetsContext";
import { ChevronRightIcon, EllipsisVerticalIcon } from "@heroicons/react/24/outline";
import ViewSheets from "./ViewSheets";
import DeleteSheets from "./DeleteSheets";

export default function SheetsTable({ sheets = [] }) {
    const { deleteSheet } = useContext(SheetsContext);

    const [selectedSheet, setSelectedSheet] = useState(null);
    const [sheetToDelete, setSheetToDelete] = useState(null);

    const isEmpty = !sheets || sheets.length === 0;

    const openEditModal = (item) => {
        setSelectedSheet(item);
        setTimeout(() => {
            document.getElementById("my_modal_3").showModal();
        }, 10);
    };

    const openDeleteModal = (item) => {
        setSheetToDelete(item);
        document.getElementById("delete_modal").showModal();
    };

    const handleRowClick = (event, item) => {
        if (event.target.closest("[data-row-action='true']")) {
            return;
        }

        openEditModal(item);
    };

    return (
        <div className="w-full">
            {/* MODAL VER */}
            <dialog id="my_modal_3" className="modal">
                <div className="modal-box max-w-lg p-0 rounded-2xl overflow-hidden">
                    <form method="dialog">
                        <button className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors absolute right-3 top-3 z-10">
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="size-5 text-gray-500"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" /></svg>
                        </button>
                    </form>

                    <div className="p-5 sm:p-6">
                        {selectedSheet ? (
                            <ViewSheets sheet={selectedSheet} />
                        ) : (
                            <p>Cargando entidad...</p>
                        )}
                    </div>
                </div>
                <form method="dialog" className="modal-backdrop"><button>close</button></form>
            </dialog>

            <DeleteSheets
                sheetToDelete={sheetToDelete}
                deleteSheet={deleteSheet}
            />

            {/* ===== MOBILE CARDS ===== */}
            <div className="md:hidden space-y-2 overflow-y-auto">
                {isEmpty ? (
                    <div className="text-center py-10 text-gray-500">
                        <p className="text-lg font-semibold">
                            No hay entidades existentes
                        </p>
                    </div>
                ) : (
                    sheets.map((item) => (
                        <div
                            key={item.id}
                            className="bg-white border-b border-gray-100 px-3 py-4 cursor-pointer transition-colors hover:bg-primary/5 select-none flex items-center justify-between"
                            onClick={() => openEditModal(item)}
                        >
                            <div className="flex flex-col min-w-0 gap-0.5">
                                <div className="flex items-center gap-2">
                                    <span className="font-bold text-gray-800 text-sm">
                                        Entidad #{item.number}
                                    </span>
                                    <span className="text-[10px] text-gray-400 font-medium">
                                        ID {item.id}
                                    </span>
                                </div>
                                <div className="flex items-center gap-1.5">
                                    <span className={`w-1.5 h-1.5 rounded-full ${
                                        item.state?.toLowerCase() === "activa"
                                            ? "bg-green-500"
                                            : "bg-amber-500"
                                    }`} />
                                    <span className="text-[10px] text-gray-500 uppercase tracking-wider font-bold">
                                        {item.state} • {item.assistants_count ?? 0} Alumnos
                                    </span>
                                </div>
                            </div>
                            <ChevronRightIcon className="w-4 h-4 text-gray-300 shrink-0" />
                        </div>
                    ))
                )}
            </div>

            {/* ===== DESKTOP TABLE ===== */}
            <div className="hidden md:block overflow-x-auto rounded-lg">
                <table className="w-full table-auto border-collapse">
                    <thead className="sticky top-0 z-10 bg-white border-b border-gray-300">
                        <tr className="text-gray-600 uppercase text-[10px] md:text-sm">
                            <th className="py-4 px-4 text-left font-bold">ID</th>
                            <th className="py-4 px-4 text-left font-bold">Entidad</th>
                            <th className="py-4 px-4 text-left font-bold">Alumnos</th>
                            <th className="py-4 px-4 text-left font-bold">Estado</th>
                            <th className="py-4 px-4 text-right font-bold w-16">
                                <span className="sr-only">Acciones</span>
                            </th>
                        </tr>
                    </thead>

                    <tbody className="bg-white">
                        {isEmpty ? (
                            <tr>
                                <td
                                    colSpan={5}
                                    className="py-8 text-center text-gray-500"
                                >
                                    No hay entidades existentes
                                </td>
                            </tr>
                        ) : (
                            sheets.map((item, index) => (
                                <tr
                                    key={item.id}
                                    onClick={(event) => handleRowClick(event, item)}
                                    className="cursor-pointer border-b border-gray-100 transition-colors bg-white hover:bg-primary/5 select-none"
                                >
                                    <td className="py-4 px-4">
                                        <span className="text-[10px] text-gray-400 font-medium">
                                            #{item.id}
                                        </span>
                                    </td>
                                    <td className="py-4 px-4">
                                        <span className="font-bold text-gray-800 text-sm">
                                            {item.number}
                                        </span>
                                    </td>
                                    <td className="py-4 px-4">
                                        <span className="text-sm text-gray-500">
                                            {item.assistants_count ?? 0}
                                        </span>
                                    </td>
                                    <td className="py-4 px-4">
                                        <span className={`inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider ${
                                            item.state?.toLowerCase() === "activa"
                                                ? "text-green-600"
                                                : "text-amber-600"
                                        }`}>
                                            <span className={`w-1.5 h-1.5 rounded-full ${
                                                item.state?.toLowerCase() === "activa"
                                                    ? "bg-green-500"
                                                    : "bg-amber-500"
                                            }`} />
                                            {item.state}
                                        </span>
                                    </td>
                                    <td className="py-4 px-4 text-right" data-row-action="true">
                                        <div className={`dropdown dropdown-end ${index >= sheets.length - 2 && sheets.length > 2 ? 'dropdown-top' : ''}`} data-row-action="true">
                                            <div
                                                tabIndex={0}
                                                role="button"
                                                className="p-1 rounded-md hover:bg-gray-100 transition-colors inline-flex"
                                                data-row-action="true"
                                                onClick={(e) => e.stopPropagation()}
                                            >
                                                <EllipsisVerticalIcon className="size-5 text-gray-400" />
                                            </div>
                                            <ul
                                                className="dropdown-content menu bg-base-100 rounded-lg w-40 p-1 shadow-lg z-50"
                                                data-row-action="true"
                                                onClick={(e) => e.stopPropagation()}
                                            >
                                                <li>
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            openEditModal(item);
                                                        }}
                                                        className="text-sm"
                                                    >
                                                        Ver
                                                    </button>
                                                </li>
                                                <li>
                                                    <button
                                                        className="text-sm text-red-600"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            openDeleteModal(item);
                                                        }}
                                                    >
                                                        Eliminar
                                                    </button>
                                                </li>
                                            </ul>
                                        </div>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
