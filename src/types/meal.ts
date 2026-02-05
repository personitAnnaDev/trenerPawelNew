// Typy do obsługi jadłospisów

export interface Ingredient {
  id: string;
  ingredient_id?: string;
  name: string;
  quantity: number;
  unit: string;
  unit_weight?: number;
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
  time?: string;
  order_index?: number;
}

export interface DayPlan {
  id: string;
  name: string;
  meals: Meal[];
}
