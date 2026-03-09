"use client";

import { useState, useEffect } from "react";
import { Clock, Play, CheckCircle2, AlertTriangle, PlusCircle } from "lucide-react";
import { useOrders } from "@/hooks/useOrders";
import { useTables } from "@/hooks/useTables";
import { useNotifications } from "@/hooks/useNotifications";

// --- Types ---
type OrderStatus = 'pendiente' | 'cocinando' | 'listo';

export default function KitchenDisplaySystemV2() {
    const { orders: dbOrders, updateOrderStatus } = useOrders();
    const { updateTableStatus } = useTables();
    const { sendNotification } = useNotifications();
    const [currentTime, setCurrentTime] = useState(new Date());

    // Update real-time clock every second for accurate overdue calculations
    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    // Filter to only show pendiente/cocinando that haven't been completed
    const activeOrders = dbOrders.filter(o => o.estado !== 'listo' && o.estado !== 'entregado');

    // Handlers for touch buttons
    const handleStartCooking = async (orderId: string) => {
        await updateOrderStatus(orderId, 'cocinando');
    };

    const handleReadyToDeliver = async (order: any) => {
        await updateOrderStatus(order.id, 'listo');

        // Update table to 'comiendo' and notify Waiter
        if (order.mesa_id) {
            await updateTableStatus(order.mesa_id, 'comiendo');
            await sendNotification({
                tipo: 'cocina_listo',
                mesa_id: order.mesa_id,
                mensaje: `Orden para ${order.mesa_nombre || "Mesa"} lista para recoger`,
                leido: false
            });
        }
    };

    return (
        <div className="min-h-screen bg-[#0f1115] text-white p-4 font-sans select-none overflow-x-hidden">
            {/* Top Bar for Tablet */}
            <header className="flex justify-between items-center mb-6 bg-[#1a1d24] p-4 rounded-xl border border-white/5 shadow-lg">
                <div>
                    <h1 className="text-2xl font-black text-white tracking-widest uppercase flex items-center gap-3">
                        <span className="w-3 h-3 rounded-full bg-green-500 animate-pulse"></span>
                        Estación Cocina (KDS)
                    </h1>
                </div>
                <div className="flex items-center gap-6">
                    <div className="text-right">
                        <p className="text-sm text-gray-400 font-bold uppercase tracking-wider">Comandas Activas</p>
                        <p className="text-2xl font-black leading-none">{activeOrders.length}</p>
                    </div>
                    <div className="h-10 w-px bg-white/10"></div>
                    <div className="flex items-center gap-2 text-xl font-mono text-gray-300 bg-[#0f1115] px-4 py-2 rounded-lg border border-white/5">
                        <Clock className="w-5 h-5 text-gray-500" />
                        {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                </div>
            </header>

            {/* Kanban / Ticket Board Layout */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-6 items-start auto-rows-max">
                {activeOrders.map(order => (
                    <OrderCard
                        key={order.id}
                        order={order}
                        currentTime={currentTime}
                        onStart={() => handleStartCooking(order.id)}
                        onReady={() => handleReadyToDeliver(order)}
                    />
                ))}

                {activeOrders.length === 0 && (
                    <div className="col-span-full h-96 flex flex-col items-center justify-center text-gray-500 border-2 border-dashed border-gray-800 rounded-3xl">
                        <CheckCircle2 className="w-16 h-16 mb-4 opacity-50" />
                        <h2 className="text-2xl font-bold">Sin Comandas Activas</h2>
                        <p className="text-lg">Excelente trabajo, cocina limpia.</p>
                    </div>
                )}
            </div>
        </div>
    );
}

// ------ ORDER CARD COMPONENT ------
function OrderCard({
    order,
    currentTime,
    onStart,
    onReady
}: {
    order: any,
    currentTime: Date,
    onStart: () => void,
    onReady: () => void
}) {
    const timePlacedObj = order.created_at ? new Date(order.created_at) : new Date();
    const elapsedMs = currentTime.getTime() - timePlacedObj.getTime();
    const elapsedMins = Math.floor(elapsedMs / 60000);
    const isOverdue = elapsedMins >= (order.tiempo_prep_estimado || 15);

    // UI State checks based on DB order status
    const hasStarted = order.estado === 'cocinando' || order.estado === 'listo';

    // "Adición" Intelligent grouping color logic
    const headerBgClass = order.is_addition
        ? "bg-blue-600/90"
        : (isOverdue ? "bg-red-600 animate-pulse-fast" : "bg-[#252830]");

    let itemsArray = [];
    try {
        itemsArray = typeof order.items === 'string' ? JSON.parse(order.items) : (order.items || []);
    } catch (e) {
        itemsArray = [];
    }

    return (
        <div className={`flex flex-col rounded-2xl overflow-hidden border shadow-2xl transition-all duration-300 ${isOverdue ? "border-red-500/50 shadow-[0_0_30px_rgba(239,68,68,0.2)]" : "border-white/10"
            } bg-[#1a1d24]`}>

            {/* Card Header */}
            <div className={`${headerBgClass} p-4 flex justify-between items-center text-white transition-colors`}>
                <div className="flex flex-col">
                    <div className="flex items-center gap-2">
                        <h2 className="text-3xl font-black">{order.mesa_nombre || "S/M"}</h2>
                        {order.is_addition && (
                            <span className="bg-white text-blue-800 text-xs font-black uppercase px-2 py-0.5 rounded flex items-center gap-1">
                                <PlusCircle className="w-3 h-3" /> Adición
                            </span>
                        )}
                    </div>
                    <p className="text-sm font-medium opacity-80 mt-1">ID: {order.id}</p>
                </div>

                <div className="text-right flex flex-col items-end">
                    <span className="text-xs uppercase font-bold opacity-80 mb-1">
                        {isOverdue ? "¡Retrasado!" : "Tiempo"}
                    </span>
                    <span className={`text-2xl font-mono font-bold flex items-center gap-2 ${isOverdue ? "text-white" : ""}`}>
                        {isOverdue && <AlertTriangle className="w-5 h-5 text-yellow-300" />}
                        {elapsedMins}m
                    </span>
                </div>
            </div>

            {/* Order Items List */}
            <div className="p-2 flex-1 flex flex-col gap-2 relative">
                {(!order.marchado_tiempo_2 && itemsArray.some((i: any) => i.tiempo === 2 && !i.marchado)) && (
                    <div className="absolute top-0 right-0 p-2 z-10 opacity-70">
                        <span className="text-[10px] font-bold bg-orange-500/20 text-orange-400 px-2 py-1 rounded border border-orange-500/30 uppercase tracking-widest">
                            Esperando Tiempos ▶
                        </span>
                    </div>
                )}

                {itemsArray
                    .filter((item: any) => order.marchado_tiempo_2 || item.marchado || item.tiempo !== 2)
                    .map((item: any) => (
                        <div
                            key={item.id}
                            className={`p-4 rounded-xl border transition-colors ${item.status === 'cooking' ? "bg-[#2a2e39] border-white/5" : "bg-[#1f222a] border-white/5 opacity-80"
                                }`}
                        >
                            <div className="flex gap-4">
                                <div className="text-xl font-black bg-white/10 text-white w-8 h-8 flex items-center justify-center rounded-lg shrink-0">
                                    {item.quantity}
                                </div>
                                <div className="flex-1">
                                    <p className={`text-lg font-bold leading-tight ${order.status === 'cooking' ? 'text-white' : 'text-gray-300'}`}>
                                        {item.name}
                                    </p>
                                    {/* High Contrast Modifiers */}
                                    {item.modifiers && item.modifiers.length > 0 && (
                                        <div className="mt-2 flex flex-wrap gap-2">
                                            {item.modifiers.map((mod: string, idx: number) => (
                                                <span
                                                    key={idx}
                                                    className="bg-yellow-400/20 text-yellow-400 font-black text-xs uppercase px-2 py-1 rounded border border-yellow-400/30 tracking-wider"
                                                >
                                                    {mod}
                                                </span>
                                            ))}
                                        </div>
                                    )}
                                    <div className="mt-1 flex items-center gap-2">
                                        <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded ${item.tiempo === 2 ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30' : 'bg-gray-800 text-gray-400 border border-gray-700'}`}>
                                            {item.tiempo === 2 ? 'Tiempo 2: Fuerte' : 'Tiempo 1: Entrada/General'}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
            </div>

            {/* Action Buttons (Large Touch Targets) */}
            <div className="p-3 bg-[#111318] border-t border-white/5">
                {!hasStarted ? (
                    <button
                        onClick={onStart}
                        className="w-full py-5 bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white font-black text-xl rounded-xl tracking-wide uppercase transition-colors shadow-lg flex items-center justify-center gap-3"
                    >
                        <Play className="w-6 h-6 fill-current" />
                        Iniciar Cocción
                    </button>
                ) : (
                    <button
                        onClick={onReady}
                        className="w-full py-5 bg-green-500 hover:bg-green-400 active:bg-green-600 text-white font-black text-xl rounded-xl tracking-wide uppercase transition-colors shadow-[0_0_20px_rgba(34,197,94,0.3)] flex items-center justify-center gap-3"
                    >
                        <CheckCircle2 className="w-6 h-6" />
                        Listo para Entregar
                    </button>
                )}
            </div>
        </div>
    );
}
