// InformationDrawer displays detailed information about the currently selected file or folder in a sidebar/modal, including metadata and available actions.
import { getSelectedItem, useExplorerData } from '@/Hooks/useExplorer';
import { DocumentIcon, FolderIcon } from '@heroicons/react/24/outline';
import React from 'react'
import { DeleteButtonOption, DownloadButtonOption, EditButtonOption } from './OptionsButtons';

const InformationDrawer = () => {
    const { selectedItems, currentFolder, folders, files } = useExplorerData();

   const selectedItem = getSelectedItem()
    return (

        <dialog id="drawer-information" className="modal">
            <div className="modal-box absolute right-0 top-0 bg-base-200 min-h-full w-80 p-4 z-50 flex flex-col justify-between text-sm">
                {/* Sidebar content here */}
                <div>
                    <div className="p-3 border-b border-base-300 font-bold text-lg flex items-center gap-2">
                        {selectedItem?.extension ? (
                            <DocumentIcon className="size-6 text-gray-600 w-6 h-6" />
                        ) : (
                            <FolderIcon className="size-6 text-gray-600 w-6 h-6" />
                        )}
                        <p className='text-sm'>
                            {selectedItem?.name}
                        </p>
                    </div>

                    <DownloadButtonOption />
                    {!selectedItem?.extension &&
                        <EditButtonOption />
                    }
                    <div className="p-2 border-b space-y-3">
                        <div className="grid grid-cols-3">
                            <span className="font-bold">Tipo</span>
                            <div className="col-span-2 ">
                                {selectedItem?.extension ? `Archivo ${selectedItem?.extension}` : "Carpeta"}
                            </div>
                        </div>

                        <div className="grid grid-cols-3">
                            <div className="font-bold">Ubicación</div>
                            <div className="col-span-2 ">
                                {currentFolder?.name ?? "Ubicación raíz"}
                            </div>
                        </div>

                        {!selectedItem?.extension &&
                            <>
                                <div className="grid grid-cols-3">
                                    <div className="font-bold">Código</div>
                                    <div className="col-span-2 ">
                                        {selectedItem?.folder_code ?? "--"}
                                    </div>
                                </div>


                                <div className="grid grid-cols-3">
                                    <div className="font-bold">Clasificación</div>
                                    <div className="col-span-2 ">
                                        {selectedItem?.department ?? "--"}
                                    </div>
                                </div>
                            </>

                        }


                        <div className="grid grid-cols-3">
                            <span className="font-bold">Creado</span>
                            <div className="col-span-2 flex gap-1 items-center ">
                                {new Date(selectedItem?.created_at).toLocaleDateString()}
                                <span className="text-xs inline-block">
                                    {new Date(selectedItem?.created_at).toLocaleTimeString()}
                                </span>
                            </div>
                        </div>

                        <div className="grid grid-cols-3 border-b border-base-300 pb-2">
                            <span className="font-bold">Modificado</span>
                            <div className="col-span-2 flex gap-1 items-center ">
                                {new Date(selectedItem?.updated_at).toLocaleDateString()}
                                <span className="text-xs inline-block">
                                    {new Date(selectedItem?.updated_at).toLocaleTimeString()}
                                </span>
                            </div>
                        </div>

                    </div>
                </div>

                <DeleteButtonOption />
            </div>






            <form method="dialog" className="modal-backdrop">
                <button>close</button>
            </form>
        </dialog>
    )
}

export default InformationDrawer