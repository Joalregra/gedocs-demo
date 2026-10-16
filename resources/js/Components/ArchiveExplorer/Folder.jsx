// Folder represents a single folder item in the explorer, handling its display, selection, and folder-specific actions such as open, edit, or delete.

import { FolderIcon,  } from "@heroicons/react/24/solid";

import MenuOptions from "./MenuOptions";
import { useExplorerData, useExplorerUI } from "@/Hooks/useExplorer";
import ButtonDrawerInformation from "./Modals/ButtonDrawerInformation";


const Folder = ({ folder }) => {
    const { gridView } = useExplorerUI();
    const { openFolder, deleteFolder, selectItem, selectedItems, isMultipleSelection, isSelected, pendingMoveItems } = useExplorerData();


    return (
        <>
            {gridView ?
                <div
                    key={folder.id}
                    onClick={(e) => selectItem(folder.id, 'folder', e)}
                    onDoubleClick={() => {
                        const isMoving = pendingMoveItems.some(i => i.id === folder.id && i.type === 'folder');
                        if (!isMoving) openFolder(folder.id, true)
                    }}
                    className={`cursor-pointer border-b lg:border shadow-sm select-none lg:hover:shadow-md relative transition p-2 rounded-md w-full active:bg-base-200 ${isSelected(folder.id, 'folder') ? "bg-primary/30" : "bg-white hover:bg-primary/20"} ${pendingMoveItems.some(i => i.id === folder.id && i.type === 'folder') ? "border-2 border-primary opacity-30 cursor-not-allowed scale-95 pointer-events-none" : ""}`}
                >
                    {(isMultipleSelection && selectedItems.length > 0) &&
                        <input type="checkbox" name="selected" id={`selected-folder-${folder.id}`} className="checkbox checkbox-primary absolute left-2 top-2 pointer-events-none" checked={isSelected(folder.id, 'folder')} readOnly />
                    }
                    <div className={'flex flex-col items-center  w-full min-w-0'}>
                        <FolderIcon className="w-10 h-10 lg:w-12 lg:h-12 text-gray-500 lg:mb-2 shrink-0" />
                        <p className="font-medium text-gray-700 truncate w-full text-center">{folder.name}</p>
                    </div>

                    {/* Button of options*/}
                    {pendingMoveItems.length === 0 && (
                        <div className="absolute top-2 right-2 flex items-center">
                            <div className="hidden lg:inline-block">
                                <MenuOptions />
                            </div>
                            {!isMultipleSelection &&
                                <div className="lg:hidden">
                                    <ButtonDrawerInformation />
                                </div>
                            }
                        </div>
                    )}
                </div>
                :
                <div
                    key={folder.id}
                    tabIndex={0}
                    className={`active:bg-primary/30 flex justify-between border-b border-gray-400 px-2 py-4 cursor-pointer shadow relative select-none outline-none transition-all duration-400 ${isSelected(folder.id, "folder") ? "bg-primary/30" : "bg-white hover:bg-primary/20"} ${pendingMoveItems.some(i => i.id === folder.id && i.type === 'folder') ? "border-2 border-primary opacity-30 cursor-not-allowed scale-95 pointer-events-none" : ""}`}
                    onClick={(e) => selectItem(folder.id, 'folder', e)}

                    onDoubleClick={() => {
                        const isMoving = pendingMoveItems.some(i => i.id === folder.id && i.type === 'folder');
                        if (!isMoving) openFolder(folder.id, true)
                    }}>
                    <div className="flex gap-2 items-center font-medium min-w-0">
                        {(isMultipleSelection && selectedItems.length > 0) &&
                            <input type="checkbox" name="selected" id={`selected-folder-${folder.id}`} className="checkbox checkbox-primary pointer-events-none" checked={isSelected(folder.id, 'folder')} readOnly />
                        }
                        <FolderIcon className="w-6 h-6 lg:w-8 lg:h-8 text-gray-800 shrink-0" />
                        <span className="text-gray-600 shrink-0">{folder.folder_code}</span>
                        <span className="shrink-0">-</span>
                        <div className="flex flex-col lg:flex-row max-w-1/2 lg:max-w-full">
                            <span className="truncate w-full">{folder.name}</span>
                            <p className="w-26 lg:hidden text-xs text-gray-500">{folder.department}</p>
                        </div>
                    </div>

                    <div className="flex gap-5 items-center">
                        <p className="w-26 hidden lg:inline-block text-gray-500">{folder.department}</p>
                        <p>{new Date(folder.created_at).toLocaleDateString()}</p>
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



            }


        </>
    )
}

export default Folder;
