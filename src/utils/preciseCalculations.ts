/**
 * Precise calculations utility using Decimal.js
 * Fixes precision issues with floating point arithmetic
 *
 * Issue #2: Błędne przeskalowania składników (150g → 15g, 140g → 139,9g)
 */

import { Decimal } from 'decimal.js';
import { logger } from '@/utils/logger';

// Configure Decimal.js for nutrition calculations
Decimal.set({
  precision: 10,
  rounding: Decimal.ROUND_HALF_UP, // Banker's rounding
  toExpNeg: -7,
  toExpPos: 21,
  maxE: 9e15,
  minE: -9e15,
  modulo: Decimal.ROUND_FLOOR,
  crypto: false
});

/**
 * Safely converts value to Decimal, handling Polish locale (comma separator)
 */
export const toDecimal = (value: number | string | null | undefined): Decimal => {
  if (value === null || value === undefined || value === '') {
    return new Decimal(0);
  }

  if (typeof value === 'string') {
    // Handle Polish locale: replace comma with dot
    const normalized = value.replace(',', '.');
    const parsed = parseFloat(normalized);
    if (isNaN(parsed)) {
      logger.warn(`🔢 Invalid number format: "${value}", defaulting to 0`);
      return new Decimal(0);
    }
    return new Decimal(parsed);
  }

  if (typeof value === 'number') {
    if (isNaN(value) || !isFinite(value)) {
      logger.warn(`🔢 Invalid number value: ${value}, defaulting to 0`);
      return new Decimal(0);
    }
    return new Decimal(value);
  }

  return new Decimal(0);
};

/**
 * Precise multiplication with proper rounding
 * @param a - First operand
 * @param b - Second operand
 * @param decimalPlaces - Number of decimal places (default: 1)
 */
export const preciseMultiply = (
  a: number | string,
  b: number | string,
  decimalPlaces: number = 1
): number => {
  const decimalA = toDecimal(a);
  const decimalB = toDecimal(b);
  const result = decimalA.mul(decimalB);

  return parseFloat(result.toFixed(decimalPlaces));
};

/**
 * Precise division with proper rounding
 * @param a - Dividend
 * @param b - Divisor
 * @param decimalPlaces - Number of decimal places (default: 1)
 */
export const preciseDivide = (
  a: number | string,
  b: number | string,
  decimalPlaces: number = 1
): number => {
  const decimalA = toDecimal(a);
  const decimalB = toDecimal(b);

  if (decimalB.isZero()) {
    logger.warn(`🔢 Division by zero: ${a} / ${b}, returning 0`);
    return 0;
  }

  const result = decimalA.div(decimalB);
  return parseFloat(result.toFixed(decimalPlaces));
};

/**
 * Precise addition with proper rounding
 */
export const preciseAdd = (
  a: number | string,
  b: number | string,
  decimalPlaces: number = 1
): number => {
  const decimalA = toDecimal(a);
  const decimalB = toDecimal(b);
  const result = decimalA.add(decimalB);

  return parseFloat(result.toFixed(decimalPlaces));
};

/**
 * Calculate nutrition macros with precise arithmetic
 * @param quantity - Ingredient quantity
 * @param nutritionPer100g - Nutrition values per 100g
 * @param unitWeight - Weight per unit (for non-gram units)
 * @param unit - Unit type (g, ml, sztuka, etc.)
 */
export const calculateNutritionMacros = (
  quantity: number | string,
  nutritionPer100g: {
    calories?: number;
    protein?: number;
    carbs?: number;
    fat?: number;
    fiber?: number;
  },
  unitWeight: number = 100,
  unit?: string
): {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
} => {
  const qty = toDecimal(quantity);
  const weight = toDecimal(unitWeight);

  // Calculate grams based on unit type
  let grams: Decimal;
  if (unit === 'mililitry' || unit === 'ml') {
    // For ml, unitWeight is grams per 100ml
    // Example: 200ml mleka, unitWeight=103g/100ml → (200/100)*103 = 206g
    grams = qty.div(100).mul(weight);
  } else if (unit === 'gramy' || unit === 'g') {
    // For grams, quantity is already in grams
    grams = qty;
  } else {
    // For sztuka and other units, unitWeight is grams per 1 unit
    // Example: 2 jajka, unitWeight=180g/sztuka → 2*180 = 360g
    grams = qty.mul(weight);
  }

  // Calculate multiplier: grams / 100
  const multiplier = grams.div(100);

  const result = {
    calories: preciseMultiply(nutritionPer100g.calories || 0, multiplier.toString(), 1),
    protein: preciseMultiply(nutritionPer100g.protein || 0, multiplier.toString(), 1),
    carbs: preciseMultiply(nutritionPer100g.carbs || 0, multiplier.toString(), 1),
    fat: preciseMultiply(nutritionPer100g.fat || 0, multiplier.toString(), 1),
    fiber: preciseMultiply(nutritionPer100g.fiber || 0, multiplier.toString(), 1)
  };

  return result;
};

/**
 * Scale ingredient quantities by ratio with precise arithmetic
 * @param ingredients - Array of ingredients to scale
 * @param targetValue - Target macro value
 * @param currentValue - Current macro value
 */
export const scaleIngredientsByRatio = <T extends { quantity: number }>(
  ingredients: T[],
  targetValue: number | string,
  currentValue: number | string
): T[] => {
  const target = toDecimal(targetValue);
  const current = toDecimal(currentValue);

  if (current.isZero() || target.isZero()) {
    logger.warn(`🔢 Invalid scaling: target=${target.toString()}, current=${current.toString()}`);
    return ingredients;
  }

  // Calculate ratio: target / current
  const ratio = target.div(current);


  return ingredients.map(ingredient => {
    const oldQuantity = toDecimal(ingredient.quantity);
    const newQuantity = oldQuantity.mul(ratio);

    return {
      ...ingredient,
      quantity: parseFloat(newQuantity.toFixed(1))
    };
  });
};

/**
 * Enhanced Polish number parsing with edge case handling
 * @param value - String value potentially with Polish formatting
 * @param defaultValue - Default value if parsing fails
 */
export const parsePolishNumberSafe = (
  value: string | number | null | undefined,
  defaultValue: number = 0
): number => {
  if (value === null || value === undefined || value === '') {
    return defaultValue;
  }

  if (typeof value === 'number') {
    return isNaN(value) || !isFinite(value) ? defaultValue : value;
  }

  if (typeof value === 'string') {
    // Handle edge cases
    const trimmed = value.trim();

    // Empty string
    if (trimmed === '') {
      return defaultValue;
    }

    // Multiple commas/dots (invalid format)
    if ((trimmed.match(/,/g) || []).length > 1 || (trimmed.match(/\./g) || []).length > 1) {
      logger.warn(`🔢 Invalid number format (multiple separators): "${value}"`);
      return defaultValue;
    }

    // Contains non-numeric characters (except comma/dot)
    if (!/^-?\d*[,.]?\d*$/.test(trimmed)) {
      logger.warn(`🔢 Invalid number format (non-numeric chars): "${value}"`);
      return defaultValue;
    }

    // Replace comma with dot for JavaScript parsing
    const normalized = trimmed.replace(',', '.');
    const parsed = parseFloat(normalized);

    if (isNaN(parsed) || !isFinite(parsed)) {
      logger.warn(`🔢 Failed to parse number: "${value}"`);
      return defaultValue;
    }

    return parsed;
  }

  return defaultValue;
};

/**
 * Validate and sanitize quantity input
 * @param value - Raw input value
 * @param min - Minimum allowed value
 * @param max - Maximum allowed value
 */
export const validateQuantityInput = (
  value: string | number,
  min: number = 0.1,
  max: number = 9999
): { isValid: boolean; value: number; error?: string } => {
  const parsed = parsePolishNumberSafe(value);

  if (parsed < min) {
    return {
      isValid: false,
      value: min,
      error: `Wartość musi być większa niż ${min}`
    };
  }

  if (parsed > max) {
    return {
      isValid: false,
      value: max,
      error: `Wartość nie może być większa niż ${max}`
    };
  }

  return {
    isValid: true,
    value: parsed
  };
};

/**
 * Format number for Polish locale display
 * @param value - Number to format
 * @param decimalPlaces - Number of decimal places
 */
export const formatPolishNumber = (
  value: number | string,
  decimalPlaces: number = 1
): string => {
  const num = parsePolishNumberSafe(value, 0);

  // If it's a whole number and we don't need decimals, show as integer
  if (decimalPlaces === 1 && num % 1 === 0) {
    return num.toString();
  }

  return num.toLocaleString('pl-PL', {
    minimumFractionDigits: 0,
    maximumFractionDigits: decimalPlaces
  });
};