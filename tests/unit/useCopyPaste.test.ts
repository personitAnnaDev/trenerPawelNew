import { describe, it, expect, beforeEach, vi } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useCopyPaste } from '@/hooks/useCopyPaste'
import { Meal, Ingredient } from '@/types/meal'

// Helper function to create test meal
const createTestMeal = (overrides: Partial<Meal> = {}): Meal => ({
  id: 'meal-1',
  name: 'Śniadanie',
  dish: 'Omlet z warzywami',
  instructions: ['Rozbij jajka', 'Pokrój warzywa', 'Usmaż na patelni'],
  ingredients: [
    {
      id: 'ing-1',
      ingredient_id: 'chicken-breast-id',
      name: 'Pierś z kurczaka',
      quantity: 200,
      unit: 'gramy',
      unit_weight: 100,
      calories: 165,
      protein: 31.0,
      fat: 3.6,
      carbs: 0.0,
      fiber: 0.0,
    },
    {
      id: 'ing-2',
      ingredient_id: 'brown-rice-id',
      name: 'Ryż brązowy',
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
  calories: 500,
  protein: 40,
  carbs: 50,
  fat: 15,
  fiber: 5,
  countTowardsDailyCalories: true,
  time: '08:00',
  order_index: 1,
  ...overrides,
})

describe('useCopyPaste Hook', () => {
  beforeEach(() => {
    // Mock crypto.randomUUID for consistent test UUIDs
    vi.spyOn(crypto, 'randomUUID')
      .mockReturnValueOnce('new-meal-uuid')
      .mockReturnValueOnce('new-ing-1-uuid')
      .mockReturnValueOnce('new-ing-2-uuid')
  })

  describe('Initial State', () => {
    it('should start with no meal copied and canPaste false', () => {
      const { result } = renderHook(() => useCopyPaste())

      expect(result.current.copyPasteState.isActive).toBe(false)
      expect(result.current.copyPasteState.sourceMeal).toBeNull()
      expect(result.current.copyPasteState.sourceDayId).toBeNull()
      expect(result.current.copyPasteState.sourceOrderIndex).toBe(0)
      expect(result.current.canPaste).toBe(false)
    })
  })

  describe('Copy Meal', () => {
    it('should store meal, sourceDayId, and sourceOrderIndex in clipboard state', () => {
      const { result } = renderHook(() => useCopyPaste())
      const testMeal = createTestMeal()

      act(() => {
        result.current.copyMeal(testMeal, 'day-1', 2)
      })

      expect(result.current.copyPasteState.isActive).toBe(true)
      expect(result.current.copyPasteState.sourceMeal).toEqual(testMeal)
      expect(result.current.copyPasteState.sourceDayId).toBe('day-1')
      expect(result.current.copyPasteState.sourceOrderIndex).toBe(2)
    })

    it('should set canPaste to true after copying', () => {
      const { result } = renderHook(() => useCopyPaste())
      const testMeal = createTestMeal()

      expect(result.current.canPaste).toBe(false)

      act(() => {
        result.current.copyMeal(testMeal, 'day-1', 1)
      })

      expect(result.current.canPaste).toBe(true)
    })
  })

  describe('Paste Meal', () => {
    it('should return cloned meal with new UUID', () => {
      const { result } = renderHook(() => useCopyPaste())
      const testMeal = createTestMeal({ id: 'original-meal-id' })

      act(() => {
        result.current.copyMeal(testMeal, 'day-1', 1)
      })

      let pastedMeal: Meal | null = null
      act(() => {
        pastedMeal = result.current.pasteMeal('day-2')
      })

      expect(pastedMeal).not.toBeNull()
      expect(pastedMeal!.id).toBe('new-meal-uuid')
      expect(pastedMeal!.id).not.toBe('original-meal-id')
      expect(pastedMeal!.name).toBe(testMeal.name + ' (kopia)')
      expect(pastedMeal!.dish).toBe(testMeal.dish)
      expect(pastedMeal!.calories).toBe(testMeal.calories)
      expect(pastedMeal!.instructions).toEqual(testMeal.instructions)
    })

    it('should clone all ingredients with new UUIDs', () => {
      const { result } = renderHook(() => useCopyPaste())
      const testMeal = createTestMeal({
        ingredients: [
          {
            id: 'original-ing-1',
            ingredient_id: 'chicken-id',
            name: 'Kurczak',
            quantity: 100,
            unit: 'gramy',
            unit_weight: 100,
            calories: 165,
            protein: 31,
            fat: 3.6,
            carbs: 0,
            fiber: 0,
          },
          {
            id: 'original-ing-2',
            ingredient_id: 'rice-id',
            name: 'Ryż',
            quantity: 50,
            unit: 'gramy',
            unit_weight: 100,
            calories: 363,
            protein: 7.2,
            fat: 2.9,
            carbs: 72.9,
            fiber: 3.4,
          },
        ],
      })

      act(() => {
        result.current.copyMeal(testMeal, 'day-1', 1)
      })

      let pastedMeal: Meal | null = null
      act(() => {
        pastedMeal = result.current.pasteMeal('day-2')
      })

      expect(pastedMeal!.ingredients).toHaveLength(2)
      expect(pastedMeal!.ingredients[0].id).toBe('new-ing-1-uuid')
      expect(pastedMeal!.ingredients[0].id).not.toBe('original-ing-1')
      expect(pastedMeal!.ingredients[1].id).toBe('new-ing-2-uuid')
      expect(pastedMeal!.ingredients[1].id).not.toBe('original-ing-2')

      // Verify ingredient data is preserved
      expect(pastedMeal!.ingredients[0].name).toBe('Kurczak')
      expect(pastedMeal!.ingredients[0].quantity).toBe(100)
      expect(pastedMeal!.ingredients[1].name).toBe('Ryż')
      expect(pastedMeal!.ingredients[1].quantity).toBe(50)
    })

    it('should return null when pasteMeal is called without copying first', () => {
      const { result } = renderHook(() => useCopyPaste())

      let pastedMeal: Meal | null = null
      act(() => {
        pastedMeal = result.current.pasteMeal('day-2')
      })

      expect(pastedMeal).toBeNull()
    })

    it('should allow multi-paste: paste 3 times to different days', () => {
      const { result } = renderHook(() => useCopyPaste())
      const testMeal = createTestMeal()

      // Copy once
      act(() => {
        result.current.copyMeal(testMeal, 'day-1', 1)
      })

      // Paste to day-2
      let paste1: Meal | null = null
      act(() => {
        paste1 = result.current.pasteMeal('day-2')
      })
      expect(paste1).not.toBeNull()
      expect(result.current.canPaste).toBe(true) // Still can paste

      // Paste to day-3
      let paste2: Meal | null = null
      act(() => {
        paste2 = result.current.pasteMeal('day-3')
      })
      expect(paste2).not.toBeNull()
      expect(result.current.canPaste).toBe(true) // Still can paste

      // Paste to day-4
      let paste3: Meal | null = null
      act(() => {
        paste3 = result.current.pasteMeal('day-4')
      })
      expect(paste3).not.toBeNull()
      expect(result.current.canPaste).toBe(true) // Still can paste

      // All pastes should have same content but different IDs
      expect(paste1!.name).toBe(testMeal.name + ' (kopia)')
      expect(paste2!.name).toBe(testMeal.name + ' (kopia)')
      expect(paste3!.name).toBe(testMeal.name + ' (kopia)')
    })
  })

  describe('Clear Clipboard', () => {
    it('should reset state to initial values', () => {
      const { result } = renderHook(() => useCopyPaste())
      const testMeal = createTestMeal()

      // Copy meal
      act(() => {
        result.current.copyMeal(testMeal, 'day-1', 1)
      })

      expect(result.current.canPaste).toBe(true)

      // Clear clipboard
      act(() => {
        result.current.clearClipboard()
      })

      expect(result.current.copyPasteState.isActive).toBe(false)
      expect(result.current.copyPasteState.sourceMeal).toBeNull()
      expect(result.current.copyPasteState.sourceDayId).toBeNull()
      expect(result.current.copyPasteState.sourceOrderIndex).toBe(0)
      expect(result.current.canPaste).toBe(false)
    })
  })
})
