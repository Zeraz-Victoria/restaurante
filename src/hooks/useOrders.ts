import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase/client';

export type OrderStatus = 'pendiente' | 'cocinando' | 'listo' | 'entregado';

export interface Order {
    id: string;
    mesa_id: string;
    mesa_nombre?: string;
    restaurant_id?: string;
    estado: OrderStatus;
    items: any[] | string; // JSON
    total: number;
    marchado_tiempo_2?: boolean;
    created_at: string;
}

export function useOrders(initialMockOrders: Order[] = []) {
    const [orders, setOrders] = useState<Order[]>(initialMockOrders);

    useEffect(() => {
        const restaurantId = typeof window !== 'undefined' ? localStorage.getItem('restaurant_id') || 'default_tenant' : 'default_tenant';

        // Fetch initial active orders
        const fetchOrders = async () => {
            const { data, error } = await supabase
                .from('ordenes')
                .select('*')
                .eq('restaurant_id', restaurantId)
                .in('estado', ['pendiente', 'cocinando', 'listo'])
                .order('created_at', { ascending: true });

            if (data) setOrders(data);
            if (error) console.log('Error Supabase ordenes:', error.message);
        };

        fetchOrders();

        // Polling para reemplazar WebSockets de Supabase
        const intervalId = setInterval(fetchOrders, 3000);

        return () => {
            clearInterval(intervalId);
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

    const insertOrder = async (orderData: Partial<Order>) => {
        const restaurantId = typeof window !== 'undefined' ? (localStorage.getItem('restaurant_id') || orderData.restaurant_id || 'default_tenant') : 'default_tenant';
        const { data, error } = await supabase
            .from('ordenes')
            .insert([{ ...orderData, restaurant_id: restaurantId }])
            .select();

        if (error) {
            console.error("Error insertando orden:", error);
            // Fallback para mock
            setOrders(prev => [...prev, { id: Math.random().toString(), ...orderData } as Order]);
        }
        return data;
    };

    const markTiempo2 = async (orderId: string) => {
        // Optimistic UI
        setOrders(prev => prev.map(o => o.id === orderId ? { ...o, marchado_tiempo_2: true } : o));

        // Find the current order to mutate its items JSON
        const orderToUpdate = orders.find(o => o.id === orderId);
        if (orderToUpdate && orderToUpdate.items) {
            // We map over items, but instead of altering them, we just append a metadata flag
            // or we can just send a flag inside the first item. Actually, let's just update all 
            // items with tiempo 2 to have `marchado: true`
            let updatedItems: unknown[] = [];
            try {
                const itemsArr = typeof orderToUpdate.items === 'string' ? JSON.parse(orderToUpdate.items) : orderToUpdate.items;
                updatedItems = itemsArr.map((item: { tiempo?: number }) => item.tiempo === 2 ? { ...item, marchado: true } : item);
            } catch {
                console.error("Failed to parse/update items JSON");
                return;
            }

            const { error } = await supabase
                .from('ordenes')
                .update({ items: updatedItems })
                .eq('id', orderId);

            if (error) console.error("Error updating marchado en items json:", error.message);
        }
    };

    return { orders, updateOrderStatus, insertOrder, clearTableOrders, markTiempo2 };
}
