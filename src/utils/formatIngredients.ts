/**
 * Utility functions for formatting ingredient data with Polish locale
 */

/**
 * Shortens unit names to their abbreviated forms for display
 * @param unit - The full unit name (e.g., 'gramy', 'sztuki', 'łyżeczka')
 * @returns Shortened unit (e.g., 'g', 'szt', 'łyż.')
 */
export const shortenUnit = (unit: string): string => {
  const u = (unit || "").toLowerCase();
  if (u === "gramy" || u === "gram") return "g";
  if (u === "mililitry" || u === "ml") return "ml";
  if (u === "sztuki" || u === "sztuka" || u === "szt") return "szt";
  if (u.includes("łyżeczka")) return "łyż.";
  if (u.includes("łyżka")) return "łyżka";
  if (u.includes("szkl")) return "szkl";
  return u.slice(0, 5);
};

/**
 * Formats ingredient quantity with Polish locale (comma as decimal separator), proper spacing, and shortened units
 * @param quantity - The numeric quantity value
 * @param unit - The unit string (e.g., 'gramy', 'sztuki', 'łyżeczka')
 * @returns Formatted string like "2,5 g" or "1,75 szt"
 */
export const formatIngredientQuantity = (quantity: number, unit: string): string => {
  const shortUnit = shortenUnit(unit);
  // Support up to 2 decimal places for quarter pieces (0.25, 0.5, 0.75) and pinch portions
  return `${quantity.toLocaleString('pl-PL', { maximumFractionDigits: 2 })} ${shortUnit}`;
};

/**
 * Formats a numeric value with Polish locale (comma as decimal separator)
 * @param value - The numeric value to format
 * @returns Formatted string like "2,5" or "1,75"
 */
export const formatPolishNumber = (value: number): string => {
  return value.toLocaleString('pl-PL');
};

/**
 * Determines the default quantity for a given unit when adding ingredients
 * @param unit - The unit string (e.g., 'g', 'gramy', 'sztuka', 'łyżeczka')
 * @returns Default quantity: 100 for weight/volume units, 1 for piece units
 */
export const getDefaultQuantityForUnit = (unit: string): number => {
  const u = (unit || "").toLowerCase().trim();
  
  // Jednostki masowe/objętościowe - domyślnie 100
  const weightVolumeUnits = [
    'g', 'gram', 'gramy',
    'ml', 'mililitr', 'mililitry', 'mililitry'
  ];
  
  // Jednostki sztukowe - domyślnie 1
  const pieceUnits = [
    'sztuka', 'sztuki', 'szt',
    'łyżeczka', 'łyżka',
    'szklanka', 'szklanki', 'szkl'
  ];
  
  if (weightVolumeUnits.includes(u)) {
    return 100;
  } else if (pieceUnits.includes(u)) {
    return 1;
  }
  
  // Fallback: jeśli jednostka zawiera charakterystyczne słowa
  if (u.includes('gram') || u.includes('ml') || u.includes('litr')) {
    return 100;
  }
  
  // Domyślnie dla nieznanych jednostek - 1
  return 1;
};