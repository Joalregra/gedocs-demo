import React, { useContext, useState } from "react";
import { DependenciesContext } from "@/context/DependenciesContext/DependenciesContext";
import { TrashIcon } from "@heroicons/react/24/outline";

export default function DeleteDependencie({ dependency }) {
    const { deleteDependency } = useContext(DependenciesContext);
    const [loading, setLoading] = useState(false);

    if (!dependency) return null;

    const modalId = `delete_dependency_${dependency.id}`;

    const handleDelete = async () => {
        setLoading(true);
        await deleteDependency(dependency.id);
        setLoading(false);
        document.getElementById(modalId)?.close();
    };

    return (
        <>
            <button
                className="btn btn-ghost btn-sm gap-1.5 text-red-500 hover:bg-red-50 hover:text-red-600"
                onClick={() => document.getElementById(modalId)?.showModal()}
            >
                <TrashIcon className="size-4" />
                Eliminar
            </button>

            <dialog id={modalId} className="modal">
                <div className="modal-box max-w-sm">
                    <h3 className="text-lg font-semibold text-slate-800 mb-1">
                        Eliminar dependencia
                    </h3>
                    <p className="text-sm text-slate-500 mb-1">
                        ¿Estás seguro de que deseas eliminar{" "}
                        <span className="font-semibold text-slate-700">
                            {dependency.name}
                        </span>
                        ?
                    </p>
                    <p className="text-xs text-red-500 mb-5">
                        Esta acción no se puede deshacer.
                    </p>

                    <div className="flex items-center justify-end gap-3">
                        <form method="dialog">
                            <button className="btn btn-ghost btn-sm">Cancelar</button>
                        </form>
                        <button
                            onClick={handleDelete}
                            disabled={loading}
                            className="btn btn-error btn-sm gap-1.5 text-white disabled:opacity-40"
                        >
                            {loading ? (
                                <span className="loading loading-spinner loading-xs" />
                            ) : (
                                <TrashIcon className="size-4" />
                            )}
                            {loading ? "Eliminando..." : "Eliminar"}
                        </button>
                    </div>
                </div>
                <form method="dialog" className="modal-backdrop">
                    <button>close</button>
                </form>
            </dialog>
        </>
    );
}