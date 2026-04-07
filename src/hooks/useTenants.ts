import { useState, useEffect } from 'react';

const ADMIN_KEY = 'SUPER-ADMIN-360';

export interface Tenant {
    id: string;
    name: string;
    plan?: string;
    status: string;
    access_code: string;
    created_at?: string;
}

async function superAdminFetch(method: 'GET' | 'POST', body?: any): Promise<any> {
    const res = await fetch('/api/superadmin', {
        method,
        headers: {
            'Content-Type': 'application/json',
            'x-admin-key': ADMIN_KEY,
        },
        body: body ? JSON.stringify(body) : undefined,
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || 'Error desconocido');
    return json.data;
}

export function useTenants() {
    const [tenants, setTenants] = useState<Tenant[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchTenants = async () => {
        setLoading(true);
        try {
            const data = await superAdminFetch('GET');
            if (data) setTenants(data);
        } catch (error) {
            console.error('Error fetching restaurants:', error);
        }
        setLoading(false);
    };

    useEffect(() => {
        fetchTenants();
    }, []);

    const createTenant = async (tenantData: Omit<Tenant, 'id' | 'created_at'>) => {
        const { plan, ...safeData } = tenantData as any;
        const restaurant = await superAdminFetch('POST', { action: 'create', data: safeData });
        setTenants(prev => [restaurant, ...prev]);
        return restaurant;
    };

    const updateTenantStatus = async (id: string, status: string) => {
        await superAdminFetch('POST', { action: 'update', id, data: { status } });
        setTenants(prev => prev.map(t => t.id === id ? { ...t, status } : t));
    };

    const deleteTenant = async (id: string) => {
        await superAdminFetch('POST', { action: 'delete', id });
        setTenants(prev => prev.filter(t => t.id !== id));
    };

    const updateTenant = async (id: string, updates: Partial<Tenant>) => {
        const { plan, ...safeUpdates } = updates as any;
        await superAdminFetch('POST', { action: 'update', id, data: safeUpdates });
        setTenants(prev => prev.map(t => t.id === id ? { ...t, ...safeUpdates } : t));
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
