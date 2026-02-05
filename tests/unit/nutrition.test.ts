import { describe, it, expect, beforeEach } from 'vitest'
import { renderHook } from '@testing-library/react'
import { useNutritionCalculator } from '@/hooks/useNutritionCalculator'
import { 
  TEST_PRODUCTS, 
  EXPECTED_NUTRITION,
  createTestIngredient,
  createTestProduct,
  EDGE_CASE_DATA 
} from '../utils/fixtures'

describe('useNutritionCalculator', () => {
  const products = Object.values(TEST_PRODUCTS)

  describe('UT-1: Basic nutrition calculation', () => {
    it('should calculate correct nutrition for single ingredient', () => {
      // Given: 100g chicken breast
      const ingredients = [
        createTestIngredient(TEST_PRODUCTS.CHICKEN_BREAST.id, {
          quantity: 100,
          unit: 'gramy',
          unit_weight: 100,
        })
      ]

      // When: Calculating nutrition
      const { result } = renderHook(() => useNutritionCalculator(ingredients, products))

      // Then: Should return chicken breast nutrition values
      expect(result.current.kcal).toBe(165)
      expect(result.current.białko).toBe(31.0)
      expect(result.current.tłuszcz).toBe(3.6)
      expect(result.current.węglowodany).toBe(0.0)
      expect(result.current.błonnik).toBe(0.0)
    })

    it('should calculate correct nutrition for multiple ingredients', () => {
      // Given: Complex meal - 200g chicken + 100g rice + 1 tbsp olive oil
      const ingredients = [
        createTestIngredient(TEST_PRODUCTS.CHICKEN_BREAST.id, {
          quantity: 200,
          unit: 'gramy',
          unit_weight: 100,
        }),
        createTestIngredient(TEST_PRODUCTS.BROWN_RICE.id, {
          quantity: 100,
          unit: 'gramy', 
          unit_weight: 100,
        }),
        createTestIngredient(TEST_PRODUCTS.OLIVE_OIL.id, {
          quantity: 1,
          unit: 'łyżka',
          unit_weight: 14,
        })
      ]

      // When: Calculating nutrition
      const { result } = renderHook(() => useNutritionCalculator(ingredients, products))

      // Then: Should return sum of all ingredients
      const expected = EXPECTED_NUTRITION.CHICKEN_RICE_MEAL
      expect(result.current.kcal).toBeCloseTo(expected.kcal, 0)
      expect(result.current.białko).toBeCloseTo(expected.białko, 1)
      expect(result.current.tłuszcz).toBeCloseTo(expected.tłuszcz, 1)
      expect(result.current.węglowodany).toBeCloseTo(expected.węglowodany, 1)
      expect(result.current.błonnik).toBeCloseTo(expected.błonnik, 1)
    })
  })

  describe('UT-2: Unit conversion accuracy', () => {
    it('should handle gram conversion correctly', () => {
      // Given: 150g chicken (1.5x base amount)
      const ingredients = [
        createTestIngredient(TEST_PRODUCTS.CHICKEN_BREAST.id, {
          quantity: 150,
          unit: 'gramy',
          unit_weight: 100,
        })
      ]

      // When: Calculating nutrition
      const { result } = renderHook(() => useNutritionCalculator(ingredients, products))

      // Then: Should scale nutrition by 1.5x
      expect(result.current.kcal).toBe(Math.round(165 * 1.5)) // 248
      expect(result.current.białko).toBe(Math.round(31.0 * 1.5 * 10) / 10) // 46.5
    })

    it('should handle piece-based conversion correctly', () => {
      // Given: 2 bananas
      const ingredients = [
        createTestIngredient(TEST_PRODUCTS.BANANA.id, {
          quantity: 2,
          unit: 'sztuki',
          unit_weight: 120, // each banana is 120g
        })
      ]

      // When: Calculating nutrition
      const { result } = renderHook(() => useNutritionCalculator(ingredients, products))

      // Then: Should calculate for 240g total (2 * 120g)
      const multiplier = (2 * 120) / 100 // 2.4
      expect(result.current.kcal).toBe(Math.round(89 * multiplier)) // 214
      expect(result.current.białko).toBe(Math.round(1.1 * multiplier * 10) / 10) // 2.6
    })

    it('should handle tablespoon conversion correctly', () => {
      // Given: 2 tablespoons olive oil
      const ingredients = [
        createTestIngredient(TEST_PRODUCTS.OLIVE_OIL.id, {
          quantity: 2,
          unit: 'łyżka',
          unit_weight: 14,
        })
      ]

      // When: Calculating nutrition
      const { result } = renderHook(() => useNutritionCalculator(ingredients, products))

      // Then: Should calculate for 28g total (2 * 14g)
      const multiplier = (2 * 14) / 100 // 0.28
      expect(result.current.kcal).toBe(Math.round(884 * multiplier)) // 247
      expect(result.current.tłuszcz).toBe(Math.round(100 * multiplier * 10) / 10) // 28.0
    })
  })

  describe('UT-4: Empty ingredients handling', () => {
    it('should return zeros for empty ingredients array', () => {
      // Given: No ingredients
      const ingredients: any[] = []

      // When: Calculating nutrition
      const { result } = renderHook(() => useNutritionCalculator(ingredients, products))

      // Then: Should return all zeros
      expect(result.current.kcal).toBe(0)
      expect(result.current.białko).toBe(0)
      expect(result.current.tłuszcz).toBe(0)
      expect(result.current.węglowodany).toBe(0)
      expect(result.current.błonnik).toBe(0)
    })

    it('should return zeros when products array is undefined', () => {
      // Given: Ingredients but no products
      const ingredients = [createTestIngredient()]

      // When: Calculating nutrition with undefined products
      const { result } = renderHook(() => useNutritionCalculator(ingredients, undefined))

      // Then: Should return all zeros
      expect(result.current.kcal).toBe(0)
      expect(result.current.białko).toBe(0)
      expect(result.current.tłuszcz).toBe(0)
      expect(result.current.węglowodany).toBe(0)
      expect(result.current.błonnik).toBe(0)
    })
  })

  describe('UT-5: Missing product data handling', () => {
    it('should skip missing products and continue with valid ones', () => {
      // Given: Mix of valid and invalid product IDs
      const ingredients = [
        createTestIngredient(TEST_PRODUCTS.CHICKEN_BREAST.id, {
          quantity: 100,
          unit: 'gramy',
          unit_weight: 100,
        }),
        createTestIngredient('non-existent-product-id', {
          quantity: 100,
          unit: 'gramy',
          unit_weight: 100,
        }),
        createTestIngredient(TEST_PRODUCTS.BROWN_RICE.id, {
          quantity: 100,
          unit: 'gramy',
          unit_weight: 100,
        })
      ]

      // When: Calculating nutrition
      const { result } = renderHook(() => useNutritionCalculator(ingredients, products))

      // Then: Should only include valid products (chicken + rice, skip missing)
      expect(result.current.kcal).toBe(165 + 363) // Only chicken + rice
      expect(result.current.białko).toBe(Math.round((31.0 + 7.2) * 10) / 10) // 38.2
    })
  })

  describe('Edge cases and boundary testing', () => {
    it('should handle zero nutritional values', () => {
      // Given: Product with zero nutrition (like water)
      const zeroNutritionProducts = [...products, EDGE_CASE_DATA.ZERO_NUTRITION]
      const ingredients = [
        createTestIngredient(EDGE_CASE_DATA.ZERO_NUTRITION.id, {
          quantity: 1000, // Large quantity
          unit: 'gramy',
          unit_weight: 100,
        })
      ]

      // When: Calculating nutrition
      const { result } = renderHook(() => useNutritionCalculator(ingredients, zeroNutritionProducts))

      // Then: Should return zeros without errors
      expect(result.current.kcal).toBe(0)
      expect(result.current.białko).toBe(0)
    })

    it('should handle extreme nutritional values', () => {
      // Given: Product with very high nutritional values
      const extremeProducts = [...products, EDGE_CASE_DATA.EXTREME_NUTRITION]
      const ingredients = [
        createTestIngredient(EDGE_CASE_DATA.EXTREME_NUTRITION.id, {
          quantity: 1, // Small quantity to avoid overflow
          unit: 'gramy',
          unit_weight: 100,
        })
      ]

      // When: Calculating nutrition
      const { result } = renderHook(() => useNutritionCalculator(ingredients, extremeProducts))

      // Then: Should handle large numbers without errors
      expect(result.current.kcal).toBe(100) // 9999 * (1/100) rounded
      expect(typeof result.current.białko).toBe('number')
      expect(result.current.białko).toBeGreaterThan(0)
    })

    it('should handle missing unit_weight gracefully', () => {
      // Given: Product without unit_weight
      const productWithoutWeight = createTestProduct({
        unit_weight: undefined as any,
        calories: 100,
        protein: 10,
      })
      const testProducts = [...products, productWithoutWeight]
      
      const ingredients = [
        createTestIngredient(productWithoutWeight.id, {
          quantity: 2,
          unit: 'sztuki',
          unit_weight: undefined as any, // Also missing from ingredient
        })
      ]

      // When: Calculating nutrition
      const { result } = renderHook(() => useNutritionCalculator(ingredients, testProducts))

      // Then: Should use default weight of 100g and not crash
      const expectedMultiplier = (2 * 100) / 100 // 2.0 (default weight = 100)
      expect(result.current.kcal).toBe(Math.round(100 * expectedMultiplier)) // 200
      expect(result.current.białko).toBe(Math.round(10 * expectedMultiplier * 10) / 10) // 20.0
    })
  })

  describe('Rounding precision', () => {
    it('should round calories to integers', () => {
      // Given: Ingredient that would result in fractional calories
      const ingredients = [
        createTestIngredient(TEST_PRODUCTS.CHICKEN_BREAST.id, {
          quantity: 33, // 33g = 0.33 multiplier
          unit: 'gramy',
          unit_weight: 100,
        })
      ]

      // When: Calculating nutrition
      const { result } = renderHook(() => useNutritionCalculator(ingredients, products))

      // Then: Calories should be rounded integer (165 * 0.33 = 54.45 → 54)
      expect(result.current.kcal).toBe(54)
      expect(Number.isInteger(result.current.kcal)).toBe(true)
    })

    it('should round macros to 1 decimal place', () => {
      // Given: Ingredient that would result in multiple decimal places
      const ingredients = [
        createTestIngredient(TEST_PRODUCTS.CHICKEN_BREAST.id, {
          quantity: 33, // Results in 0.33 multiplier
          unit: 'gramy',
          unit_weight: 100,
        })
      ]

      // When: Calculating nutrition
      const { result } = renderHook(() => useNutritionCalculator(ingredients, products))

      // Then: Macros should be rounded to 1 decimal place
      // 31.0 * 0.33 = 10.23 → 10.2
      expect(result.current.białko).toBe(10.2)
      expect(result.current.białko.toString().split('.')[1]?.length || 0).toBeLessThanOrEqual(1)
    })
  })
})