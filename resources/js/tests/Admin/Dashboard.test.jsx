import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import axios from 'axios';
import { MailContext } from '@/context/MailContext/MailContext';
import InboxSidebar from '@/Components/InboxSidebar/InboxSidebar';
import { MailReader } from '@/Components/MailReader/MailReader';

if (typeof window !== 'undefined' && typeof window.DOMMatrix === 'undefined') {
    window.DOMMatrix = class DOMMatrix {};
}

vi.mock('axios');

window.route = () => ({
    current: () => 'inbox'
});

vi.mock('@inertiajs/react', () => ({
    usePage: () => ({
        props: {
            auth: {
                user: { id: 1, name: 'Admin User', roles: [{ name: 'Admin' }] },
            },
            dependencies: [
                { id: 1, name: 'Dependencia Prueba', sheet_number_id: 1 }
            ]
        },
    }),
    Head: () => <div data-testid="head" />,
    Link: ({ children, href, className }) => <a href={href} className={className}>{children}</a>,
    router: {
        visit: vi.fn(),
    }
}));

const mockMailCards = [
    {
        id: 101,
        sender_name: "Juan Perez",
        affair: "Petición a tiempo",
        description: "Esta petición tiene mucho tiempo.",
        request_type: "Peticion",
        user_id: 10,
        dependency_id: 1,
        sheet_number_id: 1,

        created_at: new Date(Date.now() - 86400000).toISOString(),

        response_time: new Date(Date.now() + 10 * 86400000).toISOString(),
    },
    {
        id: 102,
        sender_name: "Maria Lopez",
        affair: "Queja proxima a vencer",
        description: "Esta queja casi se vence.",
        request_type: "Queja",
        user_id: 12,
        created_at: new Date(Date.now() - 2 * 86400000).toISOString(),

        response_time: new Date(Date.now() + 3 * 86400000).toISOString(),
    },
    {
        id: 103,
        sender_name: "Carlos Vargas",
        affair: "Reclamo vencido",
        description: "Esto ya está vencido hace varios días.",
        request_type: "Reclamo",
        user_id: 5,
        created_at: new Date(Date.now() - 20 * 86400000).toISOString(),

        response_time: new Date(Date.now() - 2 * 86400000).toISOString(),
    }
];

const renderWithMailContext = (ui, contextOverrides = {}) => {
    const defaultContext = {
        mailCards: mockMailCards,
        filteredMailCards: mockMailCards,
        selectedMail: null,
        setSelectedMail: vi.fn(),
        setMailCards: vi.fn(),
        loading: false,
        toggleFilter: vi.fn(),
        filters: [],
        searchTerm: '',
        setSearchTerm: vi.fn(),
        setSideFilter: vi.fn(),
        isArchiveView: false,
        ...contextOverrides
    };

    return render(
        <MailContext.Provider value={defaultContext}>
            <div className="flex h-screen w-full">
                {ui}
            </div>
        </MailContext.Provider>
    );
};

describe('Dashboard Inbox Tests (Frontend)', () => {

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it(' Render of the interface of the Sidebar and empty screen', () => {
        renderWithMailContext(
            <>
                <InboxSidebar />
                <MailReader />
            </>
        );

        expect(screen.getByText('Bandeja de Entrada')).toBeInTheDocument();
        expect(screen.getByPlaceholderText('Buscar por asunto, id o descripción...')).toBeInTheDocument();

        expect(screen.getByRole('button', { name: 'Peticiones' })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Quejas' })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Reclamos' })).toBeInTheDocument();

        expect(screen.getByText('Petición a tiempo')).toBeInTheDocument();
        expect(screen.getByText('Queja proxima a vencer')).toBeInTheDocument();
        expect(screen.getByText('Reclamo vencido')).toBeInTheDocument();

        const placeholderImg = screen.getByAltText('');
        expect(placeholderImg).toHaveAttribute('src', '/images/OBJECTS.svg');
    });

    it(' Filtering and Searching: Input text updates and toggle filters', () => {
        const setSearchTermMock = vi.fn();
        const toggleFilterMock = vi.fn();

        renderWithMailContext(<InboxSidebar />, {
            setSearchTerm: setSearchTermMock,
            toggleFilter: toggleFilterMock
        });

        const searchInput = screen.getByPlaceholderText('Buscar por asunto, id o descripción...');
        fireEvent.change(searchInput, { target: { value: 'prueba' } });
        expect(setSearchTermMock).toHaveBeenCalledWith('prueba');

        const peticionChip = screen.getByRole('button', { name: 'Peticiones' });
        fireEvent.click(peticionChip);
        expect(toggleFilterMock).toHaveBeenCalledWith('Peticion');
    });

    it(' Active Selection of PQR', () => {
        const setSelectedMailMock = vi.fn();

        const { rerender } = renderWithMailContext(
            <>
                <InboxSidebar />
                <MailReader />
            </>,
            {
                setSelectedMail: setSelectedMailMock,

                selectedMail: 101
            }
        );

        expect(screen.getAllByText('Petición a tiempo').length).toBeGreaterThan(0);
        expect(screen.getAllByText('Esta petición tiene mucho tiempo.').length).toBeGreaterThan(0);
        expect(screen.getAllByText('ID: 101').length).toBeGreaterThan(0);

        const quejaCard = screen.getByText('Queja proxima a vencer').closest('div');
        fireEvent.click(quejaCard);

        expect(setSelectedMailMock).toHaveBeenCalledWith(102);
    });

    it('colors of deadline dates according to expiration', () => {

        renderWithMailContext(
            <>
                <InboxSidebar />
                <MailReader />
            </>,
            { selectedMail: 103 }
        );

        const vencidaElements = screen.getAllByText('Vencida');
        expect(vencidaElements.length).toBeGreaterThan(0);

        const quejaCardDateContainer = screen.getByText('Queja proxima a vencer').parentNode.parentNode.querySelector('.text-\\[\\#F0DA30\\]');

        const warnText = document.querySelector('.text-\\[\\#F0DA30\\]');
        expect(warnText).not.toBeNull();

        const primaryText = document.querySelector('.text-primary.font-medium');
        expect(primaryText).not.toBeNull();
    });

});
