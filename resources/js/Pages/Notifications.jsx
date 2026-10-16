import SettingsLayout from "@/Layouts/SettingsLayout";
import NotificationsSettingsSection from "@/Components/Notifications/NotificationsSettingsSection";
import React from "react";

const Notifications = () => {
    return (
        <SettingsLayout>
            <NotificationsSettingsSection />
        </SettingsLayout>
    );
}

export default Notifications;
