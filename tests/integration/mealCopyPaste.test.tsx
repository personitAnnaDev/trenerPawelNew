import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useCopyPaste } from '@/hooks/useCopyPaste'
import { Meal, Ingredient, DayPlan } from '@/types/meal'
import { TEST_PRODUCTS } from '../utils/fixtures'

// Helper: Create test meal with realistic data
const createTestMeal = (overrides: Partial<Meal> = {}): Meal => ({
  id: 'meal-1',
  name: 'Śniadanie',
  dish: 'Omlet z warzywami',
  instructions: ['Rozbij jajka', 'Pokrój warzywa', 'Usmaż na patelni'],
  ingredients: [
    {
      id: 'ing-1',
      ingredient_id: TEST_PRODUCTS.CHICKEN_BREAST.id,
      name: TEST_PRODUCTS.CHICKEN_BREAST.name,
      quantity: 200,
      unit: 'gramy',
      unit_weight: 100,
      calories: 330, // 200g chicken = 165 * 2
      protein: 62.0,
      fat: 7.2,
      carbs: 0.0,
      fiber: 0.0,
    },
    {
      id: 'ing-2',
      ingredient_id: TEST_PRODUCTS.BROWN_RICE.id,
      name: TEST_PRODUCTS.BROWN_RICE.name,
      quantity: 100,
      unit: 'gramy',
      unit_weight: 100,
      calories: 363,
      protein: 7.2,
      fat: 2.9,
      carbs: 72.9,
      fiber: 3.4,
    },
  ],
  calories: 693, // 330 + 363
  protein: 69.2, // 62 + 7.2
  carbs: 72.9,
  fat: 10.1, // 7.2 + 2.9
  fiber: 3.4,
  countTowardsDailyCalories: true,
  time: '08:00',
  order_index: 1,
  ...overrides,
})

// Helper: Create test day plan
const createTestDayPlan = (id: string, mealsCount: number = 3): DayPlan => ({
  id,
  name: `Dzień ${id.split('-')[1]}`,
  meals: Array.from({ length: mealsCount }, (_, i) =>
    createTestMeal({
      id: `meal-${id}-${i+1}`,
      name: ['Śniadanie', 'Obiad', 'Kolacja'][i] || `Posiłek ${i+1}`,
      order_index: i + 1,
    })
  ),
})

describe('IT-FAZA1: Meal Copy-Paste Integration', () => {
  let mockCreateSnapshot: ReturnType<typeof vi.fn>
  let mockSaveMeal: ReturnType<typeof vi.fn>
  let mockUpdateMacros: ReturnType<typeof vi.fn>

  beforeEach(() => {
    // Mock crypto.randomUUID for deterministic tests
    let uuidCounter = 0
    vi.spyOn(crypto, 'randomUUID').mockImplementation(() => {
      uuidCounter++
      return `mock-uuid-${uuidCounter}`
    })

    // Mock database operations
    mockCreateSnapshot = vi.fn().mockResolvedValue({ id: 'snapshot-1' })
    mockSaveMeal = vi.fn().mockResolvedValue({ id: 'saved-meal-1' })
    mockUpdateMacros = vi.fn().mockResolvedValue(undefined)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('F1-T01: Enter copy mode', () => {
    it('should activate copy mode when copyMeal is called', () => {
      // Given: Hook initialized with no meal copied
      const { result } = renderHook(() => useCopyPaste())
      const testMeal = createTestMeal()

      expect(result.current.canPaste).toBe(false)
      expect(result.current.copyPasteState.isActive).toBe(false)

      // When: User copies a meal
      act(() => {
        result.current.copyMeal(testMeal, 'day-1', 2)
      })

      // Then: Copy mode should be active
      expect(result.current.copyPasteState.isActive).toBe(true)
      expect(result.current.copyPasteState.sourceMeal).toEqual(testMeal)
      expect(result.current.copyPasteState.sourceDayId).toBe('day-1')
      expect(result.current.copyPasteState.sourceOrderIndex).toBe(2)
      expect(result.current.canPaste).toBe(true)
    })

    it('should preserve meal data without mutations', () => {
      // Given: Original meal
      const { result } = renderHook(() => useCopyPaste())
      const originalMeal = createTestMeal({ id: 'original-id' })
      const originalIngredientId = originalMeal.ingredients[0].id

      // When: Copying meal
      act(() => {
        result.current.copyMeal(originalMeal, 'day-1', 1)
      })

      // Then: Original meal should not be mutated
      expect(originalMeal.id).toBe('original-id')
      expect(originalMeal.ingredients[0].id).toBe(originalIngredientId)

      // Copied meal should be a deep clone
      expect(result.current.copyPasteState.sourceMeal).not.toBe(originalMeal)
      expect(result.current.copyPasteState.sourceMeal!.ingredients).not.toBe(originalMeal.ingredients)
    })
  })

  describe('F1-T02: Paste to different day', () => {
    it('should clone meal with new UUIDs when pasting', () => {
      // Given: Meal copied from Day 1 at position 1
      const { result } = renderHook(() => useCopyPaste())
      const sourceMeal = createTestMeal({
        id: 'source-meal-id',
        calories: 500,
        protein: 40,
        order_index: 1,
      })

      act(() => {
        result.current.copyMeal(sourceMeal, 'day-1', 1)
      })

      // When: Pasting to Day 2
      let pastedMeal: Meal | null = null
      act(() => {
        pastedMeal = result.current.pasteMeal('day-2')
      })

      // Then: Should return cloned meal with new UUID
      expect(pastedMeal).not.toBeNull()
      expect(pastedMeal!.id).toBe('mock-uuid-1') // New UUID from mock
      expect(pastedMeal!.id).not.toBe('source-meal-id')

      // Position should be preserved from source
      expect(pastedMeal!.order_index).toBe(1)

      // Nutrition values should be preserved
      expect(pastedMeal!.calories).toBe(500)
      expect(pastedMeal!.protein).toBe(40)
      expect(pastedMeal!.name).toBe(sourceMeal.name + ' (kopia)')
      expect(pastedMeal!.dish).toBe(sourceMeal.dish)

      // Ingredients should have new UUIDs
      expect(pastedMeal!.ingredients[0].id).toBe('mock-uuid-2')
      expect(pastedMeal!.ingredients[1].id).toBe('mock-uuid-3')
      expect(pastedMeal!.ingredients[0].name).toBe(sourceMeal.ingredients[0].name)
    })

    it('should preserve all meal properties in paste', () => {
      // Given: Complex meal with all properties at position 3
      const { result } = renderHook(() => useCopyPaste())
      const complexMeal = createTestMeal({
        name: 'Kompleksowy posiłek',
        dish: 'Specjalna receptura',
        time: '14:30',
        countTowardsDailyCalories: false,
        instructions: ['Krok 1', 'Krok 2', 'Krok 3'],
        calories: 850,
        protein: 55.5,
        carbs: 90.2,
        fat: 25.8,
        fiber: 12.5,
        order_index: 3,
      })

      act(() => {
        result.current.copyMeal(complexMeal, 'day-1', 3)
      })

      // When: Pasting
      let pastedMeal: Meal | null = null
      act(() => {
        pastedMeal = result.current.pasteMeal('day-2')
      })

      // Then: All properties should be preserved including position
      expect(pastedMeal!.name).toBe('Kompleksowy posiłek (kopia)')
      expect(pastedMeal!.dish).toBe('Specjalna receptura')
      expect(pastedMeal!.time).toBe('14:30')
      expect(pastedMeal!.countTowardsDailyCalories).toBe(false)
      expect(pastedMeal!.instructions).toEqual(['Krok 1', 'Krok 2', 'Krok 3'])
      expect(pastedMeal!.calories).toBe(850)
      expect(pastedMeal!.protein).toBe(55.5)
      expect(pastedMeal!.carbs).toBe(90.2)
      expect(pastedMeal!.fat).toBe(25.8)
      expect(pastedMeal!.fiber).toBe(12.5)
      expect(pastedMeal!.order_index).toBe(3)
    })
  })

  describe('F1-T03: Position edge case', () => {
    it('should handle paste when source order_index exceeds target day meal count', () => {
      // Given: Source meal at position 5
      const { result } = renderHook(() => useCopyPaste())
      const sourceMeal = createTestMeal({ order_index: 5 })

      act(() => {
        result.current.copyMeal(sourceMeal, 'day-1', 5)
      })

      // When: Pasting to day with fewer meals
      let pastedMeal: Meal | null = null
      act(() => {
        pastedMeal = result.current.pasteMeal('day-2')
      })

      // Then: Should paste successfully with preserved order_index
      expect(pastedMeal).not.toBeNull()
      expect(pastedMeal!.id).toBe('mock-uuid-1')
      expect(pastedMeal!.order_index).toBe(5)

      // Note: Backend will handle shifting existing meals >= position 5
      // If target day has only 2 meals (order_index 0,1), the pasted meal
      // will be inserted at position 5 and no existing meals will be shifted
    })
  })

  describe('F1-T04: Multi-paste workflow', () => {
    it('should allow pasting to multiple days without clearing clipboard', () => {
      // Given: Meal copied once from position 2
      const { result } = renderHook(() => useCopyPaste())
      const sourceMeal = createTestMeal({
        name: 'Uniwersalny posiłek',
        order_index: 2,
      })

      act(() => {
        result.current.copyMeal(sourceMeal, 'day-1', 2)
      })

      // When: Pasting to Day 2
      let paste1: Meal | null = null
      act(() => {
        paste1 = result.current.pasteMeal('day-2')
      })

      expect(paste1).not.toBeNull()
      expect(paste1!.order_index).toBe(2) // Preserves source position
      expect(result.current.canPaste).toBe(true) // Still can paste

      // When: Pasting to Day 3
      let paste2: Meal | null = null
      act(() => {
        paste2 = result.current.pasteMeal('day-3')
      })

      expect(paste2).not.toBeNull()
      expect(paste2!.order_index).toBe(2) // Preserves source position
      expect(result.current.canPaste).toBe(true) // Still can paste

      // When: Pasting to Day 4
      let paste3: Meal | null = null
      act(() => {
        paste3 = result.current.pasteMeal('day-4')
      })

      expect(paste3).not.toBeNull()
      expect(paste3!.order_index).toBe(2) // Preserves source position
      expect(result.current.canPaste).toBe(true) // Still can paste

      // Then: All pastes should have same content but different IDs
      expect(paste1!.name).toBe('Uniwersalny posiłek (kopia)')
      expect(paste2!.name).toBe('Uniwersalny posiłek (kopia)')
      expect(paste3!.name).toBe('Uniwersalny posiłek (kopia)')

      // Each paste should have unique ID
      expect(paste1!.id).not.toBe(paste2!.id)
      expect(paste2!.id).not.toBe(paste3!.id)
      expect(paste1!.id).not.toBe(paste3!.id)

      // All pastes should preserve the same order_index
      expect(paste1!.order_index).toBe(paste2!.order_index)
      expect(paste2!.order_index).toBe(paste3!.order_index)
    })
  })

  describe('F1-T05: Same-day duplication', () => {
    it('should allow pasting to the same day as source', () => {
      // Given: Meal from Day 1 at position 1
      const { result } = renderHook(() => useCopyPaste())
      const sourceMeal = createTestMeal({
        id: 'original-day1-meal',
        order_index: 1,
      })

      act(() => {
        result.current.copyMeal(sourceMeal, 'day-1', 1)
      })

      // When: Pasting back to Day 1
      let pastedMeal: Meal | null = null
      act(() => {
        pastedMeal = result.current.pasteMeal('day-1')
      })

      // Then: Should create duplicate with new ID at same position
      expect(pastedMeal).not.toBeNull()
      expect(pastedMeal!.id).not.toBe('original-day1-meal')
      expect(pastedMeal!.name).toBe(sourceMeal.name + ' (kopia)')
      expect(pastedMeal!.order_index).toBe(1)

      // Note: Backend will shift original meal and others >= position 1 to +1
      // Result: pasted meal at position 1, original meal at position 2
    })
  })

  describe('F1-T06: Exit copy mode', () => {
    it('should clear clipboard and deactivate mode', () => {
      // Given: Active copy mode
      const { result } = renderHook(() => useCopyPaste())
      const testMeal = createTestMeal()

      act(() => {
        result.current.copyMeal(testMeal, 'day-1', 1)
      })

      expect(result.current.canPaste).toBe(true)
      expect(result.current.copyPasteState.isActive).toBe(true)

      // When: Clearing clipboard
      act(() => {
        result.current.clearClipboard()
      })

      // Then: Mode should be inactive
      expect(result.current.copyPasteState.isActive).toBe(false)
      expect(result.current.copyPasteState.sourceMeal).toBeNull()
      expect(result.current.copyPasteState.sourceDayId).toBeNull()
      expect(result.current.copyPasteState.sourceOrderIndex).toBe(0)
      expect(result.current.canPaste).toBe(false)
    })
  })

  describe('F1-T07: Clipboard state validation', () => {
    it('should return null when pasting without copying first', () => {
      // Given: No meal copied
      const { result } = renderHook(() => useCopyPaste())

      expect(result.current.canPaste).toBe(false)

      // When: Attempting to paste
      let pastedMeal: Meal | null = null
      act(() => {
        pastedMeal = result.current.pasteMeal('day-2')
      })

      // Then: Should return null
      expect(pastedMeal).toBeNull()
    })

    it('should maintain clipboard state across multiple paste operations', () => {
      // Given: Meal copied
      const { result } = renderHook(() => useCopyPaste())
      const sourceMeal = createTestMeal({ calories: 600 })

      act(() => {
        result.current.copyMeal(sourceMeal, 'day-1', 1)
      })

      // When: Pasting multiple times
      const pastes: (Meal | null)[] = []
      act(() => {
        pastes.push(result.current.pasteMeal('day-2'))
        pastes.push(result.current.pasteMeal('day-3'))
        pastes.push(result.current.pasteMeal('day-4'))
      })

      // Then: All pastes should succeed with same nutrition
      expect(pastes.every(p => p !== null)).toBe(true)
      expect(pastes.every(p => p!.calories === 600)).toBe(true)

      // Clipboard should remain active
      expect(result.current.canPaste).toBe(true)
    })
  })

  describe('F1-T08: Ingredient cloning integrity', () => {
    it('should deep clone all ingredients with new UUIDs', () => {
      // Given: Meal with multiple ingredients
      const { result } = renderHook(() => useCopyPaste())
      const mealWithIngredients = createTestMeal({
        ingredients: [
          {
            id: 'ing-1',
            ingredient_id: 'chicken-id',
            name: 'Kurczak',
            quantity: 150,
            unit: 'gramy',
            unit_weight: 100,
            calories: 248,
            protein: 46.5,
            fat: 5.4,
            carbs: 0,
            fiber: 0,
          },
          {
            id: 'ing-2',
            ingredient_id: 'rice-id',
            name: 'Ryż',
            quantity: 80,
            unit: 'gramy',
            unit_weight: 100,
            calories: 290,
            protein: 5.8,
            fat: 2.3,
            carbs: 58.3,
            fiber: 2.7,
          },
          {
            id: 'ing-3',
            ingredient_id: 'oil-id',
            name: 'Oliwa',
            quantity: 10,
            unit: 'gramy',
            unit_weight: 10,
            calories: 88,
            protein: 0,
            fat: 10,
            carbs: 0,
            fiber: 0,
          },
        ],
      })

      act(() => {
        result.current.copyMeal(mealWithIngredients, 'day-1', 1)
      })

      // When: Pasting
      let pastedMeal: Meal | null = null
      act(() => {
        pastedMeal = result.current.pasteMeal('day-2')
      })

      // Then: All ingredients should have new UUIDs
      expect(pastedMeal!.ingredients).toHaveLength(3)
      expect(pastedMeal!.ingredients[0].id).toBe('mock-uuid-2')
      expect(pastedMeal!.ingredients[1].id).toBe('mock-uuid-3')
      expect(pastedMeal!.ingredients[2].id).toBe('mock-uuid-4')

      // Ingredient data should be preserved
      expect(pastedMeal!.ingredients[0].name).toBe('Kurczak')
      expect(pastedMeal!.ingredients[0].quantity).toBe(150)
      expect(pastedMeal!.ingredients[1].name).toBe('Ryż')
      expect(pastedMeal!.ingredients[1].quantity).toBe(80)
      expect(pastedMeal!.ingredients[2].name).toBe('Oliwa')
      expect(pastedMeal!.ingredients[2].quantity).toBe(10)
    })
  })

  describe('F1-T09: Instructions array handling', () => {
    it('should clone instructions array independently', () => {
      // Given: Meal with instructions
      const { result } = renderHook(() => useCopyPaste())
      const originalInstructions = [
        'Rozgrzej piekarnik do 180°C',
        'Wymieszaj składniki',
        'Piecz przez 25 minut',
      ]
      const mealWithInstructions = createTestMeal({
        instructions: originalInstructions,
      })

      act(() => {
        result.current.copyMeal(mealWithInstructions, 'day-1', 1)
      })

      // When: Pasting
      let pastedMeal: Meal | null = null
      act(() => {
        pastedMeal = result.current.pasteMeal('day-2')
      })

      // Then: Instructions should be cloned, not referenced
      expect(pastedMeal!.instructions).toEqual(originalInstructions)
      expect(pastedMeal!.instructions).not.toBe(originalInstructions) // Different array reference
      expect(pastedMeal!.instructions).not.toBe(mealWithInstructions.instructions)
    })
  })

  describe('F1-T10: Edge case - empty ingredients', () => {
    it('should handle meals with no ingredients', () => {
      // Given: Meal with empty ingredients array
      const { result } = renderHook(() => useCopyPaste())
      const emptyIngredientsMeal = createTestMeal({
        ingredients: [],
        calories: 0,
        protein: 0,
        fat: 0,
        carbs: 0,
        fiber: 0,
      })

      act(() => {
        result.current.copyMeal(emptyIngredientsMeal, 'day-1', 1)
      })

      // When: Pasting
      let pastedMeal: Meal | null = null
      act(() => {
        pastedMeal = result.current.pasteMeal('day-2')
      })

      // Then: Should paste successfully with empty ingredients
      expect(pastedMeal).not.toBeNull()
      expect(pastedMeal!.ingredients).toEqual([])
      expect(pastedMeal!.calories).toBe(0)
    })
  })
})
