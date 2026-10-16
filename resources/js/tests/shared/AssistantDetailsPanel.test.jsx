import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import UserDetailsPanel from '@/Components/Users/UserDetailsPanel';
import { UserContext } from '@/context/UserContext/UserContext';
import * as InertiaReact from '@inertiajs/react';

vi.mock('@/lib/axios', () => ({
    default: {
        get: vi.fn().mockResolvedValue({ data: { entidades: [], sheets: [] } }),
        post: vi.fn(),
        put: vi.fn(),
        delete: vi.fn(),
    }
}));

vi.mock('sonner', () => ({
    toast: {
        error: vi.fn(),
        success: vi.fn(),
        loading: vi.fn(),
        dismiss: vi.fn(),
    }
}));

import { toast } from 'sonner';

vi.mock('@inertiajs/react', () => ({
    usePage: vi.fn(),
}));

describe('UserDetailsPanel & Edit Component Tests', () => {
    const mockSetIdSelected = vi.fn();
    const mockSetEdit = vi.fn();
    const mockSetIsDelete = vi.fn();
    const mockUpdateInfo = vi.fn();

    const mockAssistant = {
        id: 10,
        name: 'Carlos Perez',
        type_document: 'CC',
        document_number: '100200300',
        email: 'carlos@demo.test',
        status: 'pending',
        created_at: '2023-05-10T00:00:00.000000Z',
        roles: [{ name: 'Auxiliar' }],
        sheet_numbers: [{ id: 1, number: '2550000' }]
    };

    beforeEach(() => {
        vi.clearAllMocks();
        
        HTMLDialogElement.prototype.showModal = vi.fn();
        HTMLDialogElement.prototype.close = vi.fn();

        InertiaReact.usePage.mockReturnValue({
            url: "/users/auxiliar",
            props: { 
                auth: { user: { roles: [{ name: "Supervisor" }] } },
                dependencies: []
            }
        });
    });

    const renderWithContext = (contextValues) => {
        return render(
            <UserContext.Provider value={{
                ...contextValues,
                setidSelected: mockSetIdSelected,
                setEdit: mockSetEdit,
                setIsDelete: mockSetIsDelete,
                UpdateInfo: mockUpdateInfo,
            }}>
                <UserDetailsPanel />
            </UserContext.Provider>
        );
    };

    it('renders the detailed view of the user when idSelected is populated', () => {
        renderWithContext({
            idSelected: mockAssistant,
            edit: false,
        });

        expect(screen.getByText('Detalles de Usuario')).toBeInTheDocument();
        expect(screen.getAllByText('Carlos Perez')[0]).toBeInTheDocument();
        expect(screen.getByText('100200300')).toBeInTheDocument();
        expect(screen.getByText('carlos@demo.test')).toBeInTheDocument();
        
        expect(screen.queryByDisplayValue('Carlos Perez')).not.toBeInTheDocument();
    });

    it('opens Edit view when Edit button is clicked in details', () => {
        renderWithContext({
            idSelected: mockAssistant,
            edit: false,
        });

        const editButton = screen.getByText('Editar');
        fireEvent.click(editButton);

        expect(mockSetEdit).toHaveBeenCalledWith(true);
    });

    it('renders edit form correctly and validates empty/wrong inputs with Sonner', async () => {
        
        renderWithContext({
            idSelected: mockAssistant,
            edit: true,
        });

        const saveButton = screen.getByText('Guardar Cambios');

        const nameInput = screen.getByDisplayValue('Carlos Perez');
        fireEvent.change(nameInput, { target: { value: 'Ca' } });
        fireEvent.click(saveButton);
        await waitFor(() => {
            expect(toast.error).toHaveBeenCalledWith('El nombre debe tener al menos 3 caracteres');
        });

        fireEvent.change(nameInput, { target: { value: 'Carlos P' } });
        const emailInput = screen.getByDisplayValue('carlos@demo.test');
        fireEvent.change(emailInput, { target: { value: 'carlos_sin_arroba_demo.test' } });
        fireEvent.click(saveButton);
        await waitFor(() => {
            expect(toast.error).toHaveBeenCalledWith('Ingrese un correo electrónico válido');
        });

        fireEvent.change(emailInput, { target: { value: 'carlos2@demo.test' } });
        const docInput = screen.getByDisplayValue('100200300');
        fireEvent.change(docInput, { target: { value: '12345678901' } }); 
        fireEvent.click(saveButton);
        await waitFor(() => {
            expect(toast.error).toHaveBeenCalledWith('El número de documento no puede tener más de 10 caracteres');
        });
    });

    it('submits form successfully calling UpdateInfo', async () => {
        mockUpdateInfo.mockResolvedValueOnce(true);

        renderWithContext({
            idSelected: mockAssistant,
            edit: true,
        });

        const saveButton = screen.getByText('Guardar Cambios');
        fireEvent.click(saveButton);

        await waitFor(() => {
             
            expect(mockUpdateInfo).toHaveBeenCalledWith(
                'Carlos Perez',
                'CC',
                '100200300',
                'carlos@demo.test',
                'pending',
                10,
                [],
                null
            );
            expect(toast.success).toHaveBeenCalledWith('Información actualizada');
        });
    });

});
