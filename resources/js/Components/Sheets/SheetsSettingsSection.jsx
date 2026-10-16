import React, { useState, useContext, useMemo, useEffect } from "react";
import { MagnifyingGlassIcon } from "@heroicons/react/24/solid";
import { XMarkIcon } from "@heroicons/react/24/outline";
import SheetsTable from "./SheetsTable";
import CreateSheets from "./CreateSheets";
import { SheetsContext } from "@/context/SheetsContext/SheetsContext";
import EmptyState from "../EmptyState";

export default function SheetsSettingsSection() {
    const { sheets, fetchSheets } = useContext(SheetsContext);

    useEffect(() => {
        fetchSheets();
    }, []);

    const [searchTerm, setSearchTerm] = useState("");

    const openEditModal = () => {
        document.getElementById("my_modal_2")?.showModal();
    };

    const filteredSheets = useMemo(() => {
        const term = searchTerm.toLowerCase().trim();
        if (!term) return sheets;

        return sheets.filter(
            (sheet) =>
                sheet.number.toString().includes(term) ||
                sheet.state.toLowerCase().includes(term) ||
                sheet.id.toString().includes(term),
        );
    }, [searchTerm, sheets]);

    return (
        <div className="w-full flex flex-col gap-4">
            {/* MODAL */}
            <dialog id="my_modal_2" className="modal">
                <div className="modal-box max-w-lg w-[95%] sm:w-[90%] p-0 rounded-2xl overflow-hidden">
                    <form method="dialog">
                        <button className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors absolute right-3 top-3 z-10">
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="size-5 text-gray-500"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" /></svg>
                        </button>
                    </form>
                    <CreateSheets />
                </div>
                <form method="dialog" className="modal-backdrop"><button>close</button></form>
            </dialog>

            <h2 className="font-bold text-xl sm:text-2xl">
                Lista de Entidades
            </h2>

            <div className="flex flex-col sm:flex-row gap-3 w-full items-stretch sm:items-center">
                <div className="flex items-center bg-white border border-gray-300 px-3 py-2 rounded-lg flex-1 md:max-w-md shadow-sm focus-within:border-primary focus-within:ring-1 focus-within:ring-primary/20 transition-all">
                    <MagnifyingGlassIcon className="size-5 text-gray-500 mr-2 shrink-0" />
                    <input
                        placeholder="Buscar por número o estado..."
                        type="text"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="bg-transparent border-none focus:outline-none w-full text-sm"
                    />
                    {searchTerm && (
                        <XMarkIcon
                            className="size-5 text-gray-400 hover:text-gray-600 cursor-pointer shrink-0"
                            onClick={() => setSearchTerm("")}
                        />
                    )}
                </div>

                <button
                    onClick={openEditModal}
                    className="px-4 py-2.5 bg-primary rounded-lg text-white text-sm font-medium w-full sm:w-auto hover:opacity-90 transition-opacity"
                >
                    Nueva entidad
                </button>
            </div>

            <div className="w-full mt-4 h-full relative">
                {filteredSheets.length > 0 ? (
                    <SheetsTable sheets={filteredSheets} />
                ) : searchTerm ? (
                    <div className="relative h-[40vh]">
                        <EmptyState text={`No se encontraron resultados para "${searchTerm}"`} />
                    </div>
                ) : (
                    <div className="relative h-[50vh]">
                        <EmptyState text="Aún no hay entidades creadas" />
                    </div>
                )}
            </div>
        </div>
    );
}
