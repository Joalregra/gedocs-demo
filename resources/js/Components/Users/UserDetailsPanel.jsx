import { ROLES } from "@/constants/roles";
import { UserContext } from "@/context/UserContext/UserContext";
import React, { useContext, useEffect, useRef } from "react";
import { XMarkIcon } from "@heroicons/react/24/outline";
import UserEditPanel from "./userDetails/UserEditPanel";
import DeleteConfirm from "./DeleteConfirm";

function UserDetailsPanel() {
    const {
        idSelected,
        setidSelected,
        edit,
        setEdit,
        setIsDelete,
    } = useContext(UserContext);

    const dialogRef = useRef(null);
    const switchingToEditRef = useRef(false);

    useEffect(() => {
        const dialog = dialogRef.current;
        if (!dialog) return;
        if (idSelected && !edit) {
            if (!dialog.open) dialog.showModal();
        } else {
            if (dialog.open) dialog.close();
        }
    }, [idSelected, edit]);

    const handleDialogClose = () => {
        if (switchingToEditRef.current) {
            switchingToEditRef.current = false;
            return;
        }
        setidSelected(null);
    };

    const roleName = idSelected?.roles?.[0]?.name || "Usuario";

    const title =
        roleName === ROLES.SUPERVISOR
            ? "Detalles de Supervisor"
            : roleName === ROLES.DEPENDENCIA
            ? "Detalles de Dependencia"
            : "Detalles de Usuario";

    return (
        <>
        {edit && <UserEditPanel />}
        <dialog ref={dialogRef} className="modal" onClose={handleDialogClose}>
        {idSelected && !edit && (<>
            <div className="modal-box max-w-2xl rounded-2xl p-0 overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between px-5 sm:px-6 py-4 border-b border-gray-100">
                    <h3 className="font-bold text-lg sm:text-xl text-gray-800">{title}</h3>
                    <form method="dialog">
                        <button className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors">
                            <XMarkIcon className="size-5 text-gray-500" />
                        </button>
                    </form>
                </div>

                {/* Body */}
                <div className="flex-1 overflow-y-auto px-5 sm:px-6 py-5">
                    {/* Profile card */}
                    <div className="flex items-center gap-4 mb-6">
                        <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full overflow-hidden ring-2 ring-gray-100 shrink-0">
                            <img
                                className="w-full h-full object-cover"
                                alt="profile pic"
                                src={idSelected.profile_photo || "/images/default-user-icon.png"}
                            />
                        </div>
                        <div className="min-w-0">
                            <h2 className="font-bold text-base sm:text-lg text-gray-800 truncate">{idSelected.name}</h2>
                            <p className="text-sm text-gray-500">{roleName}</p>
                        </div>
                    </div>

                    {/* Info grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <InfoItem label="Nombre" value={idSelected.name} />
                        <InfoItem
                            label="Tipo de Documento"
                            value={idSelected.type_document === "CC" ? "Cédula de Ciudadanía" : "Tarjeta de Identidad"}
                        />
                        <InfoItem label="Número de Documento" value={idSelected.document_number} />
                        <InfoItem label="Correo Electrónico" value={idSelected.email} />
                        <InfoItem
                            label="Fecha de Creación"
                            value={new Date(idSelected.created_at).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })}
                        />
                        <InfoItem
                            label="Estado"
                            value={idSelected.status === "pending" ? "Pendiente" : "Activo"}
                            statusColor={idSelected.status === "pending" ? "amber" : "green"}
                        />

                        <div className="sm:col-span-2 bg-gray-50 rounded-xl p-4">
                            <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">
                                {roleName === ROLES.SUPERVISOR ? "Entidades Asignadas" : "Entidad"}
                            </p>
                            <div className="flex flex-wrap gap-2">
                                {idSelected.sheet_numbers?.length > 0 ? (
                                    idSelected.sheet_numbers.map((item) => (
                                        <span key={item.number} className="inline-flex items-center px-3 py-1 rounded-full bg-primary/10 text-primary text-sm font-medium">
                                            {item.number}
                                        </span>
                                    ))
                                ) : (
                                    <span className="text-sm text-gray-400">Sin entidades</span>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Footer actions */}
                <div className="border-t border-gray-100 px-5 sm:px-6 py-4 flex justify-end gap-3 bg-white">
                    <button
                        className="px-4 py-2 rounded-lg text-sm font-medium border border-red-200 text-red-600 hover:bg-red-50 transition-colors"
                        onClick={() => document.getElementById("my_modal_7")?.showModal()}
                    >
                        Borrar
                    </button>
                    <button
                        className="px-4 py-2 rounded-lg text-sm font-medium bg-primary text-white hover:opacity-90 transition-opacity"
                        onClick={() => { switchingToEditRef.current = true; setIsDelete(false); setEdit(true); }}
                    >
                        Editar
                    </button>
                </div>
            </div>
            <form method="dialog" className="modal-backdrop"><button>close</button></form>
        </>)}
        </dialog>
        <DeleteConfirm />
        </>
    );
}


const InfoItem = ({ label, value, statusColor }) => (
    <div className="bg-gray-50 rounded-xl p-4">
        <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">{label}</p>
        {statusColor ? (
            <span className={`inline-flex items-center gap-1.5 text-sm font-semibold ${
                statusColor === "green" ? "text-green-600" : "text-amber-600"
            }`}>
                <span className={`w-1.5 h-1.5 rounded-full ${statusColor === "green" ? "bg-green-500" : "bg-amber-500"}`} />
                {value || "—"}
            </span>
        ) : (
            <p className="text-sm font-semibold text-gray-800">{value || "—"}</p>
        )}
    </div>
);

export default UserDetailsPanel;
