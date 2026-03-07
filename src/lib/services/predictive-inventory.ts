/**
 * Predictive Inventory Service
 * 
 * Calculates expected 'Burn Rate' of ingredients based on past sales,
 * cross-references with current stock, and generates exact purchase suggestions.
 */

type SalesData = {
    productId: string;
    dailySalesAvg: number; // Computed from last 30/60 days mapping Orders -> Order_Items -> Products
};

type RecipeMapping = {
    productId: string;
    ingredientId: string;
    quantityRequired: number; // e.g., 0.200 (200g of meat per burger)
};

type CurrentInventory = {
    ingredientId: string;
    name: string;
    unit: string;
    currentStock: number; // Current physical amount
};

export type PurchaseSuggestion = {
    ingredientId: string;
    name: string;
    suggestedOrderAmount: number; // Amount needed to buy
    unit: string;
    daysOfStockLeft: number;
};

export function calculatePredictiveInventory(
    daysToCover: number,
    sales: SalesData[],
    recipes: RecipeMapping[],
    inventory: CurrentInventory[]
): PurchaseSuggestion[] {

    // 1. Calculate Daily Burn Rate per Ingredient
    const dailyBurnRate = new Map<string, number>();

    sales.forEach(sd => {
        // Find all ingredients this product uses
        const productRecipes = recipes.filter(r => r.productId === sd.productId);

        productRecipes.forEach(r => {
            const currentBurn = dailyBurnRate.get(r.ingredientId) || 0;
            const burnFromThisProduct = r.quantityRequired * sd.dailySalesAvg;
            dailyBurnRate.set(r.ingredientId, currentBurn + burnFromThisProduct);
        });
    });

    // 2. Compare against Current Stock
    const suggestions: PurchaseSuggestion[] = [];

    inventory.forEach(inv => {
        const dailyBurn = dailyBurnRate.get(inv.ingredientId) || 0;

        // If we don't use this ingredient, skip.
        if (dailyBurn === 0) return;

        // How long till we run out?
        const daysOfStockLeft = inv.currentStock / dailyBurn;

        // How much do we need exactly to cover the 'daysToCover'?
        const totalRequiredStock = dailyBurn * daysToCover;
        const deficit = totalRequiredStock - inv.currentStock;

        if (deficit > 0) {
            suggestions.push({
                ingredientId: inv.ingredientId,
                name: inv.name,
                suggestedOrderAmount: Number(deficit.toFixed(2)), // Round to 2 decimals
                unit: inv.unit,
                daysOfStockLeft: Number(daysOfStockLeft.toFixed(1)),
            });
        }
    });

    return suggestions.sort((a, b) => a.daysOfStockLeft - b.daysOfStockLeft); // Sort by most urgent
}
