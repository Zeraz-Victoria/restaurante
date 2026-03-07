/**
 * Menu Engineering Algorithmic Service
 * 
 * Classifies restaurant menu items based on Popularity (Sales Volume) 
 * and Profitability (Margin = Sell Price - Recipe Cost).
 */

type ProductData = {
    id: string;
    name: string;
    price: number;
    salesVolume30Days: number;
    recipeCost: number; // Sum of all ingredients costs calculated from Recipes DB
};

export type MenuEngineeringResult = {
    id: string;
    name: string;
    salesVolume: number;
    margin: number;
    classification: 'Estrella' | 'Caballo de Batalla' | 'Rompecabezas' | 'Perro';
};

export function calculateMenuEngineering(products: ProductData[]): MenuEngineeringResult[] {
    if (products.length === 0) return [];

    // Calculate Averages to define thresholds
    const totalVolume = products.reduce((acc, p) => acc + p.salesVolume30Days, 0);
    const averageVolume = totalVolume / products.length;

    // We can also weight average margin by volume, but simple average is standard start
    const totalMargin = products.reduce((acc, p) => acc + (p.price - p.recipeCost), 0);
    const averageMargin = totalMargin / products.length;

    return products.map(p => {
        const margin = p.price - p.recipeCost;

        const isHighVolume = p.salesVolume30Days >= averageVolume;
        const isHighMargin = margin >= averageMargin;

        let classification: MenuEngineeringResult['classification'];

        if (isHighVolume && isHighMargin) {
            classification = 'Estrella'; // High Volume, High Margin
        } else if (isHighVolume && !isHighMargin) {
            classification = 'Caballo de Batalla'; // High Volume, Low Margin (Loss Leader/Staple)
        } else if (!isHighVolume && isHighMargin) {
            classification = 'Rompecabezas'; // Low Volume, High Margin (Needs pushing)
        } else {
            classification = 'Perro'; // Low Volume, Low Margin (Consider removing)
        }

        return {
            id: p.id,
            name: p.name,
            salesVolume: p.salesVolume30Days,
            margin,
            classification,
        };
    });
}
