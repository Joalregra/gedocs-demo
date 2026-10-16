import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import Register from '@/Pages/Auth/Register';
import { toast } from 'sonner';
import { useForm } from '@inertiajs/react';

global.route = vi.fn().mockReturnValue('/register');

vi.mock('sonner', () => ({
    toast: {
        error: vi.fn(),
        loading: vi.fn(),
        dismiss: vi.fn(),
    }
}));

vi.mock('@inertiajs/react', () => ({
    Head: () => null,
    Link: ({ children }) => <a href="#">{children}</a>,
    useForm: vi.fn(),
}));

vi.mock('@/Layouts/GuestLayout', () => ({
    default: ({ children }) => <div>{children}</div>
}));

describe('Registration Tests', () => {
    let mockData, mockSetData, mockPost, mockReset;

    beforeEach(() => {
        vi.clearAllMocks();

        mockData = {
            type_document: "",
            document_number: "",
            name: "",
            email: "",
            role: "",
            technical_sheet_id: "",
            password: "",
            password_confirmation: "",
        };

        mockSetData = vi.fn((key, value) => {
            mockData[key] = value;
        });

        mockPost = vi.fn();
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

    const mockSheets = [
        { id: 1, number: 'Entidad-12345' },
        { id: 2, number: 'Entidad-67890' }
    ];

    it('renders all initial form fields', () => {
        render(<Register sheets={mockSheets} />);

        expect(screen.getByLabelText(/Tipo de documento/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/Número de documento/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/Nombre completo/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/Correo electrónico/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/^Rol$/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/^Contraseña/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/Confirmar contraseña/i)).toBeInTheDocument();

        // Al inicio "Entidad" no debe estar presente porque el rol está vacío
        expect(screen.queryByLabelText(/^Entidad$/i)).not.toBeInTheDocument();
    });

    it('does NOT show the sheet select when the selected role is Supervisor', () => {
        mockData.role = "Supervisor";
        useForm.mockReturnValue({
            data: mockData,
            setData: mockSetData,
            post: mockPost,
            processing: false,
            errors: {},
            reset: mockReset,
        });

        render(<Register sheets={mockSheets} />);

        expect(screen.queryByLabelText(/^Entidad/i)).not.toBeInTheDocument();
    });
    it('throws frontend validation toasts using Sonner when submitted incomplete', () => {
        render(<Register sheets={mockSheets} />);

        const btn = screen.getByRole('button', { name: /Registrarse/i });
        fireEvent.click(btn);

        expect(toast.error).toHaveBeenCalledWith("Seleccione un tipo de documento");
        expect(mockPost).not.toHaveBeenCalled();
    });

    it('prints the errors returned by the backend in the inputs (repeated email or ID)', () => {
        useForm.mockReturnValue({
            data: mockData,
            setData: mockSetData,
            post: mockPost,
            processing: false,
            errors: {
                email: "Este correo electrónico ya está en uso.",
                document_number: "Este número de documento ya está registrado."
            },
            reset: mockReset,
        });

        render(<Register sheets={mockSheets} />);

        expect(screen.getByText("Este correo electrónico ya está en uso.")).toBeInTheDocument();
        expect(screen.getByText("Este número de documento ya está registrado.")).toBeInTheDocument();
    });
});
