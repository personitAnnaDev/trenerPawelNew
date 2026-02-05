import { describe, it, expect, beforeEach, vi } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useCopyPasteDay } from '@/hooks/useCopyPasteDay'
import { DayPlan, Meal, Ingredient } from '@/types/meal'

// Helper function to create test ingredient
const createTestIngredient = (overrides: Partial<Ingredient> = {}): Ingredient => ({
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
  ...overrides,
})

// Helper function to create test meal
const createTestMeal = (overrides: Partial<Meal> = {}): Meal => ({
  id: 'meal-1',
  name: 'Śniadanie',
  dish: 'Omlet z warzywami',
  instructions: ['Rozbij jajka', 'Pokrój warzywa', 'Usmaż na patelni'],
  ingredients: [
    createTestIngredient({ id: 'ing-1', name: 'Jajka', quantity: 2 }),
    createTestIngredient({ id: 'ing-2', name: 'Papryka', quantity: 50 }),
  ],
  calories: 300,
  protein: 25,
  carbs: 15,
  fat: 18,
  fiber: 2,
  countTowardsDailyCalories: true,
  time: '08:00',
  order_index: 1,
  ...overrides,
})

// Helper function to create test day plan
const createTestDayPlan = (overrides: Partial<DayPlan> = {}): DayPlan => ({
  id: 'day-1',
  name: 'Dzień 1',
  meals: [
    createTestMeal({ id: 'meal-1', name: 'Śniadanie', order_index: 1 }),
    createTestMeal({ id: 'meal-2', name: 'Obiad', order_index: 2 }),
    createTestMeal({ id: 'meal-3', name: 'Kolacja', order_index: 3 }),
  ],
  ...overrides,
})

describe('useCopyPasteDay Hook', () => {
  beforeEach(() => {
    // Mock crypto.randomUUID with counter for deterministic UUIDs
    let uuidCounter = 0
    vi.spyOn(crypto, 'randomUUID').mockImplementation(() => {
      uuidCounter++
      return `mock-uuid-${uuidCounter}`
    })
  })

  describe('Initial State', () => {
    it('should start with no day copied and canPaste false', () => {
      const { result } = renderHook(() => useCopyPasteDay())

      expect(result.current.copyPasteDayState.isActive).toBe(false)
      expect(result.current.copyPasteDayState.sourceDayPlan).toBeNull()
      expect(result.current.copyPasteDayState.sourceDayId).toBeNull()
      expect(result.current.canPaste).toBe(false)
    })
  })

  describe('Copy Day', () => {
    it('should store day plan and sourceDayId in clipboard state', () => {
      const { result } = renderHook(() => useCopyPasteDay())
      const testDay = createTestDayPlan()

      act(() => {
        result.current.copyDay(testDay)
      })

      expect(result.current.copyPasteDayState.isActive).toBe(true)
      expect(result.current.copyPasteDayState.sourceDayPlan).toEqual(testDay)
      expect(result.current.copyPasteDayState.sourceDayId).toBe(testDay.id)
    })

    it('should set canPaste to true after copying', () => {
      const { result } = renderHook(() => useCopyPasteDay())
      const testDay = createTestDayPlan()

      expect(result.current.canPaste).toBe(false)

      act(() => {
        result.current.copyDay(testDay)
      })

      expect(result.current.canPaste).toBe(true)
    })

    it('should deep clone day plan with all meals and ingredients', () => {
      const { result } = renderHook(() => useCopyPasteDay())
      const testDay = createTestDayPlan()

      act(() => {
        result.current.copyDay(testDay)
      })

      const copiedDay = result.current.copyPasteDayState.sourceDayPlan

      // Verify deep clone - modifying copied day should not affect original
      expect(copiedDay).not.toBe(testDay) // Different object reference
      expect(copiedDay!.meals).not.toBe(testDay.meals) // Different meals array
      expect(copiedDay!.meals[0]).not.toBe(testDay.meals[0]) // Different meal objects
      expect(copiedDay!.meals[0].ingredients).not.toBe(testDay.meals[0].ingredients) // Different ingredients arrays
    })
  })

  describe('Paste Day', () => {
    it('should return cloned day plan with new UUID', () => {
      const { result } = renderHook(() => useCopyPasteDay())
      const testDay = createTestDayPlan({ id: 'original-day-id', name: 'Dzień testowy' })

      act(() => {
        result.current.copyDay(testDay)
      })

      let pastedDay: DayPlan | null = null
      act(() => {
        pastedDay = result.current.pasteDay()
      })

      expect(pastedDay).not.toBeNull()
      expect(pastedDay!.id).toBe('mock-uuid-1') // First UUID for day
      expect(pastedDay!.id).not.toBe('original-day-id')
      expect(pastedDay!.name).toBe(testDay.name) // Name not modified by pasteDay
      expect(pastedDay!.meals).toHaveLength(3)
    })

    it('should clone all meals with new UUIDs', () => {
      const { result } = renderHook(() => useCopyPasteDay())
      const testDay = createTestDayPlan({
        meals: [
          createTestMeal({ id: 'original-meal-1', name: 'Śniadanie' }),
          createTestMeal({ id: 'original-meal-2', name: 'Obiad' }),
        ],
      })

      act(() => {
        result.current.copyDay(testDay)
      })

      let pastedDay: DayPlan | null = null
      act(() => {
        pastedDay = result.current.pasteDay()
      })

      expect(pastedDay!.meals).toHaveLength(2)
      // UUID-1: day, UUID-2: meal-1, UUID-3,4: ingredients of meal-1, UUID-5: meal-2
      expect(pastedDay!.meals[0].id).toBe('mock-uuid-2')
      expect(pastedDay!.meals[0].id).not.toBe('original-meal-1')
      expect(pastedDay!.meals[1].id).toBe('mock-uuid-5')
      expect(pastedDay!.meals[1].id).not.toBe('original-meal-2')

      // Verify meal data is preserved
      expect(pastedDay!.meals[0].name).toBe('Śniadanie')
      expect(pastedDay!.meals[1].name).toBe('Obiad')
    })

    it('should clone all ingredients with new UUIDs', () => {
      const { result } = renderHook(() => useCopyPasteDay())
      const testDay = createTestDayPlan({
        meals: [
          createTestMeal({
            id: 'meal-1',
            ingredients: [
              createTestIngredient({ id: 'original-ing-1', name: 'Kurczak' }),
              createTestIngredient({ id: 'original-ing-2', name: 'Ryż' }),
            ],
          }),
        ],
      })

      act(() => {
        result.current.copyDay(testDay)
      })

      let pastedDay: DayPlan | null = null
      act(() => {
        pastedDay = result.current.pasteDay()
      })

      const pastedMeal = pastedDay!.meals[0]
      expect(pastedMeal.ingredients).toHaveLength(2)
      // UUID-1: day, UUID-2: meal, UUID-3: ing-1, UUID-4: ing-2
      expect(pastedMeal.ingredients[0].id).toBe('mock-uuid-3')
      expect(pastedMeal.ingredients[0].id).not.toBe('original-ing-1')
      expect(pastedMeal.ingredients[1].id).toBe('mock-uuid-4')
      expect(pastedMeal.ingredients[1].id).not.toBe('original-ing-2')

      // Verify ingredient data is preserved
      expect(pastedMeal.ingredients[0].name).toBe('Kurczak')
      expect(pastedMeal.ingredients[1].name).toBe('Ryż')
    })

    it('should return null when pasteDay is called without copying first', () => {
      const { result } = renderHook(() => useCopyPasteDay())

      let pastedDay: DayPlan | null = null
      act(() => {
        pastedDay = result.current.pasteDay()
      })

      expect(pastedDay).toBeNull()
    })

    it('should allow multi-paste: paste 3 times to create 3 separate days', () => {
      const { result } = renderHook(() => useCopyPasteDay())
      const testDay = createTestDayPlan({ name: 'Dzień bazowy' })

      // Copy once
      act(() => {
        result.current.copyDay(testDay)
      })

      // Paste 1st time
      let paste1: DayPlan | null = null
      act(() => {
        paste1 = result.current.pasteDay()
      })
      expect(paste1).not.toBeNull()
      expect(result.current.canPaste).toBe(true) // Still can paste

      // Paste 2nd time
      let paste2: DayPlan | null = null
      act(() => {
        paste2 = result.current.pasteDay()
      })
      expect(paste2).not.toBeNull()
      expect(result.current.canPaste).toBe(true) // Still can paste

      // Paste 3rd time
      let paste3: DayPlan | null = null
      act(() => {
        paste3 = result.current.pasteDay()
      })
      expect(paste3).not.toBeNull()
      expect(result.current.canPaste).toBe(true) // Still can paste

      // All pastes should have same content but different IDs
      expect(paste1!.name).toBe('Dzień bazowy')
      expect(paste2!.name).toBe('Dzień bazowy')
      expect(paste3!.name).toBe('Dzień bazowy')
      expect(paste1!.meals).toHaveLength(3)
      expect(paste2!.meals).toHaveLength(3)
      expect(paste3!.meals).toHaveLength(3)
    })
  })

  describe('Clear Clipboard', () => {
    it('should reset state to initial values', () => {
      const { result } = renderHook(() => useCopyPasteDay())
      const testDay = createTestDayPlan()

      // Copy day
      act(() => {
        result.current.copyDay(testDay)
      })

      expect(result.current.canPaste).toBe(true)

      // Clear clipboard
      act(() => {
        result.current.clearClipboard()
      })

      expect(result.current.copyPasteDayState.isActive).toBe(false)
      expect(result.current.copyPasteDayState.sourceDayPlan).toBeNull()
      expect(result.current.copyPasteDayState.sourceDayId).toBeNull()
      expect(result.current.canPaste).toBe(false)
    })
  })

  describe('Edge Cases', () => {
    it('should handle day with empty meals array', () => {
      const { result } = renderHook(() => useCopyPasteDay())
      const testDay = createTestDayPlan({ meals: [] })

      act(() => {
        result.current.copyDay(testDay)
      })

      let pastedDay: DayPlan | null = null
      act(() => {
        pastedDay = result.current.pasteDay()
      })

      expect(pastedDay).not.toBeNull()
      expect(pastedDay!.meals).toHaveLength(0)
    })

    it('should handle meal with empty ingredients array', () => {
      const { result } = renderHook(() => useCopyPasteDay())
      const testDay = createTestDayPlan({
        meals: [createTestMeal({ ingredients: [] })],
      })

      act(() => {
        result.current.copyDay(testDay)
      })

      let pastedDay: DayPlan | null = null
      act(() => {
        pastedDay = result.current.pasteDay()
      })

      expect(pastedDay).not.toBeNull()
      expect(pastedDay!.meals[0].ingredients).toHaveLength(0)
    })
  })
})
