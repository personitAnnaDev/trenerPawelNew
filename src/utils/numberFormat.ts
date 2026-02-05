/**
 * Formatuje liczby z przecinkami zamiast kropek dla polskiej lokalizacji
 * ENHANCED for Issue #2: Better precision handling and edge cases
 */

import { parsePolishNumberSafe, formatPolishNumber } from './preciseCalculations';

/**
 * Formatuje liczbę używając przecinka jako separatora dziesiętnego
 * @param value - liczba do sformatowania
 * @param decimals - liczba miejsc po przecinku (domyślnie 1)
 * @returns sformatowana liczba jako string
 * @deprecated Use formatPolishNumber from preciseCalculations for better precision
 */
export const formatNumber = (value: number | string, decimals: number = 1): string => {
  const num = typeof value === 'string' ? parseFloat(value) : value;

  if (isNaN(num)) {
    return '0';
  }

  // Formatuj z określoną liczbą miejsc po przecinku i zamień kropkę na przecinek
  return num.toFixed(decimals).replace('.', ',');
};

/**
 * Formatuje liczbę do wyświetlenia makroskładników
 * Usuwa niepotrzebne zera po przecinku
 * ENHANCED: Now uses precise calculations
 */
export const formatMacro = (value: number | string): string => {
  return formatPolishNumber(value, 1);
};

/**
 * Parsuje liczbę z polskim formatem (przecinek) do number
 * @param value - string z liczbą w formacie polskim
 * @returns liczba jako number
 * @deprecated Use parsePolishNumberSafe from preciseCalculations for better error handling
 */
export const parsePolishNumber = (value: string): number => {
  return parseFloat(value.replace(',', '.'));
};

/**
 * Enhanced Polish number parsing with error handling
 * @param value - String or number to parse
 * @param defaultValue - Default value if parsing fails
 * @returns Safely parsed number
 */
export const parsePolishNumberEnhanced = (
  value: string | number | null | undefined,
  defaultValue: number = 0
): number => {
  return parsePolishNumberSafe(value, defaultValue);
};
