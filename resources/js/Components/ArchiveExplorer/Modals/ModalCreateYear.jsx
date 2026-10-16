import { useExplorerData } from '@/Hooks/useExplorer';
import React, { useState } from 'react'
import { toast } from 'sonner';
import { CalendarIcon } from "@heroicons/react/24/outline";
import InputError from '@/Components/InputError';

const ModalCreateYear = () => {
    const {
        createFolder,
        activeSheetId
    } = useExplorerData();

    const [loading, setLoading] = useState(false);
    const [year, setYear] = useState(new Date().getFullYear());
    const [error, setError] = useState(null);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        if (year < 2000 || year > new Date().getFullYear()) {
            setLoading(false);
            setError("El año debe estar entre 2000 y el año actual");
            return;
        }

        try {
            const data = {
                name: year.toString(),
                folder_code: null,
                parent_id: null,
                department: "Año",
                sheet_number_id: activeSheetId,
            };

            await createFolder({ data });
            document.getElementById('createYearModal').close();
            setYear(new Date().getFullYear());
        } catch (err) {
            toast.error("Error al crear el año: " + err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleCancel = () => {
        setYear(new Date().getFullYear());
        document.getElementById('createYearModal').close();
    };

    return (
        <dialog id='createYearModal' className='modal'>
            <div className='modal-box max-w-sm'>
                <button
                    className="btn btn-sm btn-circle btn-ghost absolute right-2 top-2"
                    onClick={handleCancel}
                >
                    ✕
                </button>

                <div className="flex flex-col items-center gap-4 py-4">
                    <div className="size-16 bg-primary/10 rounded-full flex items-center justify-center">
                        <CalendarIcon className="size-10 text-primary" />
                    </div>

                    <div className="text-center">
                        <h2 className='text-2xl font-bold'>Crear Nuevo Año</h2>
                        <p className="text-sm text-gray-500 mt-1">
                            El sistema generará automáticamente la estructura de carpetas por defecto.
                        </p>
                    </div>
                </div>

                <form className='flex flex-col gap-6 mt-4' onSubmit={handleSubmit}>
                    <div className='flex flex-col space-y-2'>
                        <label className="text-sm font-bold text-gray-700">Año:</label>
                        <input
                            required
                            type="number"
                            min="2000"
                            max={year}
                            className='w-full border-2 border-gray-100 rounded-xl p-3 text-center text-2xl font-black text-primary focus:border-primary focus:ring-0 transition-all'
                            value={year}
                            onChange={(e) =>{
                                 setYear(e.target.value);
                                 setError(null);
                            }}
                        />
                        {error && <InputError message={error}/>}
                    </div>

                    <div className='flex gap-3 justify-end'>
                        <button
                            type="button"
                            className='btn btn-ghost flex-1'
                            onClick={handleCancel}
                            disabled={loading}
                        >
                            Cancelar
                        </button>
                        <button
                            className='btn btn-primary flex-1'
                            type='submit'
                            disabled={loading}
                        >
                            {loading ? "Creando..." : "Crear Año"}
                        </button>
                    </div>
                </form>
            </div>

            <form method="dialog" className="modal-backdrop" onClick={handleCancel}>
                <button>close</button>
            </form>
        </dialog>
    );
};

export default ModalCreateYear;
