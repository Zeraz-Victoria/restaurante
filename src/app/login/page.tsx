"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Lock, Utensils, ArrowRight } from "lucide-react";

import { supabase } from "@/lib/supabase/client";

export default function LoginPage() {
    const [accessCode, setAccessCode] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const router = useRouter();

    // Auto-redirect if already logged in as SuperAdmin or Restaurant
    useState(() => {
        if (typeof window !== 'undefined') {
            const isSuper = localStorage.getItem('superadmin_logged_in') === 'true';
            if (isSuper) {
                router.push('/superadmin');
            }
        }
    });

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);

        const normalizedCode = accessCode.trim().toUpperCase();

        // SuperAdmin Backdoor for demo/dev
        if (normalizedCode === 'SUPER-ADMIN-360') {
            alert("Acceso de SuperAdmin detectado. Iniciando sesión maestra...");
            localStorage.clear();
            localStorage.setItem('superadmin_logged_in', 'true');
            router.push('/superadmin');
            return;
        }

        try {
            console.log("Attempting login with code:", normalizedCode);
            const { data, error } = await supabase
                .from('restaurantes')
                .select('*')
                .ilike('access_code', normalizedCode)
                .single();

            if (error || !data) {
                console.error("Supabase login error:", error);
                alert(`Código inválido o error de conexión. Detalle: ${error?.message || 'No se encontró el restaurante'}`);
                setIsLoading(false);
                return;
            }

            if (data.status === 'Suspended') {
                alert("Este restaurante está suspendido. Contacta al administrador.");
                setIsLoading(false);
                return;
            }

            // Save restaurant info
            localStorage.clear(); // Clear any previous superadmin or other restaurant sessions
            localStorage.setItem('restaurant_id', data.id);
            localStorage.setItem('restaurant_name', data.name);
            
            router.push("/admin");
        } catch (error) {
            console.error('Login error:', error);
            alert("Error al iniciar sesión. Inténtalo de nuevo.");
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#0f1115] text-white flex items-center justify-center p-4 selection:bg-orange-500/30">
            <div className="w-full max-w-md bg-[#1a1d24] rounded-3xl p-8 md:p-12 shadow-2xl border border-white/5 relative overflow-hidden">
                {/* Background glow effect */}
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-32 bg-orange-500/20 blur-[100px] pointer-events-none rounded-full" />

                <div className="text-center mb-10 relative z-10">
                    <div className="w-20 h-20 bg-gradient-to-br from-orange-400 to-orange-600 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg shadow-orange-500/20">
                        <Utensils className="w-10 h-10 text-white" />
                    </div>
                    <h1 className="text-3xl font-black tracking-tight mb-2">RestoFlow 360</h1>
                    <p className="text-gray-400 font-medium">Acceso para Restaurantes</p>
                </div>

                <form onSubmit={handleLogin} className="space-y-6 relative z-10">
                    <div>
                        <label className="block text-sm font-bold text-gray-300 uppercase tracking-wider mb-2">
                            Código de Acceso
                        </label>
                        <div className="relative">
                            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                            <input
                                type="text"
                                value={accessCode}
                                onChange={(e) => setAccessCode(e.target.value)}
                                placeholder="E.g., RTF-8A92"
                                className="w-full bg-[#111318] border border-white/10 rounded-xl py-4 pl-12 pr-4 text-white focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition-all font-mono"
                                required
                            />
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={isLoading}
                        className="w-full bg-orange-600 hover:bg-orange-500 text-white font-black py-4 rounded-xl shadow-[0_0_20px_rgba(234,88,12,0.3)] transition-all flex items-center justify-center gap-2 group disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isLoading ? (
                            <span className="animate-pulse">Verificando...</span>
                        ) : (
                            <>
                                Ingresar al Panel
                                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                            </>
                        )}
                    </button>
                </form>

                {/* Footer Link */}
                <div className="mt-8 text-center relative z-10">
                    <p className="text-sm text-gray-500">
                        ¿Control Total? <a href="/superadmin" className="text-orange-400 hover:text-orange-300 font-bold transition-colors">Login Super Admin</a>
                    </p>
                </div>
            </div>
        </div>
    );
}
