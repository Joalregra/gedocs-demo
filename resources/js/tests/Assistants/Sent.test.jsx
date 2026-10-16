import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import axios from 'axios';
import { MailContext } from '@/context/MailContext/MailContext';
import OutboxSidebar from '@/Components/OutboxSidebar/OutboxSidebar';
import { MailReader } from '@/Components/MailReader/MailReader';

vi.mock('axios');

window.route = () => ({
    current: () => 'outbox'
});

vi.mock('@inertiajs/react', () => ({
    usePage: () => ({
        props: {
            auth: {
                user: { id: 3, name: 'Auxiliar User', roles: [{ name: 'Auxiliar' }], dependency_id: 1 },
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
        id: 301,
        sender_name: "Auxiliar Mío",
        affair: "Petición Respondida Auxiliar",
        description: "Esta petición la ve un auxiliar en su Bandeja",
        request_type: "Peticion",
        user_id: 3,
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

describe('Outbox (Sent) Tests - Assistant Role', () => {
    
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it(' Render of the interface and Assistant sent restricted list', () => {
        renderWithMailContext(
            <>
                <OutboxSidebar />
                <MailReader />
            </>
        );

        expect(screen.getByText('Bandeja de Salida')).toBeInTheDocument();
        expect(screen.getByText('Petición Respondida Auxiliar')).toBeInTheDocument();
    });

    it(' Assistant is NOT able to assign Dependency in sent item card', () => {
        renderWithMailContext(
            <MailReader />,
            { selectedMail: 301 } 
        );
        const menuTitle = screen.queryByText('Seleccionar Dependencia');
        expect(menuTitle).toBeNull();
        
        const assignDropdown = screen.queryByText('Asignar Dependencia');
        expect(assignDropdown).toBeNull();
    });

});
