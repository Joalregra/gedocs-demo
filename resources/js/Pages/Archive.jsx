import ArchiveTable from "@/Components/ArchiveTable/ArchiveTable";
import { DashboardLayout } from "@/Layouts/DashboardLayout";

export default function Archive() {
    return (
        <div className="bg-base-200">
            <DashboardLayout>
                <div className="bg-gray-100 p-4 rounded-md h-full overflow-auto">
                    <ArchiveTable />
                </div>
            </DashboardLayout>

        </div>
    );
}
