"use client";

import { useState } from "react";
import {
    BellRing,
    Utensils,
    CheckCircle2,
    AlertTriangle,
    Coffee,
    CreditCard,
    Info,
    Check,
    Search
} from "lucide-react";
import { useTables } from "@/hooks/useTables";
import { useNotifications } from "@/hooks/useNotifications";
import { useOrders } from "@/hooks/useOrders";
import { X, Receipt, LogOut } from "lucide-react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";

// --- Mock Data & Types ---
type TableStatus = 'libre' | 'mirando_menu' | 'comiendo' | 'necesita_ayuda' | 'pidiendo_cuenta' | 'esperando_comida';

type Table = {
    id: string;
    numero: number;
    estado: TableStatus;
    guests: number;
    waiter_id: string;
};

type NotificationType = 'cocina_listo' | 'cliente_ayuda' | 'cliente_cuenta' | 'cliente_cubiertos';

type Notification = {
    id: string;
    mesa_id: string;
    tipo: NotificationType;
    mensaje: string;
    created_at: string | Date;
    leido: boolean;
};

// Mock Tables Map (Updated to snake_case)
const MOCK_TABLES: Table[] = [
    { id: "t1", numero: 1, estado: 'libre', guests: 0, waiter_id: "" },
    { id: "t2", numero: 2, estado: 'comiendo', guests: 4, waiter_id: "w1" },
    { id: "t3", numero: 3, estado: 'esperando_comida', guests: 2, waiter_id: "w1" },
    { id: "t4", numero: 4, estado: 'necesita_ayuda', guests: 5, waiter_id: "w1" },
    { id: "t5", numero: 5, estado: 'pidiendo_cuenta', guests: 3, waiter_id: "w1" },
    { id: "t6", numero: 6, estado: 'libre', guests: 0, waiter_id: "" },
    { id: "t7", numero: 7, estado: 'comiendo', guests: 2, waiter_id: "w1" },
    { id: "t8", numero: 8, estado: 'libre', guests: 0, waiter_id: "" },
];

const MOCK_NOTIFICATIONS: Notification[] = [
    {
        id: "n1", mesa_id: "t4", tipo: 'cliente_ayuda',
        mensaje: "Mesa 4 requiere asistencia general", created_at: new Date(Date.now() - 120000), leido: false
    },
    {
        id: "n2", mesa_id: "t3", tipo: 'cocina_listo',
        mensaje: "Orden #102 de Mesa 3 lista para recoger", created_at: new Date(Date.now() - 45000), leido: false
    },
    {
        id: "n3", mesa_id: "t5", tipo: 'cliente_cuenta',
        mensaje: "Mesa 5 solicitó la cuenta", created_at: new Date(Date.now() - 300000), leido: true
    }
];

export default function WaiterPanel() {
    // Retiramos activeTab, el dashboard ahora es unificado
    const [selectedTableId, setSelectedTableId] = useState<string | null>(null);
    const router = useRouter();
    useAuth('restaurant');

    const handleLogout = () => {
        localStorage.clear();
        router.push('/login');
    };

    // Supabase Real-time Hooks (sin mocks — datos reales)
    const { tables, updateTableStatus } = useTables();
    const { notifications, resolveNotification } = useNotifications();
    const { orders, clearTableOrders, markTiempo2 } = useOrders();

    const unreadCount = notifications.filter(n => !n.leido).length;
    // Sort notifications so unread are first
    const activeNotifications = [...notifications].sort((a, b) => Number(a.leido) - Number(b.leido));

    // Helpers
    const getStatusStyles = (status: TableStatus) => {
        switch (status) {
            case 'libre': return "bg-[#1f222a] border-white/5 text-gray-400";
            case 'mirando_menu': return "bg-teal-900/40 border-teal-500/50 text-teal-400";
            case 'comiendo': return "bg-blue-900/40 border-blue-500/50 text-blue-400";
            case 'esperando_comida': return "bg-yellow-900/40 border-yellow-500/50 text-yellow-500 animate-pulse";
            case 'necesita_ayuda': return "bg-red-900/40 border-red-500/50 text-red-400 shadow-[0_0_15px_rgba(239,68,68,0.2)]";
            case 'pidiendo_cuenta': return "bg-purple-900/40 border-purple-500/50 text-purple-400";
            default: return "bg-[#1f222a] border-white/5 text-gray-400";
        }
    };

    const getStatusLabel = (status: TableStatus) => {
        switch (status) {
            case 'libre': return "Libre";
            case 'mirando_menu': return "Viendo Menú";
            case 'comiendo': return "Comiendo";
            case 'esperando_comida': return "Esperando Ord.";
            case 'necesita_ayuda': return "Requiere Ayuda";
            case 'pidiendo_cuenta': return "Pidiendo Cuenta";
        }
    };

    const getStatusIcon = (status: TableStatus) => {
        switch (status) {
            case 'libre': return <Coffee className="w-5 h-5 opacity-30" />;
            case 'mirando_menu': return <Search className="w-5 h-5 text-teal-400 opacity-80" />;
            case 'comiendo': return <Utensils className="w-5 h-5" />;
            case 'esperando_comida': return <Coffee className="w-5 h-5" />;
            case 'necesita_ayuda': return <AlertTriangle className="w-5 h-5" />;
            case 'pidiendo_cuenta': return <CreditCard className="w-5 h-5" />;
        }
    };

    const getNotifIcon = (tipo: NotificationType) => {
        switch (tipo) {
            case 'cocina_listo': return <CheckCircle2 className="w-6 h-6 text-green-400" />;
            case 'cliente_ayuda': return <AlertTriangle className="w-6 h-6 text-red-400" />;
            case 'cliente_cuenta': return <CreditCard className="w-6 h-6 text-purple-400" />;
            case 'cliente_cubiertos': return <Utensils className="w-6 h-6 text-blue-400" />;
        }
    };

    // Actions
    const handleResolveNotification = async (id: string, mesaId: string) => {
        // Mark notification as leido en BD
        await resolveNotification(id);

        // Reset table estado si era alerta
        const t = tables.find(t => t.id === mesaId);
        if (t && (t.estado === 'necesita_ayuda' || t.estado === 'esperando_comida' || t.estado === "pidiendo_cuenta")) {
            await updateTableStatus(mesaId, 'comiendo');
        }
    };

    // ----- SMART SORTING LÓGICA -----
    const getStatusPriority = (status: TableStatus): number => {
        switch (status) {
            case 'necesita_ayuda': return 1;    // URGENCE MAX (Red)
            case 'pidiendo_cuenta': return 2;   // URGENCE HIGH (Purple)
            case 'esperando_comida': return 3;  // URGENCE MED (Yellow)
            case 'comiendo': return 4;          // OK (Blue)
            case 'mirando_menu': return 5;      // OK (Teal)
            case 'libre': return 6;             // LOWEST (Gray)
            default: return 7;
        }
    };

    const sortedTables = [...tables].sort((a, b) => {
        const priorityAvgA = getStatusPriority(a.estado);
        const priorityAvgB = getStatusPriority(b.estado);
        if (priorityAvgA === priorityAvgB) {
            return a.numero - b.numero; // Tie-breaker by number
        }
        return priorityAvgA - priorityAvgB;
    });
    // ---------------------------------

    return (
        <div className="min-h-screen bg-[#0f1115] text-white font-sans select-none pb-8 md:pb-0 flex flex-col md:flex-row">

            {/* Sidebar / Top Nav (Mobile) */}
            <nav className="fixed md:static bottom-0 w-full md:w-24 bg-[#1a1d24] border-t md:border-r border-white/5 flex md:flex-col justify-around md:justify-start items-center p-4 z-50 shadow-[0_-10px_30px_rgba(0,0,0,0.5)] md:min-h-screen">
                <div className="hidden md:block mb-8">
                    <div className="w-12 h-12 bg-orange-500 rounded-xl flex items-center justify-center font-black text-xl shadow-lg">W</div>
                </div>

                <div className="flex flex-col items-center gap-2 p-3 rounded-2xl bg-[#2a2e39] text-white transition-all">
                    <Utensils className="w-6 h-6" />
                    <span className="text-[10px] font-bold uppercase tracking-widest hidden md:block">Mesas</span>
                </div>
            </nav>

            {/* Main Content Area */}
            <main className="flex-1 p-4 md:p-8 max-h-screen overflow-y-auto w-full">

                {/* --- CENTRO DE NOTIFICACIONES HORIZONTAL --- */}
                {unreadCount > 0 && (
                    <div className="mb-8 animate-in mt-4 md:mt-0 slide-in-from-top-6 duration-500">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-xl font-black flex items-center gap-3">
                                <BellRing className="w-6 h-6 text-red-500 animate-pulse" />
                                Alertas Activas
                                <span className="bg-red-500 text-white text-xs px-2 py-1 rounded-full font-bold">
                                    {unreadCount}
                                </span>
                            </h2>
                        </div>
                        <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide snap-x">
                            {activeNotifications.filter(n => !n.leido).map(notif => (
                                <div
                                    key={notif.id}
                                    className="snap-start min-w-[280px] md:min-w-[320px] p-4 rounded-2xl bg-[#252830] border border-red-500/30 shadow-[0_5px_20px_rgba(239,68,68,0.1)] flex items-center gap-4 animate-in zoom-in-95 duration-200"
                                >
                                    <div className="w-12 h-12 rounded-full bg-[#111318] flex items-center justify-center shrink-0 shadow-inner">
                                        {getNotifIcon(notif.tipo)}
                                    </div>
                                    <div className="flex-1">
                                        <p className="font-bold text-gray-100 text-sm leading-tight">{notif.mensaje}</p>
                                        <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider mt-1">
                                            {typeof notif.created_at === 'string' ? new Date(notif.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : (notif.created_at as Date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </p>
                                    </div>
                                    <button
                                        onClick={() => handleResolveNotification(notif.id, notif.mesa_id)}
                                        className="w-10 h-10 rounded-full bg-black/40 hover:bg-green-500/20 text-gray-400 hover:text-green-400 border border-white/5 hover:border-green-500/50 flex items-center justify-center transition-all shrink-0"
                                        title="Marcar como Resuelto"
                                    >
                                        <Check className="w-5 h-5" />
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                )}


                {/* MAP HEADER */}
                <header className="mb-6 flex flex-col md:flex-row md:justify-between md:items-end gap-4 mt-8">
                    <div>
                        <h1 className="text-3xl font-black tracking-tight flex items-center gap-3">
                            Mapa de Salón
                        </h1>
                        <p className="text-gray-400 font-medium mt-1">
                            Ordenado por prioridad de atención en tiempo real.
                        </p>
                    </div>
                    {/* Status Legend */}
                    <div className="flex gap-3 overflow-x-auto p-3 bg-[#1a1d24] rounded-2xl border border-white/5 scrollbar-hide">
                        <div className="flex items-center gap-2 whitespace-nowrap"><div className="w-3 h-3 rounded-full bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.5)]"></div><span className="text-xs text-gray-400 font-bold uppercase">Ayuda</span></div>
                        <div className="flex items-center gap-2 whitespace-nowrap"><div className="w-3 h-3 rounded-full bg-purple-500 shadow-[0_0_10px_rgba(168,85,247,0.5)]"></div><span className="text-xs text-gray-400 font-bold uppercase">Cuenta</span></div>
                        <div className="flex items-center gap-2 whitespace-nowrap"><div className="w-3 h-3 rounded-full bg-yellow-500 shadow-[0_0_10px_rgba(234,179,8,0.5)]"></div><span className="text-xs text-gray-400 font-bold uppercase">Esperando</span></div>
                        <div className="flex items-center gap-2 whitespace-nowrap"><div className="w-3 h-3 rounded-full bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.5)]"></div><span className="text-xs text-gray-400 font-bold uppercase">Comiendo</span></div>
                    </div>
                </header>

                {/* --- MAPA DE MESAS (Smart Sorted) --- */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 lg:max-w-6xl mx-auto animate-in fade-in duration-500">
                    <div className="col-span-full mb-2">
                        <span className="text-xs font-bold text-gray-500 uppercase tracking-widest pl-2">↓ Mayor Prioridad</span>
                    </div>
                    {sortedTables.map((table, index) => (
                        <button
                            key={table.id}
                            style={{
                                animationDelay: `${index * 50}ms`,
                                animationFillMode: 'both'
                            }}
                            onClick={() => setSelectedTableId(table.id)}
                            className={`w-full aspect-square md:aspect-[4/3] rounded-3xl p-4 md:p-6 border-2 flex flex-col justify-between items-start transition-all hover:-translate-y-1 hover:shadow-xl active:scale-95 animate-in zoom-in-95 slide-in-from-bottom-4 ${getStatusStyles(table.estado)} ${table.estado === 'libre' ? 'opacity-60 scale-95 grayscale hover:grayscale-0 hover:opacity-100 hover:scale-100' : ''}`}
                        >
                            <div className="flex justify-between w-full">
                                <span className={`${table.estado === 'libre' ? 'text-3xl' : 'text-4xl md:text-5xl'} font-black transition-all`}>{table.numero}</span>
                                {getStatusIcon(table.estado)}
                            </div>
                            <div className="text-left w-full">
                                <p className="font-bold text-xs md:text-sm uppercase tracking-wider truncate w-full">{getStatusLabel(table.estado)}</p>
                                {!!table.guests && table.guests > 0 && <p className="text-[10px] opacity-70 mt-1 font-bold">{table.guests} INVITADOS</p>}
                            </div>
                        </button>
                    ))}
                    <div className="col-span-full mt-4 text-right">
                        <span className="text-xs font-bold text-gray-500 uppercase tracking-widest pr-2">Menor Prioridad ↑</span>
                    </div>
                </div>

            </main>

            {/* --- MODAL DETALLE DE MESA (TICKET) --- */}
            {selectedTableId && (
                <div className="fixed inset-0 z-[100] flex justify-end animate-in fade-in duration-200">
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setSelectedTableId(null)}></div>
                    <div className="w-full md:w-96 bg-[#1a1d24] h-full shadow-2xl relative z-10 flex flex-col animate-in slide-in-from-right duration-300">
                        {/* Header */}
                        <div className="p-6 border-b border-white/10 flex justify-between items-center bg-[#1f222a]">
                            <div>
                                <h2 className="text-2xl font-black">Mesa {tables.find(t => t.id === selectedTableId)?.numero}</h2>
                                <p className="text-sm text-gray-400 font-medium mt-1">Detalle de Consumo</p>
                            </div>
                            <button onClick={() => setSelectedTableId(null)} className="p-2 hover:bg-white/10 rounded-full transition-colors">
                                <X className="w-6 h-6" />
                            </button>
                        </div>

                        {/* Order History */}
                        <div className="flex-1 overflow-y-auto p-6 space-y-6">
                            {orders.filter(o => o.mesa_id === selectedTableId && o.estado !== 'entregado').length === 0 ? (
                                <div className="text-center text-gray-500 py-10">
                                    <Receipt className="w-12 h-12 mx-auto mb-3 opacity-20" />
                                    <p>No hay órdenes pendientes de cobro.</p>
                                </div>
                            ) : (
                                orders
                                    .filter(o => o.mesa_id === selectedTableId && o.estado !== 'entregado')
                                    .map((orden, idx) => (
                                        <div key={orden.id} className="bg-[#1f222a] rounded-xl p-4 border border-white/5">
                                            <div className="flex justify-between items-center mb-3 border-b border-white/5 pb-2">
                                                <div className="flex gap-3 items-center">
                                                    <span className="font-bold text-sm text-gray-300">Tanda {idx + 1}</span>
                                                    <span className={`text-xs px-2 py-1 rounded-full font-bold uppercase tracking-wider ${orden.estado === 'listo' ? 'bg-green-500/20 text-green-400 border border-green-500/30' :
                                                        orden.estado === 'cocinando' ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30' :
                                                            'bg-gray-800 text-gray-400 border border-gray-700'
                                                        }`}>
                                                        {orden.estado}
                                                    </span>
                                                </div>
                                                <button
                                                    onClick={() => markTiempo2(orden.id)}
                                                    disabled={orden.marchado_tiempo_2}
                                                    className={`px-3 py-1 font-bold text-[10px] rounded uppercase tracking-wider transition-all ${orden.marchado_tiempo_2
                                                        ? 'bg-green-500/10 text-green-500 border border-green-500/30 cursor-not-allowed opacity-60'
                                                        : 'bg-orange-500/10 text-orange-400 border border-orange-500/30 hover:bg-orange-500 hover:text-white'}`}
                                                >
                                                    {orden.marchado_tiempo_2 ? 'Tiempos en Marcha ✓' : 'Marchar Tiempos ▶'}
                                                </button>
                                            </div>
                                            <div className="space-y-3">
                                                {(typeof orden.items === 'string' ? JSON.parse(orden.items) : orden.items)?.map((item: any, i: number) => (
                                                    <div key={i} className="flex justify-between text-sm">
                                                        <div className="flex gap-2 text-gray-300">
                                                            <span className="font-black text-white">{item.quantity}x</span>
                                                            <span>{item.name}</span>
                                                        </div>
                                                        { /* To do real math we'd need item prices in order payload, but total is pre-calculated per order */}
                                                    </div>
                                                ))}
                                            </div>
                                            <div className="mt-4 pt-3 border-t border-white/5 flex justify-between items-center">
                                                <span className="text-xs text-gray-500 font-bold uppercase tracking-widest">Subtotal</span>
                                                <span className="font-black text-white">${orden.total}</span>
                                            </div>
                                        </div>
                                    ))
                            )}
                        </div>

                        {/* Footer Totals */}
                        <div className="p-6 bg-[#1f222a] border-t border-white/10 shadow-[0_-10px_30px_rgba(0,0,0,0.5)]">
                            <div className="flex justify-between items-center mb-6">
                                <span className="text-lg font-medium text-gray-400">Total a Pagar</span>
                                <span className="text-3xl font-black text-orange-400">
                                    ${orders.filter(o => o.mesa_id === selectedTableId && o.estado !== 'entregado').reduce((acc, curr) => acc + (curr.total || 0), 0)}
                                </span>
                            </div>
                            <button
                                onClick={async () => {
                                    if (selectedTableId) {
                                        // 1. Archivar ordenes (marcar como entregadas/pagadas)
                                        await clearTableOrders(selectedTableId);
                                        // 2. Liberar la mesa fisicamente
                                        await updateTableStatus(selectedTableId, 'libre');

                                        setSelectedTableId(null);
                                    }
                                }}
                                className="w-full bg-green-600 hover:bg-green-500 text-white font-black py-4 rounded-xl shadow-[0_0_20px_rgba(34,197,94,0.3)] transition-all flex items-center justify-center gap-2"
                            >
                                <Receipt className="w-5 h-5" />
                                Marcar como Pagado
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
