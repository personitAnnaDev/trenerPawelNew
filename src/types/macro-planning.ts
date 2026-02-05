/**
 * Unified MacroPlanning interface used across the entire application
 *
 * IMPORTANT: All macro values use NUMBER type for consistency
 * - String ↔ Number conversion happens ONLY at database boundaries
 * - Within the app, all calculations use numbers
 *
 * Field naming convention:
 * - *PerKg: Grams per kg of body weight (used internally by calculator)
 * - *Grams: Absolute grams (displayed to user)
 * - *Percentage: Percentage of total calories
 */
export interface MacroPlanning {
  calories: number;

  // Protein
  proteinPercentage: number;
  proteinPerKg: number;
  proteinGrams: number;

  // Fat
  fatPercentage: number;
  fatPerKg: number;
  fatGrams: number;

  // Carbs
  carbsPercentage: number;
  carbsPerKg: number;
  carbsGrams: number;

  // Fiber
  fiberPerKg: number;
  fiberGrams: number;
}

/**
 * Calculator results interface
 */
export interface CalculatorResults {
  bmr: number;
  tdee: number;
}
