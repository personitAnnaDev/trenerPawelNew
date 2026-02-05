/**
 * Shared TypeScript interfaces for PDF generation
 * Used by both DietPDFGenerator (component) and useDietPDFGenerator (hook)
 */

export interface Ingredient {
  id: string;
  name: string;
  quantity: number;
  unit: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
}

export interface Meal {
  id: string;
  name: string;
  dish: string;
  instructions: string[];
  ingredients: Ingredient[];
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
  countTowardsDailyCalories: boolean;
  order_index?: number;
}

export interface DayPlan {
  id: string;
  name: string;
  meals: Meal[];
}

export interface MacroPlanning {
  calories: string;
  proteinPercentage: string;
  proteinGrams: string;
  fatPercentage: string;
  fatGrams: string;
  carbsPercentage: string;
  carbsGrams: string;
  fiberGrams: string;
}

export interface CalculatorResults {
  bmr: number;
  tdee: number;
}

export interface Client {
  id: string;
  imie: string;
  nazwisko: string;
  dataUrodzenia?: string;
  plec?: string;
  wzrost?: string;
  wagaPoczatkowa?: string;
  current_weight?: string;
  bmr?: number;
  tdee?: number;
  produktyNielubiane?: string;
  alergieZywieniowe?: string;
  problemyZdrowotne?: string;
  obecnyProces?: string;
  notatkiOgolne?: string;
}

export interface DietPDFDocumentProps {
  client: Client;
  dayPlans: DayPlan[];
  dayCalories: { [dayId: string]: string };
  dayMacros: { [dayId: string]: MacroPlanning };
  calculatorResults: CalculatorResults | null;
  importantNotes?: string;
  showMacros?: boolean;
  selectedDayIds?: string[]; // Filtrowanie dni do PDF
  headerHeightPt: number;
  footerHeightPt: number;
  headerUrl: string;
  footerUrl: string;
}

/**
 * Props for useDietPDFGenerator hook consumers (without internal dimensions)
 * These props are passed by components, hook adds headerHeightPt, footerHeightPt, headerUrl, footerUrl
 */
export type DietPDFGeneratorProps = Omit<
  DietPDFDocumentProps,
  'headerHeightPt' | 'footerHeightPt' | 'headerUrl' | 'footerUrl'
>;
