import React, { useState, useEffect, useContext } from "react";
import { XMarkIcon } from "@heroicons/react/24/outline";
import api from "@/lib/axios";
import { SheetsContext } from "@/context/SheetsContext/SheetsContext";
import useTimeout from "@/Hooks/useTimeout";

export default function EditSheets({ sheet }) {
    const { fetchSheets } = useContext(SheetsContext);
    const later = useTimeout();

    const [formData, setFormData] = useState({
        numeroEntidad: "",
        estado: "",
    });

    const [successMessage, setSuccessMessage] = useState("");
    const [errorMessage, setErrorMessage] = useState("");

    useEffect(() => {
        if (sheet) {
            setFormData({
                numeroEntidad: sheet.number || "",
                estado: sheet.state || "",
            });
        }
    }, [sheet]);

    if (!sheet) return <p>Cargando...</p>;

    const handleChange = (e) =>
        setFormData({ ...formData, [e.target.name]: e.target.value });

    const closeModal = () => {
        document.getElementById("my_modal_4")?.close();
        document.getElementById("my_modal_3")?.close();
    };

    const saveChanges = async () => {
        try {
            const res = await api.put(`/api/sheets/${sheet.id}`, {
                number: Number(formData.numeroEntidad),
                state: formData.estado,
            });

            if (!res.data?.success) {
                setErrorMessage("No se pudo actualizar la entidad");
                later(() => setErrorMessage(""), 3000);
                return;
            }

            await fetchSheets();
            setSuccessMessage("Entidad actualizada correctamente");
            setErrorMessage("");

            later(() => {
                setSuccessMessage("");
                closeModal();
            }, 1200);
        } catch (error) {
            console.error(error);
            setErrorMessage("Error al actualizar la entidad");
            later(() => setErrorMessage(""), 3000);
        }
    };

    const inputClass = "w-full h-10 border border-gray-300 rounded-lg px-3 text-sm bg-white focus:ring-2 focus:ring-primary/30 focus:border-primary focus:outline-none transition-shadow";

    return (
        <div className="flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between px-5 sm:px-6 py-4 border-b border-gray-100">
                <h2 className="font-bold text-lg sm:text-xl text-gray-800">Editar Entidad</h2>
                <button className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors" onClick={closeModal}>
                    <XMarkIcon className="size-5 text-gray-500" />
                </button>
            </div>

            {/* Body */}
            <div className="px-5 sm:px-6 py-5">
                {successMessage && (
                    <div className="mb-4 p-3 text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg">
                        {successMessage}
                    </div>
                )}
                {errorMessage && (
                    <div className="mb-4 p-3 text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg">
                        {errorMessage}
                    </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">Número de Entidad</label>
                        <input type="text" name="numeroEntidad" value={formData.numeroEntidad} onChange={handleChange} className={inputClass} />
                    </div>
                    <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">Estado</label>
                        <select name="estado" value={formData.estado} onChange={handleChange} className={inputClass}>
                            <option>Activa</option>
                            <option>Finalizada</option>
                            <option>Cancelada</option>
                        </select>
                    </div>
                </div>
            </div>

            {/* Footer */}
            <div className="border-t border-gray-100 px-5 sm:px-6 py-4 flex justify-end gap-3">
                <button
                    onClick={closeModal}
                    className="px-4 py-2 rounded-lg text-sm font-medium border border-gray-300 text-gray-600 hover:bg-gray-50 transition-colors"
                >
                    Cancelar
                </button>
                <button
                    onClick={saveChanges}
                    className="px-5 py-2 rounded-lg text-sm font-medium bg-primary text-white hover:opacity-90 transition-opacity"
                >
                    Guardar cambios
                </button>
            </div>
        </div>
    );
}
