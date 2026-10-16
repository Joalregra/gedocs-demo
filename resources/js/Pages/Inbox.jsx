import {DashboardLayout} from "@/Layouts/DashboardLayout.jsx";
import InboxSidebar from "@/Components/InboxSidebar/InboxSidebar.jsx";
import {MailReader} from "@/Components/MailReader/MailReader.jsx";
import {MailProvider} from "@/context/MailContext/MailContext";


export default function Home() {

    return (
        <MailProvider>
            <DashboardLayout>
                <div className="flex h-full w-full">
                    <InboxSidebar/>
                    <MailReader/>
                </div>
            </DashboardLayout>
        </MailProvider>
    );
}
