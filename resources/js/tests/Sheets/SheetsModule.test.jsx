import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import SheetsSettingsSection from '@/Components/Sheets/SheetsSettingsSection';
import ViewSheets from '@/Components/Sheets/ViewSheets';
import { SheetsContext } from '@/context/SheetsContext/SheetsContext';
import api from '@/lib/axios';

vi.mock('@/lib/axios', () => ({
    default: {
        post: vi.fn(),
        put: vi.fn(),
        delete: vi.fn(),
    }
}));

beforeAll(() => {
    HTMLDialogElement.prototype.showModal = vi.fn();
    HTMLDialogElement.prototype.close = vi.fn();
});

describe('SheetsModule Component Tests', () => {
    let mockFetchSheets;
    let mockDeleteSheet;
    let mockSheets;

    const openViewModalFromDesktopRow = (sheetNumber) => {
        const numberCell = screen.getByText(String(sheetNumber), { selector: 'td span' });
        const row = numberCell.closest('tr');
        expect(row).not.toBeNull();

        fireEvent.click(row);
    };

    beforeEach(() => {
        vi.clearAllMocks();
        vi.useRealTimers();
        mockFetchSheets = vi.fn();
        mockDeleteSheet = vi.fn();
        mockSheets = [
            { id: 1, number: '100100', state: 'Activa' },
            { id: 2, number: '200200', state: 'Finalizada' },
            { id: 3, number: '300300', state: 'Cancelada' },
        ];
    });

    const renderWithContext = (sheets = mockSheets) => {
        return render(
            <SheetsContext.Provider value={{
                sheets,
                fetchSheets: mockFetchSheets,
                deleteSheet: mockDeleteSheet
            }}>
                <SheetsSettingsSection />
            </SheetsContext.Provider>
        );
    };

    it('renders the initial layout and calls fetchSheets on mount', () => {
        renderWithContext();
        expect(mockFetchSheets).toHaveBeenCalledTimes(1);
        expect(screen.getByText('Lista de Entidades')).toBeInTheDocument();
        expect(screen.getByText('100100')).toBeInTheDocument();
        expect(screen.getByText('200200')).toBeInTheDocument();
        expect(screen.getByText('300300')).toBeInTheDocument();
    });

    it('filters the Sheets table when typing in the search bar', async () => {
        renderWithContext();

        expect(screen.getAllByText('Activa').length).toBeGreaterThan(0);
        expect(screen.getAllByText('Finalizada').length).toBeGreaterThan(0);

        const searchInput = screen.getByPlaceholderText('Buscar por número o estado...');
        fireEvent.change(searchInput, { target: { value: '200' } });

        await waitFor(() => {
            expect(screen.queryByText('100100')).not.toBeInTheDocument();
            expect(screen.getByText('200200')).toBeInTheDocument();
            expect(screen.queryByText('300300')).not.toBeInTheDocument();
        });
    });

    it('opens Create modal, fills input and submits POST /api/sheets', async () => {
        api.post.mockResolvedValueOnce({ data: { id: 99, number: '999999' } });
        renderWithContext();

        const createBtn = screen.getByText('Nueva entidad');
        fireEvent.click(createBtn);

        expect(HTMLDialogElement.prototype.showModal).toHaveBeenCalled();

        const inputEntidad = screen.getByPlaceholderText('Ej: 1001');
        fireEvent.change(inputEntidad, { target: { value: '999999' } });

        const saveBtn = screen.getByText('Guardar');
        fireEvent.click(saveBtn);

        await waitFor(() => {
            expect(api.post).toHaveBeenCalledWith('/api/sheets', { number: 999999 });
            expect(mockFetchSheets).toHaveBeenCalledTimes(2); 
            expect(screen.getByText('Entidad creada con éxito.')).toBeInTheDocument();
        });
    });

    it('opens View modal when a row is clicked', async () => {
        renderWithContext();

        openViewModalFromDesktopRow('100100');

        await waitFor(() => {
            expect(HTMLDialogElement.prototype.showModal).toHaveBeenCalled(); 
        });

        const viewDialog = document.getElementById('my_modal_3');
        expect(viewDialog).not.toBeNull();

        expect(within(viewDialog).getByText('Detalles de Entidad')).toBeInTheDocument();
        expect(within(viewDialog).getByText('Número Entidad')).toBeInTheDocument();
    });

    it('proceeds from View to Edit mode, mutates <select> and submits PUT /api/sheets', async () => {
        api.put.mockResolvedValueOnce({ data: { success: true } });
        renderWithContext();

        openViewModalFromDesktopRow('100100');

        const editBtn = await screen.findByText('Editar');
        fireEvent.click(editBtn);

        expect(HTMLDialogElement.prototype.close).toHaveBeenCalled();

        await waitFor(() => {
            expect(HTMLDialogElement.prototype.showModal).toHaveBeenCalled();
        });

        const saveChangesBtn = await screen.findByText('Guardar cambios');
        expect(saveChangesBtn).toBeInTheDocument();

        const editDialog = document.getElementById('my_modal_4');
        const numberInput = editDialog?.querySelector('input[name="numeroEntidad"]');
        expect(numberInput).not.toBeNull();
        fireEvent.change(numberInput, { target: { value: '111111' } });

        const stateSelect = editDialog?.querySelector('select[name="estado"]');
        expect(stateSelect).not.toBeNull();
        fireEvent.change(stateSelect, { target: { value: 'Finalizada' } });

        fireEvent.click(saveChangesBtn);

        await waitFor(() => {
            expect(api.put).toHaveBeenCalledWith('/api/sheets/1', {
                number: 111111,
                state: 'Finalizada'
            });
            expect(screen.getByText('Entidad actualizada correctamente')).toBeInTheDocument();
            expect(mockFetchSheets).toHaveBeenCalledTimes(2); 
        });
    });

    it('proceeds from View to Delete mode and triggers Context deleteSheet', async () => {
        renderWithContext();

        openViewModalFromDesktopRow('200200');

        const borrarBtn = await screen.findByText('Borrar');
        fireEvent.click(borrarBtn);

        await waitFor(() => {
            expect(HTMLDialogElement.prototype.close).toHaveBeenCalled();
        });

        const deleteDialogs = Array.from(document.querySelectorAll('dialog#delete_modal'));
        expect(deleteDialogs.length).toBeGreaterThan(0);

        deleteDialogs.forEach((dialog) => {
            const confirmBtn = dialog.querySelector('button.bg-red-600');
            if (confirmBtn) {
                fireEvent.click(confirmBtn);
            }
        });

        await waitFor(() => {
            expect(mockDeleteSheet).toHaveBeenCalledWith(2);
        });
    });

    it('leaves no timer behind when the view panel is removed before its modal opens', () => {
        // Choosing Editar or Borrar opens the next modal 100 ms later. If the panel goes away first,
        // that timer must not stay alive: it would run after the page, or a test environment, is gone.
        vi.useFakeTimers();
        try {
            const { unmount } = render(
                <SheetsContext.Provider value={{ deleteSheet: mockDeleteSheet }}>
                    <ViewSheets sheet={mockSheets[0]} />
                </SheetsContext.Provider>
            );

            fireEvent.click(screen.getByText('Editar'));
            fireEvent.click(screen.getByText('Borrar'));
            expect(vi.getTimerCount()).toBe(2);

            unmount();

            expect(vi.getTimerCount()).toBe(0);
        } finally {
            vi.useRealTimers();
        }
    });
});
