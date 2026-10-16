// FileExplorer is responsible for rendering the list or grid of files within the current folder. It manages file selection, preview, and file-specific actions in the explorer.
import {
    DocumentIcon,
    PhotoIcon,
} from "@heroicons/react/24/solid";
import { useExplorerData, useExplorerUI } from "@/Hooks/useExplorer";
import MenuOptions from "./MenuOptions";
import ButtonDrawerInformation from "./Modals/ButtonDrawerInformation";

const File = ({ file }) => {
    const { gridView } = useExplorerUI();
    const { selectItem, selectedItems, isMultipleSelection, isSelected, pendingMoveItems } = useExplorerData();

    const open = () => {
        // Asegura que la URL sea absoluta
        const url = file.url.startsWith("http") ? file.url : `/${file.url.replace(/^\//, "")}`;
        window.open(url, "_blank");
    };

    return (
        <>
            {gridView ? (
                /** GRID VIEW **/
                <div
                    key={file.id}
                    onClick={(e) => selectItem(file.id, 'file', e)}
                    className={`cursor-pointer relative border-b lg:border rounded-lg shadow-sm hover:shadow-md transition p-2 text-center select-none items-center justify-between ${isSelected(file.id, 'file') ? "bg-primary/30" : "bg-white hover:bg-primary/20"} ${pendingMoveItems.some(i => i.id === file.id && i.type === 'file') ? "opacity-30 cursor-not-allowed scale-95 pointer-events-none" : ""}`}
                    onDoubleClick={() => {
                        if (pendingMoveItems.length === 0) open();
                    }}
                >
                    {(isMultipleSelection && selectedItems.length > 0) &&
                        <input type="checkbox" name="selected" id={`selected-file-${file.id}`} className="checkbox checkbox-primary absolute left-2 top-2 pointer-events-none" checked={isSelected(file.id, 'file')} readOnly />
                    }
                    {/* ICON + NAME */}
                    <div className="flex flex-col items-center gap-3 w-full select-none">

                        {file.is_image ? (
                            <PhotoIcon className="w-8 text-blue-500" />
                        ) : file.is_pdf ? (
                            <DocumentIcon className="w-8 text-red-500" />
                        ) : (
                            <DocumentIcon className="w-8 text-gray-800" />
                        )}

                        <p className="font-medium w-full truncate text-gray-700">
                            {file.name}
                        </p>
                        {file.hash && (
                            <span className="text-[10px] text-gray-400 font-mono truncate w-full" title={file.hash}>
                                Hash: {file.hash.substring(0, 12)}...
                            </span>
                        )}
                    </div>

                    {/* OPTIONS BUTTON */}
                    {pendingMoveItems.length === 0 && (
                        <div className="absolute top-2 right-2 flex items-center">
                            <div className="hidden lg:inline-block">
                                <MenuOptions />
                            </div>
                            <div className="lg:hidden">
                                <ButtonDrawerInformation />
                            </div>
                        </div>
                    )}

                </div>
            ) : (
                /** LIST VIEW **/
                <div className="flex flex-col">
                    <div
                        key={file.id}
                        onClick={(e) => selectItem(file.id, 'file', e)}
                        onDoubleClick={() => {
                            if (pendingMoveItems.length === 0) open();
                        }}

                        className={`flex justify-between border-b border-gray-400 px-2 py-3 cursor-pointer select-none ${isSelected(file.id, "file") ? "bg-primary/30" : "bg-white hover:bg-primary/20"} ${pendingMoveItems.some(i => i.id === file.id && i.type === 'file') ? "opacity-30 cursor-not-allowed scale-95 pointer-events-none" : ""}`}
                    >


                        <div className={`flex ${gridView ? "flex-col" : " gap-2 items-center font-medium min-w-0 w-full"}`}>
                            {(isMultipleSelection && selectedItems.length > 0) &&
                                <input type="checkbox" name="selected" id={`selected-file-${file.id}`} className="checkbox checkbox-primary pointer-events-none" checked={isSelected(file.id, "file")} readOnly />
                            }
                            {file.is_image ? (
                                <PhotoIcon className="w-8 text-blue-500" />
                            ) : file.is_pdf ? (
                                <DocumentIcon className="w-8 text-red-500" />
                            ) : (
                                <DocumentIcon className="w-8 text-red-500" />
                            )}

                            <span className="text-gray-600 shrink-0">{file.file_code}</span>
                            <span className="shrink-0">-</span>
                            <div className="flex flex-col lg:flex-row max-w-1/2 lg:max-w-full">
                                <span className="truncate w-full">{file.name}</span>
                                {file.hash && (
                                    <span className="text-[10px] text-gray-400 font-mono lg:ml-2 shrink-0" title={file.hash}>
                                        [{file.hash.substring(0, 8)}]
                                    </span>
                                )}
                                <p className="w-26 lg:hidden text-xs text-gray-500">--</p>
                            </div>
                        </div>

                        <div className="flex gap-5 items-center">
                            <p className="w-26 hidden lg:inline-block text-gray-500">--</p>
                            <p>{new Date(file.created_at).toLocaleDateString()}</p>
                            {(!isMultipleSelection && pendingMoveItems.length === 0) &&
                                <>
                                    <div className="hidden lg:inline-block">
                                        <MenuOptions />
                                    </div>
                                    <div className="lg:hidden">
                                        <ButtonDrawerInformation />
                                    </div>
                                </>
                            }
                        </div>
                    </div>
                </div>
            )}
        </>


        // <li><a href={file.url} download={file.name}>Descargar</a></li>
    );
};

export default File;
