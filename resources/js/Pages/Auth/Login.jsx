import InputError from '@/Components/InputError';
import InputLabel from '@/Components/InputLabel';
import PrimaryButton from '@/Components/PrimaryButton';
import TextInput from '@/Components/TextInput';
import GuestLayout from '@/Layouts/GuestLayout';
import { Head, Link, useForm } from '@inertiajs/react';
import PasswordResetModal from '@/Components/PasswordResetModal.jsx';
import DemoAccess from '@/Components/Demo/DemoAccess';
import { toast } from 'sonner';
import { usePage } from '@inertiajs/react';

import { useEffect } from 'react';

export default function Login({ status, canResetPassword }) {
    const { data, setData, post, processing, errors, reset } = useForm({
        email: '',
        password: '',
        remember: false,
    });

    const { props } = usePage();

    useEffect(() => {
        if (status) {
            toast.info(status);
            props.status = null;
        }
    }, [status, props]);


    const submit = (e) => {
        e.preventDefault();

        if (!data.email || !data.password) {
            toast.error("Por favor complete todos los campos");
            return;
        }

        let toastId;

        post(route('login'), {
            onStart: () => {
                toastId = toast.loading("Verificando información");
            },
            onError: (errors) => {
                if (toastId) toast.dismiss(toastId);
                if (errors.email) {
                    toast.error("Correo o contraseña incorrectos");
                } else if (errors.password) {
                    toast.error("Ingrese una contraseña válida");
                } else {
                    toast.error("Error en el ingreso al sistema");
                }
            },
            onFinish: () => {
                reset('password')
                if (toastId) toast.dismiss(toastId);
            }
        });
    };

    return (
        <GuestLayout>
            <Head title="Iniciar sesion" />

            {status && (
                <div></div>
            )}

            <form onSubmit={submit} className="space-y-5">
                <div className="space-y-2 text-center sm:text-left">
                    <h1 className="text-2xl font-bold text-slate-900">Iniciar sesion</h1>
                    <p className="text-sm text-slate-600">
                        Accede a GeDocs para continuar con la gestion documental.
                    </p>
                </div>

                <div className="space-y-4">
                    <div>
                        <InputLabel htmlFor="email" value="Correo electronico" className="mb-1.5 text-slate-700" />

                        <TextInput
                            id="email"
                            type="email"
                            name="email"
                            value={data.email}
                            className="block w-full border-slate-300 bg-white text-slate-900 placeholder:text-slate-400 focus:border-primary focus:ring-primary"
                            autoComplete="username"
                            isFocused={true}
                            placeholder="correo@ejemplo.com"
                            onChange={(e) => setData('email', e.target.value)}
                        />

                        <InputError message={errors.email} className="mt-2" />
                    </div>

                    <div>
                        <InputLabel htmlFor="password" value="Contrasena" className="mb-1.5 text-slate-700" />

                        <TextInput
                            id="password"
                            type="password"
                            name="password"
                            value={data.password}
                            className="block w-full border-slate-300 bg-white text-slate-900 placeholder:text-slate-400 focus:border-primary focus:ring-primary"
                            autoComplete="current-password"
                            placeholder="Ingresa tu contrasena"
                            onChange={(e) => setData('password', e.target.value)}
                        />

                        <InputError message={errors.password} className="mt-2" />
                    </div>
                </div>

                <div className="flex items-center justify-end">
                    <button
                        type="button"
                        className="text-sm font-medium text-primary transition hover:underline"
                        onClick={() => document.getElementById('reset_modal').showModal()}
                    >
                        ¿Olvidaste tu contrasena?
                    </button>
                </div>

                <div className="flex flex-col gap-2 sm:flex-row">
                    <PrimaryButton
                        className="h-11 w-full justify-center rounded-lg text-sm normal-case tracking-normal"
                        disabled={processing}
                    >
                        Iniciar sesion
                    </PrimaryButton>

                    <Link
                        href={route('register')}
                        className="inline-flex h-11 w-full items-center justify-center rounded-lg border border-primary bg-white px-4 text-sm font-semibold text-primary transition hover:bg-primary/5"
                        disabled={processing}
                    >
                        Registrarse
                    </Link>
                </div>

                <div className="text-center text-sm text-slate-600 sm:text-left">
                    ¿Aun no tienes cuenta?{' '}
                    <Link href={route('register')} className="font-semibold text-primary hover:underline">
                        Crear cuenta
                    </Link>
                </div>
            </form>
            <DemoAccess />
            <PasswordResetModal />
        </GuestLayout>
    );
}