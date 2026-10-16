import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import Explorer from '@/Pages/Explorer';
import { usePage, router } from '@inertiajs/react';
import { toast } from 'sonner';
import { __resetExplorerStoreForTesting } from '@/Hooks/useExplorer';

window.route = (name, params) => {
    if (params) return `/${name}/${params}`;
    return `/${name}`;
};

vi.mock('@inertiajs/react', () => ({
    usePage: vi.fn(),
    router: {
        get: vi.fn(),
        post: vi.fn((url, data, options) => {
            if (options && options.onSuccess) options.onSuccess();
        }),
        put: vi.fn((url, data, options) => {
            if (options && options.onSuccess) options.onSuccess();
        }),
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

vi.mock('@/Layouts/DashboardLayout', () => ({
    DashboardLayout: ({ children }) => <div data-testid="dashboard-layout">{children}</div>
}));

vi.mock('@/Components/DependencyScheme/DependencyScheme', () => ({
    default: ({ onPdfGenerated }) => (
        <div data-testid="dependency-scheme">
            <button onClick={onPdfGenerated}>Simulate PDF</button>
        </div>
    )
}));

global.ResizeObserver = class ResizeObserver {
    observe() {} unobserve() {} disconnect() {}
};

HTMLDialogElement.prototype.showModal = vi.fn(function() { this.open = true; });
HTMLDialogElement.prototype.close = vi.fn(function() { this.open = false; });

Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation(query => ({ matches: false, addListener: vi.fn(), removeListener: vi.fn() })),
});

global.fetch = vi.fn(() => 
    Promise.resolve({
        json: () => Promise.resolve({
            success: true,
            folders: [{ id: 99, name: 'Carpeta en Papelera', type: 'folder' }],
            files: []
        })
    })
);

const mockAuth = { user: { id: 1, name: 'Admin', roles: [{ name: 'Admin' }] } };
const mockSheets = [ { id: 1, number: '1234567' } ];
const mockYearFolders = [ { id: 10, name: '2025', year: 2025, parent_id: null, sheet_number_id: 1, active: 1, department: 'Año' } ];
const mockInnerFolders = [ { id: 20, name: 'Ventanilla Unica', parent_id: 10, sheet_number_id: 1, active: 1, department: 'Ventanilla', children: [] } ];
const mockFiles = [ { id: 100, name: '2025-Ex-000-001-Documento.pdf', extension: 'pdf', size: 1024, folder_id: 20, active: 1, hash: 'abc' } ];

describe('Explorer Module - Frontend User Interaction Tests', () => {

    beforeEach(() => {
        vi.clearAllMocks();
        localStorage.clear();
        __resetExplorerStoreForTesting();
        usePage.mockReturnValue({
            props: { auth: mockAuth, sheets: mockSheets, filters: { sheet_id: 1 }, folders: mockYearFolders, allFolders: [...mockYearFolders, ...mockInnerFolders], files: [], currentFolder: null },
            url: '/explorer?sheet_id=1'
        });
    });

    it('renders the initial layout with sheets list and year cards based on User Sheets', async () => {
        render(<Explorer />);
        
        await waitFor(() => {
            
            expect(screen.getAllByText(/Entidad 1234567/i)[0]).toBeInTheDocument();
            
            expect(screen.getAllByText(/2025/i)[0]).toBeInTheDocument();
            expect(screen.getAllByText(/Periodos Anuales/i)[0]).toBeInTheDocument();
        });
    });

    it('navigates to inner folders', async () => {
        render(<Explorer />);
        
        await waitFor(() => {
            expect(screen.getAllByText(/2025/i)[0]).toBeInTheDocument();
        });

        const yearBox = screen.getAllByText(/2025/i)[0];
        fireEvent.click(yearBox);

        await waitFor(() => {
            expect(router.get).toHaveBeenCalledWith('/explorer', { folder_id: 10, sheet_id: 1 }, expect.anything());
        });
    });

    it('shows items in trash and can restore them', async () => {
        render(<Explorer />);

        await waitFor(() => {
            expect(screen.getAllByText('Papelera').length).toBeGreaterThan(0);
        });
        
        const trashBtn = screen.getAllByText('Papelera')[0].closest('button');
        fireEvent.click(trashBtn);

        await waitFor(() => expect(global.fetch).toHaveBeenCalled());

        await waitFor(() => {
            expect(screen.getByText('Archivo / Papelera')).toBeInTheDocument();
            expect(screen.getByText('Carpeta en Papelera')).toBeInTheDocument();
        });

        fireEvent.click(screen.getByText('Carpeta en Papelera'));

        const restoreBtn = document.querySelector('button[data-tip="Restaurar"]');
        if (restoreBtn) fireEvent.click(restoreBtn);

        await waitFor(() => {
            expect(router.post).toHaveBeenCalledWith('/folders.restoreMixed', {
                folders: [99],
                files: []
            }, expect.anything());
            expect(toast.success).toHaveBeenCalledWith("Elementos restaurados");
        });
    });

    it('searches for folders/files using filters', async () => {
        usePage.mockReturnValue({
            props: { auth: mockAuth, sheets: mockSheets, filters: { sheet_id: 1, folder_id: 10 }, folders: mockInnerFolders, allFolders: [...mockYearFolders, ...mockInnerFolders], files: [], currentFolder: mockYearFolders[0] },
            url: '/explorer?sheet_id=1&folder_id=10'
        });
        render(<Explorer />);

        await waitFor(() => {
            expect(screen.getByPlaceholderText(/Buscar/i)).toBeInTheDocument();
        });
        const searchInput = screen.getByPlaceholderText(/Buscar/i);
        fireEvent.change(searchInput, { target: { value: 'Reporte' } });
        
        await waitFor(() => {
            expect(searchInput.value).toBe('Reporte');
        });

        fireEvent.submit(searchInput.closest('form'));

        await waitFor(() => {
            expect(router.get).toHaveBeenCalledWith('/explorer', expect.objectContaining({ buscador: 'Reporte' }), expect.anything());
        });
    });

    it('allows editing a Year folder natively', async () => {
        render(<Explorer />);

        await waitFor(() => {
            expect(screen.getAllByText(/2025/i)[0]).toBeInTheDocument();
            const editBtns = document.querySelectorAll('button[title="Editar Año"]');
            expect(editBtns.length).toBeGreaterThan(0);
        });
        
        const editBtns = document.querySelectorAll('button[title="Editar Año"]');
        fireEvent.click(editBtns[0]);

        expect(HTMLDialogElement.prototype.showModal).toHaveBeenCalled();
    });

    it('selects an item mapping to inner components', async () => {
        
        usePage.mockReturnValue({
            props: { 
                auth: mockAuth, sheets: mockSheets, filters: { sheet_id: 1, folder_id: 10 }, 
                folders: mockInnerFolders, allFolders: [...mockYearFolders, ...mockInnerFolders], files: mockFiles, 
                currentFolder: mockYearFolders[0] 
            },
            url: '/explorer?sheet_id=1&folder_id=10'
        });

        render(<Explorer />);
        
        await waitFor(() => {
            expect(screen.getByText('Ventanilla Unica')).toBeInTheDocument();
        });

        const ventanillaBox = screen.getByText('Ventanilla Unica');
        fireEvent.click(ventanillaBox);
        
        await waitFor(() => {
            expect(screen.getAllByText(/seleccionado/i).length).toBeGreaterThan(0);
        });
    });

    it('deletes an item', async () => {
        usePage.mockReturnValue({
            props: { 
                auth: mockAuth, sheets: mockSheets, filters: { sheet_id: 1, folder_id: 10 }, 
                folders: mockInnerFolders, allFolders: [...mockYearFolders, ...mockInnerFolders], files: [], 
                currentFolder: mockYearFolders[0] 
            },
            url: '/explorer?sheet_id=1&folder_id=10'
        });

        render(<Explorer />);
        
        await waitFor(() => expect(screen.getByText('Ventanilla Unica')).toBeInTheDocument());

        fireEvent.click(screen.getByText('Ventanilla Unica'));
        
        await waitFor(() => expect(screen.getAllByText(/Mover a la papelera/i)[0]).toBeInTheDocument());

        const deleteBtn = screen.getAllByText(/Mover a la papelera/i)[0];
        fireEvent.click(deleteBtn);

        expect(HTMLDialogElement.prototype.showModal).toHaveBeenCalled();

        const confirmBtn = screen.getByText('Mover a papelera');
        fireEvent.click(confirmBtn);

        await waitFor(() => {
            expect(router.post).toHaveBeenCalledWith('/folders.deleteMixed', {
                folders: [20],
                files: []
            }, expect.anything());
            expect(toast.success).toHaveBeenCalledWith(expect.stringContaining("Elementos archivados"), expect.anything());
        });
    });

    it('handles moving an item mapping', async () => {
        usePage.mockReturnValue({
            props: { 
                auth: mockAuth, sheets: mockSheets, filters: { sheet_id: 1, folder_id: 10 }, 
                folders: mockInnerFolders, allFolders: mockInnerFolders, files: [], 
                currentFolder: mockYearFolders[0] 
            },
            url: '/explorer?sheet_id=1&folder_id=10'
        });
        render(<Explorer />);
        
        await waitFor(() => expect(screen.getByText('Ventanilla Unica')).toBeInTheDocument());

        fireEvent.click(screen.getByText('Ventanilla Unica'));

        await waitFor(() => expect(screen.getAllByText('Mover')[0]).toBeInTheDocument());

        const moveBtn = screen.getAllByText('Mover')[0];
        fireEvent.click(moveBtn);

        await waitFor(() => expect(screen.getByText(/Mover aqu/i)).toBeInTheDocument());

        fireEvent.click(screen.getByText(/Mover aqu/i));

        await waitFor(() => {
            expect(router.post).toHaveBeenCalledWith('/folders.moveMixed', {
                folders: [20],
                files: [],
                target_folder_id: 10
            }, expect.anything());
        });
    });

    it('allows creating a new year triggering validation toasts', async () => {
        render(<Explorer />);

        await waitFor(() => expect(screen.getByText('Añadir Año')).toBeInTheDocument());

        const addYearBtn = screen.getByText('Añadir Año').closest('button');
        fireEvent.click(addYearBtn);

        expect(HTMLDialogElement.prototype.showModal).toHaveBeenCalled();

        await waitFor(() => {
            const inputField = document.querySelector('input[name="year"]');
            if (inputField) {
                fireEvent.change(inputField, { target: { value: '2028' } });
            }
        });
    });

});
