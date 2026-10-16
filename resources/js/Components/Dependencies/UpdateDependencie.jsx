import React, { useContext, useState } from "react";
import { DependenciesContext } from "@/context/DependenciesContext/DependenciesContext";
import { CheckIcon } from "@heroicons/react/24/outline";
import { toast } from "sonner";

export default function UpdateDependencie({ dependency }) {
    const { editDependency } = useContext(DependenciesContext);

    const [name, setName] = useState(dependency.name);
    const [loading, setLoading] = useState(false);

    const isDirty = name.trim() !== dependency.name && name.trim() !== "";

    const handleUpdate = async () => {
        if (!isDirty) return;
        setLoading(true);
        const ok = await editDependency(dependency.id, { name: name.trim() });
        if (ok?.success !== false) {
            toast.success("Dependencia actualizada");
        } else {
            toast.error("No se pudo actualizar la dependencia");
        }
        setLoading(false);
    };

    return (
        <div className="flex items-end gap-2">
            <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                    Renombrar
                </label>
                <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="input input-bordered input-sm"
                    placeholder="Nuevo nombre"
                />
            </div>
            <button
                onClick={handleUpdate}
                disabled={loading || !isDirty}
                className="btn btn-primary btn-sm gap-1.5 text-white disabled:opacity-40"
            >
                {loading ? (
                    <span className="loading loading-spinner loading-xs" />
                ) : (
                    <CheckIcon className="size-4" />
                )}
                Guardar
            </button>
        </div>
    );
}