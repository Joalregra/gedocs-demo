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
                user: { id: 2, name: 'Supervisor User', roles: [{ name: 'Supervisor' }] },
            },
            sheets: [
                { id: 1, number: '123456', dependencies: [{id: 1, name: 'Dep 1'}] }
            ]
        },
    }),
}));

const mockMails = [
    {
        id: 102,
        sender_name: "Ana Supervisor",
        affair: "Petición Archivada Supervisor",
        description: "Desc Supervisor",
        request_type: "Peticion",
        response_status: "Finalizado",
        email: "ana@test.com",
        response_time: new Date(Date.now() - 86400000).toISOString(),
        created_at: new Date().toISOString(),
    }
];

describe('Archive Module Tests - Supervisor (Frontend)', () => {

    beforeEach(() => {
        vi.clearAllMocks();
        api.get.mockResolvedValue({ data: { data: mockMails } });
    });

    it('Renders table and Select option', async () => {
        render(<ArchiveTable />);

        await waitFor(() => {
            expect(screen.getByText('Petición Archivada Supervisor')).toBeInTheDocument();
        });

        expect(screen.getByText('Entidad y/o dependencia')).toBeInTheDocument();

        expect(screen.getByText('Ana Supervisor')).toBeInTheDocument();
        expect(screen.queryByText('Estado')).not.toBeInTheDocument();
    });

    it('Opens modal on row click', async () => {
        render(<ArchiveTable />);

        await waitFor(() => {
            expect(screen.getByText('Petición Archivada Supervisor')).toBeInTheDocument();
        });

        const row = screen.getByText('Petición Archivada Supervisor').closest('tr');
        fireEvent.click(row);

        expect(screen.getByText('PQR #102')).toBeInTheDocument();
        expect(screen.getByText('Desc Supervisor')).toBeInTheDocument();
    });

    it('Shows read-only modal content', async () => {
        render(<ArchiveTable />);

        await waitFor(() => {
            expect(screen.getByText('Petición Archivada Supervisor')).toBeInTheDocument();
        });

        fireEvent.click(screen.getByText('Petición Archivada Supervisor').closest('tr'));

        expect(screen.getByText(/Fecha límite/i)).toBeInTheDocument();
        expect(screen.queryByRole('button', { name: /Desarchivar/i })).not.toBeInTheDocument();
    });
});
