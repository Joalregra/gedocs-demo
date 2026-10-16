import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { router, usePage } from '@inertiajs/react';
import DemoAccess from '@/Components/Demo/DemoAccess';
import DemoBadge from '@/Components/Demo/DemoBadge';
import DemoTour from '@/Components/Demo/DemoTour';
import InitialsAvatar from '@/Components/InitialsAvatar';
import ErrorPage from '@/Pages/Error';
import { ROLES } from '@/constants/roles';

global.route = vi.fn((name, param) => `/${name}/${param}`);

vi.mock('@inertiajs/react', () => ({
    Head: () => null,
    Link: ({ children, href }) => <a href={href}>{children}</a>,
    usePage: vi.fn(() => ({ props: {} })),
    router: { post: vi.fn() },
}));

describe('DemoAccess', () => {
    beforeEach(() => vi.clearAllMocks());

    it('renders nothing when the app is not in demo mode', () => {
        usePage.mockReturnValue({ props: { demo: false } });
        const { container } = render(<DemoAccess />);
        expect(container).toBeEmptyDOMElement();
    });

    it('offers one-click access for every role in demo mode', () => {
        usePage.mockReturnValue({ props: { demo: true } });
        render(<DemoAccess />);

        expect(screen.getByRole('button', { name: /Entrar como Administrador/ })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /Entrar como Supervisor/ })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /Entrar como Auxiliar/ })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /Entrar como Dependencia/ })).toBeInTheDocument();
        expect(screen.getByText(/se reinician cada día a las 3:00 a. m./)).toBeInTheDocument();
    });

    it('posts to the demo login route with the role name', () => {
        usePage.mockReturnValue({ props: { demo: true } });
        render(<DemoAccess />);

        fireEvent.click(screen.getByRole('button', { name: /Entrar como Supervisor/ }));

        expect(global.route).toHaveBeenCalledWith('demo.login', ROLES.SUPERVISOR);
        expect(router.post).toHaveBeenCalledWith('/demo.login/Supervisor');
    });
});

describe('DemoBadge', () => {
    it('states that the data is fictional and when it resets', () => {
        render(<DemoBadge />);
        expect(screen.getByText(/Demo con datos ficticios/)).toBeInTheDocument();
        expect(screen.getByText(/3:00 a. m./)).toBeInTheDocument();
    });
});

describe('DemoTour', () => {
    beforeEach(() => window.localStorage.clear());

    it('shows the three steps with links to the main flows', () => {
        render(<DemoTour />);

        expect(screen.getByText('Radica una PQRSD')).toBeInTheDocument();
        expect(screen.getByText('Archiva un documento')).toBeInTheDocument();
        expect(screen.getByText('Genera un acta en PDF')).toBeInTheDocument();
        expect(screen.getByRole('link', { name: 'Abrir el formulario' })).toHaveAttribute('href', '/form');
    });

    it('stays closed after the visitor dismisses it', () => {
        const { unmount } = render(<DemoTour />);
        fireEvent.click(screen.getByRole('button', { name: 'Cerrar el recorrido' }));
        expect(screen.queryByText('Recorrido de 3 pasos')).not.toBeInTheDocument();
        unmount();

        render(<DemoTour />);
        expect(screen.queryByText('Recorrido de 3 pasos')).not.toBeInTheDocument();
    });

    it('still works when browser storage is blocked', () => {
        const getItem = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new Error('blocked'); });
        const setItem = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('blocked'); });

        render(<DemoTour />);
        expect(screen.getByText('Recorrido de 3 pasos')).toBeInTheDocument();
        fireEvent.click(screen.getByRole('button', { name: 'Cerrar el recorrido' }));
        expect(screen.queryByText('Recorrido de 3 pasos')).not.toBeInTheDocument();

        getItem.mockRestore();
        setItem.mockRestore();
    });
});

describe('InitialsAvatar', () => {
    it('shows the first and last initials', () => {
        render(<InitialsAvatar name="María Fernanda López" />);
        expect(screen.getByRole('img')).toHaveTextContent('ML');
    });

    it('handles a single name and a missing name', () => {
        const { rerender } = render(<InitialsAvatar name="Ana" />);
        expect(screen.getByRole('img')).toHaveTextContent('A');
        rerender(<InitialsAvatar name="" />);
        expect(screen.getByRole('img')).toHaveTextContent('?');
    });

    it('always uses the same color for the same person', () => {
        const { rerender } = render(<InitialsAvatar name="Carlos Ruiz" />);
        const first = screen.getByRole('img').style.backgroundColor;
        rerender(<InitialsAvatar name="Carlos Ruiz" />);
        expect(screen.getByRole('img').style.backgroundColor).toBe(first);
    });
});

describe('Error page', () => {
    it.each([
        [403, 'No tienes acceso a esta página'],
        [404, 'No encontramos esa página'],
        [419, 'La sesión expiró'],
        [500, 'Algo salió mal de nuestro lado'],
        [503, 'Estamos en mantenimiento'],
    ])('explains a %i error in plain language', (status, title) => {
        render(<ErrorPage status={status} />);
        expect(screen.getByRole('heading', { name: title })).toBeInTheDocument();
        expect(screen.getByRole('link', { name: 'Ir al inicio' })).toHaveAttribute('href', '/');
    });

    it('offers a retry only for errors that can recover', () => {
        const { rerender } = render(<ErrorPage status={404} />);
        expect(screen.queryByRole('button', { name: 'Intentar de nuevo' })).not.toBeInTheDocument();
        rerender(<ErrorPage status={500} />);
        expect(screen.getByRole('button', { name: 'Intentar de nuevo' })).toBeInTheDocument();
    });

    it('falls back to the generic message for an unknown status', () => {
        render(<ErrorPage status={418} />);
        expect(screen.getByRole('heading', { name: 'Algo salió mal de nuestro lado' })).toBeInTheDocument();
    });
});
