import { ArrowLeftCircleIcon } from "@heroicons/react/24/outline";
import { useContext } from "react";
import { ElectronicIndexContext } from "@/context/ElectronicIndexContext/ElectronicIndexContext";

export default function IndexTitle({
    activeSheetId,
    activeSheetNumber,
    activeYear,
}) {
    const { openExplorerAtActiveYear } = useContext(ElectronicIndexContext);

    return (
        <div className="w-full">
            <div
                className="w-full rounded-2xl flex flex-col items-start justify-start gap-3 pt-2
             "
            >
                <div className="hidden md:flex items-center gap-3 mb-4 p-3 bg-white rounded-2xl">
                    <button
                        type="button"
                        onClick={openExplorerAtActiveYear}
                        className="flex items-center gap-2 text-xs font-black uppercase cursor-pointer tracking-widest text-gray-400 hover:text-primary transition-all group"
                    >
                        <ArrowLeftCircleIcon className="size-5 transition-transform group-hover:-translate-x-1" />
                        Volver a entidades
                    </button>
                    <div className="h-4 w-px bg-gray-100"></div>
                    <div className="flex items-center gap-2">
                        <span className="text-xs font-black text-gray-600 px-2 py-1 bg-gray-50 rounded-lg border border-gray-100">
                            Año {activeYear || "-"}
                        </span>
                        {activeSheetNumber ? (
                            <span className="text-xs font-black text-primary px-2 py-1 bg-primary/5 rounded-lg border border-primary/10">
                                Entidad {activeSheetNumber}
                            </span>
                        ) : (
                            <span className="text-xs font-black text-gray-400 px-2 py-1 bg-gray-50 rounded-lg border border-gray-100">
                                Sin entidad seleccionada
                            </span>
                        )}
                    </div>
                </div>

                <h2 className="text-2xl ml-3 font-medium">
                    Indice Electrónico
                </h2>
            </div>
        </div>
    );
}
