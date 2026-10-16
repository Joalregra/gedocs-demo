import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { UserList } from '@/Components/Users/UserList';
import { UserContext } from '@/context/UserContext/UserContext';
import * as InertiaReact from '@inertiajs/react';

vi.mock('@inertiajs/react', () => ({
    usePage: vi.fn(),
}));

describe('SupervisorList Component (Frontend)', () => {
    const mockSetContent = vi.fn();
    const mockShowInformation = vi.fn();
    const mockFetchUser = vi.fn();

    const mockUsers = [
        {
            id: 1,
            name: 'Assistant Filtered Out',
            document_number: '123456',
            email: 'app@test.com',
            status: 'active',
            created_at: '2023-01-01T00:00:00.000000Z',
            roles: [{ name: 'Auxiliar' }],
        },
        {
            id: 2,
            name: 'Supervisor Visible',
            document_number: '987654',
            email: 'inst1@test.com',
            status: 'pending',
            created_at: '2023-01-02T00:00:00.000000Z',
            roles: [{ name: 'Supervisor' }],
            profile_photo: null
        }
    ];

    const renderWithContext = (contextValues) => {
        return render(
            <UserContext.Provider value={contextValues}>
                <UserList url="/users/supervisor" />
            </UserContext.Provider>
        );
    };

    beforeEach(() => {
        vi.clearAllMocks();
        HTMLDialogElement.prototype.showModal = vi.fn();
        HTMLDialogElement.prototype.close = vi.fn();

        InertiaReact.usePage.mockReturnValue({
            url: "/users/supervisor",
            props: { auth: { user: { roles: [{ name: "Admin" }] } } }
        });
    });

    it('renders only users that match the current content (Supervisor)', () => {
        renderWithContext({
            user: mockUsers,
            loading: false,
            
            content: 'Supervisor', 
            setContent: mockSetContent,
            fetchUser: mockFetchUser,
            isSearching: false,
            ShowInformation: mockShowInformation
        });

        expect(mockFetchUser).toHaveBeenCalled();

        expect(screen.getByText('Supervisor Visible')).toBeInTheDocument();
        expect(screen.getByText('987654')).toBeInTheDocument();
        expect(screen.getByText('inst1@test.com')).toBeInTheDocument();

        expect(screen.queryByText('Assistant Filtered Out')).not.toBeInTheDocument();
    });

    it('shows empty state when no supervisors are in the database', () => {
        
        renderWithContext({
            user: [], 
            loading: false,
            isSearching: false,
            content: 'Supervisor',
            setContent: mockSetContent,
            fetchUser: mockFetchUser,
        });

        expect(screen.getByText('No hay usuarios para mostrar.')).toBeInTheDocument();
    });
});
