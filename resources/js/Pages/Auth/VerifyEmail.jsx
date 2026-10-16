import PrimaryButton from '@/Components/PrimaryButton';
import GuestLayout from '@/Layouts/GuestLayout';
import { Head, Link, useForm } from '@inertiajs/react';

export default function VerifyEmail({ status }) {
    const { post, processing } = useForm({});

    const submit = (e) => {
        e.preventDefault();

        post(route('verification.send'));
    };

    return (
        <GuestLayout>
            <Head title="Verificacion de correo" />

            <div className="space-y-5">
                <div className="space-y-2 text-center sm:text-left">
                    <h1 className="text-2xl font-bold text-slate-900">Verifica tu correo</h1>
                    <p className="text-sm text-slate-600">
                        Te enviamos un enlace de verificacion. Haz clic en el enlace para activar tu cuenta.
                    </p>
                </div>

                {status === 'verification-link-sent' && (
                    <div className="rounded-lg border border-success/30 bg-success/10 px-3 py-2 text-sm font-medium text-slate-700">
                        Se envio un nuevo enlace de verificacion a tu correo.
                    </div>
                )}

                <form onSubmit={submit} className="space-y-4">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                        <PrimaryButton
                            className="h-11 w-full justify-center rounded-lg text-sm normal-case tracking-normal sm:w-auto"
                            disabled={processing}
                        >
                            Reenviar verificacion
                        </PrimaryButton>

                        <Link
                            href={route('logout')}
                            method="post"
                            as="button"
                            className="h-11 w-full rounded-lg border border-slate-300 px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 sm:w-auto"
                        >
                            Cerrar sesion
                        </Link>
                    </div>
                </form>
            </div>
        </GuestLayout>
    );
}
