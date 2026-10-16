import { useExplorerData } from '@/Hooks/useExplorer';
import React, { useState, useEffect } from 'react'
import { toast } from 'sonner';
import { CalendarIcon, PencilIcon } from "@heroicons/react/24/outline";
import InputError from '@/Components/InputError';

const ModalEditYear = ({ yearData }) => {
    const {
        updateFolder,
    } = useExplorerData();

    const [loading, setLoading] = useState(false);
    const [year, setYear] = useState("");
    const [error, setError] = useState(null);


    useEffect(() => {
        if (yearData) {
            setYear(yearData.name);
        }
    }, [yearData]);

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
                year: parseInt(year)
            };

            await updateFolder({ data, folderId: yearData.id });
            document.getElementById('editYearModal').close();
        } catch (err) {
            toast.error("Error al editar el año: " + err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleCancel = () => {
        document.getElementById('editYearModal').close();
    };

    return (
        <dialog id='editYearModal' className='modal'>
            <div className='modal-box max-w-sm rounded-3xl p-8'>
                <button
                    className="btn btn-sm btn-circle btn-ghost absolute right-4 top-4"
                    onClick={handleCancel}
                >
                    ✕
                </button>

                <div className="flex flex-col items-center gap-4 py-4">
                    <div className="size-16 bg-primary/10 rounded-2xl flex items-center justify-center">
                        <PencilIcon className="size-8 text-primary" />
                    </div>

                    <div className="text-center">
                        <h2 className='text-xl font-black text-gray-800 tracking-tight'>Editar Año</h2>
                        <p className="text-xs text-gray-500 mt-1 font-medium italic">
                            Actualiza el nombre del periodo anual.
                        </p>
                    </div>
                </div>

                <form className='flex flex-col gap-6 mt-4' onSubmit={handleSubmit}>
                    <div className='flex flex-col space-y-2'>
                        <label className="text-xs font-black text-gray-400 uppercase tracking-widest">Año:</label>
                        <input
                            required
                            type="number"
                            min="2000"
                            max="2100"
                            className='w-full border-2 border-gray-100 rounded-2xl p-4 text-center text-3xl font-black text-primary focus:border-primary focus:ring-0 transition-all shadow-inner'
                            value={year}
                            onChange={(e) => {
                                setYear(e.target.value);
                                setError(null);
                            }}
                        />
                        {error && <InputError message={error} />}

                    </div>

                    <div className='flex gap-3 mt-2'>
                        <button
                            type="button"
                            className='btn btn-ghost flex-1 rounded-2xl font-bold'
                            onClick={handleCancel}
                            disabled={loading}
                        >
                            Cancelar
                        </button>
                        <button
                            className='btn btn-primary flex-1 rounded-2xl font-black shadow-lg shadow-primary/20 border-0'
                            type='submit'
                            disabled={loading}
                        >
                            {loading ? "Guardando..." : "Guardar Cambios"}
                        </button>
                    </div>
                </form>
            </div>

            <form method="dialog" className="modal-backdrop bg-black/20 backdrop-blur-sm" onClick={handleCancel}>
                <button>close</button>
            </form>
        </dialog>
    );
};

export default ModalEditYear;
