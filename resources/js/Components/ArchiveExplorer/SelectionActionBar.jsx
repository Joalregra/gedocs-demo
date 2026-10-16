// SelectionActionBar displays a toolbar when items are selected, providing batch actions like delete, download, and toggling multi-selection mode.

import MenuOptions from './MenuOptions';
import { useExplorerData } from '@/Hooks/useExplorer';
import { DeleteButtonOption, DownloadButtonOption } from './OptionsButtons';
import { XMarkIcon } from '@heroicons/react/24/outline';

const SelectionActionBar = () => {
    const { selectedItems, deleteSelection, setIsMultipleSelection, isMultipleSelection, folders, files } = useExplorerData();
    const showMultiSelect = folders.length > 1 || files.length > 1;

    return (
        <div className="bg-primary/10 w-full rounded-2xl md:rounded-full px-3 py-2 flex flex-col md:flex-row md:justify-between md:items-center gap-2 mb-3">

            {/* Fila principal: botón cerrar + contador + acciones */}
            <div className='flex items-center gap-2 flex-1 min-w-0'>
                {/* Botón cerrar selección */}
                <button
                    className="shrink-0 cursor-pointer p-1 transition-colors duration-300 rounded-full hover:bg-base-300"
                    onClick={deleteSelection}
                    title="Cancelar selección"
                >
                    <XMarkIcon className="size-5" />
                </button>

                {/* Contador de seleccionados */}
                <span className="text-sm font-medium truncate shrink-0">
                    {selectedItems?.length}
                    <span className="hidden sm:inline"> {selectedItems?.length > 1 ? "seleccionados" : "seleccionado"}</span>
                    <span className="sm:hidden"> sel.</span>
                </span>

                 {showMultiSelect && (
                <div className='flex items-center gap-2 tooltip tooltip-bottom md:tooltip-left shrink-0' data-tip="(Shift + Click)">
                    <input
                        type="checkbox"
                        name="selection"
                        id="selection"
                        checked={isMultipleSelection}
                        className='checkbox checkbox-sm'
                        onChange={(e) => setIsMultipleSelection(e.target.checked)}
                    />
                    <label htmlFor='selection' className='cursor-pointer text-sm whitespace-nowrap'>
                        <span className="hidden sm:inline">Selección múltiple</span>
                        <span className="sm:hidden">Múltiple</span>
                    </label>
                </div>
            )}


                {/* Botones de acción rápida (tablet y PC) */}
                <div className='hidden md:flex items-center gap-2 ml-1'>
                    <DeleteButtonOption showText={false} />
                    <DownloadButtonOption showText={false} />
                </div>

                {/* Menú de opciones (siempre visible) */}
                <div className="ml-auto md:ml-1">
                    <MenuOptions />
                </div>
            </div>

            {/* Selección múltiple: en móvil va en fila aparte, en md+ inline */}
           
        </div>
    );
};

export default SelectionActionBar;