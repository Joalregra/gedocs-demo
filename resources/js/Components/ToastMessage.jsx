import React, { useEffect, useState } from "react";
import { usePage } from "@inertiajs/react";

const ToastMessage = () => {
    const [show, setShow] = useState(false);
    const { pending } = usePage().props;

    useEffect(() => {
        if (pending) {
            setShow(true);
            const timeout = setTimeout(() => {
                setShow(false);
            }, 5000);

            return () => clearTimeout(timeout);
        }
    }, [pending]);

    if (!show || !pending) return null;

    return (
        <div
            className={`toast toast-center toast-top transition-all duration-500 ${
                show ? "opacity-100" : "opacity-0 "
            }`}
        >
            <div className="alert bg-red-500 text-white font-bold">
                <span>{pending.message || pending}</span>
            </div>
        </div>
    );
};

export default ToastMessage;
