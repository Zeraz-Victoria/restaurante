import { useEffect, useState, useMemo } from 'react';
import { supabase } from '@/lib/supabase/client';
import { Product } from './useProducts';

export interface AnalyticsData {
    estrellas: Product[];
    vacas: Product[];
    perros: Product[];
    incognitas: Product[];
    resurtido: any[];
}

export function useAnalytics(products: Product[]) {
    const [allOrders, setAllOrders] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchHistoricalOrders = async () => {
            // Fetch all orders from the current month for analytics
            const { data, error } = await supabase
                .from('ordenes')
                .select('items, created_at');

            if (data) setAllOrders(data);
            if (error) console.log("Error fetch all orders for analytics:", error.message);
            setLoading(false);
        };

        fetchHistoricalOrders();

        // Optional: Realtime subscription for analytics (might be overkill, but good for demo)
        const sub = supabase.channel('analytics-realtime')
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'ordenes' }, payload => {
                setAllOrders(prev => [...prev, payload.new]);
            }).subscribe();

        return () => {
            supabase.removeChannel(sub);
        };
    }, []);

    const analytics = useMemo(() => {
        if (!products.length) return { estrellas: [], vacas: [], perros: [], incognitas: [], resurtido: [] };

        // 1. Calculate Volume per Product
        const volumeMap: Record<string, number> = {};

        allOrders.forEach(order => {
            // Depending heavily on how items are stored. 
            // If they are stored as JSON strings or arrays of objects.
            let itemsToParse = order.items;
            if (typeof itemsToParse === 'string') {
                try { itemsToParse = JSON.parse(itemsToParse); } catch (e) { itemsToParse = []; }
            }
            if (Array.isArray(itemsToParse)) {
                itemsToParse.forEach((item: any) => {
                    const pid = item.productId || products.find(p => p.name === item.name)?.id;
                    if (pid) {
                        volumeMap[pid] = (volumeMap[pid] || 0) + (item.quantity || 1);
                    }
                });
            }
        });

        // 2. Compute Margins and calculate Medians
        let totalVolume = 0;
        let totalMargin = 0;
        let activeProductsCount = 0;

        const productStats = products.map(p => {
            const vol = volumeMap[p.id] || 0;
            const price = p.price || 1;
            const cost = p.cost || 0; // Default to 0 if no cost is set
            const margin = (price - cost) / price;

            if (vol > 0) {
                totalVolume += vol;
                totalMargin += margin;
                activeProductsCount++;
            }

            return { ...p, volume: vol, margin };
        });

        // Thresholds based on active products, or fallback to fixed thresholds if not enough data
        const medianVolume = activeProductsCount > 0 ? (totalVolume / activeProductsCount) : 1;
        const medianMargin = activeProductsCount > 0 ? (totalMargin / activeProductsCount) : 0.5; // 50% margin baseline

        // 3. Classify (BCG Matrix)
        const estrellas: Product[] = [];
        const vacas: Product[] = [];
        const perros: Product[] = [];
        const incognitas: Product[] = [];

        productStats.forEach(p => {
            // Note: If volume is 0, they usually fall into perros or incognitas
            if (p.volume >= medianVolume && p.margin >= medianMargin) estrellas.push(p);
            else if (p.volume >= medianVolume && p.margin < medianMargin) vacas.push(p);
            else if (p.volume < medianVolume && p.margin >= medianMargin) incognitas.push(p);
            else perros.push(p);
        });

        // 4. Fake AI Restock logic purely based on volume map
        // Find top selling products and suggest ingredients
        const sortedByVolume = [...productStats].sort((a, b) => b.volume - a.volume);
        const topSellers = sortedByVolume.slice(0, 3).filter(p => p.volume > 0);

        const resurtido = topSellers.map(p => {
            // Heuristic matching for demo
            let ing = "Ingredientes para " + p.name;
            let qty = (p.volume * 2) + " Unidades";
            let state = "red"; // high turnover

            if (p.name.toLowerCase().includes('taco') || p.name.toLowerCase().includes('pastor')) {
                ing = "Carne al Pastor / Tortillas"; qty = "15 Kg";
            } else if (p.name.toLowerCase().includes('hamburguesa')) {
                ing = "Carne de Res / Pan Brioche"; qty = "20 Paquetes";
            } else if (p.name.toLowerCase().includes('agua') || p.name.toLowerCase().includes('refresco')) {
                ing = "Bebidas / Hielo"; qty = "10 Cajas"; state = "yellow";
            }

            return { productId: p.id, name: ing, reason: `Alta rotación por ventas de "${p.name}" (${p.volume} vendidos).`, suggestion: qty, severity: state };
        });

        // If no sales at all yet, show some placeholders so the UI isn't broken
        if (resurtido.length === 0) {
            resurtido.push({ productId: "fallback-1", name: "Carne Premium", reason: "Stock preventivo de fin de semana.", suggestion: "10 Kg", severity: "yellow" });
            resurtido.push({ productId: "fallback-2", name: "Cebolla y Cilantro", reason: "Uso constante en la mayoría de platillos.", suggestion: "5 Manojo", severity: "green" });
        }

        // Sort STARS primarily by volume to show the best of the best
        estrellas.sort((a, b) => (volumeMap[b.id] || 0) - (volumeMap[a.id] || 0));
        vacas.sort((a, b) => (volumeMap[b.id] || 0) - (volumeMap[a.id] || 0));

        return { estrellas, vacas, perros, incognitas, resurtido };

    }, [products, allOrders]);

    return { ...analytics, loading };
}
