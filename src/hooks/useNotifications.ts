import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase/client';

export type NotificationType = 'cocina_listo' | 'cliente_ayuda' | 'cliente_cuenta' | 'cliente_cubiertos';

export function useNotifications(initialMockNotifs: any[] = []) {
    const [notifications, setNotifications] = useState<any[]>(initialMockNotifs);

    useEffect(() => {
        const restaurantId = typeof window !== 'undefined' ? localStorage.getItem('restaurant_id') || 'default_tenant' : 'default_tenant';

        const fetchNotifs = async () => {
            const { data, error } = await supabase
                .from('solicitudes_ayuda')
                .select('*')
                .eq('restaurant_id', restaurantId)
                .eq('leido', false)
                .order('created_at', { ascending: false });

            if (data && data.length > 0) setNotifications(data);
            if (error) console.log("Error fetch solicitudes_ayuda:", error.message);
        };

        fetchNotifs();

        // Polling para reemplazar WebSockets de Supabase
        const intervalId = setInterval(fetchNotifs, 3000);

        return () => {
            clearInterval(intervalId);
        };
    }, []);

    const sendNotification = async (payload: any) => {
        const restaurantId = typeof window !== 'undefined' ? localStorage.getItem('restaurant_id') || 'default_tenant' : 'default_tenant';
        console.log("Sending notification payload:", payload);
        const { error } = await supabase.from('solicitudes_ayuda').insert([{ ...payload, restaurant_id: restaurantId }]);
        if (error) console.error("Error sending notification:", error);
    };

    const resolveNotification = async (id: string) => {
        // Optimistic update
        setNotifications(prev => prev.map(n => n.id === id ? { ...n, leido: true } : n));
        const { error } = await supabase.from('solicitudes_ayuda').update({ leido: true }).eq('id', id);
        if (error) console.error("Error resolving notification:", error);
    };

    return { notifications, sendNotification, resolveNotification };
}
