export default function DeleteSheets({ sheetToDelete, deleteSheet }) {
    const handleDelete = () => {
        if (!sheetToDelete) return;
        deleteSheet(sheetToDelete.id);
        document.getElementById("delete_modal")?.close();
        document.getElementById("my_modal_3")?.close();
    };

    return (
        <dialog id="delete_modal" className="modal">
            <div className="modal-box max-w-md rounded-2xl p-0 overflow-hidden">
                <div className="px-5 sm:px-6 pt-5 pb-2">
                    <h3 className="font-bold text-lg text-gray-800">¿Eliminar entidad?</h3>
                    <p className="mt-2 text-sm text-gray-500 leading-relaxed">
                        Esta acción no se puede deshacer. Las dependencias ligadas a la entidad se eliminarán de igual forma.
                    </p>
                </div>

                <div className="px-5 sm:px-6 py-4 flex justify-end gap-3">
                    <form method="dialog">
                        <button className="px-4 py-2 rounded-lg text-sm font-medium border border-gray-300 text-gray-600 hover:bg-gray-50 transition-colors">
                            Cancelar
                        </button>
                    </form>
                    <button
                        onClick={handleDelete}
                        className="px-4 py-2 rounded-lg text-sm font-medium bg-red-600 text-white hover:bg-red-700 transition-colors"
                    >
                        Eliminar
                    </button>
                </div>
            </div>
            <form method="dialog" className="modal-backdrop"><button>close</button></form>
        </dialog>
    );
}
