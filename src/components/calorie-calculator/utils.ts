// Enhanced numeric input validation
export const validateNumericInput = (value: string, allowDecimals: boolean = true): string => {
  if (value === "") return value;
  
  // Remove any non-numeric characters except comma and dot
  let cleanValue = value.replace(/[^0-9.,]/g, '');
  
  // Handle decimal places
  if (!allowDecimals) {
    cleanValue = cleanValue.replace(/[.,]/g, '');
  } else {
    // Allow only one decimal separator (comma or dot)
    const commaCount = (cleanValue.match(/,/g) || []).length;
    const dotCount = (cleanValue.match(/\./g) || []).length;
    
    if (commaCount + dotCount > 1) {
      // Keep only the first decimal separator
      let foundDecimal = false;
      cleanValue = cleanValue.replace(/[.,]/g, (match) => {
        if (!foundDecimal) {
          foundDecimal = true;
          return ','; // Always use comma for display
        }
        return '';
      });
    } else if (cleanValue.includes('.')) {
      // Convert dot to comma for Polish format
      cleanValue = cleanValue.replace('.', ',');
    }
  }
  
  // Prevent negative values (convert to number using dot for parsing)
  const numValue = parseFloat(cleanValue.replace(',', '.'));
  if (numValue < 0) return "0";
  
  return cleanValue;
};

// String-based versions (legacy - for backward compatibility)
export const calculateGramsFromPercentage = (percentage: string, calories: string, macroType: 'protein' | 'fat' | 'carbs') => {
  const percentNum = parseFloat(percentage.replace(',', '.'));
  const caloriesNum = parseFloat(calories.replace(',', '.'));

  if (isNaN(percentNum) || isNaN(caloriesNum)) return "";

  const caloriesFromMacro = (caloriesNum * percentNum) / 100;
  let grams = 0;

  switch (macroType) {
    case 'protein':
      grams = caloriesFromMacro / 4;
      break;
    case 'fat':
      grams = caloriesFromMacro / 9;
      break;
    case 'carbs':
      grams = caloriesFromMacro / 4;
      break;
  }

  return Math.round(grams).toString().replace('.', ',');
};

export const calculatePercentageFromGrams = (grams: string, calories: string, macroType: 'protein' | 'fat' | 'carbs') => {
  const gramsNum = parseFloat(grams.replace(',', '.'));
  const caloriesNum = parseFloat(calories.replace(',', '.'));

  if (isNaN(gramsNum) || isNaN(caloriesNum) || caloriesNum === 0) return "";

  let caloriesFromMacro = 0;

  switch (macroType) {
    case 'protein':
      caloriesFromMacro = gramsNum * 4;
      break;
    case 'fat':
      caloriesFromMacro = gramsNum * 9;
      break;
    case 'carbs':
      caloriesFromMacro = gramsNum * 4;
      break;
  }

  const percentage = (caloriesFromMacro / caloriesNum) * 100;
  const result = Math.round(percentage * 10) / 10;
  return result.toString().replace('.', ',');
};

// Number-based versions (preferred)
export const calculateGramsFromPercentageNum = (percentage: number, calories: number, macroType: 'protein' | 'fat' | 'carbs'): number => {
  // 🔧 FIX: Allow 0 values - check if undefined/null instead of falsy
  if ((percentage !== 0 && !percentage) || !calories) return 0;

  const caloriesFromMacro = (calories * percentage) / 100;
  let grams = 0;

  switch (macroType) {
    case 'protein':
      grams = caloriesFromMacro / 4;
      break;
    case 'fat':
      grams = caloriesFromMacro / 9;
      break;
    case 'carbs':
      grams = caloriesFromMacro / 4;
      break;
  }

  return Math.round(grams);
};

export const calculatePercentageFromGramsNum = (grams: number, calories: number, macroType: 'protein' | 'fat' | 'carbs'): number => {
  // 🔧 FIX: Allow 0 values - check if undefined/null instead of falsy
  if ((grams !== 0 && !grams) || !calories || calories === 0) return 0;

  let caloriesFromMacro = 0;

  switch (macroType) {
    case 'protein':
      caloriesFromMacro = grams * 4;
      break;
    case 'fat':
      caloriesFromMacro = grams * 9;
      break;
    case 'carbs':
      caloriesFromMacro = grams * 4;
      break;
  }

  const percentage = (caloriesFromMacro / calories) * 100;
  return Math.round(percentage * 10) / 10;
};

// Calculate grams needed for specific macro to fill missing calories (or remove surplus)
export const calculateMissingGramsForMacro = (missingCalories: number, macroType: 'protein' | 'fat' | 'carbs'): number => {
  if (missingCalories === 0) return 0;

  let gramsNeeded = 0;

  switch (macroType) {
    case 'protein':
      gramsNeeded = missingCalories / 4;
      break;
    case 'fat':
      gramsNeeded = missingCalories / 9;
      break;
    case 'carbs':
      gramsNeeded = missingCalories / 4;
      break;
  }

  return Math.round(gramsNeeded);
};

// Format the Polish suggestion text
export const formatMacroSuggestionText = (grams: number, isDeficit: boolean): string => {
  if (isDeficit) {
    return `Dodaj brakujące dzienne kalorie - ${grams} gramów`;
  } else {
    return `Usuń nadwyżkę kalorii - ${Math.abs(grams)} gramów`;
  }
};
