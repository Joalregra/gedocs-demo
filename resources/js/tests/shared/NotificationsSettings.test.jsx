import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import axios from 'axios';
import { NotificationsProvider } from '@/context/Notifications/NotificationsContext';
import NotificationsSettingsSection from '@/Components/Notifications/NotificationsSettingsSection';

if (typeof window !== 'undefined' && typeof window.DOMMatrix === 'undefined') {
    window.DOMMatrix = class DOMMatrix {};
}

vi.mock('axios', () => {
    return {
        default: {
            get: vi.fn(),
            post: vi.fn(),
            put: vi.fn(),
            delete: vi.fn()
        }
    };
});

import api from '@/lib/axios'; 
vi.mock('@/lib/axios', () => {
    return {
        default: {
            get: vi.fn(),
            post: vi.fn(),
            put: vi.fn(),
            delete: vi.fn()
        }
    };
});

let mockUserRole = 'Admin';
vi.mock('@inertiajs/react', () => ({
    usePage: () => ({
        props: {
            auth: {
                user: { id: 1, name: 'Admin', roles: [{ name: mockUserRole }] }
            }
        }
    })
}));

vi.mock('sonner', () => ({
    toast: {
        loading: vi.fn(),
        success: vi.fn(),
        error: vi.fn(),
        dismiss: vi.fn()
    }
}));

const mockNotifications = [
    {
        id: "1",
        type: "App\\Notifications\\NewUserRegistered",
        data: {
            role: "Supervisor",
            user: {
                id: 10,
                name: "Supervisor Activo",
                email: "inst@test.com",
                type_document: "CC",
                document_number: "123456",
                roles: [{ name: "Supervisor" }],
                status: "active"
            }
        },
        read_at: new Date().toISOString(), 
        created_at: new Date().toISOString()
    },
    {
        id: "2",
        type: "App\\Notifications\\NewUserRegistered",
        data: {
            role: "Supervisor",
            user: {
                id: 11,
                name: "Supervisor Reachazado",
                email: "inst2@test.com",
                type_document: "CC",
                document_number: "654321",
                roles: [{ name: "Supervisor" }],
                status: "rejected"
            }
        },
        read_at: null, 
        created_at: new Date().toISOString()
    },
    {
        id: "3",
        type: "App\\Notifications\\NewUserRegistered",
        data: {
            role: "Auxiliar",
            user: {
                id: 12,
                name: "Auxiliar Pendiente",
                email: "apr3@test.com",
                type_document: "CC",
                document_number: "11111",
                roles: [{ name: "Auxiliar" }],
                status: "pending"
            }
        },
        read_at: null,
        created_at: new Date().toISOString()
    }
];

import { useContext, useEffect } from 'react';
import { NotificationsContext } from '@/context/Notifications/NotificationsContext';

const TestWrapper = () => {
    const { fetchNotifications } = useContext(NotificationsContext);
    useEffect(() => {
        fetchNotifications();
    }, []);
    return <NotificationsSettingsSection />;
};

const renderComponent = () => {
    return render(
        <NotificationsProvider>
            <TestWrapper />
        </NotificationsProvider>
    );
};

describe('Notifications Frontend Tests', () => {

    beforeEach(() => {
        vi.clearAllMocks();
        
        api.get.mockResolvedValue({
            data: { success: true, notifications: mockNotifications }
        });
        mockUserRole = 'Admin';
    });

    it('Render complete lists for Admin', async () => {
        mockUserRole = 'Admin';
        renderComponent();
        
        await waitFor(() => {
            expect(screen.getByText('Supervisor Activo')).toBeInTheDocument();
            expect(screen.getByText('Supervisor Reachazado')).toBeInTheDocument();
        });

        expect(screen.queryByText('Auxiliar Pendiente')).not.toBeInTheDocument();
    });

    it('Render complete lists for Supervisor', async () => {
        mockUserRole = 'Supervisor';
        renderComponent();
        
        await waitFor(() => {
            expect(screen.getByText('Auxiliar Pendiente')).toBeInTheDocument();
        });

        expect(screen.queryByText('Supervisor Activo')).not.toBeInTheDocument();
    });

    it('Verify styling/colors based on notification status (read, unread, active, rejected, pending)', async () => {
        mockUserRole = 'Admin';
        renderComponent();
        
        await waitFor(() => {
            
            const spanAceptada = screen.getByText('Aceptada');
            expect(spanAceptada).toHaveClass('bg-green-50 text-green-600');

            const spanRechazada = screen.getByText('Rechazada');
            expect(spanRechazada).toHaveClass('bg-red-50 text-red-500');
        });
    });

    it('Verify Details Card visibility when notification is clicked', async () => {
        mockUserRole = 'Admin';
        renderComponent();

        await waitFor(() => expect(screen.getByText('Supervisor Reachazado')).toBeInTheDocument());

        api.post.mockResolvedValueOnce({ data: { success: true } });
        
        const listItem = screen.getByText('Supervisor Reachazado').closest('li');
        fireEvent.click(listItem);

        await waitFor(() => {
            expect(screen.getByText('Solicitud de Acceso')).toBeInTheDocument();
            expect(screen.getByText('Usuario rechazado')).toBeInTheDocument(); 
        });
    });

    it('Verify Accept functionality triggers PUT endpoint', async () => {
        mockUserRole = 'Supervisor'; 
        api.put.mockResolvedValueOnce({ data: { success: true } });
        renderComponent();

        await waitFor(() => expect(screen.getByText('Auxiliar Pendiente')).toBeInTheDocument());

        api.post.mockResolvedValueOnce({ data: { success: true } }); 
        fireEvent.click(screen.getByText('Auxiliar Pendiente').closest('li'));

        await waitFor(() => expect(screen.getByText('Solicitud de Acceso')).toBeInTheDocument());

        const acceptBtn = screen.getByRole('button', { name: /Aceptar/i });
        fireEvent.click(acceptBtn);

        await waitFor(() => {
            expect(api.put).toHaveBeenCalledWith('/api/notifications/update/3/active');
        });
    });

    it('Verify Reject functionality triggers DELETE endpoint', async () => {
        mockUserRole = 'Supervisor'; 
        api.delete.mockResolvedValueOnce({ data: { success: true } });
        renderComponent();
        
        await waitFor(() => expect(screen.getByText('Auxiliar Pendiente')).toBeInTheDocument());
        
        api.post.mockResolvedValueOnce({ data: { success: true } });
        fireEvent.click(screen.getByText('Auxiliar Pendiente').closest('li'));

        await waitFor(() => expect(screen.getByText('Solicitud de Acceso')).toBeInTheDocument());

        const rejectBtn = screen.getByRole('button', { name: /Rechazar/i });
        fireEvent.click(rejectBtn);

        await waitFor(() => {
            
            expect(api.delete).toHaveBeenCalledWith('/api/users/12');
        });
    });

    it('Verify Refresh fetch button functionality', async () => {
        mockUserRole = 'Admin';
        renderComponent();
        
        await waitFor(() => {
            expect(screen.getByText('Supervisor Activo')).toBeInTheDocument();
        });

        vi.clearAllMocks();
        api.get.mockResolvedValue({
            data: { success: true, notifications: mockNotifications }
        });

        const refreshBtn = screen.getByTitle('Refrescar notificaciones');
        fireEvent.click(refreshBtn);

        await waitFor(() => {
            expect(api.get).toHaveBeenCalledWith('/api/notifications');
        });
    });
});
