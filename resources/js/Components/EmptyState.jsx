import React from 'react'

const EmptyState = ({ text }) => {
    return (
        <div className="flex-1 flex flex-col items-center justify-center py-20 px-6 min-h-[50vh] animate-fade-in relative overflow-hidden">
            {/* Background Decorative element */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 size-64 bg-primary/5 rounded-full blur-3xl pointer-events-none" />

            <div className="relative group transition-all duration-700 hover:scale-105">
                <div className="absolute -inset-8 bg-gray-50 rounded-full blur-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
                <img
                    src="/brand/gedocs-mark.svg"
                    alt=""
                    className="size-32 sm:size-40 lg:size-52 object-contain grayscale opacity-[0.08] group-hover:opacity-20 transition-all duration-700 relative scale-90 group-hover:scale-100"
                />
            </div>

            <div className="mt-8 text-center relative z-10 max-w-sm">
                <h3 className="text-lg sm:text-xl font-black text-gray-300 uppercase tracking-[0.25em] mb-3">
                    Buzón Vacío
                </h3>
                <p className="text-sm sm:text-base text-gray-400 font-bold leading-relaxed opacity-80">
                    {text || "No hay elementos disponibles en esta ubicación"}
                </p>
                <div className="mt-6 flex justify-center gap-2">
                    <div className="size-1.5 rounded-full bg-gray-200 animate-bounce [animation-delay:-0.3s]"></div>
                    <div className="size-1.5 rounded-full bg-gray-200 animate-bounce [animation-delay:-0.15s]"></div>
                    <div className="size-1.5 rounded-full bg-gray-200 animate-bounce"></div>
                </div>
            </div>
        </div>
    )
}

export default EmptyState