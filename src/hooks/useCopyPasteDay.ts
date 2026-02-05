import { useState, useMemo } from 'react'
import { DayPlan, Meal, Ingredient } from '@/types/meal'

/**
 * Stan trybu kopiowania dni
 */
export interface CopyPasteDayState {
  isActive: boolean              // czy tryb kopiowania aktywny
  sourceDayPlan: DayPlan | null  // skopiowany dzień (deep clone)
  sourceDayId: string | null     // ID dnia źródłowego
}

/**
 * Interfejs zwracany przez hook useCopyPasteDay
 */
export interface UseCopyPasteDayReturn {
  copyPasteDayState: CopyPasteDayState
  copyDay: (dayPlan: DayPlan) => void
  pasteDay: () => DayPlan | null
  clearClipboard: () => void
  canPaste: boolean
}

/**
 * Hook do zarządzania kopiowaniem i wklejaniem całych dni diety.
 *
 * Funkcjonalność:
 * - Kopiowanie dni z deep clone (day + meals + ingredients)
 * - Multi-paste: 1 copy → N paste
 * - Generowanie nowych UUID dla sklonowanych dni, posiłków i składników
 * - Zarządzanie stanem clipboardu
 *
 * @example
 * ```tsx
 * const { copyDay, pasteDay, canPaste, clearClipboard } = useCopyPasteDay()
 *
 * // Kopiuj dzień
 * copyDay(dayPlan)
 *
 * // Wklej dzień (zwraca nowy DayPlan z nowymi UUID)
 * const clonedDay = pasteDay()
 *
 * // Zakończ tryb kopiowania
 * clearClipboard()
 * ```
 */
export function useCopyPasteDay(): UseCopyPasteDayReturn {
  const [copyPasteDayState, setCopyPasteDayState] = useState<CopyPasteDayState>({
    isActive: false,
    sourceDayPlan: null,
    sourceDayId: null,
  })

  /**
   * Kopiuje cały dzień (day plan) do clipboardu.
   * Wykonuje deep clone dnia, wszystkich posiłków i składników.
   *
   * @param dayPlan - Plan dnia do skopiowania
   */
  const copyDay = (dayPlan: DayPlan): void => {
    // Deep clone day plan z wszystkimi posiłkami i składnikami
    const clonedDayPlan: DayPlan = {
      ...dayPlan,
      meals: dayPlan.meals.map((meal: Meal) => ({
        ...meal,
        ingredients: meal.ingredients.map((ing: Ingredient) => ({ ...ing })),
        instructions: [...meal.instructions],
      })),
    }

    setCopyPasteDayState({
      isActive: true,
      sourceDayPlan: clonedDayPlan,
      sourceDayId: dayPlan.id,
    })
  }

  /**
   * Wkleja skopiowany dzień.
   * Tworzy nowy dzień z nowymi UUID dla day, meals i ingredients.
   *
   * Uwaga: NIE czyści clipboardu po wklejeniu (multi-paste workflow).
   *
   * @returns Sklonowany dzień z nowymi UUID lub null jeśli nie ma skopiowanego dnia
   */
  const pasteDay = (): DayPlan | null => {
    if (!copyPasteDayState.sourceDayPlan) {
      return null
    }

    // Clone day plan z nowymi UUID dla wszystkich encji
    const pastedDayPlan: DayPlan = {
      ...copyPasteDayState.sourceDayPlan,
      id: crypto.randomUUID(), // Nowe UUID dla dnia
      // Nazwa nie jest modyfikowana - modal ustawi nazwę później
      meals: copyPasteDayState.sourceDayPlan.meals.map((meal: Meal) => ({
        ...meal,
        id: crypto.randomUUID(), // Nowe UUID dla posiłku
        ingredients: meal.ingredients.map((ing: Ingredient) => ({
          ...ing,
          id: crypto.randomUUID(), // Nowe UUID dla składnika
        })),
        instructions: [...meal.instructions], // Deep clone instructions
      })),
    }

    return pastedDayPlan
  }

  /**
   * Czyści clipboard i kończy tryb kopiowania.
   * Resetuje state do wartości początkowych.
   */
  const clearClipboard = (): void => {
    setCopyPasteDayState({
      isActive: false,
      sourceDayPlan: null,
      sourceDayId: null,
    })
  }

  /**
   * Computed property: czy można wkleić (czy jest skopiowany dzień)
   */
  const canPaste = useMemo(
    () => copyPasteDayState.isActive && copyPasteDayState.sourceDayPlan !== null,
    [copyPasteDayState.isActive, copyPasteDayState.sourceDayPlan]
  )

  return {
    copyPasteDayState,
    copyDay,
    pasteDay,
    clearClipboard,
    canPaste,
  }
}
