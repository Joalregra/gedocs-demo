import { UserList } from "@/Components/Users/UserList";
import UserSearch from "@/Components/Users/UserSearch";
import SettingsLayout from "@/Layouts/SettingsLayout";
import React from "react";
import { usePage } from "@inertiajs/react";

export default function Users() {
    const { url } = usePage();

    return (
        <SettingsLayout>
            <UserSearch url={url} />
            <UserList url={url} />
        </SettingsLayout>
    );
}
