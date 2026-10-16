import {DashboardLayout} from "@/Layouts/DashboardLayout.jsx";
import OutboxSidebar from "@/Components/OutboxSidebar/OutboxSidebar.jsx";
import {MailReader} from "@/Components/MailReader/MailReader.jsx";
import {MailProvider} from "@/context/MailContext/MailContext";


export default function Outbox() {

    return (
        <MailProvider>
            <DashboardLayout>
                <div className="flex h-full w-full">
                    <OutboxSidebar/>
                    <MailReader/>
                </div>
            </DashboardLayout>
        </MailProvider>
    );
}
