import {
    FunnelIcon,
    MagnifyingGlassIcon,
} from "@heroicons/react/24/solid";
import InboxMailCard from "@/Components/InboxMailCard/InboxMailCard";
import { useContext, useEffect } from "react";
import { MailContext } from "@/context/MailContext/MailContext.jsx";
import SelectDependecyOrNumberSheet from "../SelectDependecyOrNumberSheet";

export default function OutboxSidebar() {
    const {
        filteredMailCards,
        selectedMail,
        loading,
        toggleFilter,
        filters,
        searchTerm,
        setSearchTerm,
        setSideFilter,
    } = useContext(MailContext);

    const categories = [
        { label: "Peticiones", value: "Peticion" },
        { label: "Quejas", value: "Queja" },
        { label: "Reclamos", value: "Reclamo" },
        { label: "Sugerencias", value: "Sugerencia" },
        { label: "Otro", value: "Otro" },
    ];

    const currentMonthYear = new Intl.DateTimeFormat("es-ES", {
        month: "long",
        year: "numeric",
    }).format(new Date());

    useEffect(() => {
        setSideFilter('sent');
    }, [setSideFilter]);

    return (
        <div
            className={`
        w-full
        lg:w-[420px]
        xl:w-[34%]
        bg-white/95
        border border-slate-200
        flex flex-col
        rounded-2xl
        shadow-sm
        overflow-hidden
        h-full
        min-h-0
        lg:ml-1
        p-0
        transition-all duration-300 ease-in-out
        shrink-0
        ${selectedMail ? "hidden lg:flex" : "flex"}
    `}
        >
            <div className="w-full flex flex-col p-4 md:p-5 bg-linear-to-b from-slate-50 to-white border-b border-slate-100">
                <h2 className="font-semibold text-xl md:text-2xl mb-4 text-slate-800 tracking-tight">
                    Bandeja de Salida
                </h2>

                <div id="inbox-search" className="flex gap-2 w-full">
                    <div className="relative flex items-center bg-slate-100/90 px-3 rounded-xl flex-1 min-w-0 border border-slate-200 focus-within:ring-2 focus-within:ring-primary/20 focus-within:border-primary/40 transition-all">
                        <MagnifyingGlassIcon className="size-5 mr-2 shrink-0 text-slate-500" />
                        <input
                            placeholder="Buscar por asunto, id o descripción..."
                            type="text"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="input bg-transparent border-none focus:outline-none shadow-none w-full truncate px-0 text-sm md:text-base placeholder:text-slate-400"
                        />
                    </div>
                </div>

                <div
                    id="inbox-categories"
                    className="flex mt-3 w-full justify-between items-center"
                >
                    <div className="flex gap-2 w-full overflow-x-auto py-1 pr-1 scrollbar-hide">
                        {categories.map((cat) => (
                            <button
                                key={cat.value}
                                className={`rounded-full text-xs md:text-sm font-medium py-2 px-4 whitespace-nowrap border transition-all ${filters.includes(cat.value)
                                    ? "bg-primary text-white border-primary shadow-sm"
                                    : "bg-white text-slate-600 border-slate-200 hover:border-slate-300 hover:bg-slate-50"
                                    }`}
                                type="button"
                                aria-pressed={filters.includes(cat.value)}
                                onClick={() => toggleFilter(cat.value)}
                                title={cat.label}
                            >
                                {cat.label}
                            </button>
                        ))}
                    </div>
                </div>
                <div className="flex flex-wrap gap-2 justify-between pt-3 items-center">
                    <h5
                        id="inbox-date"
                        className="text-start px-3 py-1.5 rounded-full bg-slate-100 border border-slate-200 font-semibold capitalize whitespace-nowrap text-xs md:text-sm text-slate-700"
                    >
                        {currentMonthYear}
                    </h5>

                    <div className="flex flex-1 justify-end min-w-[150px]">
                        <SelectDependecyOrNumberSheet />
                    </div>
                </div>
            </div>

            <div
                id="mail-card-scrollarea"
                className="p-3 md:p-4 bg-slate-50/80 flex-1 overflow-y-auto w-full h-full min-h-0"
            >
                {loading ? (
                    <div className={"flex flex-col gap-2"}>
                        <div className={"skeleton w-full h-36 rounded-xl"}></div>
                        <div className={"skeleton w-full h-36 rounded-xl"}></div>
                        <div className={"skeleton w-full h-32 rounded-xl"}></div>
                    </div>
                ) : (
                    <>
                        {filteredMailCards.length > 0 ? (
                            filteredMailCards.map((card) => (
                                <InboxMailCard key={card.id} card={card} />
                            ))
                        ) : (
                            <div className="flex flex-col items-center justify-center p-10 text-slate-400 text-center bg-white border border-dashed border-slate-200 rounded-2xl">
                                <FunnelIcon className="size-12 mb-2 opacity-30" />
                                <p className="text-sm md:text-base">No se encontraron PQRS con estos filtros.</p>
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
}
