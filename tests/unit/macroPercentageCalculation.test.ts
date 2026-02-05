import { describe, it, expect } from 'vitest'
import {
  calculatePercentageFromGramsNum,
  calculateGramsFromPercentageNum
} from '../../src/components/calorie-calculator/utils'

/**
 * Test dla buga zgłoszonego przez klienta:
 *
 * SCENARIUSZ:
 * 1. Tworzę nowy dzień (kalorie = 0)
 * 2. Wpisuję gramy: białko 100g, tłuszcze 200g, węgle 60g
 * 3. Wpisuję kalorie = 2000
 * 4. OCZEKIWANE: Procenty powinny się przeliczyć automatycznie
 *    - Białko: 100g × 4kcal/g = 400kcal → 400/2000 × 100 = 20%
 *    - Tłuszcze: 200g × 9kcal/g = 1800kcal → 1800/2000 × 100 = 90%
 *    - Węglowodany: 60g × 4kcal/g = 240kcal → 240/2000 × 100 = 12%
 *
 * BUG: Procenty pozostają 0%
 */

describe('Macro Percentage Calculations - Client Bug Report', () => {

  describe('calculatePercentageFromGramsNum - basic functionality', () => {

    it('should calculate protein percentage from grams', () => {
      // Given: 100g protein, 2000 kcal
      const grams = 100
      const calories = 2000

      // When: calculating percentage
      const percentage = calculatePercentageFromGramsNum(grams, calories, 'protein')

      // Then: (100g × 4kcal/g) / 2000kcal × 100 = 20%
      expect(percentage).toBe(20)
    })

    it('should calculate fat percentage from grams', () => {
      // Given: 200g fat, 2000 kcal
      const grams = 200
      const calories = 2000

      // When: calculating percentage
      const percentage = calculatePercentageFromGramsNum(grams, calories, 'fat')

      // Then: (200g × 9kcal/g) / 2000kcal × 100 = 90%
      expect(percentage).toBe(90)
    })

    it('should calculate carbs percentage from grams', () => {
      // Given: 60g carbs, 2000 kcal
      const grams = 60
      const calories = 2000

      // When: calculating percentage
      const percentage = calculatePercentageFromGramsNum(grams, calories, 'carbs')

      // Then: (60g × 4kcal/g) / 2000kcal × 100 = 12%
      expect(percentage).toBe(12)
    })
  })

  describe('calculatePercentageFromGramsNum - edge cases', () => {

    it('should return 0 when calories is 0 (prevents division by zero)', () => {
      // Given: 100g protein, 0 kcal
      const grams = 100
      const calories = 0

      // When: calculating percentage
      const percentage = calculatePercentageFromGramsNum(grams, calories, 'protein')

      // Then: should return 0 (not NaN or Infinity)
      expect(percentage).toBe(0)
    })

    it('should return 0 when grams is 0', () => {
      // Given: 0g protein, 2000 kcal
      const grams = 0
      const calories = 2000

      // When: calculating percentage
      const percentage = calculatePercentageFromGramsNum(grams, calories, 'protein')

      // Then: should return 0
      expect(percentage).toBe(0)
    })

    it('should handle undefined grams gracefully', () => {
      // Given: undefined grams
      const grams = undefined as unknown as number
      const calories = 2000

      // When: calculating percentage
      const percentage = calculatePercentageFromGramsNum(grams, calories, 'protein')

      // Then: should return 0
      expect(percentage).toBe(0)
    })

    it('should round to 1 decimal place', () => {
      // Given: values that result in fractional percentage
      const grams = 33
      const calories = 2000

      // When: calculating percentage
      const percentage = calculatePercentageFromGramsNum(grams, calories, 'protein')

      // Then: (33g × 4kcal/g) / 2000kcal × 100 = 6.6%
      expect(percentage).toBe(6.6)
    })
  })

  describe('calculateGramsFromPercentageNum - reverse calculation', () => {

    it('should calculate protein grams from percentage', () => {
      // Given: 20% protein, 2000 kcal
      const percentage = 20
      const calories = 2000

      // When: calculating grams
      const grams = calculateGramsFromPercentageNum(percentage, calories, 'protein')

      // Then: 20% × 2000kcal / 4kcal/g = 100g
      expect(grams).toBe(100)
    })

    it('should calculate fat grams from percentage', () => {
      // Given: 30% fat, 2000 kcal
      const percentage = 30
      const calories = 2000

      // When: calculating grams
      const grams = calculateGramsFromPercentageNum(percentage, calories, 'fat')

      // Then: 30% × 2000kcal / 9kcal/g = 66.67g ≈ 67g
      expect(grams).toBe(67)
    })

    it('should calculate carbs grams from percentage', () => {
      // Given: 50% carbs, 2000 kcal
      const percentage = 50
      const calories = 2000

      // When: calculating grams
      const grams = calculateGramsFromPercentageNum(percentage, calories, 'carbs')

      // Then: 50% × 2000kcal / 4kcal/g = 250g
      expect(grams).toBe(250)
    })
  })

  describe('Full client scenario: grams first, then calories', () => {
    /**
     * KLUCZOWY TEST - symuluje dokładny scenariusz zgłoszony przez klienta
     */

    it('should correctly calculate all percentages for client scenario', () => {
      // Given: Client inputs from screenshot
      const proteinGrams = 100
      const fatGrams = 200
      const carbsGrams = 60
      const calories = 2000

      // When: User enters calories after entering grams
      // System should recalculate all percentages
      const proteinPct = calculatePercentageFromGramsNum(proteinGrams, calories, 'protein')
      const fatPct = calculatePercentageFromGramsNum(fatGrams, calories, 'fat')
      const carbsPct = calculatePercentageFromGramsNum(carbsGrams, calories, 'carbs')

      // Then: Percentages should be correct
      expect(proteinPct).toBe(20)   // 100g × 4 / 2000 × 100 = 20%
      expect(fatPct).toBe(90)       // 200g × 9 / 2000 × 100 = 90%
      expect(carbsPct).toBe(12)     // 60g × 4 / 2000 × 100 = 12%

      // And: Total should exceed 100% (this is valid - user inputs intentionally high)
      const totalPct = proteinPct + fatPct + carbsPct
      expect(totalPct).toBe(122) // 20 + 90 + 12 = 122%
    })

    it('should show correct missing calories (negative = surplus)', () => {
      // Given: Client inputs from screenshot
      const proteinGrams = 100
      const fatGrams = 200
      const carbsGrams = 60
      const targetCalories = 2000

      // When: Calculating total calories from macros
      const proteinCalories = proteinGrams * 4  // 400 kcal
      const fatCalories = fatGrams * 9          // 1800 kcal
      const carbsCalories = carbsGrams * 4      // 240 kcal
      const totalFromMacros = proteinCalories + fatCalories + carbsCalories // 2440 kcal

      const missingCalories = targetCalories - totalFromMacros

      // Then: Missing should be -440 (surplus)
      expect(missingCalories).toBe(-440)
    })
  })
})
