import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import api from '@/lib/axios';
import ArchiveTable from '@/Components/ArchiveTable/ArchiveTable';

if (typeof window !== 'undefined' && typeof window.DOMMatrix === 'undefined') {
    window.DOMMatrix = class DOMMatrix {};
}

vi.mock('@/lib/axios', () => ({
    default: { get: vi.fn() }
}));

window.route = () => ({
    current: () => 'archive'
});

vi.mock('@inertiajs/react', () => ({
    usePage: () => ({
        props: {
            auth: {
                user: { id: 3, name: 'Assistant User', roles: [{ name: 'Auxiliar' }], dependency_id: 1 },
            },
            sheets: [
                { id: 1, number: '123456', dependencies: [{id: 1, name: 'Dep 1'}] }
            ]
        },
    }),
}));

const mockMails = [
    {
        id: 103,
        sender_name: "Pedro Assistant",
        affair: "Petición Archivada Auxiliar",
        description: "Desc Auxiliar",
        request_type: "Peticion",
        response_status: "Finalizado",
        dependency_id: 1,
        email: "pedro@test.com",
        response_time: new Date(Date.now() - 86400000).toISOString(),
        created_at: new Date().toISOString(),
    }
];

describe('Archive Module Tests - Assistant (Frontend)', () => {

    beforeEach(() => {
        vi.clearAllMocks();
        api.get.mockResolvedValue({ data: { data: mockMails } });
    });

    it('Renders table and DOES NOT show the sheet Select option', async () => {
        render(<ArchiveTable />);

        await waitFor(() => {
            expect(screen.getByText('Petición Archivada Auxiliar')).toBeInTheDocument();
        });

        expect(screen.queryByText('Entidad y/o dependencia')).not.toBeInTheDocument();

        expect(screen.getByText('Pedro Assistant')).toBeInTheDocument();
        expect(screen.queryByText('Estado')).not.toBeInTheDocument();
    });

    it('Opens modal on row click', async () => {
        render(<ArchiveTable />);

        await waitFor(() => {
            expect(screen.getByText('Petición Archivada Auxiliar')).toBeInTheDocument();
        });

        const row = screen.getByText('Petición Archivada Auxiliar').closest('tr');
        fireEvent.click(row);

        expect(screen.getByText('PQR #103')).toBeInTheDocument();
        expect(screen.getByText('Desc Auxiliar')).toBeInTheDocument();
    });

    it('Shows read-only modal content', async () => {
        render(<ArchiveTable />);

        await waitFor(() => {
            expect(screen.getByText('Petición Archivada Auxiliar')).toBeInTheDocument();
        });

        fireEvent.click(screen.getByText('Petición Archivada Auxiliar').closest('tr'));

        expect(screen.getByText(/Fecha límite/i)).toBeInTheDocument();
        expect(screen.queryByRole('button', { name: /Desarchivar/i })).not.toBeInTheDocument();
    });
});
