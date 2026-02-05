/**
 * Unit tests for precise calculations utility
 *
 * Tests Issue #2: Błędne przeskalowania składników
 * - Precision loss in Number().toFixed() combinations
 * - Polish locale number formatting (comma vs dot)
 * - Input validation edge cases
 * - Precise arithmetic operations
 */

import { describe, it, expect } from 'vitest'
import {
  toDecimal,
  preciseMultiply,
  preciseDivide,
  preciseAdd,
  calculateNutritionMacros,
  scaleIngredientsByRatio,
  parsePolishNumberSafe,
  validateQuantityInput,
  formatPolishNumber
} from '@/utils/preciseCalculations'

describe('preciseCalculations utility', () => {
  describe('PC-1: Decimal conversion and validation', () => {
    it('should handle Polish comma format correctly', () => {
      expect(toDecimal('15,5').toString()).toBe('15.5')
      expect(toDecimal('140,9').toString()).toBe('140.9')
      expect(toDecimal('0,1').toString()).toBe('0.1')
    })

    it('should handle dot format correctly', () => {
      expect(toDecimal('15.5').toString()).toBe('15.5')
      expect(toDecimal('140.9').toString()).toBe('140.9')
      expect(toDecimal('0.1').toString()).toBe('0.1')
    })

    it('should handle edge cases safely', () => {
      expect(toDecimal(null).toString()).toBe('0')
      expect(toDecimal(undefined).toString()).toBe('0')
      expect(toDecimal('').toString()).toBe('0')
      expect(toDecimal('invalid').toString()).toBe('0')
      expect(toDecimal(NaN).toString()).toBe('0')
      expect(toDecimal(Infinity).toString()).toBe('0')
    })

    it('should handle number inputs correctly', () => {
      expect(toDecimal(15.5).toString()).toBe('15.5')
      expect(toDecimal(140.9).toString()).toBe('140.9')
      expect(toDecimal(0).toString()).toBe('0')
    })
  })

  describe('PC-2: Precise arithmetic operations', () => {
    it('should perform precise multiplication', () => {
      // Issue #2 cases: 150g → 15g bug
      expect(preciseMultiply(150, 1)).toBe(150.0)
      expect(preciseMultiply(150, 0.1)).toBe(15.0)
      expect(preciseMultiply('150', '0,1')).toBe(15.0)

      // Issue #2 cases: 140g → 139,9g bug
      expect(preciseMultiply(140, 1)).toBe(140.0)
      expect(preciseMultiply('140,0', '1,0')).toBe(140.0)

      // Floating point precision issues
      expect(preciseMultiply(0.1, 0.2)).toBe(0.0) // 0.1 * 0.2 = 0.02 → rounds to 0.0
      expect(preciseMultiply(0.1, 3)).toBe(0.3) // 0.1 * 3 = 0.3 (exact)
    })

    it('should perform precise division', () => {
      expect(preciseDivide(150, 10)).toBe(15.0)
      expect(preciseDivide('150', '10')).toBe(15.0)
      expect(preciseDivide('150,0', '10,0')).toBe(15.0)

      // Edge case: division by zero
      expect(preciseDivide(150, 0)).toBe(0)
      expect(preciseDivide(150, '')).toBe(0)
      expect(preciseDivide(150, null)).toBe(0)
    })

    it('should perform precise addition', () => {
      expect(preciseAdd(0.1, 0.2)).toBe(0.3) // Classic JS precision issue
      expect(preciseAdd('15,5', '24,5')).toBe(40.0)
      expect(preciseAdd(140.9, 0.1)).toBe(141.0)
    })

    it('should handle precision with multiple decimal places', () => {
      expect(preciseMultiply(123.456, 2.789, 2)).toBe(344.32) // 123.456 * 2.789 = 344.316984 → 344.32
      expect(preciseDivide(1000, 3, 2)).toBe(333.33)
      expect(preciseAdd(99.99, 0.01, 2)).toBe(100.00)
    })
  })

  describe('PC-3: Polish number parsing and validation', () => {
    it('should parse Polish numbers safely', () => {
      expect(parsePolishNumberSafe('15,5')).toBe(15.5)
      expect(parsePolishNumberSafe('140,9')).toBe(140.9)
      expect(parsePolishNumberSafe('0,1')).toBe(0.1)
      expect(parsePolishNumberSafe('1000,0')).toBe(1000.0)
    })

    it('should handle edge cases with default values', () => {
      expect(parsePolishNumberSafe('', 5)).toBe(5)
      expect(parsePolishNumberSafe(null, 10)).toBe(10)
      expect(parsePolishNumberSafe(undefined, 0)).toBe(0)
      expect(parsePolishNumberSafe('invalid', 1)).toBe(1)
    })

    it('should reject invalid formats', () => {
      expect(parsePolishNumberSafe('15,5,5')).toBe(0) // Multiple commas
      expect(parsePolishNumberSafe('15.5.5')).toBe(0) // Multiple dots
      expect(parsePolishNumberSafe('abc')).toBe(0) // Non-numeric
      expect(parsePolishNumberSafe('15a5')).toBe(0) // Mixed characters
    })

    it('should validate quantity input ranges', () => {
      const result1 = validateQuantityInput('15,5')
      expect(result1.isValid).toBe(true)
      expect(result1.value).toBe(15.5)

      const result2 = validateQuantityInput('0,05')
      expect(result2.isValid).toBe(false)
      expect(result2.value).toBe(0.1) // Min value
      expect(result2.error).toContain('większa niż 0.1')

      const result3 = validateQuantityInput('10000')
      expect(result3.isValid).toBe(false)
      expect(result3.value).toBe(9999) // Max value
      expect(result3.error).toContain('nie może być większa niż 9999')
    })
  })

  describe('PC-4: Nutrition macro calculations', () => {
    it('should calculate nutrition with precise arithmetic', () => {
      const nutritionPer100g = {
        calories: 165,
        protein: 31.0,
        carbs: 0.0,
        fat: 3.6,
        fiber: 0.0
      }

      // Test case: 1.5 units of chicken breast (unitWeight = 100g each)
      // This represents 1.5 * 100g = 150g total
      const result = calculateNutritionMacros(1.5, nutritionPer100g, 100)

      expect(result.calories).toBe(247.5) // 165 * 1.5
      expect(result.protein).toBe(46.5) // 31.0 * 1.5
      expect(result.carbs).toBe(0.0)
      expect(result.fat).toBe(5.4) // 3.6 * 1.5
      expect(result.fiber).toBe(0.0)
    })

    it('should handle different unit weights correctly', () => {
      const nutritionPer100g = {
        calories: 89,
        protein: 1.1,
        carbs: 22.8,
        fat: 0.3,
        fiber: 2.6
      }

      // Test case: 2 bananas (unit_weight = 120g each)
      const result = calculateNutritionMacros(2, nutritionPer100g, 120)

      // 2 * 120g = 240g total = 2.4 multiplier
      expect(result.calories).toBe(213.6) // 89 * 2.4
      expect(result.protein).toBe(2.6) // 1.1 * 2.4
      expect(result.carbs).toBe(54.7) // 22.8 * 2.4
    })

    it('should handle edge cases in nutrition calculation', () => {
      // Zero nutrition values
      const result1 = calculateNutritionMacros(100, {
        calories: 0,
        protein: 0,
        carbs: 0,
        fat: 0,
        fiber: 0
      }, 100)

      expect(result1.calories).toBe(0)
      expect(result1.protein).toBe(0)

      // Undefined nutrition values
      const result2 = calculateNutritionMacros(100, {}, 100)

      expect(result2.calories).toBe(0)
      expect(result2.protein).toBe(0)
    })
  })

  describe('PC-5: Ingredient scaling operations', () => {
    interface TestIngredient {
      id: string
      quantity: number
      name?: string
    }

    it('should scale ingredients by ratio precisely', () => {
      const ingredients: TestIngredient[] = [
        { id: '1', quantity: 150 },
        { id: '2', quantity: 100 },
        { id: '3', quantity: 75.5 }
      ]

      // Scale from current 500 to target 750 (1.5x ratio)
      const scaled = scaleIngredientsByRatio(ingredients, 750, 500)

      expect(scaled[0].quantity).toBe(225.0) // 150 * 1.5
      expect(scaled[1].quantity).toBe(150.0) // 100 * 1.5
      expect(scaled[2].quantity).toBe(113.3) // 75.5 * 1.5 rounded to 1 decimal
    })

    it('should handle edge cases in scaling', () => {
      const ingredients: TestIngredient[] = [
        { id: '1', quantity: 100 }
      ]

      // Zero current value
      const scaled1 = scaleIngredientsByRatio(ingredients, 200, 0)
      expect(scaled1[0].quantity).toBe(100) // No change

      // Zero target value
      const scaled2 = scaleIngredientsByRatio(ingredients, 0, 200)
      expect(scaled2[0].quantity).toBe(100) // No change

      // Same target and current
      const scaled3 = scaleIngredientsByRatio(ingredients, 200, 200)
      expect(scaled3[0].quantity).toBe(100.0) // 1.0 ratio
    })

    it('should preserve non-quantity properties during scaling', () => {
      const ingredients = [
        { id: 'test-1', quantity: 100, name: 'Test Ingredient', extraProp: 'preserved' }
      ]

      const scaled = scaleIngredientsByRatio(ingredients, 150, 100) // 1.5x

      expect(scaled[0].id).toBe('test-1')
      expect(scaled[0].name).toBe('Test Ingredient')
      expect((scaled[0] as any).extraProp).toBe('preserved')
      expect(scaled[0].quantity).toBe(150.0)
    })
  })

  describe('PC-6: Polish formatting output', () => {
    it('should format numbers with Polish locale', () => {
      expect(formatPolishNumber(15.5)).toBe('15,5')
      expect(formatPolishNumber(140.9)).toBe('140,9')
      expect(formatPolishNumber(1000.0)).toBe('1000') // No decimals for whole numbers
      expect(formatPolishNumber(1000.5)).toBe('1000,5')
    })

    it('should handle different decimal places', () => {
      expect(formatPolishNumber(15.567, 2)).toBe('15,57')
      expect(formatPolishNumber(15.567, 0)).toBe('16') // Rounded
      expect(formatPolishNumber(15.567, 3)).toBe('15,567')
    })

    it('should handle edge cases in formatting', () => {
      expect(formatPolishNumber(0)).toBe('0')
      expect(formatPolishNumber('')).toBe('0')
      expect(formatPolishNumber(null)).toBe('0')
      expect(formatPolishNumber(undefined)).toBe('0')
    })
  })

  describe('PC-7: Regression tests for Issue #2', () => {
    it('should fix the 150g → 15g scaling bug', () => {
      // Reproduce the original bug scenario
      const ingredients = [{ id: '1', quantity: 150 }]

      // Scale from current total of 150 to target of 150 (should be 1:1)
      const scaled = scaleIngredientsByRatio(ingredients, 150, 150)
      expect(scaled[0].quantity).toBe(150.0) // Should remain 150, not become 15

      // Scale from 150 to 15 (should be 0.1x ratio)
      const scaled2 = scaleIngredientsByRatio(ingredients, 15, 150)
      expect(scaled2[0].quantity).toBe(15.0) // This should work correctly
    })

    it('should fix the 140g → 139,9g precision bug', () => {
      // Test precise scaling that was causing 140 → 139.9
      const ingredients = [{ id: '1', quantity: 140 }]

      // Scale by 1.0 ratio (should remain exactly 140)
      const scaled = scaleIngredientsByRatio(ingredients, 140, 140)
      expect(scaled[0].quantity).toBe(140.0) // Should be exactly 140.0, not 139.9

      // Scale by a precise ratio
      const scaled2 = scaleIngredientsByRatio(ingredients, 280, 140) // 2x
      expect(scaled2[0].quantity).toBe(280.0) // Should be exactly 280.0
    })

    it('should handle complex multi-step calculations without precision loss', () => {
      // Simulate complex calculation chain that could accumulate errors
      let value = 140.0

      // Multiple operations that could cause precision issues
      value = preciseMultiply(value, 1.1) // 154.0
      value = preciseDivide(value, 1.1) // Back to 140.0
      value = preciseAdd(value, 0.1) // 140.1
      value = preciseMultiply(value, 10) // 1401.0
      value = preciseDivide(value, 10) // Back to 140.1

      expect(value).toBe(140.1) // Should be exact, no precision drift
    })

    it('should maintain precision in Polish locale operations', () => {
      // Test the full cycle: parse Polish → calculate → format Polish
      const input = '140,5'
      const parsed = parsePolishNumberSafe(input)
      const calculated = preciseMultiply(parsed, 2)
      const formatted = formatPolishNumber(calculated)

      expect(parsed).toBe(140.5)
      expect(calculated).toBe(281.0)
      expect(formatted).toBe('281') // No unnecessary decimals
    })
  })
})