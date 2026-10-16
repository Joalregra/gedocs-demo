import api from "@/lib/axios";
import { PencilIcon, UserIcon } from "@heroicons/react/24/outline";
import { router, usePage } from "@inertiajs/react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import InitialsAvatar from "../InitialsAvatar";

const ProfileSummaryCard = ({ className = "" }) => {
    const {
        props: {
            auth: { user },
        },
    } = usePage();
    const [loadingPhoto, setLoadingPhoto] = useState(true);

    useEffect(() => {
        if (!user.profile_photo) {
            setLoadingPhoto(false);
        }
    }, []);

    const UploatPhoto = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const toastId = toast.loading(
            user.profile_photo ? "Actualizando Imagen" : "Subiendo imagen",
        );

        try {
            const form = new FormData();
            form.append("profile_photo", file);

            await api.post("/api/profile/photo", form, {
                headers: {
                    "Content-Type": "multipart/form-data",
                },
            });
            toast.dismiss(toastId);
            toast.success(user.profile_photo ? "Foto actualizada" : "Foto subida");
            router.reload({ only: ["auth"] });
        } catch (err) {
            toast.dismiss(toastId);
            toast.error(
                err?.response?.data?.message ||
                err?.message ||
                err ||
                "Error al hacer la peticion",
            );
        } finally {
            setLoadingPhoto(false);
        }
    };

    return (
        <aside className={`w-full text-gray-800 p-4 ${className}`}>
            <h1 className="mb-2 font-semibold text-slate-900 text-center">
                Informacion de Usuario
            </h1>

            <div className="relative mx-auto mb-2 w-fit">
                {loadingPhoto && user.profile_photo && (
                    <div className="skeleton h-28 w-28 rounded-xl absolute inset-0" />
                )}

                {user.profile_photo ? (
                    <img
                        src={user.profile_photo}
                        className={`${loadingPhoto
                            ? "opacity-0 w-28 h-28 rounded-full overflow-hidden"
                            : "opacity-100 h-28 w-28  object-cover rounded-full overflow-hidden"
                            }`}
                        onLoad={() => setLoadingPhoto(false)}
                        onError={e => {
                            setLoadingPhoto(false);
                            e.target.onerror = null;
                            e.target.src = "/images/default-user-icon.png";
                        }}
                    />
                ) : (
                    <InitialsAvatar name={user?.name} className="h-28 w-28 rounded-full text-3xl" />
                )}

                <div encType="multipart/form-data">
                    <label
                        htmlFor="photo"
                        className="absolute z-10 -bottom-2 -right-2 cursor-pointer rounded-lg bg-primary p-2 text-white shadow-sm"
                    >
                        <PencilIcon className="size-6 " />
                    </label>
                    <input
                        type="file"
                        id="photo"
                        className="hidden"
                        name="profile_photo"
                        accept="image/*"
                        onChange={UploatPhoto}
                    />
                </div>
            </div>

            <div className="w-full rounded-xl bg-slate-50 px-3 py-2 text-center">
                <h2 data-testid="user-email" className="text-sm font-semibold text-slate-900">
                    {user.name}
                </h2>
                <p className="text-xs text-slate-500 break-all">{user.email}</p>
            </div>
        </aside>
    );
};

export default ProfileSummaryCard;
