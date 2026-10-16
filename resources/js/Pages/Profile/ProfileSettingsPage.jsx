import UpdatePasswordForm from "./Partials/UpdatePasswordForm";
import UpdateProfileInformationForm from "./Partials/UpdateProfileInformationForm";
import SettingsLayout from "@/Layouts/SettingsLayout";
import ProfileSummaryCard from "@/Components/Profile/ProfileSummaryCard";

export default function ProfileSettingsPage({ mustVerifyEmail, status }) {
    return (
        <SettingsLayout>
            <div className="flex h-full min-h-0 flex-col gap-3 overflow-y-auto lg:flex-row lg:gap-4 lg:overflow-hidden">
                {/* Left column: user card */}
                <div className="flex w-full shrink-0 flex-col gap-3 lg:w-64 xl:w-72 lg:gap-4 lg:overflow-y-auto">
                    <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
                        <ProfileSummaryCard />
                    </div>
                </div>

                {/* Right column: profile info + password */}
                <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-3 lg:gap-4 lg:overflow-y-auto">
                    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                        <UpdateProfileInformationForm
                            mustVerifyEmail={mustVerifyEmail}
                            status={status}
                        />
                    </div>

                    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                        <UpdatePasswordForm />
                    </div>
                </div>
            </div>
        </SettingsLayout>
    );
}
