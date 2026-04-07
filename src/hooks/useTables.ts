import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase/client';

export type TableStatus = 'libre' | 'mirando_menu' | 'comiendo' | 'esperando_comida' | 'necesita_ayuda' | 'pidiendo_cuenta';

export type TableType = { id: string; numero: number; estado: TableStatus; session_id?: string; active_guests?: number; guests?: number; };

// Este hook se utilizará en el Waiter Panel para monitorear colores de las mesas
export function useTables(initialMockTables: TableType[] = []) {
    const [tables, setTables] = useState<TableType[]>(initialMockTables);

    useEffect(() => {
        const restaurantId = typeof window !== 'undefined' ? localStorage.getItem('restaurant_id') || 'default_tenant' : 'default_tenant';

        const fetchTables = async () => {
            const { data, error } = await supabase
                .from('mesas')
                .select('*')
                .eq('restaurant_id', restaurantId)
                .order('numero', { ascending: true });

            if (data && data.length > 0) setTables(data);
            if (error) console.log("Error fetch mesas:", error.message);
        };

        fetchTables();

        // Polling para reemplazar WebSockets de Supabase
        const intervalId = setInterval(fetchTables, 3000);

        return () => {
            clearInterval(intervalId);
        };
    }, []);

    const updateTableStatus = async (id: string, estado: TableStatus) => {
        // Optimistic 
        setTables(prev => prev.map(t => t.id === id ? { ...t, estado } : t));
        const { error } = await supabase.from('mesas').update({ estado }).eq('id', id);
        if (error) console.error("Error updating table status:", error);
    };

    const addTable = async () => {
        try {
            const restaurantId = typeof window !== 'undefined' ? localStorage.getItem('restaurant_id') || 'default_tenant' : 'default_tenant';
            const nextNum = tables.length > 0 ? Math.max(...tables.map(t => typeof t.numero === 'number' ? t.numero : parseInt(t.numero) || 0)) + 1 : 1;
            console.log("Adding table number:", nextNum);
            const { data, error } = await supabase.from('mesas').insert([{ numero: nextNum, estado: 'libre', restaurant_id: restaurantId }]).select();
            if (error) {
                console.error("Supabase insert error:", error);
                alert("Error creando mesa: " + error.message);
                throw error;
            }
            return data;
        } catch (err: any) {
            console.error("addTable threw:", err);
            alert("Exception creando mesa: " + err.message);
        }
    };

    const deleteTable = async (id: string) => {
        const { error } = await supabase.from('mesas').delete().eq('id', id);
        if (error) throw error;
    };

    return { tables, updateTableStatus, addTable, deleteTable };
}
