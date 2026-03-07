"use client";

import { useEffect } from "react";

export default function Error({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    useEffect(() => {
        console.error("RestoFlow Error:", error);
    }, [error]);

    return (
        <div className="min-h-screen bg-[#0a0a0c] text-white flex items-center justify-center p-6">
            <div className="max-w-md text-center">
                <div className="w-20 h-20 mx-auto mb-6 bg-red-500/10 rounded-full flex items-center justify-center">
                    <span className="text-4xl">⚠️</span>
                </div>
                <h2 className="text-2xl font-black mb-3">Algo salió mal</h2>
                <p className="text-gray-400 mb-8 leading-relaxed">
                    Ocurrió un error inesperado en el sistema. Esto puede deberse a una
                    conexión interrumpida o un problema temporal del servidor.
                </p>
                <button
                    onClick={() => reset()}
                    className="bg-orange-600 hover:bg-orange-500 text-white font-bold py-3 px-8 rounded-xl shadow-[0_0_20px_rgba(234,88,12,0.3)] transition-colors"
                >
                    Reintentar
                </button>
                <p className="text-xs text-gray-600 mt-6">
                    Error: {error.message}
                </p>
            </div>
        </div>
    );
}
