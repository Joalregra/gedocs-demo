import { useContext, useEffect, useMemo } from "react";
import { usePage } from "@inertiajs/react";
import IndexTitle from "@/Components/ElectronicIndex/indexTitle";
import IndexTable from "@/Components/ElectronicIndex/indexTable";
import Header from "@/Components/Header/Header";
import { ElectronicIndexContext } from "@/context/ElectronicIndexContext/ElectronicIndexContext";

export default function ElectronicIndex(){
    const { setActiveScope, setActiveDependencyFolderId, loadExplorerFiles } = useContext(ElectronicIndexContext);
    const { url } = usePage();

    const queryParams = useMemo(() => new URLSearchParams(url.split("?")[1] || ""), [url]);
    const querySheetId = queryParams.get("sheet_id");
    const querySheetNumber = queryParams.get("sheet_number");
    const queryYear = queryParams.get("year");
    const queryDependencyFolderId = queryParams.get("dependency_folder_id");

    const activeSheetId = querySheetId || localStorage.getItem("active_sheet_id");
    const activeSheetNumber = querySheetNumber || localStorage.getItem("active_sheet_number");
    const activeYear = queryYear || localStorage.getItem("active_sheet_year") || String(new Date().getFullYear());
    const activeDependencyFolderId = queryDependencyFolderId || localStorage.getItem("active_dependency_folder_id");

    useEffect(() => {
        if (querySheetId) {
            localStorage.setItem("active_sheet_id", querySheetId);
        }

        if (querySheetNumber) {
            localStorage.setItem("active_sheet_number", querySheetNumber);
        }

        if (queryYear) {
            localStorage.setItem("active_sheet_year", queryYear);
        }

        if (queryDependencyFolderId) {
            localStorage.setItem("active_dependency_folder_id", queryDependencyFolderId);
        }
    }, [querySheetId, querySheetNumber, queryYear, queryDependencyFolderId]);

    useEffect(() => {
        setActiveScope({
            sheetId: activeSheetId,
            year: activeYear,
        });
    }, [activeSheetId, activeYear, setActiveScope]);

    useEffect(() => {
        setActiveDependencyFolderId(activeDependencyFolderId);
    }, [activeDependencyFolderId, setActiveDependencyFolderId]);

    useEffect(() => {
        if (!activeSheetId || !activeYear) return;
        loadExplorerFiles();
    }, [activeSheetId, activeYear, loadExplorerFiles]);

    useEffect(() => {
        const baseTitle = "Indice Electronico";
        document.title = activeSheetNumber
            ? `${baseTitle} | Entidad ${activeSheetNumber} | ${activeYear}`
            : baseTitle;
    }, [activeSheetNumber, activeYear]);

    return(
        <div className="pt-16 px-4 pb-5 w-screen h-screen bg-gray-100" >
            <Header/>
            <div className="w-full h-full flex flex-col justify-start items-center gap-10 bg-white rounded-2xl border border-gray-100">
            <IndexTitle
                activeSheetId={activeSheetId}
                activeSheetNumber={activeSheetNumber}
                activeYear={activeYear}
            />
            <IndexTable/>
            </div>
        </div>
    )

}
