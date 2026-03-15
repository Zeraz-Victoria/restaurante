import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase/client';

export interface Categoria {
    id: string;
    name: string;
    order_index: number;
}

export interface Product {
    id: string;
    name: string;
    description: string;
    price: number;
    cost: number;
    category_id: string;
    image_url: string;
    status: string;
    is_spicy: boolean;
    isPopular?: boolean;
    is_recommended?: boolean;
    discount_price?: number;
    sizes?: { name: string; price: number }[];
    options?: { name: string; choices: string[] }[];
    extras?: { name: string; price: number }[];
    ingredients?: { name: string; quantity: number; unit: string; }[];
}

export function useProducts() {
    const [products, setProducts] = useState<Product[]>([]);
    const [categorias, setCategorias] = useState<Categoria[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchData = async () => {
        setLoading(true);
        const restaurantId = typeof window !== 'undefined' ? localStorage.getItem('restaurant_id') || 'default_tenant' : 'default_tenant';
        try {
            const [catRes, prodRes] = await Promise.all([
                supabase.from('categorias').select('*').eq('restaurant_id', restaurantId).order('order_index'),
                supabase.from('productos').select('*').eq('restaurant_id', restaurantId).order('created_at', { ascending: false })
            ]);

            if (catRes.data) setCategorias(catRes.data);
            if (prodRes.data) setProducts(prodRes.data);
        } catch (error) {
            console.error("Error fetching menu data", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        const restaurantId = typeof window !== 'undefined' ? localStorage.getItem('restaurant_id') || 'default_tenant' : 'default_tenant';
        fetchData();

        // Optional realtime hook for products
        const channelName = `public:productos-${restaurantId}-${Math.random().toString(36).substring(7)}`;
        const channel = supabase
            .channel(channelName)
            .on('postgres_changes', { 
                event: '*', 
                schema: 'public', 
                table: 'productos',
                filter: `restaurant_id=eq.${restaurantId}`
            }, () => {
                fetchData(); // Refresh all on any change
            })
            .on('postgres_changes', { 
                event: '*', 
                schema: 'public', 
                table: 'categorias',
                filter: `restaurant_id=eq.${restaurantId}`
            }, () => {
                fetchData(); // Refresh all on any change
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, []);

    const addProduct = async (productData: Partial<Product>) => {
        const restaurantId = typeof window !== 'undefined' ? localStorage.getItem('restaurant_id') || 'default_tenant' : 'default_tenant';
        const { data, error } = await supabase.from('productos').insert([{ ...productData, restaurant_id: restaurantId }]).select();
        if (error) {
            console.warn("Error adding product, attempting fallback without new UI columns:", error);
            // Fallback for missing columns in Supabase
            const { is_recommended, discount_price, sizes, extras, ingredients, ...safeData } = productData as any;
            const { data: fallbackData, error: fallbackError } = await supabase.from('productos').insert([safeData]).select();
            if (fallbackError) {
                console.error("Fallback error adding product:", fallbackError);
                throw fallbackError;
            }
            return fallbackData;
        }
        return data;
    };

    const updateProduct = async (id: string, productData: Partial<Product>) => {
        const { data, error } = await supabase.from('productos').update(productData).eq('id', id).select();
        if (error) {
            console.warn("Error updating product, attempting fallback without new UI columns:", error);
             // Fallback for missing columns in Supabase
            const { is_recommended, discount_price, sizes, extras, ingredients, ...safeData } = productData as any;
            const { data: fallbackData, error: fallbackError } = await supabase.from('productos').update(safeData).eq('id', id).select();
            if (fallbackError) {
                console.error("Fallback error updating product:", fallbackError);
                throw fallbackError;
            }
            return fallbackData;
        }
        return data;
    };

    const deleteProduct = async (id: string) => {
        const { error } = await supabase.from('productos').delete().eq('id', id);
        if (error) {
            console.error("Error deleting product:", error);
            throw error;
        }
    };

    const addCategoria = async (name: string) => {
        const restaurantId = typeof window !== 'undefined' ? localStorage.getItem('restaurant_id') || 'default_tenant' : 'default_tenant';
        const newOrder = categorias.length > 0 ? Math.max(...categorias.map(c => c.order_index)) + 1 : 1;
        const { data, error } = await supabase.from('categorias').insert([{ name, order_index: newOrder, restaurant_id: restaurantId }]).select();
        if (error) throw error;
        return data;
    };

    const updateCategoria = async (id: string, name: string) => {
        const { data, error } = await supabase.from('categorias').update({ name }).eq('id', id).select();
        if (error) throw error;
        return data;
    };

    const deleteCategoria = async (id: string) => {
        const { error } = await supabase.from('categorias').delete().eq('id', id);
        if (error) throw error;
    };

    return {
        products, categorias, loading, refresh: fetchData,
        addProduct, updateProduct, deleteProduct,
        addCategoria, updateCategoria, deleteCategoria
    };
}
