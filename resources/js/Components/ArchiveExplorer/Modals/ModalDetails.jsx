// ModalDetails displays a modal with detailed information about the selected file or folder, including metadata and main icon.
import { DocumentIcon, FolderIcon } from "@heroicons/react/24/outline";

import { useExplorerData, useExplorerUI } from "@/Hooks/useExplorer";

export const ModalDetails = () => {

  // Context UI management
  const { formatSize } = useExplorerUI();
  const { currentFolder, folders, files, selectedItems } = useExplorerData();

  const selected = selectedItems[0];

  const selectedItem = selected
    ? selected.type === 'folder'
      ? folders.find(f => f.id === selected.id)
      : files.find(f => f.id === selected.id)
    : null;
  ;
  // Render the modal with item details
  return (
    <dialog
      id="modalDetails"
      className="modal"
    >
      <div
        className="modal-box"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Main Icon */}
        <div className="w-full flex justify-center mb-2">
          <div className="border rounded-md p-6">
            {selectedItem?.extension ? (
              <DocumentIcon className="w-12 h-12 text-gray-600" />
            ) : (
              <FolderIcon className="w-12 h-12 text-gray-600" />
            )}
          </div>
        </div>

        {/* Title */}
        <h2 className="font-semibold text-gray-900 mb-3 w-full truncate">
          {selectedItem?.name || "Detalles"}
        </h2>

        {/* General data  */}
        <div className="text-sm text-gray-700 space-y-1">
          <p>
            <span className="font-medium">Tipo:</span>{" "}
            {selectedItem?.extension ? `Archivo ${selectedItem?.extension}` : "Carpeta"}
          </p>
          <p>
            <span className="font-medium">Última Modificación: {new Date(selectedItem?.updated_at).toLocaleString()}</span>

          </p>
        </div>

        <hr className="my-3" />

        {/* Extra Data */}
        <div className="text-sm text-gray-700 space-y-1 text-left">
          <p>
            <span className="font-medium">Código sección:</span>{" "}
            {currentFolder?.folder_code || selectedItem?.folder_code || "--"}
          </p>
          <p>
            <span className="font-medium">Dentro de:</span> {currentFolder?.name ?? "--"}
          </p>
          <p>
            <span className="font-medium">Clasificación:</span>{" "}
            {currentFolder?.department || selectedItem?.department || "--"}
          </p>
          {selectedItem?.extemsion &&
            <>
              <p>
                <span className="font-medium">Tamaño:</span>{" "}
                {selectedItem === "folder" ? "--" : formatSize(selectedItem?.size)}
              </p>
            </>
          }
        </div>
      </div>
      <form method="dialog" className="modal-backdrop">
        <button>close</button>
      </form>
    </dialog>
  );
};
