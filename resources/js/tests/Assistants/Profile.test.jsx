import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import ProfileSettingsPage from '@/Pages/Profile/ProfileSettingsPage';
import HamburguerMenu from '@/Components/HamburguerMenu/HamburguerMenu';
import { UserContext } from '@/context/UserContext/UserContext';

if (typeof window !== 'undefined' && typeof window.DOMMatrix === 'undefined') {
    window.DOMMatrix = class DOMMatrix {};
}

window.route = (name) => `/${name}`;

vi.mock('@inertiajs/react', () => ({
    usePage: () => ({
        url: '/current-url',
        props: {
            auth: {
                user: { id: 3, name: 'Assistant User', email: 'assistant@test.com', roles: [{ name: 'Auxiliar' }] },
            },
        },
    }),
    useForm: () => ({
        data: { password: '', name: '', email: '' },
        setData: vi.fn(),
        delete: vi.fn(),
        patch: vi.fn(),
        processing: false,
        reset: vi.fn(),
        errors: {},
        clearErrors: vi.fn(),
        recentlySuccessful: false,
    }),
    Link: ({ children, href }) => <a href={href}>{children}</a>,
}));

// Mock ProfileSummaryCard specifically since we only test the presence of forms here
vi.mock('@/Components/Profile/ProfileSummaryCard', () => ({
    default: () => <div data-testid="profile-summary">Summary Card</div>
}));

vi.mock('@/Layouts/SettingsLayout', () => ({
    default: ({ children }) => <div data-testid="settings-layout">{children}</div>
}));

describe('Profile and Menu Tests - Assistant (Frontend)', () => {

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('Assistant Profile Settings: does NOT render Delete Account form, but renders Edit forms', () => {
        const mockContext = { setContent: vi.fn(), notifications: [] };
        render(
            <UserContext.Provider value={mockContext}>
                <ProfileSettingsPage mustVerifyEmail={false} status={null} />
            </UserContext.Provider>
        );

        expect(screen.queryByText('Eliminar Cuenta')).not.toBeInTheDocument();

        expect(screen.getByRole('heading', { name: 'Información de Perfil' })).toBeInTheDocument();
        expect(screen.getByRole('heading', { name: 'Cambiar Contraseña' })).toBeInTheDocument();
    });

    it('Assistant Hamburguer Menu: renders ONLY Dependencies and Profile info', () => {
        const mockContext = { setContent: vi.fn() };
        render(
            <UserContext.Provider value={mockContext}>
                <HamburguerMenu />
            </UserContext.Provider>
        );

        expect(screen.getByText('Dependencias')).toBeInTheDocument();
        expect(screen.getByText('Informacion de Perfil')).toBeInTheDocument();

        expect(screen.queryByText('Supervisores')).not.toBeInTheDocument();
        expect(screen.queryByText('Auxiliares')).not.toBeInTheDocument();
        expect(screen.queryByText('Entidades')).not.toBeInTheDocument();
    });
});
