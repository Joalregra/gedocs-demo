import React, { useState, useContext } from "react";
import api from "@/lib/axios";
import { SheetsContext } from "@/context/SheetsContext/SheetsContext";

export default function CreateSheets() {
    const { fetchSheets } = useContext(SheetsContext);

    const [formData, setFormData] = useState({
        numeroEntidad: "",
    });

    const [errorMsg, setErrorMsg] = useState("");
    const [successMsg, setSuccessMsg] = useState("");

    const handleChange = (e) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value,
        });
    };

    const handleSubmit = async () => {
        setErrorMsg("");
        setSuccessMsg("");

        if (!formData.numeroEntidad) {
            setErrorMsg("Debes ingresar un número de entidad.");
            return;
        }

        try {
            const res = await api.post("/api/sheets", {
                number: Number(formData.numeroEntidad),
            });

            if (!res.data?.id) {
                setErrorMsg("Error al crear la entidad.");
                return;
            }

            setSuccessMsg("Entidad creada con éxito.");
            await fetchSheets();

            setFormData({ numeroEntidad: "" });
            // Error messages
        } catch (error) {
            if (error.response?.status === 401) {
                setErrorMsg("La sesión ha expirado. Inicia sesión nuevamente.");
            } else if (error.response?.status === 422 && error.response?.data?.errors?.number) {
                setErrorMsg("Ya existe una entidad con este número");
            } else if (error.response?.status === 500) {
                setErrorMsg("Error interno al crear la entidad.");
            } else {
                setErrorMsg("Error al comunicarse con el servidor.");
            }

            console.error("ERROR CREATE SHEET:", error);
        }
    };

    return (
        <div className="flex flex-col">
            {/* Header */}
            <div className="px-5 sm:px-6 pt-5 pb-2">
                <h2 className="font-bold text-lg sm:text-xl text-gray-800">Crear Entidad</h2>
            </div>

            {/* Body */}
            <div className="px-5 sm:px-6 py-4">
                {errorMsg && (
                    <div className="mb-4 p-3 text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg">
                        {errorMsg}
                    </div>
                )}
                {successMsg && (
                    <div className="mb-4 p-3 text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg">
                        {successMsg}
                    </div>
                )}

                <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Número de Entidad
                    </label>
                    <input
                        type="text"
                        name="numeroEntidad"
                        placeholder="Ej: 1001"
                        value={formData.numeroEntidad}
                        onChange={handleChange}
                        className="w-full h-10 border border-gray-300 rounded-lg px-3 text-sm bg-white focus:ring-2 focus:ring-primary/30 focus:border-primary focus:outline-none transition-shadow"
                    />
                </div>
            </div>

            {/* Footer */}
            <div className="border-t border-gray-100 px-5 sm:px-6 py-4 flex justify-end gap-3">
                <form method="dialog">
                    <button className="px-4 py-2 rounded-lg text-sm font-medium border border-gray-300 text-gray-600 hover:bg-gray-50 transition-colors">
                        Cancelar
                    </button>
                </form>
                <button
                    onClick={handleSubmit}
                    className="px-5 py-2 rounded-lg text-sm font-medium bg-primary text-white hover:opacity-90 transition-opacity"
                >
                    Guardar
                </button>
            </div>
        </div>
    );
}
