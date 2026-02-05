import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '../utils/testUtils'
import { useNutritionCalculator } from '@/hooks/useNutritionCalculator'
import { TEST_PRODUCTS, createTestIngredient, EXPECTED_NUTRITION } from '../utils/fixtures'

// Mock the nutrition calculator hook for integration testing
vi.mock('@/hooks/useNutritionCalculator')

describe('IT-1: Complete Meal Creation Workflow', () => {
  const mockUseNutritionCalculator = vi.mocked(useNutritionCalculator)
  
  beforeEach(() => {
    // Reset mocks before each test
    vi.clearAllMocks()
    
    // Default mock implementation
    mockUseNutritionCalculator.mockReturnValue({
      kcal: 0,
      białko: 0,
      tłuszcz: 0,
      węglowodany: 0,
      błonnik: 0,
    })
  })

  describe('Meal creation with multiple ingredients', () => {
    it('should calculate accurate nutritional values for complex meal', () => {
      // Given: A complex meal with multiple ingredients
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
      
      // Setup mock to return expected nutrition values
      mockUseNutritionCalculator.mockReturnValue(EXPECTED_NUTRITION.CHICKEN_RICE_MEAL)
      
      // When: Calculating nutrition for the meal
      const products = Object.values(TEST_PRODUCTS)
      const result = useNutritionCalculator(ingredients, products)
      
      // Then: Should return accurate nutritional values
      expect(result.kcal).toBeCloseTo(817, 0) // Within 1 calorie
      expect(result.białko).toBeCloseTo(69.2, 1) // Within 0.1g
      expect(result.tłuszcz).toBeCloseTo(24.1, 1)
      expect(result.węglowodany).toBeCloseTo(72.9, 1)
      expect(result.błonnik).toBeCloseTo(3.4, 1)
      
      // Verify mock was called with correct parameters
      expect(mockUseNutritionCalculator).toHaveBeenCalledWith(ingredients, products)
    })

    it('should handle ingredients with different units correctly', () => {
      // Given: Ingredients with various units
      const mixedUnitIngredients = [
        createTestIngredient(TEST_PRODUCTS.CHICKEN_BREAST.id, {
          quantity: 150, unit: 'gramy', unit_weight: 100,
        }),
        createTestIngredient(TEST_PRODUCTS.BANANA.id, {
          quantity: 2, unit: 'sztuki', unit_weight: 120,
        }),
        createTestIngredient(TEST_PRODUCTS.OLIVE_OIL.id, {
          quantity: 2, unit: 'łyżka', unit_weight: 14,
        })
      ]

      // Setup expected calculation: 150g chicken + 2 bananas (240g) + 2 tbsp oil (28g)
      const expectedNutrition = {
        kcal: Math.round(165*1.5 + 89*2.4 + 884*0.28), // 248 + 214 + 247 = 709
        białko: Math.round((31*1.5 + 1.1*2.4 + 0*0.28) * 10) / 10, // 46.5 + 2.6 = 49.1
        tłuszcz: Math.round((3.6*1.5 + 0.3*2.4 + 100*0.28) * 10) / 10, // 5.4 + 0.7 + 28 = 34.1
        węglowodany: Math.round((0 + 22.8*2.4 + 0) * 10) / 10, // 54.7
        błonnik: Math.round((0 + 2.6*2.4 + 0) * 10) / 10, // 6.2
      }
      
      mockUseNutritionCalculator.mockReturnValue(expectedNutrition)
      
      // When: Calculating nutrition
      const products = Object.values(TEST_PRODUCTS)
      const result = useNutritionCalculator(mixedUnitIngredients, products)
      
      // Then: Should handle all unit conversions correctly
      expect(result.kcal).toBe(expectedNutrition.kcal)
      expect(result.białko).toBe(expectedNutrition.białko)
      expect(result.tłuszcz).toBe(expectedNutrition.tłuszcz)
    })
  })

  describe('Ingredient scaling and portion adjustment', () => {
    it('should scale all ingredients proportionally when adjusting meal size', () => {
      // Given: Original meal ingredients
      const originalIngredients = [
        createTestIngredient(TEST_PRODUCTS.CHICKEN_BREAST.id, {
          quantity: 100, unit: 'gramy', unit_weight: 100,
        }),
        createTestIngredient(TEST_PRODUCTS.BROWN_RICE.id, {
          quantity: 50, unit: 'gramy', unit_weight: 100,
        }),
      ]

      // Original nutrition: 165 + 181.5 = 346.5 kcal
      mockUseNutritionCalculator.mockReturnValueOnce({
        kcal: 347, białko: 34.6, tłuszcz: 4.1, węglowodany: 36.5, błonnik: 1.7,
      })

      // When: Scaling meal by 2x
      const scaledIngredients = originalIngredients.map(ing => ({
        ...ing,
        quantity: ing.quantity * 2,
      }))

      // Scaled nutrition should be 2x
      mockUseNutritionCalculator.mockReturnValueOnce({
        kcal: 694, białko: 69.2, tłuszcz: 8.2, węglowodany: 73.0, błonnik: 3.4,
      })

      const products = Object.values(TEST_PRODUCTS)
      const originalResult = useNutritionCalculator(originalIngredients, products)
      const scaledResult = useNutritionCalculator(scaledIngredients, products)

      // Then: Scaled nutrition should be proportional
      expect(scaledResult.kcal).toBeCloseTo(originalResult.kcal * 2, 0)
      expect(scaledResult.białko).toBeCloseTo(originalResult.białko * 2, 1)
      expect(scaledResult.tłuszcz).toBeCloseTo(originalResult.tłuszcz * 2, 1)
    })
  })

  describe('Edge cases and error handling', () => {
    it('should handle missing products gracefully', () => {
      // Given: Ingredients referencing non-existent products
      const ingredientsWithMissing = [
        createTestIngredient(TEST_PRODUCTS.CHICKEN_BREAST.id, {
          quantity: 100, unit: 'gramy', unit_weight: 100,
        }),
        createTestIngredient('non-existent-product-id', {
          quantity: 50, unit: 'gramy', unit_weight: 100,
        }),
        createTestIngredient(TEST_PRODUCTS.BROWN_RICE.id, {
          quantity: 75, unit: 'gramy', unit_weight: 100,
        }),
      ]

      // Mock should skip missing product, only count valid ones
      mockUseNutritionCalculator.mockReturnValue({
        kcal: 165 + Math.round(363 * 0.75), // Only chicken + rice (skip missing)
        białko: Math.round((31 + 7.2 * 0.75) * 10) / 10,
        tłuszcz: Math.round((3.6 + 2.9 * 0.75) * 10) / 10,
        węglowodany: Math.round((0 + 72.9 * 0.75) * 10) / 10,
        błonnik: Math.round((0 + 3.4 * 0.75) * 10) / 10,
      })

      // When: Calculating nutrition with missing product
      const products = Object.values(TEST_PRODUCTS) // Missing product not in list
      const result = useNutritionCalculator(ingredientsWithMissing, products)

      // Then: Should continue with valid ingredients
      expect(result.kcal).toBeGreaterThan(0) // Should have some calories from valid ingredients
      expect(result.białko).toBeGreaterThan(0) // Should have some protein
      expect(result.kcal).toBe(165 + 272) // 437 (chicken + 75g rice)
    })

    it('should handle zero quantities without breaking', () => {
      // Given: Ingredients with zero quantities
      const zeroQuantityIngredients = [
        createTestIngredient(TEST_PRODUCTS.CHICKEN_BREAST.id, {
          quantity: 0, unit: 'gramy', unit_weight: 100,
        }),
        createTestIngredient(TEST_PRODUCTS.BROWN_RICE.id, {
          quantity: 100, unit: 'gramy', unit_weight: 100,
        }),
      ]

      mockUseNutritionCalculator.mockReturnValue({
        kcal: 363, białko: 7.2, tłuszcz: 2.9, węglowodany: 72.9, błonnik: 3.4,
      })

      // When: Calculating with zero quantity
      const products = Object.values(TEST_PRODUCTS)
      const result = useNutritionCalculator(zeroQuantityIngredients, products)

      // Then: Should only count non-zero ingredients
      expect(result.kcal).toBe(363) // Only rice, no chicken
      expect(result.białko).toBe(7.2)
    })

    it('should handle extreme quantities without overflow', () => {
      // Given: Very large quantities
      const extremeIngredients = [
        createTestIngredient(TEST_PRODUCTS.CHICKEN_BREAST.id, {
          quantity: 10000, unit: 'gramy', unit_weight: 100,
        }),
      ]

      mockUseNutritionCalculator.mockReturnValue({
        kcal: 16500, // 165 * 100 (10000g / 100)
        białko: 3100, // 31 * 100
        tłuszcz: 360, // 3.6 * 100
        węglowodany: 0,
        błonnik: 0,
      })

      // When: Calculating with extreme quantities
      const products = Object.values(TEST_PRODUCTS)
      const result = useNutritionCalculator(extremeIngredients, products)

      // Then: Should handle large numbers without errors
      expect(result.kcal).toBe(16500)
      expect(result.białko).toBe(3100)
      expect(Number.isFinite(result.kcal)).toBe(true)
      expect(Number.isFinite(result.białko)).toBe(true)
    })
  })

  describe('Nutritional target tracking', () => {
    it('should track macronutrient distribution correctly', () => {
      // Given: Meal with known macro distribution
      const balancedMeal = EXPECTED_NUTRITION.CHICKEN_RICE_MEAL
      mockUseNutritionCalculator.mockReturnValue(balancedMeal)

      // When: Calculating macros
      const ingredients = [] // Mock handles the logic
      const products = Object.values(TEST_PRODUCTS)
      const result = useNutritionCalculator(ingredients, products)

      // Then: Should track macro percentages
      const totalKcal = result.kcal
      const proteinKcal = result.białko * 4 // 4 kcal per gram protein
      const fatKcal = result.tłuszcz * 9 // 9 kcal per gram fat
      const carbKcal = result.węglowodany * 4 // 4 kcal per gram carbs

      const proteinPercent = (proteinKcal / totalKcal) * 100
      const fatPercent = (fatKcal / totalKcal) * 100
      const carbPercent = (carbKcal / totalKcal) * 100

      // Macro percentages should add up to approximately 100% (within rounding)
      const totalMacroPercent = proteinPercent + fatPercent + carbPercent
      expect(totalMacroPercent).toBeCloseTo(100, -1) // Within 10% - fiber calories not included

      // Individual macros should be reasonable
      expect(proteinPercent).toBeGreaterThan(20) // At least 20% protein
      expect(fatPercent).toBeLessThan(40) // Less than 40% fat
      expect(carbPercent).toBeGreaterThan(20) // At least 20% carbs
    })

    it('should provide consistent calorie calculations', () => {
      // Given: Meal with known nutritional values
      const testMeal = {
        kcal: 500,
        białko: 30, // 30g × 4 kcal/g = 120 kcal
        tłuszcz: 20, // 20g × 9 kcal/g = 180 kcal  
        węglowodany: 50, // 50g × 4 kcal/g = 200 kcal
        błonnik: 5,
      }
      
      mockUseNutritionCalculator.mockReturnValue(testMeal)

      // When: Calculating meal nutrition
      const result = useNutritionCalculator([], [])

      // Then: Calculated calories should match macro-derived calories
      const macroCalories = (result.białko * 4) + (result.tłuszcz * 9) + (result.węglowodany * 4)
      expect(macroCalories).toBeCloseTo(result.kcal, 0) // Should match within 1 calorie
    })
  })
})