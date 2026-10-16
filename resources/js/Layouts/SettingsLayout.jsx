import Header from "@/Components/Header/Header";
import SettingsSidebar from "@/Components/Settings/SettingsSidebar";

const SettingsLayout = ({ children }) => {
    return (
        <div className="h-screen overflow-hidden bg-slate-100 pt-14">
            <Header />

            <div className="h-full px-3 py-3 sm:px-4 sm:py-4 lg:px-6 lg:py-5">
                <div className="h-full rounded-2xl border border-slate-200 bg-white/85 shadow-sm">
                    <div className="flex h-full min-h-0 flex-col lg:flex-row">
                        <aside className="hidden lg:flex lg:w-72 lg:shrink-0 lg:border-r lg:border-slate-200 lg:p-4">
                            <SettingsSidebar />
                        </aside>

                        <main className="min-h-0 flex-1 overflow-y-auto p-3 sm:p-4 lg:p-5">
                            {children}
                        </main>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SettingsLayout;