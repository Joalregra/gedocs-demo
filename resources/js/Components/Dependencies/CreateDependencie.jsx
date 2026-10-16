import { ROLES } from "@/constants/roles";
import React, { useContext, useEffect, useState } from "react";
import { DependenciesContext } from "@/context/DependenciesContext/DependenciesContext";
import { usePage } from "@inertiajs/react";
import { PlusIcon } from "@heroicons/react/24/outline";
import api from "@/lib/axios";
import { toast } from "sonner";

const MODAL_ID = "create_dependency_modal";

export default function CreateDependencie() {
    const { props } = usePage();
    const rol = props?.auth?.user?.roles?.[0]?.name;

    const { createDependency } = useContext(DependenciesContext);

    const [name, setName] = useState("");
    const [sheetNumber, setSheetNumber] = useState("");
    const [folderCode, setFolderCode] = useState("");
    const [sheets, setSheets] = useState([]);
    const [loading, setLoading] = useState(false);

    const fetchSheets = async () => {
        try {
            const result = await api.get("/api/sheets");
            setSheets(result.data.sheets || []);
        } catch (e) {
            console.error(e.response?.data);
        }
    };

    useEffect(() => {
        fetchSheets();
    }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!name.trim()) {
            toast.error("Ingrese el nombre de la dependencia");
            return;
        }
        if (!sheetNumber) {
            toast.error("Debe seleccionar una entidad");
            return;
        }
        if (!folderCode.trim()) {
            toast.error("Ingrese el código de la carpeta");
            return;
        }

        setLoading(true);

        const response = await createDependency({
            name: name.trim(),
            sheet_number_id: Number(sheetNumber),
            folder_code: folderCode.trim(),
        });

        if (response.success) {
            setName("");
            setSheetNumber("");
            setFolderCode("");
            document.getElementById(MODAL_ID)?.close();
            toast.success("Dependencia creada exitosamente");
        } else if (response.errors) {
            const firstError = Object.values(response.errors)[0][0];
            toast.error(firstError);
        } else {
            toast.error("No se pudo crear la dependencia");
        }

        setLoading(false);
    };

    if (rol !== ROLES.SUPERVISOR && rol !== ROLES.ADMIN) return null;

    return (
        <>
            <button
                onClick={() => document.getElementById(MODAL_ID)?.showModal()}
                className="btn btn-primary btn-sm gap-1.5 text-white"
            >
                <PlusIcon className="size-4" />
                Nueva Dependencia
            </button>

            <dialog id={MODAL_ID} className="modal">
                <div className="modal-box max-w-md">
                    <h3 className="text-lg font-semibold text-slate-800 mb-1">
                        Nueva Dependencia
                    </h3>
                    <p className="text-sm text-slate-500 mb-5">
                        Complete los campos para registrar una nueva dependencia.
                    </p>

                    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                        <div className="flex flex-col gap-1.5">
                            <label className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                                Nombre
                            </label>
                            <input
                                type="text"
                                className="input input-bordered w-full"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder="Nombre de la dependencia"
                                required
                            />
                        </div>

                        <div className="flex flex-col gap-1.5">
                            <label className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                                Entidad
                            </label>
                            <select
                                value={sheetNumber}
                                onChange={(e) => setSheetNumber(e.target.value)}
                                className="select select-bordered w-full"
                            >
                                <option value="">Seleccione una entidad</option>
                                {sheets.map((sheet) => (
                                    <option key={sheet.id} value={sheet.id}>
                                        {sheet.number}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div className="flex flex-col gap-1.5">
                            <label className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                                Código de carpeta
                            </label>
                            <input
                                type="text"
                                className="input input-bordered w-full"
                                value={folderCode}
                                onChange={(e) => setFolderCode(e.target.value)}
                                placeholder="Ej. 100, 101, 110"
                                required
                            />
                        </div>

                        <div className="flex items-center justify-end gap-3 mt-2">
                            <button
                                type="button"
                                className="btn btn-ghost btn-sm"
                                onClick={() => document.getElementById(MODAL_ID)?.close()}
                            >
                                Cancelar
                            </button>
                            <button
                                type="submit"
                                disabled={loading}
                                className="btn btn-primary btn-sm text-white"
                            >
                                {loading ? "Creando..." : "Crear dependencia"}
                            </button>
                        </div>
                    </form>
                </div>
                <form method="dialog" className="modal-backdrop">
                    <button>close</button>
                </form>
            </dialog>
        </>
    );
}