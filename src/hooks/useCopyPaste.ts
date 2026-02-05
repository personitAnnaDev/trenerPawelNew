import { useState, useMemo } from 'react'
import { Meal, Ingredient } from '@/types/meal'

/**
 * Stan trybu kopiowania posiłków
 */
export interface CopyPasteState {
  isActive: boolean          // czy tryb kopiowania aktywny
  sourceMeal: Meal | null     // skopiowany posiłek (deep clone)
  sourceDayId: string | null  // ID dnia źródłowego
  sourceOrderIndex: number    // pozycja posiłku w źródle
}

/**
 * Interfejs zwracany przez hook useCopyPaste
 */
export interface UseCopyPasteReturn {
  copyPasteState: CopyPasteState
  copyMeal: (meal: Meal, dayId: string, orderIndex: number) => void
  pasteMeal: (targetDayId: string) => Meal | null
  clearClipboard: () => void
  canPaste: boolean
}

/**
 * Hook do zarządzania kopiowaniem i wklejaniem posiłków między dniami.
 *
 * Funkcjonalność:
 * - Kopiowanie posiłków z deep clone
 * - Multi-paste: 1 copy → N paste
 * - Generowanie nowych UUID dla sklonowanych posiłków i składników
 * - Zarządzanie stanem clipboardu
 *
 * @example
 * ```tsx
 * const { copyMeal, pasteMeal, canPaste, clearClipboard } = useCopyPaste()
 *
 * // Kopiuj posiłek
 * copyMeal(meal, 'day-1', 2)
 *
 * // Wklej do innego dnia
 * const clonedMeal = pasteMeal('day-2')
 *
 * // Zakończ tryb kopiowania
 * clearClipboard()
 * ```
 */
export function useCopyPaste(): UseCopyPasteReturn {
  const [copyPasteState, setCopyPasteState] = useState<CopyPasteState>({
    isActive: false,
    sourceMeal: null,
    sourceDayId: null,
    sourceOrderIndex: 0,
  })

  /**
   * Kopiuje posiłek do clipboardu.
   * Wykonuje deep clone posiłku i zapisuje w state.
   *
   * @param meal - Posiłek do skopiowania
   * @param dayId - ID dnia źródłowego
   * @param orderIndex - Pozycja posiłku w dniu źródłowym
   */
  const copyMeal = (meal: Meal, dayId: string, orderIndex: number): void => {
    // Deep clone meal (aby uniknąć mutacji oryginalnego obiektu)
    const clonedMeal: Meal = {
      ...meal,
      ingredients: meal.ingredients.map(ing => ({ ...ing })),
      instructions: [...meal.instructions],
    }

    setCopyPasteState({
      isActive: true,
      sourceMeal: clonedMeal,
      sourceDayId: dayId,
      sourceOrderIndex: orderIndex,
    })
  }

  /**
   * Wkleja skopiowany posiłek do docelowego dnia.
   * Tworzy nowy posiłek z nowymi UUID dla meal i ingredients.
   *
   * Uwaga: NIE czyści clipboardu po wklejeniu (multi-paste workflow).
   *
   * @param targetDayId - ID dnia docelowego
   * @returns Sklonowany posiłek z nowymi UUID lub null jeśli nie ma skopiowanego posiłku
   */
  const pasteMeal = (targetDayId: string): Meal | null => {
    if (!copyPasteState.sourceMeal) {
      return null
    }

    // Clone meal z nowymi UUID
    const pastedMeal: Meal = {
      ...copyPasteState.sourceMeal,
      id: crypto.randomUUID(),
      name: copyPasteState.sourceMeal.name + ' (kopia)',
      ingredients: copyPasteState.sourceMeal.ingredients.map((ing: Ingredient) => ({
        ...ing,
        id: crypto.randomUUID(),
      })),
      instructions: [...copyPasteState.sourceMeal.instructions],
    }

    return pastedMeal
  }

  /**
   * Czyści clipboard i kończy tryb kopiowania.
   * Resetuje state do wartości początkowych.
   */
  const clearClipboard = (): void => {
    setCopyPasteState({
      isActive: false,
      sourceMeal: null,
      sourceDayId: null,
      sourceOrderIndex: 0,
    })
  }

  /**
   * Computed property: czy można wkleić (czy jest skopiowany posiłek)
   */
  const canPaste = useMemo(
    () => copyPasteState.isActive && copyPasteState.sourceMeal !== null,
    [copyPasteState.isActive, copyPasteState.sourceMeal]
  )

  return {
    copyPasteState,
    copyMeal,
    pasteMeal,
    clearClipboard,
    canPaste,
  }
}
