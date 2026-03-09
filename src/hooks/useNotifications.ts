import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase/client';

export type NotificationType = 'cocina_listo' | 'cliente_ayuda' | 'cliente_cuenta' | 'cliente_cubiertos';

export function useNotifications(initialMockNotifs: any[] = []) {
    const [notifications, setNotifications] = useState<any[]>(initialMockNotifs);

    useEffect(() => {
        const fetchNotifs = async () => {
            const { data, error } = await supabase
                .from('solicitudes_ayuda')
                .select('*')
                .eq('leido', false)
                .order('created_at', { ascending: false });

            if (data && data.length > 0) setNotifications(data);
            if (error) console.log("Error fetch solicitudes_ayuda:", error.message);
        };

        fetchNotifs();

        const channelName = `solicitudes-realtime-${Math.random().toString(36).substring(7)}`;
        const channel = supabase
            .channel(channelName)
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'solicitudes_ayuda' }, payload => {
                console.log('Realtime INSERT in solicitudes_ayuda:', payload);
                setNotifications(prev => [payload.new, ...prev]);
            })
            .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'solicitudes_ayuda' }, payload => {
                console.log('Realtime UPDATE in solicitudes_ayuda:', payload);
                setNotifications(prev => prev.map(n => n.id === payload.new.id ? payload.new : n));
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, []);

    const sendNotification = async (payload: any) => {
        console.log("Sending notification payload:", payload);
        const { error } = await supabase.from('solicitudes_ayuda').insert([payload]);
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
