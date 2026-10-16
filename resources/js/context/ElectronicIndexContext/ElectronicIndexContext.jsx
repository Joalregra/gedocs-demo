import{
    createContext,
    useState,
    useEffect,
    useCallback,
    useMemo,
} from "react";
import { ROLES } from "@/constants/roles";
import { router } from "@inertiajs/react";
import { toast } from "sonner";

import api from "@/lib/axios";

export const ElectronicIndexContext = createContext();

export function ElectronicIndexProvider ({ children, authUserId = null, authUserRole = null, inertiaVersion = null }) {
    const [rawFiles, setRawFiles] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const [activeSheetId, setActiveSheetIdState] = useState(() => {
        const saved = localStorage.getItem("active_sheet_id");
        return saved ? Number(saved) : null;
    });

    const [activeYear, setActiveYearState] = useState(() => {
        const saved = localStorage.getItem("active_sheet_year");
        return saved ? Number(saved) : new Date().getFullYear();
    });

    const [activeDependencyFolderId, setActiveDependencyFolderIdState] = useState(() => {
        const saved = localStorage.getItem("active_dependency_folder_id");
        return saved ? Number(saved) : null;
    });

    const fetchExplorerNode = useCallback(async ({ sheetId, folderId = null }) => {
        const params = {};
        if (sheetId) params.sheet_id = sheetId;
        if (folderId) params.folder_id = folderId;

        const res = await api.get("/explorer", {
            params,
            headers: {
                "X-Inertia": true,
                ...(inertiaVersion ? { "X-Inertia-Version": inertiaVersion } : {}),
                "Accept": "application/json",
            },
        });

        return res?.data?.props || {};
    }, [inertiaVersion]);

    const loadExplorerFiles = useCallback(async () => {
        if (!activeSheetId || !activeYear) {
            setRawFiles([]);
            return;
        }

        try {
            setLoading(true);
            setError(null);

            const rootData = await fetchExplorerNode({ sheetId: activeSheetId });
            const rootFolders = Array.isArray(rootData?.folders) ? rootData.folders : [];

            const yearFolder = rootFolders.find((folder) => {
                const byYearField = folder?.year && Number(folder.year) === Number(activeYear);
                const byName = String(folder?.name) === String(activeYear);
                return byYearField || byName;
            });

            if (!yearFolder?.id) {
                setRawFiles([]);
                return;
            }

            const queue = [{ folderId: yearFolder.id, dependencyName: null, pathIds: [yearFolder.id] }];
            const visited = new Set();
            const collected = [];

            while (queue.length > 0) {
                const currentNode = queue.shift();
                const currentFolderId = currentNode?.folderId;
                const inheritedDependencyName = currentNode?.dependencyName || null;
                const currentPathIds = Array.isArray(currentNode?.pathIds) ? currentNode.pathIds : [];
                if (!currentFolderId || visited.has(currentFolderId)) continue;
                visited.add(currentFolderId);

                const nodeData = await fetchExplorerNode({
                    sheetId: activeSheetId,
                    folderId: currentFolderId,
                });

                const childFolders = Array.isArray(nodeData?.folders) ? nodeData.folders : [];
                const files = Array.isArray(nodeData?.files) ? nodeData.files : [];
                const currentFolder = nodeData?.currentFolder || null;
                const isYearRoot = Number(currentFolderId) === Number(yearFolder.id);

                files.forEach((file) => {
                    collected.push({
                        ...file,
                        sheet_number_id: activeSheetId,
                        year: Number(activeYear),
                        folder_id: currentFolderId,
                        folder_path_ids: currentPathIds,
                        folder_code: currentFolder?.folder_code || null,
                        folder_name: currentFolder?.name || null,
                        root_dependency_name: inheritedDependencyName,
                    });
                });

                childFolders.forEach((folder) => {
                    if (folder?.id && !visited.has(folder.id)) {
                        queue.push({
                            folderId: folder.id,
                            dependencyName: isYearRoot
                                ? (folder.name || inheritedDependencyName)
                                : inheritedDependencyName,
                            pathIds: [...currentPathIds, folder.id],
                        });
                    }
                });
            }

            setRawFiles(
                collected.filter((file) =>
                    String(file?.extension || "").toLowerCase() === "pdf"
                )
            );
        } catch (err) {
            setError(err?.response?.data?.message || err?.message || "Error cargando archivos del explorador");
            setRawFiles([]);
        } finally {
            setLoading(false);
        }
    }, [activeSheetId, activeYear, fetchExplorerNode]);

    const setActiveSheetId = useCallback((sheetId) => {
        if (sheetId === null || sheetId === undefined || sheetId === "") {
            setActiveSheetIdState(null);
            localStorage.removeItem("active_sheet_id");
            return;
        }

        const numericSheetId = Number(sheetId);
        setActiveSheetIdState(numericSheetId);
        localStorage.setItem("active_sheet_id", String(numericSheetId));
    }, []);

    const setActiveYear = useCallback((year) => {
        if (year === null || year === undefined || year === "") {
            setActiveYearState(null);
            localStorage.removeItem("active_sheet_year");
            return;
        }

        const numericYear = Number(year);
        setActiveYearState(numericYear);
        localStorage.setItem("active_sheet_year", String(numericYear));
    }, []);

    const setActiveScope = useCallback(({ sheetId = null, year = null } = {}) => {
        if (sheetId !== null && sheetId !== undefined) {
            setActiveSheetId(sheetId);
        }

        if (year !== null && year !== undefined) {
            setActiveYear(year);
        }
    }, [setActiveSheetId, setActiveYear]);

    const setActiveDependencyFolderId = useCallback((dependencyFolderId) => {
        if (dependencyFolderId === null || dependencyFolderId === undefined || dependencyFolderId === "") {
            setActiveDependencyFolderIdState(null);
            localStorage.removeItem("active_dependency_folder_id");
            return;
        }

        const numericDependencyFolderId = Number(dependencyFolderId);
        if (Number.isNaN(numericDependencyFolderId)) {
            setActiveDependencyFolderIdState(null);
            localStorage.removeItem("active_dependency_folder_id");
            return;
        }

        setActiveDependencyFolderIdState(numericDependencyFolderId);
        localStorage.setItem("active_dependency_folder_id", String(numericDependencyFolderId));
    }, []);

    const scopedFiles = useMemo(() => {
        if (!activeDependencyFolderId) return [];

        return rawFiles.filter((file) => {
            const pathIds = Array.isArray(file?.folder_path_ids) ? file.folder_path_ids : [];
            return pathIds.some((pathId) => Number(pathId) === Number(activeDependencyFolderId));
        });
    }, [rawFiles, activeDependencyFolderId]);

    const canEdit = authUserRole === ROLES.ADMIN || authUserRole === ROLES.SUPERVISOR;

    const downloadFileById = useCallback(async (fileId) => {
        if (!fileId) return;

        const idToast = toast.loading("Preparando descarga");

        try {
            window.location.href = route("folders.download", fileId);
        } catch (err) {
            toast.error("Error al descargar " + (err?.message || "el archivo"));
        } finally {
            toast.dismiss(idToast);
        }
    }, []);

    const moveFileToTrashById = useCallback((fileId) => {
        if (!fileId || !canEdit) return;

        router.post(route("folders.deleteMixed"), {
            folders: [],
            files: [fileId],
        }, {
            onSuccess: () => {
                toast.success("Archivo movido a la papelera");
                window.dispatchEvent(new CustomEvent("explorer:files-updated"));
                loadExplorerFiles();
            },
            onError: () => {
                toast.error("Error al mover el archivo a la papelera");
            },
            preserveState: true,
        });
    }, [canEdit, loadExplorerFiles]);

    const openFileInExplorerById = useCallback((fileId) => {
        const targetFile = rawFiles.find((file) => Number(file?.id) === Number(fileId));

        if (!targetFile?.folder_id || !activeSheetId) {
            toast.error("No se pudo ubicar la carpeta del archivo");
            return;
        }

        const pathIds = Array.isArray(targetFile.folder_path_ids)
            ? targetFile.folder_path_ids
            : [targetFile.folder_id];

        localStorage.setItem("active_sheet_id", String(activeSheetId));
        localStorage.setItem("folder_id", JSON.stringify(pathIds));

        router.get(route("explorer"), {
            sheet_id: activeSheetId,
            folder_id: targetFile.folder_id,
        });
    }, [rawFiles, activeSheetId]);

    const openExplorerAtActiveYear = useCallback(async () => {
        if (!activeSheetId || !activeYear) {
            router.get(route("explorer"));
            return;
        }

        try {
            const rootData = await fetchExplorerNode({ sheetId: activeSheetId });
            const rootFolders = Array.isArray(rootData?.folders) ? rootData.folders : [];

            const yearFolder = rootFolders.find((folder) => {
                const byYearField = folder?.year && Number(folder.year) === Number(activeYear);
                const byName = String(folder?.name) === String(activeYear);
                return byYearField || byName;
            });

            localStorage.setItem("active_sheet_id", String(activeSheetId));

            if (!yearFolder?.id) {
                localStorage.removeItem("folder_id");
                router.get(route("explorer"), { sheet_id: activeSheetId });
                return;
            }

            localStorage.setItem("folder_id", JSON.stringify([yearFolder.id]));
            router.get(route("explorer"), {
                sheet_id: activeSheetId,
                folder_id: yearFolder.id,
            });
        } catch (err) {
            toast.error("No se pudo abrir el explorador en el año activo");
            router.get(route("explorer"), { sheet_id: activeSheetId });
        }
    }, [activeSheetId, activeYear, fetchExplorerNode]);

    useEffect(() => {
        if (!authUserId) {
            setRawFiles([]);
            setError(null);
            setLoading(false);
            return;
        }

        loadExplorerFiles();
    }, [authUserId, activeSheetId, activeYear, loadExplorerFiles]);

    useEffect(() => {
        const handleFilesUpdated = () => {
            if (!authUserId || !activeSheetId || !activeYear) return;
            loadExplorerFiles();
        };

        window.addEventListener("explorer:files-updated", handleFilesUpdated);
        return () => {
            window.removeEventListener("explorer:files-updated", handleFilesUpdated);
        };
    }, [authUserId, activeSheetId, activeYear, loadExplorerFiles]);



    return(
        <ElectronicIndexContext.Provider value={{
            rawFiles,
            scopedFiles,
            loading,
            error,
            activeSheetId,
            activeYear,
            activeDependencyFolderId,
            setActiveSheetId,
            setActiveYear,
            setActiveScope,
            setActiveDependencyFolderId,
            loadExplorerFiles,
            canEdit,
            downloadFileById,
            moveFileToTrashById,
            openFileInExplorerById,
            openExplorerAtActiveYear,
        }}>
            {children}
        </ElectronicIndexContext.Provider>
    )

}
