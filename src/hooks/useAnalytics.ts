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

export function useAnalytics(products: Product[], interval: string = 'semanal') {
    const [allOrders, setAllOrders] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchHistoricalOrders = async () => {
            // Determine the start date string based on interval
            const now = new Date();
            let daysToSubtract = 7; // default semanal
            if (interval === 'diario') daysToSubtract = 1; /* Note: 1 day here means last 24h, or 'today' equivalent. Below we can constrain more exactly if needed. */
            else if (interval === 'quincenal') daysToSubtract = 15;
            else if (interval === 'mensual') daysToSubtract = 30;

            now.setDate(now.getDate() - daysToSubtract);
            const startDateStr = now.toISOString();

            // Fetch orders matching the timeframe
            const { data, error } = await supabase
                .from('ordenes')
                .select('items, created_at')
                .gte('created_at', startDateStr);

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

        // 4. Exact AI Restock Logic based on ingredient mappings and volume
        type AggregationMap = Record<string, { unit: string; totalQuantity: number; itemNames: Set<string>; isCritial: boolean }>;
        const totalIngredientsNeeded: AggregationMap = {};

        let hasNoRecipeConfigData = true;

        productStats.forEach(p => {
            if (p.volume > 0 && p.ingredients && p.ingredients.length > 0) {
                hasNoRecipeConfigData = false;
                p.ingredients.forEach(ing => {
                    const key = `${ing.name.toLowerCase().trim()}_${ing.unit.toLowerCase().trim()}`;
                    if (!totalIngredientsNeeded[key]) {
                        totalIngredientsNeeded[key] = { unit: ing.unit, totalQuantity: 0, itemNames: new Set(), isCritial: false };
                    }
                    totalIngredientsNeeded[key].totalQuantity += (ing.quantity * p.volume);
                    totalIngredientsNeeded[key].itemNames.add(p.name);

                    // simple heuristic: if top sellers rely on this, mark critical
                    if (p.volume >= medianVolume) {
                        totalIngredientsNeeded[key].isCritial = true;
                    }
                });
            }
        });

        const resurtido: any[] = [];

        if (!hasNoRecipeConfigData) {
            Object.values(totalIngredientsNeeded).forEach(ing => {
                // Get arbitrary name from one of the keys or format nicely
                const nameParts = Array.from(ing.itemNames);
                const nameDesc = nameParts.length > 2 ? `${nameParts[0]}, ${nameParts[1]} y más` : nameParts.join(' y ');

                resurtido.push({
                    productId: Math.random().toString(), // fake id 
                    name: "Ingredientes para " + nameDesc,
                    reason: `Basado en ${ing.itemNames.size} producto(s) vendido(s) con este insumo.`,
                    suggestion: `${ing.totalQuantity.toLocaleString()} ${ing.unit}`,
                    severity: ing.isCritial ? 'red' : 'yellow'
                });
            });
            // Sort by quantity desc to mimic priority
            resurtido.sort((a, b) => parseFloat(b.suggestion) - parseFloat(a.suggestion));
        } else {
            // Fallback if NO products have ingredients configured yet
            const sortedByVolume = [...productStats].sort((a, b) => b.volume - a.volume);
            const topSellers = sortedByVolume.slice(0, 3).filter(p => p.volume > 0);

            topSellers.forEach(p => {
                let ing = "Ingredientes genéricos para " + p.name;
                let qty = (p.volume * 2) + " Unidades";
                let state = "red";

                if (p.name.toLowerCase().includes('taco') || p.name.toLowerCase().includes('pastor')) {
                    ing = "Carne al Pastor / Tortillas"; qty = "15 Kg";
                } else if (p.name.toLowerCase().includes('hamburguesa')) {
                    ing = "Carne de Res / Pan Brioche"; qty = "20 Paquetes";
                } else if (p.name.toLowerCase().includes('agua') || p.name.toLowerCase().includes('refresco')) {
                    ing = "Bebidas / Hielo"; qty = "10 Cajas"; state = "yellow";
                }
                resurtido.push({ productId: p.id, name: ing, reason: `Configura la receta de este platillo para más precisión.`, suggestion: qty, severity: state });
            });

            // If no sales at all yet
            if (resurtido.length === 0) {
                resurtido.push({ productId: "fallback-1", name: "Insumos Varios", reason: "Falta configuración de recetas y de ventas.", suggestion: "0", severity: "green" });
            }
        }

        // Sort STARS primarily by volume to show the best of the best
        estrellas.sort((a, b) => (volumeMap[b.id] || 0) - (volumeMap[a.id] || 0));
        vacas.sort((a, b) => (volumeMap[b.id] || 0) - (volumeMap[a.id] || 0));

        return { estrellas, vacas, perros, incognitas, resurtido };

    }, [products, allOrders]);

    return { ...analytics, loading };
}
