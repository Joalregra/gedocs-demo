import { ROLES } from "@/constants/roles";
import api from "@/lib/axios";
import { UserContext } from "@/context/UserContext/UserContext";
import React, { useContext, useState, useEffect, useRef } from "react";
import { XMarkIcon } from "@heroicons/react/24/outline";
import { ArrowUturnLeftIcon } from "@heroicons/react/24/solid";
import { toast } from "sonner";
import { useMemo } from "react";

import { usePage } from "@inertiajs/react";

function UserEditPanel() {
    const { props } = usePage();
    const dependencies = props?.dependencies || [];
    const user = props?.auth?.user;
    const authRole = props?.auth?.user?.roles?.[0]?.name;
    const { idSelected, setEdit, UpdateInfo } = useContext(UserContext);

    const dialogRef = useRef(null);

    const [nombre, setNombre] = useState("");
    const [documento, setDocumento] = useState("");
    const [numero_documento, setNumeroDocumento] = useState("");
    const [email, setEmail] = useState("");
    const [estado, setEstado] = useState("");
    const [sheets, setSheets] = useState([]);
    const [selectedSheets, setSelectedSheets] = useState([]);
    const [selectedDependency, setSelectedDependency] = useState(null);
    useEffect(() => {
        const dialog = dialogRef.current;
        if (dialog && !dialog.open) dialog.showModal();
    }, []);

    useEffect(() => {
        if (idSelected) {
            setNombre(idSelected.name);
            setDocumento(idSelected.type_document);
            setNumeroDocumento(idSelected.document_number);
            setEmail(idSelected.email);
            setEstado(idSelected.status);
            if (idSelected.roles && idSelected.roles[0]?.name === ROLES.AUXILIAR) {
                setSelectedDependency(idSelected.dependency_id || null);
            }
            if (idSelected.sheet_numbers) {
                setSelectedSheets(idSelected.sheet_numbers.map((sheet) => sheet.id));
            }
        }
    }, [idSelected]);

    const filteredDependencies = useMemo(() => {
        if (!idSelected || !idSelected.sheet_numbers?.length) return [];

        const sheetId = idSelected.sheet_numbers[0].id;

        return dependencies.filter(
            (dep) => dep.sheet_number_id === sheetId
        );
    }, [dependencies, idSelected]);


    const toggleSheet = (sheetId) => {
        if (selectedSheets.includes(sheetId)) {
            setSelectedSheets(selectedSheets.filter((id) => id !== sheetId));
        } else {
            setSelectedSheets([...selectedSheets, sheetId]);
        }
    };

    useEffect(() => {
        const fetchData = async () => {
            // Fetch sheets for Supervisor
            if (authRole === ROLES.SUPERVISOR) {
                const res = await api.get("/api/sheetsNumber");
                setSheets(res.data.entidades || []);
            } else {
                const res = await api.get("/api/sheets?active_only=true");
                setSheets(res.data.sheets || []);
            }

        };
        fetchData();
    }, [authRole, idSelected]);

    const UploadUser = async () => {
        let toastId;
        if (numero_documento.length > 10) {
            toast.error("El número de documento no puede tener más de 10 caracteres");
            return;
        }
        if (nombre.length < 3) {
            toast.error("El nombre debe tener al menos 3 caracteres");
            return;
        }
        if (email.length < 5 || !email.includes("@")) {
            toast.error("Ingrese un correo electrónico válido");
            return;
        }
        if (estado === "") {
            toast.error("Seleccione un estado Valido");
            return;
        }
        try {
            toastId = toast.loading("Actualizando información");
            if (idSelected?.roles && idSelected.roles[0]?.name === ROLES.AUXILIAR) {
                await UpdateInfo(nombre, documento, numero_documento, email, estado, idSelected.id, [], selectedDependency);
            } else {
                await UpdateInfo(nombre, documento, numero_documento, email, estado, idSelected.id, selectedSheets);
            }
            toast.success("Información actualizada");
        } catch (err) {
            toast.error(err?.response?.data?.message || err?.message || err || "Error al hacer la petición");
        } finally {
            if (toastId) toast.dismiss(toastId);
        }
    };

    const inputClass = "w-full h-10 border border-gray-300 rounded-lg px-3 text-sm bg-white focus:ring-2 focus:ring-primary/30 focus:border-primary focus:outline-none transition-shadow";

    return (
        <dialog ref={dialogRef} className="modal" onClose={() => setEdit(false)}>
            <div className="modal-box max-w-2xl rounded-2xl p-0 overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between px-5 sm:px-6 py-4 border-b border-gray-100">
                    <button
                        className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
                        onClick={() => dialogRef.current?.close()}
                    >
                        <ArrowUturnLeftIcon className="size-5 text-gray-500" />
                    </button>
                    <h3 className="font-bold text-lg sm:text-xl text-gray-800">
                        {idSelected?.roles[0]?.name === ROLES.SUPERVISOR ? "Editar Supervisor" : "Editar Auxiliar"}
                    </h3>
                    <form method="dialog">
                        <button className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors">
                            <XMarkIcon className="size-5 text-gray-500" />
                        </button>
                    </form>
                </div>

                {/* Body */}
                <div className="flex-1 overflow-y-auto px-5 sm:px-6 py-5">
                    {/* Profile header */}
                    <div className="flex items-center gap-4 mb-6">
                        <div className="w-12 h-12 rounded-full overflow-hidden ring-2 ring-gray-100 shrink-0">
                            <img
                                className="w-full h-full object-cover"
                                alt="profile pic"
                                src={idSelected.profile_photo || "/images/default-user-icon.png"}
                                onError={e => {
                                    e.target.onerror = null;
                                    e.target.src = "/images/default-user-icon.png";
                                }}
                            />
                        </div>
                        <h2 className="font-semibold text-base sm:text-lg text-gray-800 truncate">{idSelected?.name}</h2>
                    </div>

                    {/* Form grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="flex flex-col gap-1.5">
                            <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">Nombres</label>
                            <input type="text" className={inputClass} value={nombre} onChange={(e) => setNombre(e.target.value)} />
                        </div>

                        <div className="flex flex-col gap-1.5">
                            <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">Tipo Documento</label>
                            <select className={inputClass} value={documento} onChange={(e) => setDocumento(e.target.value)}>
                                <option value="">Seleccione</option>
                                <option value="CC">Cédula</option>
                                <option value="TI">Tarjeta</option>
                            </select>
                        </div>

                        <div className="flex flex-col gap-1.5">
                            <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">Número Documento</label>
                            <input type="text" className={inputClass} value={numero_documento} onChange={(e) => setNumeroDocumento(e.target.value)} />
                        </div>

                        <div className="flex flex-col gap-1.5">
                            <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">Correo</label>
                            <input type="email" className={inputClass} value={email} onChange={(e) => setEmail(e.target.value)} />
                        </div>

                        <div className="flex flex-col gap-1.5 md:col-span-2">
                            <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">Estado</label>
                            <select className={inputClass} value={estado} onChange={(e) => setEstado(e.target.value)}>
                                <option value="">Seleccione estado</option>
                                <option value="pending">Pendiente</option>
                                <option value="active">Activo</option>
                            </select>
                        </div>

                        {/* Dependency selector for Auxiliar, Sheets for others */}
                        {idSelected?.roles && idSelected.roles[0]?.name === ROLES.AUXILIAR ? (
                            <div className="flex flex-col gap-2 md:col-span-2">
                                <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">Asignar Dependencia</label>
                                <select
                                    className={inputClass}
                                    value={selectedDependency || ""}
                                    onChange={(e) => setSelectedDependency(e.target.value)}
                                >
                                    <option value="">Seleccione una dependencia</option>

                                    {filteredDependencies.length > 0 ? (
                                        filteredDependencies.map(dep => (
                                            <option key={dep.id} value={dep.id}>
                                                {dep.name}
                                            </option>
                                        ))
                                    ) : (
                                        <option value="">No hay dependencias disponibles</option>
                                    )}
                                </select>
                            </div>
                        ) : (
                            <div className="flex flex-col gap-2 md:col-span-2">
                                <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">Asignar Entidades</label>
                                <div className="border border-gray-200 rounded-xl bg-gray-50 p-4 flex flex-col gap-3">
                                    <div className="flex flex-wrap gap-2 min-h-7">
                                        {selectedSheets.length > 0 ? (
                                            selectedSheets.map((sheetId) => {
                                                const sheet = sheets.find((s) => s.id === sheetId);
                                                return (
                                                    <span key={sheetId} className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium">
                                                        {sheet?.number}
                                                        <button type="button" onClick={() => toggleSheet(sheetId)} className="hover:text-primary/70">
                                                            <XMarkIcon className="size-3.5" />
                                                        </button>
                                                    </span>
                                                );
                                            })
                                        ) : (
                                            <span className="text-xs text-gray-400">No hay entidades seleccionadas</span>
                                        )}
                                    </div>
                                    <div className="max-h-40 overflow-y-auto border-t border-gray-200 pt-3 flex flex-col gap-0.5">
                                        {sheets.map((sheet) => {
                                            const isSelected = selectedSheets.includes(sheet.id);
                                            return (
                                                <div
                                                    key={sheet.id}
                                                    onClick={() => toggleSheet(sheet.id)}
                                                    className={`cursor-pointer px-3 py-2 rounded-lg text-sm flex items-center transition-colors ${isSelected ? "bg-primary text-white" : "hover:bg-white"
                                                        }`}
                                                >
                                                    {sheet.number}
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Footer */}
                <div className="border-t border-gray-100 px-5 sm:px-6 py-4 flex justify-end gap-3 bg-white">
                    <button
                        className="px-4 py-2 rounded-lg text-sm font-medium border border-gray-300 text-gray-600 hover:bg-gray-50 transition-colors"
                        onClick={() => dialogRef.current?.close()}
                    >
                        Cancelar
                    </button>
                    <button
                        className="px-5 py-2 rounded-lg text-sm font-medium bg-primary text-white hover:opacity-90 transition-opacity"
                        onClick={UploadUser}
                    >
                        Guardar Cambios
                    </button>
                </div>
            </div>
            <form method="dialog" className="modal-backdrop"><button>close</button></form>
        </dialog>
    );
}

export default UserEditPanel;
