import React, { useContext, useEffect, useState } from "react";
import { MagnifyingGlassIcon } from "@heroicons/react/24/solid";
import { XMarkIcon, FunnelIcon } from "@heroicons/react/24/outline";
import { UserContext } from "@/context/UserContext/UserContext";

function UserSearch({ url }) {
    const {
        inputSearch,
        setInputSearch,
        searchUser,
        setIsSearching,
        isSearching,
        resetSearch,
        filteredUser,
        filterSelected,
        setFilterSelected,
    } = useContext(UserContext);

    const [openDrodown, setOpenDropdown] = useState(false);

    const filterLabels = {
        search: "Todos",
        name: "Nombre",
        document_number: "Identificación",
        email: "Email",
        sheet_number: "Entidad",
    };

    useEffect(() => {
        if (isSearching) {
            searchUser(inputSearch, filterSelected);
        }
    }, [filterSelected]);

    const title =
        url === "/users/supervisor"
            ? "Lista de Supervisores"
            : url === "/users/auxiliar"
            ? "Lista de Auxiliares"
            : "Lista de Entidades";

    return (
        <div className="w-full flex flex-col gap-4">
            <h2 className="font-bold text-xl sm:text-2xl">{title}</h2>

            <div className="flex flex-col sm:flex-row gap-3 w-full items-stretch sm:items-center">
                {/* Search input */}
                <div className="flex items-center bg-white border border-gray-300 px-3 py-2 rounded-lg flex-1 md:max-w-md shadow-sm focus-within:border-primary focus-within:ring-1 focus-within:ring-primary/20 transition-all">
                    <MagnifyingGlassIcon className="size-5 text-gray-500 mr-2 shrink-0" />
                    <input
                        placeholder="Buscar..."
                        type="text"
                        value={inputSearch}
                        className="bg-transparent border-none focus:outline-none w-full text-sm"
                        onChange={(e) => {
                            const value = e.target.value;
                            setInputSearch(value);

                            if (value === "" && isSearching) {
                                searchUser("", filterSelected);
                                return;
                            }

                            if (isSearching) {
                                searchUser(value, filterSelected);
                            }
                        }}
                    />
                    {inputSearch && (
                        <XMarkIcon
                            className="size-5 text-gray-400 hover:text-gray-600 cursor-pointer shrink-0"
                            onClick={() => {
                                resetSearch();
                            }}
                        />
                    )}
                </div>

                {/* Filter dropdown */}
                <div className="relative">
                    <button
                        className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all border ${
                            openDrodown || filterSelected
                                ? "border-primary bg-primary/5 text-primary"
                                : "border-gray-300 bg-white text-gray-600 hover:border-gray-400"
                        }`}
                        onClick={() => setOpenDropdown(!openDrodown)}
                    >
                        <FunnelIcon className="size-4" />
                        {filterSelected ? filterLabels[filterSelected] : "Filtrar"}
                    </button>
                    {openDrodown && (
                        <div className="absolute left-0 top-full mt-1 w-44 bg-white shadow-lg rounded-lg border border-gray-200 z-20 overflow-hidden">
                            <ul className="py-1 text-sm">
                                {Object.entries(filterLabels).map(([key, label]) => (
                                    <li
                                        key={key}
                                        className={`px-4 py-2.5 cursor-pointer transition-colors ${
                                            filterSelected === key
                                                ? "bg-primary/5 text-primary font-medium"
                                                : "text-gray-700 hover:bg-gray-50"
                                        }`}
                                        onClick={() => {
                                            setOpenDropdown(false);
                                            setFilterSelected(key);
                                        }}
                                    >
                                        {label}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}
                </div>

                {/* Search button */}
                {!isSearching ? (
                    <button
                        className="px-4 py-2.5 bg-primary rounded-lg text-white text-sm font-medium w-full sm:w-auto hover:opacity-90 transition-opacity"
                        onClick={() => {
                            searchUser(inputSearch, filterSelected);
                        }}
                    >
                        Buscar
                    </button>
                ) : (
                    <button
                        className="px-4 py-2.5 rounded-lg text-sm font-medium w-full sm:w-auto border border-gray-300 text-gray-600 hover:bg-gray-50 transition-colors"
                        onClick={() => {
                            resetSearch();
                        }}
                    >
                        Ver Todos
                    </button>
                )}
            </div>
        </div>
    );
}

export default UserSearch;
