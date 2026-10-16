import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { UserList } from '@/Components/Users/UserList';
import { UserContext } from '@/context/UserContext/UserContext';
import * as InertiaReact from '@inertiajs/react';

vi.mock('@inertiajs/react', () => ({
    usePage: vi.fn(),
    Link: ({ children }) => <div>{children}</div>,
}));

global.ResizeObserver = class ResizeObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
};

describe('UserList Component', () => {
    const mockSetContent = vi.fn();
    const mockShowInformation = vi.fn();
    const mockFetchUser = vi.fn();

    const mockUsers = [
        {
            id: 1,
            name: 'Assistant One',
            document_number: '123456',
            email: 'app1@test.com',
            status: 'active',
            created_at: '2023-01-01T00:00:00.000000Z',
            roles: [{ name: 'Auxiliar' }],
        },
        {
            id: 2,
            name: 'Supervisor One',
            document_number: '987654',
            email: 'inst1@test.com',
            status: 'pending',
            created_at: '2023-01-02T00:00:00.000000Z',
            roles: [{ name: 'Supervisor' }],
        }
    ];

    const renderWithContext = (contextValues) => {
        return render(
            <UserContext.Provider value={contextValues}>
                <UserList url="/users/auxiliar" />
            </UserContext.Provider>
        );
    };

    beforeEach(() => {
        vi.clearAllMocks();
        HTMLDialogElement.prototype.showModal = vi.fn();
        HTMLDialogElement.prototype.close = vi.fn();
        
        InertiaReact.usePage.mockReturnValue({
            url: "/users/auxiliar",
            props: { auth: { user: { roles: [{ name: "Supervisor" }] } } }
        });
    });

    it('renders loading state correctly', () => {
        renderWithContext({
            loading: true,
            fetchUser: mockFetchUser,
            setContent: mockSetContent,
        });

        expect(screen.getByText('Cargando')).toBeInTheDocument();
        expect(screen.queryByText('Assistant One')).not.toBeInTheDocument();
    });

    it('renders only users that match the current content (Assistants)', () => {
        renderWithContext({
            user: mockUsers,
            loading: false,
            content: 'Auxiliar',
            setContent: mockSetContent,
            fetchUser: mockFetchUser,
            isSearching: false,
        });

        expect(mockFetchUser).toHaveBeenCalled();

        expect(screen.getByText('Assistant One')).toBeInTheDocument();
        expect(screen.getByText('123456')).toBeInTheDocument();
        expect(screen.getByText('app1@test.com')).toBeInTheDocument();

        expect(screen.queryByText('Supervisor One')).not.toBeInTheDocument();
    });

    it('renders search results correctly', () => {
        renderWithContext({
            user: mockUsers,
            filteredUser: [mockUsers[0]], 
            loading: false,
            isSearching: true,
            loadingSearch: false,
            content: 'Auxiliar',
            setContent: mockSetContent,
            fetchUser: mockFetchUser,
        });

        expect(screen.getByText('Assistant One')).toBeInTheDocument();
    });

    it('shows empty state when no users are found during search', () => {
        renderWithContext({
            user: mockUsers,
            filteredUser: [], 
            loading: false,
            isSearching: true,
            loadingSearch: false,
            content: 'Auxiliar',
            setContent: mockSetContent,
            fetchUser: mockFetchUser,
        });

        expect(screen.getByText('No hay resultados para mostrar.')).toBeInTheDocument();
    });
});
