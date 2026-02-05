import { useMemo } from 'react';
import { SelectedIngredient } from '@/components/IngredientSelector';
import { Product } from '@/utils/supabasePotrawy';

export interface NutritionValues {
  kcal: number;
  białko: number;
  tłuszcz: number;
  węglowodany: number;
  błonnik: number;
}

export const useNutritionCalculator = (
  selectedIngredients: SelectedIngredient[],
  products?: Product[]
): NutritionValues => {
  return useMemo(() => {
    if (!products || selectedIngredients.length === 0) {
      return {
        kcal: 0,
        białko: 0,
        tłuszcz: 0,
        węglowodany: 0,
        błonnik: 0
      };
    }

    let totalKcal = 0;
    let totalBialko = 0;
    let totalTluszcz = 0;
    let totalWeglowodany = 0;
    let totalBlonnik = 0;

    /**
     * Calculate ingredient weight in grams for nutritional calculations
     */
    function calculateIngredientGrams(ingredient: SelectedIngredient, product: Product): number {
      if (ingredient.unit === "gramy" || ingredient.unit === "g") {
        return ingredient.quantity;
      }
      
      if (ingredient.unit === "mililitry" || ingredient.unit === "ml") {
        // unit_weight = masa 100 ml produktu w gramach
        return (ingredient.quantity / 100) * (product.unit_weight || ingredient.unit_weight || 100);
      }
      
      // For other units (sztuka, łyżeczka, etc.) - convert using unit_weight
      return ingredient.quantity * (product.unit_weight || ingredient.unit_weight || 100);
    }

    selectedIngredients.forEach(ingredient => {
      const product = products.find(p => p.id === ingredient.productId);
      if (product) {
        const grams = calculateIngredientGrams(ingredient, product);
        const multiplier = grams / 100; // All nutrition values are per 100g

        totalKcal += (product.calories || 0) * multiplier;
        totalBialko += (product.protein || 0) * multiplier;
        totalTluszcz += (product.fat || 0) * multiplier;
        totalWeglowodany += (product.carbs || 0) * multiplier;
        totalBlonnik += (product.fiber || 0) * multiplier;
      }
    });

    return {
      kcal: Math.round(totalKcal),
      białko: Math.round(totalBialko * 10) / 10,
      tłuszcz: Math.round(totalTluszcz * 10) / 10,
      węglowodany: Math.round(totalWeglowodany * 10) / 10,
      błonnik: Math.round(totalBlonnik * 10) / 10
    };
  }, [selectedIngredients, products]);
};
