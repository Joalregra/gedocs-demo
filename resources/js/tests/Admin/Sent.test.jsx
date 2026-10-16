import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import axios from 'axios';
import { MailContext } from '@/context/MailContext/MailContext';
import OutboxSidebar from '@/Components/OutboxSidebar/OutboxSidebar';
import { MailReader } from '@/Components/MailReader/MailReader';

vi.mock('axios');

vi.mock('@inertiajs/react', () => ({
    usePage: () => ({
        props: {
            auth: {
                user: { id: 1, name: 'Admin User', roles: [{ name: 'Admin' }] },
            },
            sheets: [
                { id: 1, number: '123456', state: 'Activa' }
            ],
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

window.route = () => ({
    current: () => 'outbox'
});

const mockMailCards = [
    {
        id: 101,
        sender_name: "Juan Perez Admin",
        affair: "Petición Respondida Admin",
        description: "Esto es una pqrs archivada de administrador",
        request_type: "Peticion",
        user_id: 1,
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

describe('Outbox (Sent) Tests - Admin Role', () => {
    
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it(' Render of the Admin Outbox interface', () => {
        renderWithMailContext(
            <>
                <OutboxSidebar />
                <MailReader />
            </>
        );

        expect(screen.getByText('Bandeja de Salida')).toBeInTheDocument();
        expect(screen.getByText('Petición Respondida Admin')).toBeInTheDocument();
    });

    it(' Component SelectDependecyOrNumberSheet renders for Admin in Outbox', () => {
        renderWithMailContext(<OutboxSidebar />);
        
        const buttonElement = screen.getByRole('button', { name: /Entidad y\/o dependencia/i });
        expect(buttonElement).toBeInTheDocument();
    });

});
