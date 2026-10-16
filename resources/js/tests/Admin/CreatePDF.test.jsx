import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import CreatePDF from '@/Pages/CreatePDF';
import { usePage, router } from '@inertiajs/react';
import { toast } from 'sonner';
import api from '@/lib/axios';
import React from 'react';

window.route = (name, params) => {
    if (params) return `/${name}/${JSON.stringify(params)}`;
    return `/${name}`;
};

vi.mock('@inertiajs/react', () => ({
    usePage: vi.fn(),
    router: {
        visit: vi.fn(),
    },
    Head: ({ title }) => <title>{title}</title>,
    Link: ({ children, href, ...props }) => <a href={href} {...props}>{children}</a>,
}));

vi.mock('sonner', () => ({
    toast: {
        success: vi.fn(),
        error: vi.fn(),
        loading: vi.fn(() => 'toast-id'),
        dismiss: vi.fn(),
    }
}));

vi.mock('@/lib/axios', () => ({
    default: {
        post: vi.fn(),
        delete: vi.fn(),
    }
}));

vi.mock('@/Layouts/DashboardLayout', () => ({
    DashboardLayout: ({ children }) => <div data-testid="dashboard-layout">{children}</div>
}));

HTMLDialogElement.prototype.showModal = vi.fn(function() { this.open = true; });
HTMLDialogElement.prototype.close = vi.fn(function() { this.open = false; });

describe('CreatePDF Interface', () => {
    beforeEach(() => {
        vi.clearAllMocks();

        usePage.mockReturnValue({
            props: {
                auth: {
                    user: { pdf_footer_text: "Mi pie de pagina predeterminado" }
                },

                targetFolderId: 999,
                targetSheetId: 3
            }
        });
    });

    it('renders default state with active "Carta" document template', () => {
        render(<CreatePDF />);

        expect(screen.getByText('Seleccionar tipo de documento')).toBeInTheDocument();

        expect(screen.getByPlaceholderText('Tratamiento')).toBeInTheDocument();
        expect(screen.getByPlaceholderText('Asunto')).toBeInTheDocument();

        expect(screen.getAllByText('Mi pie de pagina predeterminado')[0]).toBeInTheDocument();
    });

    it('dynamically re-renders template fields conditionally based on document type (Acta/Circular)', () => {
        render(<CreatePDF />);

        const select = screen.getByRole('combobox');

        fireEvent.change(select, { target: { value: 'circular' } });

        expect(screen.getByPlaceholderText('Titulo')).toBeInTheDocument();
        expect(screen.getByPlaceholderText('Grupo destinatario')).toBeInTheDocument();

        expect(screen.queryByPlaceholderText('Tratamiento')).not.toBeInTheDocument();

        fireEvent.change(select, { target: { value: 'acta' } });

        expect(screen.getByText('Asistentes')).toBeInTheDocument();
        expect(screen.getByText('Orden del dia')).toBeInTheDocument();
        expect(screen.getByText('+ Agregar punto')).toBeInTheDocument();
    });

    it('allows editing and saving the global generic footer from the dialog modal', async () => {

        api.post.mockResolvedValueOnce({
            data: { footer_text: "Este es el footer corporativo guardado." }
        });

        render(<CreatePDF />);

        const editFooterBtn = screen.getByText('Editar pie de pagina');
        fireEvent.click(editFooterBtn);

        expect(HTMLDialogElement.prototype.showModal).toHaveBeenCalled();

        const footerTextarea = screen.getByPlaceholderText('Escribe el pie de pagina del documento');
        fireEvent.change(footerTextarea, { target: { value: 'Mi nuevo intento corporativo' } });

        const saveModalBtn = screen.getByText('Guardar pie de pagina');
        fireEvent.click(saveModalBtn);

        await waitFor(() => {
            expect(api.post).toHaveBeenCalledWith('/pdf/footer-preference', {
                footer_text: 'Mi nuevo intento corporativo'
            });
        });

        await waitFor(() => {
            expect(screen.getByText('Pie de pagina guardado correctamente.')).toBeInTheDocument();
        });
    });

    it('triggers PDF Generation forwarding the IDOR-injected targetFolderId (999) accurately capturing the vulnerability', async () => {

        api.post.mockResolvedValue({
            data: { folder_id: 999, sheet_id: 3 }
        });

        render(<CreatePDF />);

        const generatePdfBtn = screen.getByText('Generar PDF');
        fireEvent.click(generatePdfBtn);

        // Wait for confirmation modal and click Confirmar button
        await waitFor(() => {
            const confirmBtn = screen.getByText('Confirmar');
            expect(confirmBtn).toBeInTheDocument();
            fireEvent.click(confirmBtn);
        });

        await waitFor(() => {
            expect(api.post).toHaveBeenCalledWith('/generate-pdf-to-explorer', expect.any(FormData));
        });
        const pdfCall = api.post.mock.calls.find(call => call[0] === '/generate-pdf-to-explorer');
        const formData = pdfCall[1];

        expect(formData.get('folder_id')).toBe("999");
        expect(formData.get('sheet_id')).toBe("3");
        expect(formData.get('document_type')).toBe("carta");

        await waitFor(() => {
            expect(toast.success).toHaveBeenCalledWith('PDF generado y guardado correctamente');
        });

        expect(router.visit).toHaveBeenCalled();
    });
});
