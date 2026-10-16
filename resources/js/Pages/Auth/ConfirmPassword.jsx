import InputError from '@/Components/InputError';
import InputLabel from '@/Components/InputLabel';
import PrimaryButton from '@/Components/PrimaryButton';
import TextInput from '@/Components/TextInput';
import GuestLayout from '@/Layouts/GuestLayout';
import { Head, useForm } from '@inertiajs/react';

export default function ConfirmPassword() {
    const { data, setData, post, processing, errors, reset } = useForm({
        password: '',
    });

    const submit = (e) => {
        e.preventDefault();

        post(route('password.confirm'), {
            onFinish: () => reset('password'),
        });
    };

    return (
        <GuestLayout>
            <Head title="Confirmar contrasena" />

            <div className="space-y-5">
                <div className="space-y-2 text-center sm:text-left">
                    <h1 className="text-2xl font-bold text-slate-900">Confirmar contrasena</h1>
                    <p className="text-sm text-slate-600">
                        Esta es una zona segura. Confirma tu contrasena para continuar.
                    </p>
                </div>

                <form onSubmit={submit} className="space-y-4">
                    <div>
                        <InputLabel htmlFor="password" value="Contrasena" className="mb-1.5 text-slate-700" />

                        <TextInput
                            id="password"
                            type="password"
                            name="password"
                            value={data.password}
                            className="block w-full border-slate-300 bg-white text-slate-900 placeholder:text-slate-400 focus:border-primary focus:ring-primary"
                            placeholder="Ingresa tu contrasena"
                            isFocused={true}
                            onChange={(e) => setData('password', e.target.value)}
                        />

                        <InputError message={errors.password} className="mt-2" />
                    </div>

                    <div className="flex justify-end">
                        <PrimaryButton className="h-11 justify-center rounded-lg px-6 text-sm normal-case tracking-normal" disabled={processing}>
                            Confirmar
                        </PrimaryButton>
                    </div>
                </form>
            </div>
        </GuestLayout>
    );
}
