/**
 * Utility functions for Polish unit formatting with proper grammatical cases
 */

import { formatPolishNumber } from './preciseCalculations';

interface UnitDeclension {
  singular: string; // 1
  plural2to4: string; // 2-4 
  plural5plus: string; // 5+
}

const POLISH_UNITS: Record<string, UnitDeclension> = {
  'sztuka': {
    singular: 'sztuka',
    plural2to4: 'sztuki', 
    plural5plus: 'sztuk'
  },
  'sztuki': {
    singular: 'sztuka',
    plural2to4: 'sztuki',
    plural5plus: 'sztuk'
  },
  'łyżeczka': {
    singular: 'łyżeczka',
    plural2to4: 'łyżeczki',
    plural5plus: 'łyżeczek'
  },
  'łyżka': {
    singular: 'łyżka',
    plural2to4: 'łyżki',
    plural5plus: 'łyżek'
  },
  'szklanka': {
    singular: 'szklanka',
    plural2to4: 'szklanki',
    plural5plus: 'szklanek'
  },
  'kubek': {
    singular: 'kubek',
    plural2to4: 'kubki',
    plural5plus: 'kubków'
  },
  'garść': {
    singular: 'garść',
    plural2to4: 'garście',
    plural5plus: 'garści'
  },
  'plasterek': {
    singular: 'plasterek',
    plural2to4: 'plasterki',
    plural5plus: 'plasterków'
  },
  'kawałek': {
    singular: 'kawałek',
    plural2to4: 'kawałki',
    plural5plus: 'kawałków'
  },
  'gram': {
    singular: 'gram',
    plural2to4: 'gramy',
    plural5plus: 'gramów'
  },
  'gramy': {
    singular: 'gram',
    plural2to4: 'gramy',
    plural5plus: 'gramów'
  },
  'g': {
    singular: 'g',
    plural2to4: 'g',
    plural5plus: 'g'
  },
  'mililitr': {
    singular: 'mililitr',
    plural2to4: 'mililitry',
    plural5plus: 'mililitrów'
  },
  'mililitry': {
    singular: 'mililitr',
    plural2to4: 'mililitry',
    plural5plus: 'mililitrów'
  },
  'ml': {
    singular: 'ml',
    plural2to4: 'ml',
    plural5plus: 'ml'
  },
  'litr': {
    singular: 'litr',
    plural2to4: 'litry',
    plural5plus: 'litrów'
  },
  'kilogram': {
    singular: 'kilogram',
    plural2to4: 'kilogramy',
    plural5plus: 'kilogramów'
  },
  'kg': {
    singular: 'kg',
    plural2to4: 'kg',
    plural5plus: 'kg'
  }
};

/**
 * Determines the correct grammatical case for Polish numbers
 */
function getPolishNumberCase(quantity: number): 'singular' | 'plural2to4' | 'plural5plus' {
  // Handle decimal numbers by looking at the integer part
  const integerPart = Math.floor(Math.abs(quantity));
  
  if (integerPart === 1) {
    return 'singular';
  }
  
  const lastDigit = integerPart % 10;
  const lastTwoDigits = integerPart % 100;
  
  // Special cases for teens (11-19)
  if (lastTwoDigits >= 11 && lastTwoDigits <= 19) {
    return 'plural5plus';
  }
  
  // 2, 3, 4 (but not 12, 13, 14)
  if (lastDigit >= 2 && lastDigit <= 4) {
    return 'plural2to4';
  }
  
  // 0, 1, 5-9 (but 1 is handled above)
  return 'plural5plus';
}

/**
 * Formats quantity with proper Polish unit declension
 * @param quantity - The number/quantity
 * @param unit - The base unit (e.g., 'sztuka', 'łyżeczka')
 * @returns Formatted string with proper Polish grammar (e.g., "5 sztuk", "1 łyżeczka")
 */
export function formatPolishUnit(quantity: number, unit: string): string {
  // Format quantity with Polish comma (1 decimal place)
  const formattedQuantity = formatPolishNumber(quantity, 1);

  // Handle empty or unknown units
  if (!unit || unit.trim() === '') {
    return formattedQuantity;
  }

  const unitLower = unit.toLowerCase().trim();
  const unitDeclension = POLISH_UNITS[unitLower];

  // If unit is not in our dictionary, return as-is with space
  if (!unitDeclension) {
    return `${formattedQuantity} ${unit}`;
  }

  const numberCase = getPolishNumberCase(quantity);
  let properUnit: string;

  switch (numberCase) {
    case 'singular':
      properUnit = unitDeclension.singular;
      break;
    case 'plural2to4':
      properUnit = unitDeclension.plural2to4;
      break;
    case 'plural5plus':
      properUnit = unitDeclension.plural5plus;
      break;
  }

  return `${formattedQuantity} ${properUnit}`;
}

/**
 * Formats ingredients list with proper Polish grammar
 * @param ingredients - Array of ingredients with quantity and unit
 * @returns Formatted string for ingredients description
 */
export function formatIngredientsString(ingredients: Array<{nazwa: string, quantity: number, unit: string}>): string {
  return ingredients
    .map(ing => `${ing.nazwa} - ${formatPolishUnit(ing.quantity, ing.unit)}`)
    .join(', ');
}
