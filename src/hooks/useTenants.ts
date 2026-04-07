import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase/client';

export interface Tenant {
    id: string;
    name: string;
    plan: 'Basic' | 'Pro' | 'Premium';
    status: 'Active' | 'Suspended';
    access_code: string;
    created_at?: string;
}

export function useTenants() {
    const [tenants, setTenants] = useState<Tenant[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchTenants = async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from('restaurantes')
            .select('*')
            .order('created_at', { ascending: false });

        if (data) setTenants(data);
        if (error) console.error('Error fetching restaurants:', error);
        setLoading(false);
    };

    useEffect(() => {
        fetchTenants();
    }, []);

    const createTenant = async (tenantData: Omit<Tenant, 'id' | 'created_at'>) => {
        const payload = { ...tenantData };
        delete (payload as any).plan; // Hack: remove plan temporarily since it's not in Prisma schema
        const { data, error } = await supabase
            .from('restaurantes')
            .insert([payload])
            .select();

        if (error) {
            console.error('Error creating restaurant:', error);
            throw error;
        }
        if (data) setTenants(prev => [data[0], ...prev]);
        return data?.[0];
    };

    const updateTenantStatus = async (id: string, status: 'Active' | 'Suspended') => {
        const { error } = await supabase
            .from('restaurantes')
            .update({ status })
            .eq('id', id);

        if (error) {
            console.error('Error updating restaurant status:', error);
            throw error;
        }
        setTenants(prev => prev.map(t => t.id === id ? { ...t, status } : t));
    };

    const deleteTenant = async (id: string) => {
        const { error } = await supabase
            .from('restaurantes')
            .delete()
            .eq('id', id);

        if (error) {
            console.error('Error deleting restaurant:', error);
            throw error;
        }
        setTenants(prev => prev.filter(t => t.id !== id));
    };

    const updateTenant = async (id: string, updates: Partial<Tenant>) => {
        const payload = { ...updates };
        delete (payload as any).plan; // Hack: remove plan
        const { data, error } = await supabase
            .from('restaurantes')
            .update(payload)
            .eq('id', id)
            .select();

        if (error) {
            console.error('Error updating restaurant:', error);
            throw error;
        }
        if (data) setTenants(prev => prev.map(t => t.id === id ? { ...t, ...updates } : t));
        return data?.[0];
    };

    return {
        tenants,
        loading,
        createTenant,
        updateTenant,
        updateTenantStatus,
        deleteTenant,
        refresh: fetchTenants
    };
}
