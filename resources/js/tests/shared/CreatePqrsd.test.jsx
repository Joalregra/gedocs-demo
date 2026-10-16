import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import axios from 'axios';
import Form from '@/Pages/Form'; 
import { toast } from 'sonner';

vi.mock('axios');

vi.mock('sonner', () => ({
    toast: {
        error: vi.fn(),
        success: vi.fn(),
    }
}));

vi.mock('@inertiajs/react', () => ({
    usePage: () => ({
        props: {
            auth: {
                user: { id: 2, name: 'Test User', roles: [{ name: 'Auxiliar' }] },
            },
            sheets: [
                { id: 1, number: '1234567', state: 'Activa' },
                { id: 2, number: '7654321', state: 'Activa' }
            ]
        },
    }),
    Head: () => <div data-testid="head" />,
    Link: ({ children, href, className }) => <a href={href} className={className}>{children}</a>,
}));

window.route = () => 'inbox'; 

describe('Form.jsx - Frontend Validations and Toast Tests', () => {

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('renders the initial fields correctly', () => {
        render(<Form />);
        
        expect(screen.getByText('Diligenciar PQRS')).toBeInTheDocument();
        expect(screen.getByLabelText(/Nombre Completo/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/Entidad/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/Número de Documento/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/Asunto/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/Descripción/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/Correo Electrónico/i)).toBeInTheDocument();

        const submitBtn = screen.getByRole('button', { name: /Enviar PQRS/i });
        expect(submitBtn).toBeDisabled();
    });

    it('limit the types of files that can be uploaded in frontend', async () => {
        render(<Form />);
        
        const fileInput = document.querySelector('input[type="file"]');
        expect(fileInput).toHaveAttribute('type', 'file');

        expect(fileInput).toHaveAttribute('accept', expect.stringMatching(/\.pdf|\.doc|\.jpg|\.png/));
    });
});
