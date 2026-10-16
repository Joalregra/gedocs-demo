import { ROLES } from "@/constants/roles";
import InputError from "@/Components/InputError";
import InputLabel from "@/Components/InputLabel";
import PrimaryButton from "@/Components/PrimaryButton";
import TextInput from "@/Components/TextInput";
import GuestLayout from "@/Layouts/GuestLayout";
import { Head, Link, useForm } from "@inertiajs/react";
import { toast } from "sonner";
import { useRef } from "react";

export default function Register({ sheets }) {
    const { data, setData, post, processing, errors, reset } = useForm({
        type_document: "",
        document_number: "",
        name: "",
        email: "",
        role: "",
        technical_sheet_id: "",
        password: "",
        password_confirmation: "",
    });

    const toastIdRef = useRef(null);

    const submit = (e) => {
        e.preventDefault();

        if (!data.type_document)
            return toast.error("Seleccione un tipo de documento");
        if (!data.document_number)
            return toast.error("Ingrese el número de documento");
        if (!data.name) return toast.error("Ingrese su nombre completo");
        if (!data.email) return toast.error("Ingrese un email válido");
        if (!data.role) return toast.error("Seleccione un rol");
        if (data.document_number.length > 10) return toast.error("El número de documento debe tener máximo 10 caracteres");
        if (data.document_number.length < 7) return toast.error("El número de documento debe tener mínimo 7 caracteres");
        if (!/^\d+$/.test(data.document_number)) return toast.error("El número de documento debe ser numérico");

        if (data.role === ROLES.AUXILIAR && !data.technical_sheet_id) {
            return toast.error("Seleccione su entidad");
        }

        if (data.password.length < 8) {
            return toast.error("La contraseña debe tener mínimo 8 caracteres");
        }

        if (data.password !== data.password_confirmation) {
            return toast.error("Las contraseñas no coinciden");
        }

        post(route("register"), {
            onStart: () => {
                toastIdRef.current = toast.loading("Registrando usuario...");
            },
            onError: () => {
                toast.dismiss(toastIdRef.current);
            },
            onSuccess: () => {
                toast.dismiss(toastIdRef.current);
            },
            onFinish: () => {
                reset("password", "password_confirmation");
            },
        });
    };
    return (
        <GuestLayout>
            <Head title="Registrarse" />

            <form onSubmit={submit} className="space-y-5">
                <div className="space-y-2 text-center sm:text-left">
                    <h1 className="text-2xl font-bold text-slate-900">Crear cuenta</h1>
                    <p className="text-sm text-slate-600">
                        Completa tus datos para acceder a la plataforma GeDocs.
                    </p>
                </div>

                {/* Tipo documento */}
                <div>
                    <InputLabel
                        htmlFor="type_document"
                        value="Tipo de documento"
                        className="mb-1.5 text-slate-700"
                    />
                    <select
                        id="type_document"
                        value={data.type_document}
                        onChange={(e) =>
                            setData("type_document", e.target.value)
                        }
                        className="select w-full rounded-lg border-slate-300 bg-white text-slate-900 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
                    >
                        <option value="">Seleccione un tipo</option>
                        <option value="CC">Cédula de Ciudadanía</option>
                        <option value="TI">Tarjeta de Identidad</option>
                        <option value="CE">Cédula de Extranjería</option>
                    </select>
                    <InputError
                        message={errors.type_document}
                        className="mt-2"
                    />
                </div>

                {/* Documento */}
                <div>
                    <InputLabel
                        htmlFor="document_number"
                        value="Número de documento"
                        className="mb-1.5 text-slate-700"
                    />
                    <TextInput
                        id="document_number"
                        value={data.document_number}
                        className="block w-full border-slate-300 bg-white text-slate-900 placeholder:text-slate-400 focus:border-primary focus:ring-primary"
                        placeholder="Ej: 1234567890"
                        inputMode="numeric"
                        maxLength={10}
                        onChange={(e) =>
                            setData("document_number", e.target.value.replace(/\D/g, ""))
                        }
                    />
                    <InputError
                        message={errors.document_number}
                        className="mt-2"
                    />
                </div>

                {/* Nombre */}
                <div>
                    <InputLabel htmlFor="name" value="Nombre completo" className="mb-1.5 text-slate-700" />
                    <TextInput
                        id="name"
                        value={data.name}
                        className="block w-full border-slate-300 bg-white text-slate-900 placeholder:text-slate-400 focus:border-primary focus:ring-primary"
                        placeholder="Nombre y apellidos"
                        onChange={(e) => setData("name", e.target.value)}
                    />
                    <InputError message={errors.name} className="mt-2" />
                </div>

                {/* Email */}
                <div>
                    <InputLabel htmlFor="email" value="Correo electrónico" className="mb-1.5 text-slate-700" />
                    <TextInput
                        id="email"
                        type="email"
                        value={data.email}
                        className="block w-full border-slate-300 bg-white text-slate-900 placeholder:text-slate-400 focus:border-primary focus:ring-primary"
                        placeholder="correo@ejemplo.com"
                        onChange={(e) => setData("email", e.target.value)}
                    />
                    <InputError message={errors.email} className="mt-2" />
                </div>

                {/* Rol */}
                <div>
                    <InputLabel htmlFor="role" value="Rol" className="mb-1.5 text-slate-700" />
                    <select
                        id="role"
                        value={data.role}
                        onChange={(e) => setData("role", e.target.value)}
                        className="select w-full rounded-lg border-slate-300 bg-white text-slate-900 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
                    >
                        <option value="">Seleccione un rol</option>
                        <option value={ROLES.AUXILIAR}>Auxiliar</option>
                        <option value={ROLES.SUPERVISOR}>Supervisor</option>
                    </select>
                    <InputError message={errors.role} className="mt-2" />
                </div>

                {/* Entidad */}
                {data.role === ROLES.AUXILIAR && (
                    <div>
                        <InputLabel htmlFor="technical_sheet_id" value="Entidad" className="mb-1.5 text-slate-700" />
                        <select
                            id="technical_sheet_id"
                            value={data.technical_sheet_id}
                            onChange={(e) =>
                                setData("technical_sheet_id", e.target.value)
                            }
                            className="select w-full rounded-lg border-slate-300 bg-white text-slate-900 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
                        >
                            <option value="">Seleccione su entidad</option>
                            {sheets.map((sheet) => (
                                <option key={sheet.id} value={sheet.id}>
                                    {sheet.number}
                                </option>
                            ))}
                        </select>
                        <InputError
                            message={errors.technical_sheet_id}
                            className="mt-2"
                        />
                    </div>
                )}

                {/* Password */}
                <div>
                    <InputLabel htmlFor="password" value="Contraseña" className="mb-1.5 text-slate-700" />
                    <TextInput
                        id="password"
                        type="password"
                        value={data.password}
                        className="block w-full border-slate-300 bg-white text-slate-900 placeholder:text-slate-400 focus:border-primary focus:ring-primary"
                        placeholder="Mínimo 8 caracteres"
                        onChange={(e) => setData("password", e.target.value)}
                    />
                    <InputError message={errors.password} className="mt-2" />
                </div>

                {/* Confirm */}
                <div>
                    <InputLabel
                        htmlFor="password_confirmation"
                        value="Confirmar contraseña"
                        className="mb-1.5 text-slate-700"
                    />
                    <TextInput
                        id="password_confirmation"
                        type="password"
                        value={data.password_confirmation}
                        className="block w-full border-slate-300 bg-white text-slate-900 placeholder:text-slate-400 focus:border-primary focus:ring-primary"
                        placeholder="Repite tu contraseña"
                        onChange={(e) =>
                            setData("password_confirmation", e.target.value)
                        }
                    />
                    <InputError
                        message={errors.password_confirmation}
                        className="mt-2"
                    />
                </div>

                {/* Actions */}
                <div className="flex flex-col-reverse gap-2 pt-1 sm:flex-row sm:items-center sm:justify-between">
                    <Link
                        href={route("login")}
                        className="text-center text-sm font-medium text-slate-600 transition hover:text-primary hover:underline sm:text-left"
                    >
                        ¿Ya estás registrado?
                    </Link>

                    <PrimaryButton className="h-11 justify-center rounded-lg px-6 text-sm normal-case tracking-normal" disabled={processing}>
                        Registrarse
                    </PrimaryButton>
                </div>
            </form>
        </GuestLayout>
    );
}