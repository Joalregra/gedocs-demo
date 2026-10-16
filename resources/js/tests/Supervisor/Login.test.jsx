import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, beforeAll } from 'vitest';
import Login from '@/Pages/Auth/Login';
import { toast } from 'sonner';
import { useForm } from '@inertiajs/react';

global.route = vi.fn((name) => `/${name}`);

vi.mock('sonner', () => ({
    toast: {
        error: vi.fn(),
        loading: vi.fn(),
        dismiss: vi.fn(),
        info: vi.fn(),
    }
}));

vi.mock('@inertiajs/react', () => ({
    Head: () => null,
    Link: ({ children }) => <a href="#">{children}</a>,
    useForm: vi.fn(),
    usePage: vi.fn(() => ({ props: {} })),
    router: {
        post: vi.fn(),
    }
}));

vi.mock('@/Layouts/GuestLayout', () => ({
    default: ({ children }) => <div>{children}</div>
}));

describe('Frontend Login Tests', () => {
    let mockData, mockSetData, mockPost, mockReset;

    beforeAll(() => {

        HTMLDialogElement.prototype.showModal = vi.fn();
        HTMLDialogElement.prototype.close = vi.fn();
    });

    beforeEach(() => {
        vi.clearAllMocks();

        mockData = {
            email: "",
            password: "",
            remember: false,
        };

        mockSetData = vi.fn((key, value) => {
            mockData[key] = value;
        });

        // Hacemos que post ejecute automáticamente opciones para poder probar callbacks si quisiéramos
        mockPost = vi.fn((routeName, options) => {
            if (options && options.onStart) options.onStart();
            // No llamamos onSuccess/onError automáticamente para que cada prueba decida
        });

        mockReset = vi.fn();

        useForm.mockReturnValue({
            data: mockData,
            setData: mockSetData,
            post: mockPost,
            processing: false,
            errors: {},
            reset: mockReset,
        });
    });

    it('renders all initial login form fields and buttons', () => {
        render(<Login status="" canResetPassword={true} />);

        expect(screen.getByLabelText(/Correo electronico|Correo electrónico/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/Contrasena|Contraseña/i)).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /Iniciar sesion|Iniciar Sesion/i })).toBeInTheDocument();
        expect(screen.getByText(/Olvidaste tu contrasena|Olvidaste tu contraseña/i)).toBeInTheDocument();
    });

    it('throws frontend validation toast when submitted with empty fields', () => {
        render(<Login status="" canResetPassword={true} />);

        const btn = screen.getByRole('button', { name: /Iniciar Sesion/i });
        fireEvent.click(btn);

        // Como los campos están vacíos (definidos en mockData al inicio), aborta y muestra toast
        expect(toast.error).toHaveBeenCalledWith("Por favor complete todos los campos");
        expect(mockPost).not.toHaveBeenCalled();
    });

    it('displays backend errors when passed through useForm errors', () => {

        useForm.mockReturnValue({
            data: { email: "usuario@test.com", password: "password", remember: false },
            setData: mockSetData,
            post: mockPost,
            processing: false,
            errors: {
                email: "Estas credenciales no coinciden con nuestros registros.",
            },
            reset: mockReset,
        });

        render(<Login status="" canResetPassword={true} />);

        // Verifica que el error se imprima en el formulario (InputError).
        // Usamos getAllByText porque el mock globally shared lo renderiza tanto en Login como en PasswordResetModal.
        expect(screen.getAllByText("Estas credenciales no coinciden con nuestros registros.")[0]).toBeInTheDocument();
    });

    it('shows toast error on bad credentials via onError callback in post', () => {
        // Llenamos los datos para pasar la validación inicial
        mockData.email = "test@test.com";
        mockData.password = "wrong";

        mockPost.mockImplementation((url, options) => {
            if (options && options.onError) {
                options.onError({ email: "error falso" });
            }
        });

        render(<Login status="" canResetPassword={true} />);

        const btn = screen.getByRole('button', { name: /Iniciar Sesion/i });
        fireEvent.click(btn);

        // Debería mostrar el toast error "Correo o contraseña incorrectos" manejado en el onError
        expect(toast.error).toHaveBeenCalledWith("Correo o contraseña incorrectos");
    });

    it('triggers the password recovery function and calls password.email', () => {

        render(<Login status="" canResetPassword={true} />);

        // Abrir el modal
        const recoveryLink = screen.getByText(/Olvidaste tu contrasena|Olvidaste tu contraseña/i);
        fireEvent.click(recoveryLink);
        expect(HTMLDialogElement.prototype.showModal).toHaveBeenCalled();

        // Buscar el input de correo dentro del modal
        const emailInputs = screen.getAllByPlaceholderText('correo@ejemplo.com');
        const emailInput = emailInputs[emailInputs.length - 1];
        fireEvent.change(emailInput, { target: { value: 'supervisor@test.com' } });

        // Simular que mockData se actualizó (ya que usamos el mismo mockData)
        mockData.email = 'supervisor@test.com';

        // Evitamos fireEvent.click en el botón porque forms method="dialog" a veces no lo autodisparan en jsdom
        const modalForm = emailInput.closest('form');
        fireEvent.submit(modalForm);

        expect(mockPost).toHaveBeenCalledWith(route('password.email'), expect.any(Object));
    });

    it('shows info toast when supervisor is not yet approved by admin', () => {
        const statusMsg = "Espera a que el/la Administrador@ te de aceptacion para ingresar al sistema";

        render(<Login status={statusMsg} canResetPassword={true} />);

        expect(toast.info).toHaveBeenCalledWith(statusMsg);
    });

    it('successfully posts to the login route and expects redirect to dashboard (/)', async () => {

            mockData.email = "supervisor@test.com";
            mockData.password = "password123";

            mockPost.mockImplementation((url, options) => {
                if (options && options.onStart) options.onStart();
                if (options && options.onSuccess) options.onSuccess();
                if (options && options.onFinish) options.onFinish();
            });

            render(<Login status="" canResetPassword={true} />);

            const btn = screen.getByRole('button', { name: /Iniciar Sesion/i });
            fireEvent.click(btn);

            expect(mockPost).toHaveBeenCalledWith('/login', expect.any(Object));
        });
});
