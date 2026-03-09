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
    options?: any;
    extras?: any;
    ingredients?: { name: string; quantity: number; unit: string; }[];
}

export function useProducts() {
    const [products, setProducts] = useState<Product[]>([]);
    const [categorias, setCategorias] = useState<Categoria[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [catRes, prodRes] = await Promise.all([
                supabase.from('categorias').select('*').order('order_index'),
                supabase.from('productos').select('*').order('created_at', { ascending: false })
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
        fetchData();

        // Optional realtime hook for products
        const channel = supabase
            .channel('public:productos')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'productos' }, () => {
                fetchData(); // Refresh all on any change
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, []);

    const addProduct = async (productData: Partial<Product>) => {
        const { data, error } = await supabase.from('productos').insert([productData]).select();
        if (error) {
            console.error("Error adding product:", error);
            throw error;
        }
        return data;
    };

    const updateProduct = async (id: string, productData: Partial<Product>) => {
        const { data, error } = await supabase.from('productos').update(productData).eq('id', id).select();
        if (error) {
            console.error("Error updating product:", error);
            throw error;
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
        const newOrder = categorias.length > 0 ? Math.max(...categorias.map(c => c.order_index)) + 1 : 1;
        const { data, error } = await supabase.from('categorias').insert([{ name, order_index: newOrder }]).select();
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
