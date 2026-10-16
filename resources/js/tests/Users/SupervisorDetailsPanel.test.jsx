import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import UserDetailsPanel from '@/Components/Users/UserDetailsPanel';
import { UserContext } from '@/context/UserContext/UserContext';
import * as InertiaReact from '@inertiajs/react';

vi.mock('@/lib/axios', () => ({
    default: {
        get: vi.fn().mockImplementation((url) => {
            if (url === '/api/sheetsNumber' || String(url).startsWith('/api/sheets')) {
                return Promise.resolve({
                    data: {
                        entidades: [
                            { id: 1, number: '100100' },
                            { id: 2, number: '200200' },
                            { id: 3, number: '300300' }
                        ],
                        sheets: [
                            { id: 1, number: '100100' },
                            { id: 2, number: '200200' },
                            { id: 3, number: '300300' }
                        ]
                    }
                });
            }
            return Promise.resolve({ data: {} });
        }),
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

describe('SupervisorDetailsPanel Component Tests', () => {
    const mockSetIdSelected = vi.fn();
    const mockSetEdit = vi.fn();
    const mockSetIsDelete = vi.fn();
    const mockUpdateInfo = vi.fn();

    const mockSupervisor = {
        id: 5,
        name: 'Ana Supervisor',
        type_document: 'CC',
        document_number: '10203040',
        email: 'ana@demo.test',
        status: 'active',
        created_at: '2023-05-10T00:00:00.000000Z',
        roles: [{ name: 'Supervisor' }],
        sheet_numbers: [{ id: 1, number: '100100' }, { id: 2, number: '200200' }]
    };

    beforeEach(() => {
        vi.clearAllMocks();
        HTMLDialogElement.prototype.showModal = vi.fn();
        HTMLDialogElement.prototype.close = vi.fn();

        InertiaReact.usePage.mockReturnValue({
            url: "/users/supervisor",
            props: {
                auth: { user: { roles: [{ name: "Admin" }] } },
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

    it('renders Supervisor details properly with dynamic titles', () => {
        renderWithContext({
            idSelected: mockSupervisor,
            edit: false,
        });

        expect(screen.getByText('Detalles de Supervisor')).toBeInTheDocument();
        expect(screen.getAllByText('Ana Supervisor')[0]).toBeInTheDocument();
        expect(screen.getByText('Entidades Asignadas')).toBeInTheDocument();

        expect(screen.getByText('100100')).toBeInTheDocument();
        expect(screen.getByText('200200')).toBeInTheDocument();
    });

    it('switches to Edit view and replaces Dependency select with multiple Sheet UI', async () => {

        renderWithContext({
            idSelected: mockSupervisor,
            edit: true,
        });

        expect(screen.getByText('Editar Supervisor')).toBeInTheDocument();

        expect(screen.getByText('Asignar Entidades')).toBeInTheDocument();
        expect(screen.queryByText('Asignar Dependencia')).not.toBeInTheDocument();

        await waitFor(() => {

            expect(screen.getAllByText('300300').length).toBeGreaterThan(0);
        });
    });

    it('modifies multiple sheets and submits UpdateInfo correctly', async () => {
        mockUpdateInfo.mockResolvedValueOnce(true);

        renderWithContext({
            idSelected: mockSupervisor,
            edit: true,
        });

        await waitFor(() => {
            expect(screen.getAllByText('100100').length).toBeGreaterThan(0);
        });

        const addSheetDiv = screen.getAllByText('300300')[0];
        fireEvent.click(addSheetDiv);

        const removeSheetDiv = screen.getAllByText('200200')[screen.getAllByText('200200').length - 1];
        fireEvent.click(removeSheetDiv);

        const saveButton = screen.getByText('Guardar Cambios');
        fireEvent.click(saveButton);

        await waitFor(() => {
            expect(mockUpdateInfo).toHaveBeenCalledWith(
                'Ana Supervisor',
                'CC',
                '10203040',
                'ana@demo.test',
                'active',
                5,
                [1, 3]
            );
            expect(toast.success).toHaveBeenCalledWith('Información actualizada');
        });
    });

});
