import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import axios from 'axios';
import { MailContext } from '@/context/MailContext/MailContext';
import InboxSidebar from '@/Components/InboxSidebar/InboxSidebar';
import { MailReader } from '@/Components/MailReader/MailReader';

vi.mock('axios');

window.route = () => ({
    current: () => 'inbox'
});

vi.mock('@inertiajs/react', () => ({
    usePage: () => ({
        props: {
            auth: {
                user: { id: 2, name: 'Supervisor User', roles: [{ name: 'Supervisor' }] },
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
        id: 201,
        sender_name: "Juan Perez",
        affair: "Petición Supervisor",
        description: "Esta petición corresponde a una entidad asignada.",
        request_type: "Peticion",
        user_id: 10,
        dependency_id: 1,
        sheet_number_id: 1,
        created_at: new Date(Date.now() - 86400000).toISOString(),
        response_time: new Date(Date.now() + 10 * 86400000).toISOString(),
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

describe('Dashboard Inbox Tests - Supervisor Role', () => {
    
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it(' Render of the interface and Supervisor restricted list', () => {
        renderWithMailContext(
            <>
                <InboxSidebar />
                <MailReader />
            </>
        );

        expect(screen.getByText('Bandeja de Entrada')).toBeInTheDocument();
        
        expect(screen.getByText('Petición Supervisor')).toBeInTheDocument();
    });

    it(' Supervisor is able to assign Dependency (menu exists)', () => {
        renderWithMailContext(
            <MailReader />,
            { selectedMail: 201 } 
        );

        const assignDropdowns = screen.getAllByText(/Dependencia Prueba|Asignar Dependencia/i);
        expect(assignDropdowns.length).toBeGreaterThan(0);
    });

});
