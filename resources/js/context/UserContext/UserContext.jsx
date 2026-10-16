import { createContext, useState, useEffect, useCallback } from "react";
import api from "@/lib/axios";
import { router, usePage } from "@inertiajs/react";

export const UserContext = createContext();

export function UserProvider({ children }) {
    const [user, setUser] = useState([]);
    const [loading, setLoading] = useState(false);
    const [loadingSearch, setLoadingSearch] = useState(false);
    const [loadingEdit, setLoadingEdit] = useState(false);
    const [idSelected, setidSelected] = useState(null);
    const [content, setContent] = useState(null);

    // search State

    const [isSearching, setIsSearching] = useState(false);
    const [filteredUser, setFilteredUser] = useState([]);
    const [inputSearch, setInputSearch] = useState("");
    const [filterSelected, setFilterSelected] = useState("");

    const [edit, setEdit] = useState(false);
    const [isDelete, setIsDelete] = useState(false);

    //functions
    const fetchUser = useCallback(async () => {
        const res = await api.get("/api/users");
        if (res.data.success === false) {
            console.log("ERRROR AL OBTENER USUARIOS!");
            return;
        }
        setUser(res.data.data);
        setLoading(false);
        return res.data.data;
    }, []);



    const ShowInformation = async (id) => {
        const newArray = user.find((item) => item.id === id);
        setidSelected(newArray);
    };

    const DeleteInfo = async (id) => {
        const res = await api.delete(`/api/users/${id}`);

        if (res.data.success === false) {
            console.log("ERROR AL ELIMINAR USUARIO");
            return;
        }

        await fetchUser();
        setidSelected(null);
    };

    const UpdateInfo = async (
        nombre,
        tipo_documento,
        documento_number,
        email,
        estado,
        id,
        sheetNumbers = [],
        dependencyId = null
    ) => {
        try {
            setLoadingEdit(true);
            const payload = {
                type_document: tipo_documento,
                document_number: documento_number.toString(),
                name: nombre,
                email: email,
                status: estado,
            };
            if (sheetNumbers && sheetNumbers.length > 0) {
                payload.sheet_numbers = sheetNumbers;
            }
            if (dependencyId) {
                payload.dependency_id = dependencyId;
            }
            const res = await api.put(`/api/users/${id}`, payload);
            if (res.data.success === false) {
                console.log("ERROR AL ACTUALIZAR USUARIO");
                return;
            }
            const newList = await fetchUser();
            const updateUser = newList.find((u) => u.id === id);
            setEdit(false);
            setidSelected(updateUser);
        } catch (error) {
            throw error;
        } finally {
            setLoadingEdit(false);
        }
    };


    const searchUser = async (searcher, filter) => {
        if (searcher === "" && isSearching) {
            setFilteredUser([]); 
            return;
        }

        if (!searcher) {
            return;
        }

            setIsSearching(true);
            setLoadingSearch(true);

            const queryParam = filter ? `${filter}=${searcher}` : `search=${searcher}`;
            const res = await api.get(
                `/api/users/search/filter?${queryParam}`
            );

            if (res.data.success === false) {
                console.log("ERROR AL FILTRAR");
                return;
            }
            setFilteredUser(res.data.data);
            setLoadingSearch(false);
    };

    const resetSearch = async () => {
        setInputSearch("");
        setIsSearching(false);
        setFilteredUser([]);
        setFilterSelected("");

        await fetchUser();
    };

    return (
        <UserContext.Provider
            value={{
                // props
                user,
                content,
                setContent,
                loading,
                ShowInformation,
                idSelected,
                setidSelected,
                edit,
                setEdit,
                isDelete,
                loadingEdit,
                setIsDelete,
                UpdateInfo,
                DeleteInfo,
                inputSearch,
                setInputSearch,
                searchUser,
                setIsSearching,
                isSearching,
                resetSearch,
                filteredUser,
                loadingSearch,
                filterSelected,
                setFilterSelected,
                fetchUser,
                setLoadingEdit,
            }}
        >
            {children}
        </UserContext.Provider>
    );
}
