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
                user: { id: 1, name: 'Admin User', roles: [{ name: 'Admin' }] },
            },
            sheets: [
                { id: 1, number: '123456', dependencies: [{id: 1, name: 'Dep 1'}] }
            ]
        },
    }),
}));

const mockMails = [
    {
        id: 101,
        sender_name: "Juan Admin",
        affair: "Petición Archivada Admin",
        description: "Desc Admin",
        request_type: "Peticion",
        response_status: "Finalizado",
        email: "juan@test.com",
        response_time: new Date(Date.now() - 86400000).toISOString(),
        created_at: new Date().toISOString(),
    }
];

describe('Archive Module Tests - Admin (Frontend)', () => {

    beforeEach(() => {
        vi.clearAllMocks();
        api.get.mockResolvedValue({ data: { data: mockMails } });
    });

    it('Renders table and Select option', async () => {
        render(<ArchiveTable />);

        await waitFor(() => {
            expect(screen.getByText('Petición Archivada Admin')).toBeInTheDocument();
        });

        expect(screen.getByText('Entidad y/o dependencia')).toBeInTheDocument();

        expect(screen.getByText('Juan Admin')).toBeInTheDocument();
        expect(screen.queryByText('Estado')).not.toBeInTheDocument();
    });

    it('Opens modal on row click', async () => {
        render(<ArchiveTable />);

        await waitFor(() => {
            expect(screen.getByText('Petición Archivada Admin')).toBeInTheDocument();
        });

        const row = screen.getByText('Petición Archivada Admin').closest('tr');
        fireEvent.click(row);

        expect(screen.getByText('PQR #101')).toBeInTheDocument();
        expect(screen.getByText('Desc Admin')).toBeInTheDocument();
        expect(screen.queryByRole('button', { name: /Desarchivar/i })).not.toBeInTheDocument();
    });

    it('Shows read-only modal content', async () => {
        render(<ArchiveTable />);

        await waitFor(() => {
            expect(screen.getByText('Petición Archivada Admin')).toBeInTheDocument();
        });

        fireEvent.click(screen.getByText('Petición Archivada Admin').closest('tr'));

        expect(screen.getByText(/Fecha límite/i)).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /Entendido/i })).toBeInTheDocument();
    });
});
