import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase/client';

export type OrderStatus = 'pendiente' | 'cocinando' | 'listo' | 'entregado';

export interface Order {
    id: string;
    mesa_id: string;
    estado: OrderStatus;
    items: string; // JSON
    total: number;
    marchado_tiempo_2?: boolean;
    created_at: string;
}

export function useOrders(initialMockOrders: any[] = []) {
    const [orders, setOrders] = useState<any[]>(initialMockOrders);

    useEffect(() => {
        // Fetch initial active orders
        const fetchOrders = async () => {
            const { data, error } = await supabase
                .from('ordenes')
                .select('*')
                .in('estado', ['pendiente', 'cocinando', 'listo'])
                .order('created_at', { ascending: true });

            if (data) setOrders(data);
            if (error) console.log('Error Supabase ordenes:', error.message);
        };

        fetchOrders();

        // Subscribe to real-time changes
        const subscription = supabase
            .channel('ordenes-realtime')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'ordenes' }, payload => {
                console.log('Realtime change in ordenes:', payload);
                if (payload.eventType === 'INSERT') {
                    setOrders(prev => [...prev, payload.new as any]);
                } else if (payload.eventType === 'UPDATE') {
                    setOrders(prev => prev.map(o => o.id === payload.new.id ? payload.new : o));
                } else if (payload.eventType === 'DELETE') {
                    setOrders(prev => prev.filter(o => o.id !== payload.old.id));
                }
            })
            .subscribe();

        return () => {
            supabase.removeChannel(subscription);
        };
    }, []);

    const updateOrderStatus = async (id: string, estado: OrderStatus) => {
        // Optimistic UI update
        setOrders(prev => prev.map(o => o.id === id ? { ...o, estado } : o));

        const { error } = await supabase
            .from('ordenes')
            .update({ estado })
            .eq('id', id);

        if (error) console.error("Error updating order status:", error);
    };

    const clearTableOrders = async (mesaId: string) => {
        // Optimistic UI update
        setOrders(prev => prev.map(o => o.mesa_id === mesaId ? { ...o, estado: 'entregado' } : o));

        const { error } = await supabase
            .from('ordenes')
            .update({ estado: 'entregado' })
            .eq('mesa_id', mesaId)
            .neq('estado', 'entregado'); // Only update non-delivered

        if (error) console.error("Error clearing table orders:", error);
    };

    const insertOrder = async (orderData: any) => {
        const { data, error } = await supabase
            .from('ordenes')
            .insert([{ ...orderData, marchado_tiempo_2: false }])
            .select();

        if (error) {
            console.error("Error insertando orden:", error);
            // Fallback para mock
            setOrders(prev => [...prev, { id: Math.random().toString(), ...orderData }]);
        }
        return data;
    };

    const markTiempo2 = async (orderId: string) => {
        setOrders(prev => prev.map(o => o.id === orderId ? { ...o, marchado_tiempo_2: true } : o));

        const { error } = await supabase
            .from('ordenes')
            .update({ marchado_tiempo_2: true })
            .eq('id', orderId);

        if (error) console.error("Error updating marchado_tiempo_2:", error);
    };

    return { orders, updateOrderStatus, insertOrder, clearTableOrders, markTiempo2 };
}
