import InputError from '@/Components/InputError';
import PrimaryButton from '@/Components/PrimaryButton';
import TextInput from '@/Components/TextInput';
import GuestLayout from '@/Layouts/GuestLayout';
import { Head, useForm } from '@inertiajs/react';

export default function ForgotPassword({ status }) {
    const { data, setData, post, processing, errors } = useForm({
        email: '',
    });

    const submit = (e) => {
        e.preventDefault();
        post(route('password.email'));
    };

    return (
        <GuestLayout>
            <Head title="Recuperar contrasena" />

            <div className="space-y-5">
                <div className="space-y-2 text-center sm:text-left">
                    <h1 className="text-2xl font-bold text-slate-900">Recuperar contrasena</h1>
                    <p className="text-sm text-slate-600">
                        Ingresa tu correo y te enviaremos un enlace para restablecer tu contrasena.
                    </p>
                </div>

                {status && (
                    <div className="rounded-lg border border-success/30 bg-success/10 px-3 py-2 text-sm font-medium text-slate-700">
                        {status}
                    </div>
                )}

                <form onSubmit={submit} className="space-y-4">
                    <div>
                        <label htmlFor="email" className="mb-1.5 block text-sm font-medium text-slate-700">
                            Correo electronico
                        </label>
                        <TextInput
                            id="email"
                            type="email"
                            name="email"
                            value={data.email}
                            className="block w-full border-slate-300 bg-white text-slate-900 placeholder:text-slate-400 focus:border-primary focus:ring-primary"
                            placeholder="correo@ejemplo.com"
                            isFocused={true}
                            onChange={(e) => setData('email', e.target.value)}
                        />
                    </div>

                    <InputError message={errors.email} className="mt-2" />

                    <div className="flex flex-col gap-2 sm:flex-row sm:justify-between">
                        <PrimaryButton
                            className="h-11 w-full justify-center rounded-lg text-sm normal-case tracking-normal sm:w-auto"
                            disabled={processing}
                        >
                            Enviar enlace de recuperacion
                        </PrimaryButton>
                    </div>
                </form>
            </div>
        </GuestLayout>
    );
}
