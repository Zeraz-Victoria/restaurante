import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase/client';

export interface Review {
    id: string;
    mesa_id: string;
    calificacion: number;
    comentario: string;
    created_at: string;
}

export function useReviews() {
    const [reviews, setReviews] = useState<Review[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const restaurantId = typeof window !== 'undefined' ? localStorage.getItem('restaurant_id') || 'default_tenant' : 'default_tenant';

        const fetchReviews = async () => {
            const { data, error } = await supabase
                .from('resenas')
                .select('*')
                .eq('restaurant_id', restaurantId)
                .order('created_at', { ascending: false });

            if (data) setReviews(data);
            if (error) console.log('Error fetching reviews:', error.message);
            setLoading(false);
        };

        fetchReviews();

        // Optional realtime hook
        const channelName = `resenas-realtime-${restaurantId}-${Math.random().toString(36).substring(7)}`;
        const subscription = supabase
            .channel(channelName)
            .on('postgres_changes', { 
                event: '*', 
                schema: 'public', 
                table: 'resenas',
                filter: `restaurant_id=eq.${restaurantId}`
            }, payload => {
                if (payload.eventType === 'INSERT') {
                    setReviews(prev => [payload.new as Review, ...prev]);
                } else if (payload.eventType === 'DELETE') {
                    setReviews(prev => prev.filter(r => r.id !== payload.old.id));
                }
            })
            .subscribe();

        return () => {
            supabase.removeChannel(subscription);
        };
    }, []);

    const addReview = async (mesa_id: string, calificacion: number, comentario: string) => {
        const restaurantId = typeof window !== 'undefined' ? localStorage.getItem('restaurant_id') || 'default_tenant' : 'default_tenant';
        // Optimistic
        const tempId = Date.now().toString();
        const newReview = { id: tempId, mesa_id, calificacion, comentario, created_at: new Date().toISOString() };
        setReviews(prev => [newReview, ...prev]);

        const { data, error } = await supabase
            .from('resenas')
            .insert([{ mesa_id, calificacion, comentario, restaurant_id: restaurantId }])
            .select()
            .single();

        if (error) {
            console.log('Error adding review:', error.message);
            // Revert on error
            setReviews(prev => prev.filter(r => r.id !== tempId));
            return { error };
        }

        // Replace optimistic ID with DB ID
        setReviews(prev => prev.map(r => r.id === tempId ? data : r));
        return { data };
    };

    const deleteReview = async (id: string) => {
        setReviews(prev => prev.filter(r => r.id !== id));
        const { error } = await supabase.from('resenas').delete().eq('id', id);
        if (error) console.log('Error deleting review:', error.message);
    };

    return { reviews, addReview, deleteReview, loading };
}
