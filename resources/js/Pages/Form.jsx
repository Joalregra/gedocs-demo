import { ROLES } from "@/constants/roles";
import { PaperClipIcon } from "@heroicons/react/24/solid";
import { useState, lazy, Suspense } from "react";
import axios from "axios";
import { Link, usePage } from "@inertiajs/react";
import { useEffect } from "react";

const CheckCircleIcon = lazy(() =>
    import("@heroicons/react/24/solid").then((m) => ({ default: m.CheckCircleIcon }))
);

export default function Form() {
    const { auth, sheets = [] } = usePage().props;
    const userRole = auth?.user?.roles?.[0]?.name;

    const [toasts, setToasts] = useState([]);
    const [submitted, setSubmitted] = useState(false);
    const [authorizedDataTreatment, setAuthorizedDataTreatment] = useState(false);

    const [formData, setFormData] = useState({
        document_type: "CC",
        document: "",
        sender_name: "",
        email: "",
        affair: "",
        description: "",
        request_type: "Peticion",
        number: "",
        dependency_id: "",
        attachments: [],
    });

    useEffect(() => {
        if (userRole === ROLES.AUXILIAR && sheets.length === 1) {
            setFormData(prev => ({ ...prev, number: sheets[0].number }));
        }
    }, [userRole, sheets]);

    const addToast = (type, message) => {
        const id = `${Date.now()}-${Math.floor(Math.random() * 1000)}`;
        setToasts((prev) => [...prev, { id, type, message }]);

        setTimeout(() => {
            setToasts((prev) => prev.filter((t) => t.id !== id));
        }, 4000);
    };

    const resetForm = () => {
        setFormData({
            document_type: "CC",
            document: "",
            sender_name: "",
            email: "",
            affair: "",
            description: "",
            request_type: "Peticion",
            number: "",
            dependency_id: "",
            attachments: [],
        });
        setSubmitted(false);
    };

    const formDataHandler = (e) => {
        const { name, value, type, files } = e.target;

        if (name === "document" && !/^\d*$/.test(value)) return;

        setFormData((prev) => ({
            ...prev,
            [name]: type === "file" ? Array.from(files) : value,
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        const data = new FormData();

        Object.entries(formData).forEach(([key, value]) => {
            if (key === "attachments") {
                value.forEach((file) => {
                    data.append("attachments[]", file);
                });
            } else if (value !== "" && value !== null) {
                data.append(key, value);
            }
        });

        try {
            await axios.post("/api/pqrs", data, {
                headers: { "Content-Type": "multipart/form-data" },
            });

            setSubmitted(true);
            addToast("success", "PQRS enviada correctamente");
        } catch (error) {
            if (error.response?.status === 422) {
                Object.values(error.response.data.errors).forEach((messages) => {
                    messages.forEach((msg) => addToast("error", msg));
                });
            } else {
                addToast("error", "Ocurrió un error inesperado");
            }
        }
    };

    if (submitted) {
        return (
            <div className="bg-base-200 min-h-screen flex items-center justify-center px-4">
                <div className="bg-white rounded-xl p-8 sm:p-10 w-full max-w-lg text-center shadow-md">
                    <Suspense fallback={null}>
                        <CheckCircleIcon className="w-20 h-20 text-primary mx-auto mb-4" />
                    </Suspense>
                    <h1 className="text-2xl font-bold text-primary mb-2">
                        ¡PQRS enviada con éxito!
                    </h1>
                    <p className="text-neutral mb-6">
                        Hemos recibido tu solicitud correctamente.
                        Nuestro equipo la revisará y te dará respuesta dentro
                        de los tiempos establecidos.
                    </p>
                    <div className="flex flex-col sm:flex-row gap-4 justify-center">
                        <button
                            onClick={resetForm}
                            className="btn bg-primary text-white w-full sm:w-auto px-6"
                        >
                            Enviar otra PQRS
                        </button>
                        <a
                            href="/"
                            className="btn btn-outline outline-primary text-primary w-full sm:w-auto px-6"
                        >
                            Volver al inicio
                        </a>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <>
            <div className="toast toast-top toast-end z-50">
                {toasts.map((toast) => (
                    <div
                        key={toast.id}
                        className={`alert ${
                            toast.type === "success"
                                ? "alert-success"
                                : "alert-error"
                        }`}
                    >
                        <span>{toast.message}</span>
                    </div>
                ))}
            </div>

            <div className="bg-base-200 min-h-screen flex flex-col px-2 sm:px-4">
                <div className="flex flex-1 justify-center">
                    <div className="relative flex flex-col items-center bg-white m-3 sm:m-6 rounded-xl p-6 sm:p-10 w-full max-w-5xl shadow-md">

                        {/* BOTÓN VOLVER */}
                        <div className="absolute top-4 left-4">
                            <Link
                                href={route("inbox")}
                                className="flex items-center justify-center h-10 w-10 rounded-full hover:bg-primary transition-all duration-200 group"
                            >
                                <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    viewBox="0 0 24 24"
                                    fill="currentColor"
                                    className="w-6 h-6 text-primary group-hover:text-white transition-colors"
                                >
                                    <path
                                        fillRule="evenodd"
                                        d="M11.03 3.97a.75.75 0 0 1 0 1.06l-6.22 6.22H21a.75.75 0 0 1 0 1.5H4.81l6.22 6.22a.75.75 0 1 1-1.06 1.06l-7.5-7.5a.75.75 0 0 1 0-1.06l7.5-7.5a.75.75 0 0 1 1.06 0Z"
                                        clipRule="evenodd"
                                    />
                                </svg>
                            </Link>
                        </div>

                        <h1 className="font-bold text-2xl text-primary text-center mb-6">
                            Diligenciar PQRS
                        </h1>

                        <form
                            className="w-full flex flex-col items-center"
                            onSubmit={handleSubmit}
                        >

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 w-full lg:w-4/5 xl:w-3/4">

                                <div>
                                    <label htmlFor="sender_name" className="label-text">Nombre Completo</label>
                                    <input
                                        id="sender_name"
                                        name="sender_name"
                                        type="text"
                                        className="input input-bordered w-full"
                                        value={formData.sender_name}
                                        onChange={formDataHandler}
                                    />
                                </div>

                                <div>
                                    <label htmlFor="number" className="label-text">Entidad</label>
                                    <select
                                        id="number"
                                        name="number"
                                        className="select select-bordered w-full"
                                        value={formData.number}
                                        onChange={formDataHandler}
                                        disabled={userRole === ROLES.AUXILIAR && sheets.length === 1}
                                    >
                                        <option value="" disabled>Seleccione una entidad</option>
                                        {sheets.map((sheet) => (
                                            <option key={sheet.id} value={sheet.number}>
                                                {sheet.number}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label htmlFor="document_type" className="label-text">Tipo de Documento</label>
                                    <select
                                        id="document_type"
                                        name="document_type"
                                        className="select select-bordered w-full"
                                        value={formData.document_type}
                                        onChange={formDataHandler}
                                    >
                                        <option>CC</option>
                                        <option>TI</option>
                                        <option>CE</option>
                                    </select>
                                </div>

                                <div>
                                    <label htmlFor="document" className="label-text">Número de Documento</label>
                                    <input
                                        id="document"
                                        name="document"
                                        type="text"
                                        className="input input-bordered w-full"
                                        value={formData.document}
                                        onChange={formDataHandler}
                                    />
                                </div>

                                <div>
                                    <label htmlFor="email" className="label-text">Correo Electrónico</label>
                                    <input
                                        id="email"
                                        name="email"
                                        type="email"
                                        className="input input-bordered w-full"
                                        value={formData.email}
                                        onChange={formDataHandler}
                                    />
                                </div>

                                <div>
                                    <label htmlFor="request_type" className="label-text">Tipo de Solicitud</label>
                                    <select
                                        id="request_type"
                                        name="request_type"
                                        className="select select-bordered w-full"
                                        value={formData.request_type}
                                        onChange={formDataHandler}
                                    >
                                        <option>Peticion</option>
                                        <option>Queja</option>
                                        <option>Reclamo</option>
                                        <option>Sugerencia</option>
                                        <option>Otro</option>
                                    </select>
                                </div>

                            </div>

                            <div className="w-full lg:w-4/5 xl:w-3/4 mt-6">
                                <label htmlFor="affair" className="label-text">Asunto</label>
                                <input
                                    id="affair"
                                    name="affair"
                                    type="text"
                                    className="input input-bordered w-full"
                                    value={formData.affair}
                                    onChange={formDataHandler}
                                />
                            </div>

                            <div className="w-full lg:w-4/5 xl:w-3/4 mt-4">
                                <label htmlFor="description" className="label-text">Descripción</label>
                                <textarea
                                    id="description"
                                    name="description"
                                    className="textarea textarea-bordered w-full"
                                    rows="5"
                                    maxLength={1000}
                                    value={formData.description}
                                    onChange={formDataHandler}
                                />
                                <small className="block text-right text-gray-500 mt-1">
                                    {1000 - formData.description.length} caracteres restantes
                                </small>
                            </div>

                            <div className="flex flex-col sm:flex-row w-full lg:w-4/5 xl:w-3/4 items-start sm:items-center gap-3 mt-5">
                                <label className="btn">Adjuntar Soportes</label>
                                <PaperClipIcon className="w-5 h-5 text-gray-500" />
                                <input
                                    accept=".pdf"
                                    name="attachments"
                                    type="file"
                                    multiple
                                    onChange={formDataHandler}
                                    className="file-input file-input-bordered w-full sm:w-auto"
                                />
                            </div>

                            <div className="flex w-full lg:w-4/5 xl:w-3/4 mt-5 gap-3 items-start text-sm sm:text-base">
                                <input
                                    type="checkbox"
                                    checked={authorizedDataTreatment}
                                    onChange={(e) => setAuthorizedDataTreatment(e.target.checked)}
                                    className="checkbox checkbox-success mt-1"
                                />
                                <label>
                                    Autorizo el tratamiento de mis datos personales conforme a la Ley 1581 de 2012
                                </label>
                            </div>

                            <button
                                type="submit"
                                disabled={!authorizedDataTreatment}
                                className="btn bg-primary text-white font-bold w-full sm:w-auto px-10 py-3 rounded-lg mt-6 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                Enviar PQRS
                            </button>

                        </form>
                    </div>
                </div>
            </div>
        </>
    );
}