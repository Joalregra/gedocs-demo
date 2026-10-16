import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import IndexTable from "@/Components/ElectronicIndex/indexTable";
import { ElectronicIndexContext } from "@/context/ElectronicIndexContext/ElectronicIndexContext";
import * as useExplorerModule from "@/Hooks/useExplorer";

vi.mock("@heroicons/react/24/outline", () => ({
    EllipsisVerticalIcon: () => <svg data-testid="ellipsis-icon" />,
    ExclamationTriangleIcon: () => <svg data-testid="exclamation-icon" />,
}));

const mockFiles = [
    {
        id: 1,
        name: "Archivo-Prueba-1.pdf",
        created_at: "2024-03-20T10:00:00.000Z",
        updated_at: "2024-03-21T10:00:00.000Z",
        folder_code: "123-456",
        root_dependency_name: "Dependencia A",
        hash: "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
    },
    {
        id: 2,
        name: "Archivo-Sin-Hash.pdf",
        created_at: null,
        updated_at: null,
        folder_code: null,
        root_dependency_name: null,
        hash: null,
    }
];

describe("ElectronicIndex - IndexTable Frontend API", () => {
    let mockContextValue;
    let mockUseExplorerValue;

    beforeEach(() => {
        vi.clearAllMocks();

        mockContextValue = {
            scopedFiles: mockFiles,
            loading: false,
            error: null,
            openFileInExplorerById: vi.fn(),
        };

        mockUseExplorerValue = {
            deleteSelectionItemsMixed: vi.fn().mockResolvedValue(),
            setSelectedItems: vi.fn(),
            downloadZip: vi.fn().mockResolvedValue(),
        };

        vi.spyOn(useExplorerModule, "useExplorer").mockReturnValue(mockUseExplorerValue);

        const modalMock = {
            open: false,
            showModal: vi.fn(function() { this.open = true; }),
            close: vi.fn(function() { this.open = false; }),
        };
        vi.spyOn(document, 'getElementById').mockImplementation((id) => {
            if (id === 'confirmDeleteIndexFile') return modalMock;
            return null;
        });
    });

    const renderComponent = () => {
        return render(
            <ElectronicIndexContext.Provider value={mockContextValue}>
                <IndexTable />
            </ElectronicIndexContext.Provider>
        );
    };

    it("renders files correctly", () => {
        renderComponent();

        expect(screen.getByText("Archivo-Prueba-1.pdf")).toBeInTheDocument();
        expect(screen.getByText("Archivo-Sin-Hash.pdf")).toBeInTheDocument();
        expect(screen.getByText("123-456")).toBeInTheDocument();
        expect(screen.getByText("Dependencia A")).toBeInTheDocument();
    });

    it("renders hashes shortened to 12 characters or shows a dash if there is no hash", () => {
        renderComponent();

        expect(screen.getByText("e3b0c44298fc...")).toBeInTheDocument();

        const rows = screen.getAllByRole('row');
        expect(rows.length).toBeGreaterThan(1); 
    });

    it("opens the 3-dot menu and 'Go to file' works", async () => {
        renderComponent();

        const ellipsisButtons = screen.getAllByTestId("ellipsis-icon");
        
        fireEvent.click(ellipsisButtons[0].parentElement);

        const goToFileBtn = screen.getByText("Ir al archivo");
        expect(goToFileBtn).toBeInTheDocument();

        fireEvent.click(goToFileBtn);

        expect(mockContextValue.openFileInExplorerById).toHaveBeenCalledWith(1);
    });

    it("opens the 3-dot menu and 'Download' works", async () => {
        renderComponent();

        const ellipsisButtons = screen.getAllByTestId("ellipsis-icon");
        fireEvent.click(ellipsisButtons[0].parentElement);

        const downloadBtn = screen.getByText("Descargar");
        fireEvent.click(downloadBtn);

        expect(mockUseExplorerValue.setSelectedItems).toHaveBeenCalledWith([
            { id: 1, type: "file" }
        ]);
        expect(mockUseExplorerValue.downloadZip).toHaveBeenCalled();
    });

    it("opens the 3-dot menu and 'Move to trash' works', y confirma", async () => {
        renderComponent();

        const ellipsisButtons = screen.getAllByTestId("ellipsis-icon");
        fireEvent.click(ellipsisButtons[0].parentElement);

        const moveToTrashBtn = screen.getByText("Mover a la papelera");
        fireEvent.click(moveToTrashBtn);

        const confirmBtns = screen.getAllByText("Mover a papelera");
        const confirmBtn = confirmBtns[confirmBtns.length - 1]; 
        fireEvent.click(confirmBtn);

        await waitFor(() => {
            expect(mockUseExplorerValue.deleteSelectionItemsMixed).toHaveBeenCalledWith(
                [{ id: 1, type: "file" }],
                expect.any(Object)
            );
        });
    });

    it("shows loading message", () => {
        mockContextValue.loading = true;
        renderComponent();
        expect(screen.getByText("Cargando archivos...")).toBeInTheDocument();
    });

    it("shows error message", () => {
        mockContextValue.error = "Error al cargar archivos";
        renderComponent();
        expect(screen.getByText("Error al cargar archivos")).toBeInTheDocument();
    });
});
