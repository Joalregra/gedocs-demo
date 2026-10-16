import { createContext, useCallback, useState } from "react";
import api from "@/lib/axios";

export const DependenciesContext = createContext();

export function DependenciesProvider({ children }) {

    const [dependencies, setDependencies] = useState([]);

    const fetchDependencies = useCallback(async () => {
        try {
            const res = await api.get("/api/dependency");
            setDependencies(res.data.dependencies || []);
        } catch (error) {
            console.log("Error API (fetchDependencies):", error.response?.data);
        }
    }, []);

    const createDependency = async (data) => {
        try {
            const res = await api.post("/api/dependency", data);

            await fetchDependencies();

            return {
                success: true,
                data: res.data.dependency
            };

        } catch (error) {

            if (error.response?.status === 422) {
                return {
                    success: false,
                    errors: error.response.data.errors
                };
            }

            return {
                success: false,
                message: "Error inesperado"
            };
        }
    };

    const editDependency = async (id, data) => {
        try {
            await api.put(`/api/dependency/${id}`, data);
            await fetchDependencies();
            return { success: true };
        } catch (error) {
            return { success: false };
        }
    };

    const deleteDependency = async (id) => {
        try {
            await api.delete(`/api/dependency/${id}`);
            setDependencies(prev => prev.filter(dep => dep.id !== id));
        } catch (error) {
            console.log("Error eliminando:", error.response?.data);
        }
    };

    return (
        <DependenciesContext.Provider
            value={{
                dependencies,
                fetchDependencies,
                createDependency,
                editDependency,
                deleteDependency,
            }}
        >
            {children}
        </DependenciesContext.Provider>
    );
}