import { createContext, useCallback, useState } from "react";
import api from "@/lib/axios";

export const SheetsContext = createContext();

export function SheetsProvider({ children }) {
    const [sheets, setSheets] = useState([]);

    // Obtener todas las entidades
    const fetchSheets = useCallback(async () => {
        try {
            const res = await api.get("/api/sheets");

            if (!res.data?.success) {
                console.log("ERROR AL OBTENER LAS ENTIDADES");
                return;
            }

            setSheets(res.data.sheets || []);
        } catch (error) {
            console.log("Error API:", error);
        }
    }, []);

    // Eliminar entidad
    const deleteSheet = async (id) => {
        try {
            const res = await api.delete(`/api/sheets/${id}`);

            if (!res.data?.success) {
                console.log("Error al eliminar");
                return;
            }

            // Eliminar de la lista sin recargar
            setSheets((prev) => prev.filter((s) => s.id !== id));
        } catch (error) {
            console.log("Error API:", error);
        }
    };

    // Editar entidad
    const editSheet = async (id, data) => {
        try {
            const res = await api.put(`/api/sheets/${id}`, data);

            if (!res.data?.success) {
                console.log("Error editando la entidad");
                return false;
            }

            await fetchSheets(); // Actualiza lista

            return true;
        } catch (error) {
            console.log("Error API:", error);
            return false;
        }
    };

    return (
        <SheetsContext.Provider
            value={{
                sheets,
                fetchSheets,
                deleteSheet,
                editSheet,
            }}
        >
            {children}
        </SheetsContext.Provider>
    );
}
