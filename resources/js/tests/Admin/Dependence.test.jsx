import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, beforeAll } from 'vitest';
import { DependenciesContext } from '@/context/DependenciesContext/DependenciesContext';
import DependenciesSettingsSection from '@/Components/Dependencies/DependenciesSettingsSection';
import { toast } from 'sonner';

vi.mock('sonner', () => ({
    toast: {
        success: vi.fn(),
        error: vi.fn(),
    }
}));

vi.mock('@inertiajs/react', () => ({
    usePage: () => ({
        props: {
            auth: {
                user: { id: 1, name: 'Admin', roles: [{ name: 'Admin' }] },
            },
        },
    }),
}));

vi.mock('@/lib/axios', () => {
    return {
        default: {
            get: vi.fn((url) => {
                if (url.includes('api/sheets')) {
                    return Promise.resolve({ data: { sheets: [{ id: 1, number: '123456' }] } });
                }
                return Promise.resolve({ data: {} });
            })
        }
    };
});

const mockDependencies = [
    { id: 1, name: 'Ventanilla Unica', sheet_number_id: 1 },
    { id: 2, name: 'Dependencia de Prueba', sheet_number_id: 1 }
];

const renderWithContext = (ui, contextOverrides = {}) => {
    const defaultContext = {
        dependencies: mockDependencies,
        fetchDependencies: vi.fn().mockResolvedValue({ success: true }),
        createDependency: vi.fn().mockResolvedValue({ success: true }),
        editDependency: vi.fn().mockResolvedValue({ success: true }),
        deleteDependency: vi.fn().mockResolvedValue({ success: true }),
        ...contextOverrides
    };

    return render(
        <DependenciesContext.Provider value={defaultContext}>
            {ui}
        </DependenciesContext.Provider>
    );
};

describe('Frontend Dependencies Module Tests - Admin', () => {

    beforeAll(() => {
        HTMLDialogElement.prototype.showModal = function() { this.open = true; };
        HTMLDialogElement.prototype.close = function() { this.open = false; };
    });

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('renders the Dependencies component with its items and the count badge', async () => {
        renderWithContext(<DependenciesSettingsSection />);
        
        await waitFor(() => {
            expect(screen.queryByText('Cargando dependencias...')).not.toBeInTheDocument();
        });
        expect(screen.getByRole('heading', { level: 2, name: 'Dependencias' })).toBeInTheDocument();
        
        expect(screen.getByText('2')).toBeInTheDocument();

        expect(screen.getAllByText('Ventanilla Unica')[0]).toBeInTheDocument();
        expect(screen.getAllByText('Dependencia de Prueba')[0]).toBeInTheDocument();
    });

    it('prevents Ventanilla Unica from showing edit actions', async () => {
        renderWithContext(<DependenciesSettingsSection />);
        
        await waitFor(() => {
            expect(screen.queryByText('Cargando dependencias...')).not.toBeInTheDocument();
        });

        expect(screen.getByText('Dependencia del sistema (No modificable)')).toBeInTheDocument();
    });

    it('shows and prevents submission of new dependency with empty fields', async () => {
        renderWithContext(<DependenciesSettingsSection />);
        
        await waitFor(() => {
            expect(screen.queryByText('Cargando dependencias...')).not.toBeInTheDocument();
        });

        const newBtn = screen.getByRole('button', { name: /Nueva Dependencia/i });
        fireEvent.click(newBtn);

        const nameInput = screen.getByPlaceholderText('Nombre de la dependencia');
        fireEvent.change(nameInput, { target: { value: 'Una de prueba sin más info' }});

        const createBtn = screen.getByRole('button', { name: /Crear dependencia/i });
        fireEvent.submit(createBtn.closest('form'));

        await waitFor(() => {
            expect(toast.error).toHaveBeenCalledWith('Debe seleccionar una entidad');
        });
    });

    it('submits a new dependency and calls context successfully', async () => {
        const createSpy = vi.fn().mockResolvedValue({ success: true });
        renderWithContext(<DependenciesSettingsSection />, { createDependency: createSpy });
        
        await waitFor(() => {
            expect(screen.queryByText('Cargando dependencias...')).not.toBeInTheDocument();
        });

        const newBtn = screen.getByRole('button', { name: /Nueva Dependencia/i });
        fireEvent.click(newBtn);

        const nameInput = screen.getByPlaceholderText('Nombre de la dependencia');
        const folderInput = screen.getByPlaceholderText('Ej. 100, 101, 110');
        const selectSheet = screen.getByDisplayValue('Seleccione una entidad');

        fireEvent.change(nameInput, { target: { value: 'Gestion' }});
        fireEvent.change(selectSheet, { target: { value: '1' }});
        fireEvent.change(folderInput, { target: { value: 'GEO-01' }});

        const submitBtn = screen.getByRole('button', { name: /Crear dependencia/i });
        fireEvent.submit(submitBtn.closest('form'));

        await waitFor(() => {
            expect(createSpy).toHaveBeenCalledWith({
                name: 'Gestion',
                sheet_number_id: 1,
                folder_code: 'GEO-01'
            });
            expect(toast.success).toHaveBeenCalledWith('Dependencia creada exitosamente');
        });
    });

    it('allows editing a standard dependency name', async () => {
        const editSpy = vi.fn().mockResolvedValue({ success: true });
        renderWithContext(<DependenciesSettingsSection />, { editDependency: editSpy });
        
        await waitFor(() => {
            expect(screen.queryByText('Cargando dependencias...')).not.toBeInTheDocument();
        });

        expect(screen.getAllByText('Dependencia de Prueba')[0]).toBeInTheDocument();

        const renameInputs = screen.getAllByPlaceholderText('Nuevo nombre');
        expect(renameInputs).toHaveLength(1);

        fireEvent.change(renameInputs[0], { target: { value: 'Dependencia Nueva' }});

        const saveBtns = screen.getAllByRole('button', { name: /Guardar/i });
        fireEvent.click(saveBtns[0]);

        await waitFor(() => {
            expect(editSpy).toHaveBeenCalledWith(2, { name: 'Dependencia Nueva' });
            expect(toast.success).toHaveBeenCalledWith('Dependencia actualizada');
        });
    });

    it('allows deleting a standard dependency', async () => {
        const deleteSpy = vi.fn().mockResolvedValue({ success: true });
        renderWithContext(<DependenciesSettingsSection />, { deleteDependency: deleteSpy });
        
        await waitFor(() => {
            expect(screen.queryByText('Cargando dependencias...')).not.toBeInTheDocument();
        });

        const deleteBtn = screen.getByRole('button', { name: /Eliminar/i });
        fireEvent.click(deleteBtn);

        const confirmDeleteBtns = screen.getAllByRole('button', { name: /^Eliminar$/i });
        fireEvent.click(confirmDeleteBtns[1]);

        await waitFor(() => {
            expect(deleteSpy).toHaveBeenCalledWith(2);
        });
    });

});
