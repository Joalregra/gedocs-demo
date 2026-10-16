// MenuOptions renders the dropdown menu with available actions (download, edit, delete, details) for files and folders, adapting options based on user role and context.
import { ROLES } from "@/constants/roles";
import { ArrowDownTrayIcon, EllipsisVerticalIcon, InformationCircleIcon, PencilSquareIcon, TrashIcon } from '@heroicons/react/24/outline'
import { usePage } from '@inertiajs/react'
import React from 'react'
import { toast } from 'sonner'
import { DeleteButtonOption, DetailsButtonOption, EditButtonOption, MoveButtonOption } from './OptionsButtons'
import { getSelectedItem, useExplorerData } from '@/Hooks/useExplorer'

const MenuOptions = () => {
    const role = usePage().props.auth.user.roles[0].name
    const canEdit = role === ROLES.ADMIN || role === ROLES.SUPERVISOR

    const {
        downloadZip,
    } = useExplorerData()
    const selectedItem = getSelectedItem();
    return (
        <>
            {/* OPTIONS BUTTON */}
            <div className={`dropdown dropdown-bottom  dropdown-end `}>
                <button tabIndex={"-1"} role="button" className="p-1 h-full flex items-center rounded-full hover:bg-base-300 cursor-pointer">
                    <EllipsisVerticalIcon className="size-5" />
                </button>
                <ul tabIndex="-1" className="dropdown-content dropdown-open menu bg-base-100 rounded-box z-50 w-52 p-2 shadow-sm">

                    <li onClick={async () => {
                        const idToast = toast.loading("Preparando Descarga");
                        try {
                            await downloadZip();
                        } catch (err) {
                            toast.error("Error al decargar " + err?.message);
                        } finally {
                            toast.dismiss(idToast)
                        }
                    }}>
                        <a
                            className="flex items-center gap-2 px-3 py-2 rounded cursor-pointer"
                        >
                            <ArrowDownTrayIcon className="w-5 h-5 text-gray-600" />
                            <span>Descargar</span>
                        </a>
                    </li>
                    <DetailsButtonOption />
                    {canEdit &&
                        <>
                            <EditButtonOption />
                            <MoveButtonOption />

                            <DeleteButtonOption />
                        </>
                    }

                </ul>
            </div>
        </>
    )
}

export default MenuOptions