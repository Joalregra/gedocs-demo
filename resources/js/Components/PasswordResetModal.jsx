import { XMarkIcon } from '@heroicons/react/24/outline';
import { useForm } from '@inertiajs/react';
import InputError from '@/Components/InputError';
import PrimaryButton from '@/Components/PrimaryButton';
import TextInput from '@/Components/TextInput';

export default function PasswordResetModal() {
    const { data, setData, post, processing, errors, recentlySuccessful } = useForm({
        email: '',
    });

    const closeModal = () => {
        document.getElementById('reset_modal').close();
    };

    const submitReset = (e) => {
        e.preventDefault();

        post(route('password.email'), {
            onSuccess: () => {
                closeModal();
            },
        });
    };

    return (
        <dialog id="reset_modal" className="modal">
            <div className="modal-box w-11/12 max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-lg sm:p-7">
                <button
                    type="button"
                    aria-label="Cerrar"
                    onClick={closeModal}
                    className="btn btn-ghost btn-sm absolute right-3 top-3 rounded-full"
                >
                    <XMarkIcon className="size-5" />
                </button>

                <div className="space-y-2 pr-8">
                    <h3 className="text-xl font-bold text-slate-900 sm:text-2xl">Recuperar contraseña</h3>
                    <p className="text-sm text-slate-600 sm:text-base">
                        Ingresa tu correo y te enviaremos un enlace de recuperación.
                    </p>
                </div>

                {recentlySuccessful && (
                    <div className="mt-4 rounded-lg border border-success/30 bg-success/10 px-3 py-2 text-sm font-medium text-slate-700">
                        Hemos enviado el enlace de recuperación a tu correo.
                    </div>
                )}

                <form onSubmit={submitReset} className="mt-5 space-y-4">
                    <div>
                        <label htmlFor="email" className="mb-1.5 block text-sm font-medium text-slate-700">
                            Correo electrónico
                        </label>
                        <TextInput
                            id="email"
                            type="email"
                            name="email"
                            value={data.email}
                            className="block w-full border-slate-300 bg-white text-slate-900 placeholder:text-slate-400 focus:border-primary focus:ring-primary"
                            placeholder="correo@ejemplo.com"
                            autoComplete="email"
                            onChange={(e) => setData('email', e.target.value)}
                        />
                        <InputError message={errors.email} className="mt-2" />
                    </div>

                    <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
                        <button
                            type="button"
                            onClick={closeModal}
                            className="inline-flex h-11 w-full items-center justify-center rounded-lg border border-primary bg-white px-4 text-sm font-semibold text-primary transition hover:bg-primary/5 sm:w-auto"
                        >
                            Cerrar
                        </button>

                        <PrimaryButton
                            type="submit"
                            disabled={processing}
                            className="h-11 w-full justify-center rounded-lg text-sm normal-case tracking-normal sm:w-auto"
                        >
                            {processing ? 'Enviando...' : 'Enviar enlace'}
                        </PrimaryButton>
                    </div>
                </form>
            </div>
        </dialog>
    );
}
