import { useState, useEffect, useMemo, useCallback } from "react";
import { logger } from "@/utils/logger";
import ReactDOM from "react-dom";
import type { Ingredient, Meal } from "@/types/meal";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NumericInput } from "@/components/ui/numeric-input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Plus, Trash2, Save, X, Loader2 } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Check, ChevronsUpDown } from "lucide-react";
import SearchableIngredientInput from "./SearchableIngredientInput";
import { useQuery } from "@tanstack/react-query";
import { getCategories } from "@/utils/supabasePotrawy";
import { getPotrawy, getProducts } from "@/utils/supabasePotrawy";
import { findOrCreateTemplateAndDayPlan } from "@/utils/supabaseTemplates";
import { useAuth } from "@/contexts/AuthContext";
import { shortenUnit, getDefaultQuantityForUnit } from "@/utils/formatIngredients";
import EditableNutritionSection from "./EditableNutritionSection";
import { useModalConfirmation } from "@/hooks/useModalConfirmation";
import { useToast } from "@/hooks/use-toast";
import {
  calculateNutritionMacros,
  scaleIngredientsByRatio,
  parsePolishNumberSafe,
  formatPolishNumber
} from "@/utils/preciseCalculations";

interface DishSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectDish: (meal: Meal) => void;
  onSave?: (meal: Meal) => void;
  meal?: Meal | null;
  dayPlanId: string;
  context: 'templateBuilder' | 'clientDiet';
  onRefreshData?: () => void;
  isSaving?: boolean; // 🎯 HOTFIX: Dodano prop dla loading state
}

import { LoadingSpinner } from "@/components/ui/loading-spinner";

// Type for EditableNutritionSection compatibility
interface SelectedIngredient {
  id: string;
  productId: string;
  nazwa: string;
  quantity: number;
  unit: string;
  unit_weight: number;
}

// Helper function for safe unit weight calculation
const calculateUnitWeight = (ingredient: any, product?: any): number => {
  let unitWeight: number;
  if (ingredient.unit === "gramy" || ingredient.unit === "g") {
    unitWeight = 1;
  } else if (ingredient.unit === "mililitry" || ingredient.unit === "ml") {
    // 🔧 FIX: Prioritize product's current unit_weight over ingredient's cached value
    // This ensures we use fresh data from products table instead of stale cached values
    unitWeight = product?.unit_weight || ingredient.unit_weight || 100;
  } else {
    // 🔧 FIX: For sztuka and other units, prioritize product's current unit_weight
    // Example: Egg product updated to 55g, but old meal has cached 100g
    unitWeight = product?.unit_weight || ingredient.unit_weight || 100;
  }

  return unitWeight;
};

// Helper function for safe product lookup
// 🛡️ SECURITY: Name-based fallback is SAFE here because:
// 1. RLS filters 'products' array to contain ONLY current user's ingredients
// 2. Cannot match foreign ingredients - they're blocked by RLS before reaching this function
// 3. Fallback protects against stale ingredient_id after migrations or cache issues
const findProduct = (products: any[] | undefined, ingredientId?: string, name?: string): any | null => {
  if (!products || !Array.isArray(products)) return null;

  // Primary: Search by ID (most reliable)
  if (ingredientId) {
    const product = products.find(p => p.id === ingredientId);
    if (product) {
      return product;
    }
  }

  // Fallback: Search by name if ID not found
  // This is SAFE because RLS ensures 'products' contains only user's own ingredients
  // Useful when ingredient_id is stale (after migrations) or missing
  if (name) {
    const fallbackProduct = products.find(p => p.name === name);
    if (fallbackProduct) {
      // Fallback found - no logging needed (this is expected behavior for migrated data)
      return fallbackProduct;
    }
  }

  return null;
};

const DishSelectionModal = ({ isOpen, onClose, onSelectDish, onSave, meal, dayPlanId, context, onRefreshData, isSaving: externalIsSaving = false }: DishSelectionModalProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [mealName, setMealName] = useState("");
  const [isEditingLoading, setIsEditingLoading] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [selectedDishId, setSelectedDishId] = useState('');
  const [initialDishIdInEditMode, setInitialDishIdInEditMode] = useState<string | null>(null);
  const [dishSearchOpen, setDishSearchOpen] = useState(false);
  const [instructions, setInstructions] = useState<string[]>([""]);
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [currentStep, setCurrentStep] = useState(1);
  const [countTowardsDailyCalories, setCountTowardsDailyCalories] = useState(true);
  const [macroDraft, setMacroDraft] = useState<{ protein: number; carbs: number; fat: number }>({
    protein: 0,
    carbs: 0,
    fat: 0
  });
  const [isSaving, setIsSaving] = useState(false);

  // Saving overlay state - similar to AI optimization
  const [savingStartTime, setSavingStartTime] = useState<number | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  // Helper functions to block/unblock scroll immediately
  const blockScrollImmediate = () => {
    // Save current scroll position
    const scrollY = window.scrollY;

    // Block scroll
    document.body.style.overflow = 'hidden';
    document.body.style.position = 'fixed';
    document.body.style.top = `-${scrollY}px`;
    document.body.style.width = '100%';

    // Block ALL pointer events on body (except the modal which will be rendered in portal)
    document.body.style.pointerEvents = 'none';

    // Add a style tag to ensure modal portal content is interactive
    const styleEl = document.createElement('style');
    styleEl.id = 'meal-saving-modal-override';
    styleEl.textContent = `
      #meal-saving-modal-portal,
      #meal-saving-modal-portal * {
        pointer-events: auto !important;
      }
    `;
    document.head.appendChild(styleEl);

    // Store scroll position for later restoration
    (document.body as any).__scrollY = scrollY;
  };

  const unblockScrollImmediate = () => {
    const scrollY = (document.body as any).__scrollY || 0;

    // Restore scroll
    document.body.style.overflow = '';
    document.body.style.position = '';
    document.body.style.top = '';
    document.body.style.width = '';
    document.body.style.pointerEvents = '';
    window.scrollTo(0, scrollY);

    // Remove style override
    const style = document.getElementById('meal-saving-modal-override');
    if (style) style.remove();

    // Clean up stored position
    delete (document.body as any).__scrollY;
  };

  // Initial state capture for change detection
  const [initialState, setInitialState] = useState<{
    mealName: string;
    selectedDishId: string;
    instructions: string[];
    ingredients: Ingredient[];
    countTowardsDailyCalories: boolean;
  } | null>(null);

  // Function to check if there are unsaved changes
  const hasUnsavedChanges = useCallback(() => {
    return true; // Always require confirmation
  }, []);

  // Confirmation modal hook
  const { handleClose: handleConfirmationClose, confirmationDialog } = useModalConfirmation({
    title: "Zamknąć tworzenie posiłku?",
    message: "Czy na pewno chcesz zamknąć okno tworzenia/edycji posiłku?",
    hasUnsavedChanges,
    onDiscard: () => {
      // Reset state and close modal
      setMealName("");
      setSelectedDishId("");
      setInstructions([""]);
      setIngredients([]);
      setCurrentStep(1);
      setCountTowardsDailyCalories(true);
      setInitialState(null);
      onClose();
    }
  });

  // Track active saving state for overlay display
  const isSavingActive = isSaving || externalIsSaving;

  // Handle cleanup when externalIsSaving completes (saving done in parent component)
  useEffect(() => {
    // When externalIsSaving goes from true to false, unblock scroll
    if (!externalIsSaving && (document.body as any).__scrollY !== undefined) {
      unblockScrollImmediate();
    }
  }, [externalIsSaving]);

  // Update elapsed time every second during saving
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (savingStartTime) {
      interval = setInterval(() => {
        setElapsedSeconds(Math.floor((Date.now() - savingStartTime) / 1000));
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [savingStartTime]);

  // Start timer when saving begins
  useEffect(() => {
    if (isSavingActive && !savingStartTime) {
      setSavingStartTime(Date.now());
    } else if (!isSavingActive && savingStartTime) {
      // Reset timer when saving completes
      setSavingStartTime(null);
      setElapsedSeconds(0);
    }
  }, [isSavingActive, savingStartTime]);

  // Fetch categories and dishes using unified storage
  const { data: categories, isLoading: categoriesLoading, error: categoriesError } = useQuery({
    queryKey: ['categories'],
    queryFn: getCategories,
  });

  const { data: allDishes } = useQuery({
    queryKey: ['potrawy'],
    queryFn: getPotrawy,
  });

  const { data: products } = useQuery({
    queryKey: ['products'],
    queryFn: getProducts,
  });

  // Wyświetl tylko dania z wybranej kategorii (dokładne porównanie)
  const filteredDishes = allDishes?.filter(dish => 
    selectedCategory === '' ||
    dish.category?.trim().toLowerCase() === selectedCategory.trim().toLowerCase()
  ) || [];

  const selectedDish = allDishes?.find(dish => dish.id === selectedDishId);

  // 🚀 OPTIMIZED: Calculate nutrition function with useCallback
  const calculateNutrition = useCallback(() => {
    // 🔧 ALWAYS recalculate from current product data to ensure freshness after product edits
    const sum = ingredients.reduce(
      (total, ingredient) => {
        // Always lookup current product to get latest nutritional values
        const product = findProduct(products, ingredient.ingredient_id, ingredient.name);

        let nutrition = {
          calories: 0,
          protein: 0,
          carbs: 0,
          fat: 0,
          fiber: 0
        };

        if (product) {
          // Calculate nutrition using precise arithmetic with safe unit weight
          const unitWeight = calculateUnitWeight(ingredient, product);

          nutrition = calculateNutritionMacros(ingredient.quantity, {
            calories: product.calories || 0,
            protein: product.protein || 0,
            carbs: product.carbs || 0,
            fat: product.fat || 0,
            fiber: product.fiber || 0
          }, unitWeight, ingredient.unit);
        }

        return {
          calories: total.calories + nutrition.calories,
          protein: total.protein + nutrition.protein,
          carbs: total.carbs + nutrition.carbs,
          fat: total.fat + nutrition.fat,
          fiber: total.fiber + nutrition.fiber
        };
      },
      { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 }
    );

    // 🔧 FIXED Issue #2: Use parsePolishNumberSafe for precise rounding
    return {
      calories: parsePolishNumberSafe(sum.calories.toFixed(1)),
      protein: parsePolishNumberSafe(sum.protein.toFixed(1)),
      carbs: parsePolishNumberSafe(sum.carbs.toFixed(1)),
      fat: parsePolishNumberSafe(sum.fat.toFixed(1)),
      fiber: parsePolishNumberSafe(sum.fiber.toFixed(1))
    };
  }, [ingredients, products]);

  // 🔧 FIXED Issue #2: Helper function to calculate nutrition for individual ingredient display
  const getIngredientDisplayNutrition = useCallback((ingredient: any) => {
    const product = findProduct(products, ingredient.ingredient_id, ingredient.name);

    if (!product) {
      return {
        calories: 0,
        protein: 0,
        carbs: 0,
        fat: 0,
        fiber: 0
      };
    }

    // Use consolidated unit weight calculation
    const unitWeight = calculateUnitWeight(ingredient, product);

    const result = calculateNutritionMacros(ingredient.quantity, {
      calories: product.calories || 0,
      protein: product.protein || 0,
      carbs: product.carbs || 0,
      fat: product.fat || 0,
      fiber: product.fiber || 0
    }, unitWeight, ingredient.unit);

    return result;
  }, [products]);

  // 🚀 OPTIMIZED: Memoized nutrition calculation - eliminates 2 redundant useEffects
  const nutrition = useMemo(() => {
    return calculateNutrition();
  }, [calculateNutrition]);

  // 🚀 OPTIMIZED: Single useEffect for macro draft updates
  // 🔧 FIX: Use primitive values in dependencies to prevent infinite re-renders
  // Objects (nutrition, meal) change reference on every render even with same values
  useEffect(() => {
    if (isOpen) {
      setMacroDraft({
        protein: nutrition.protein,
        carbs: nutrition.carbs,
        fat: nutrition.fat
      });
    }
  }, [isOpen, meal?.id, nutrition.protein, nutrition.carbs, nutrition.fat]);

  useEffect(() => {
    if (!isOpen) {
      setMealName("");
      setSelectedCategory('');
      setSelectedDishId('');
      setInitialDishIdInEditMode(null);
      setInstructions([""]);
      setIngredients([]);
      setCurrentStep(1);
      setCountTowardsDailyCalories(true);
      setIsEditingLoading(false);
      setIsSaving(false);

      // 🔧 FIX: Ensure pointer-events is restored when modal closes
      // This handles edge cases where blockScrollImmediate was called but unblockScrollImmediate wasn't
      if (document.body.style.pointerEvents === 'none') {
        document.body.style.pointerEvents = '';
        document.body.style.overflow = '';
        document.body.style.position = '';
        document.body.style.top = '';
        document.body.style.width = '';
        const style = document.getElementById('meal-saving-modal-override');
        if (style) style.remove();
      }
      return;
    }

    if (meal && meal.name && allDishes && allDishes.length > 0) {
      setIsEditingLoading(true);
      setMealName(meal.name || "");
      setInstructions(meal.instructions || [""]);

      // Poprawione ustawianie składników:
      // Upewniamy się, że przekazane składniki mają wszystkie potrzebne pola,
      // nawet jeśli pochodzą bezpośrednio z meal_ingredients i nie mają np. `ingredient_id`
      if (Array.isArray(meal.ingredients)) {
        const mappedIngredients = meal.ingredients.map((ing: any) => ({
          ...ing,
          // Jeśli brakuje pól, można tu ustawić domyślne wartości
          calories: ing.calories ?? 0,
          protein: ing.protein ?? 0,
          carbs: ing.carbs ?? 0,
          fat: ing.fat ?? 0,
          fiber: ing.fiber ?? 0,
        }));
        setIngredients(mappedIngredients);
      } else {
        setIngredients([]);
      }

      setCountTowardsDailyCalories(meal.countTowardsDailyCalories ?? true);

      const dish = allDishes.find(d => d.name === meal.dish);
      if (dish) {
        setSelectedCategory(dish.category || "");
        setSelectedDishId(dish.id);
        // Track initial dish in edit mode to detect changes
        setInitialDishIdInEditMode(dish.id);
      }

      // W trybie edycji zaczynamy od kroku 1, aby uniknąć pomyłek
      setCurrentStep(1);
      setIsEditingLoading(false);
    } else if (isOpen) {
      // Tryb tworzenia nowego posiłku
      setCurrentStep(1);
      setInitialDishIdInEditMode(null);
      setIsEditingLoading(false);
    }
  // 🔧 FIX: Use meal?.id instead of meal object to prevent re-runs on reference change
  }, [isOpen, meal?.id, meal?.name, allDishes?.length]);

  // Capture initial state for change detection - only when modal opens
  useEffect(() => {
    if (isOpen && !initialState) {
      // Capture state after modal is fully loaded, but only once
      const timer = setTimeout(() => {
        setInitialState({
          mealName,
          selectedDishId,
          instructions: [...instructions],
          ingredients: [...ingredients],
          countTowardsDailyCalories
        });
      }, 500); // Longer delay to ensure all state is loaded

      return () => clearTimeout(timer);
    } else if (!isOpen) {
      // Reset initial state when modal closes
      setInitialState(null);
    }
  }, [isOpen]); // Remove state dependencies to avoid constant resets

  // 🔧 FIX: Auto-resize textareas ONCE when step 2 is shown (not on every render)
  // This prevents scroll jumping caused by height resets on each re-render
  useEffect(() => {
    if (currentStep === 2 && instructions.length > 0) {
      // Use requestAnimationFrame to ensure DOM is ready
      requestAnimationFrame(() => {
        const textareas = document.querySelectorAll<HTMLTextAreaElement>(
          '[data-instruction-textarea]'
        );
        textareas.forEach(textarea => {
          textarea.style.height = 'auto';
          textarea.style.height = textarea.scrollHeight + 'px';
        });
      });
    }
  }, [currentStep, instructions.length]); // Only re-run when step changes or instructions count changes

  // 🔥 BUGFIX Issue #1: Update ingredients when dish is selected (BUT NOT in edit mode)
  useEffect(() => {
    // 🎯 FIX: Don't override ingredients when editing an existing meal UNLESS user changed the dish
    if (meal && meal.id && selectedDishId === initialDishIdInEditMode) {
      return;
    }

    if (selectedDish && selectedDish.ingredients_json && Array.isArray(selectedDish.ingredients_json)) {

      const dishIngredients = selectedDish.ingredients_json.map((ing: any) => ({
        id: ing.ingredient_id || `dish_ing_${ing.name}_${Date.now()}`,
        ingredient_id: ing.ingredient_id,
        name: ing.name,
        quantity: ing.quantity,
        unit: ing.unit,
        unit_weight: ing.unit_weight || 100,
        calories: 0, // Will be recalculated
        protein: 0,  // Will be recalculated
        carbs: 0,    // Will be recalculated
        fat: 0,      // Will be recalculated
        fiber: 0     // Will be recalculated
      }));

      // Recalculate macros for each ingredient
      const recalculatedIngredients = dishIngredients.map(ing => {
        const macros = recalculateMacros(ing);
        return { ...ing, ...macros };
      });

      setIngredients(recalculatedIngredients);

      // Also update instructions from dish
      if (selectedDish.instructions && Array.isArray(selectedDish.instructions)) {
        setInstructions(selectedDish.instructions);
      }

    }
  // 🔧 FIX: Use primitive IDs instead of objects to prevent re-runs on reference change
  // selectedDish?.id is sufficient since selectedDish is derived from selectedDishId
  }, [selectedDish?.id, products?.length, meal?.id, selectedDishId, initialDishIdInEditMode]);

  const handleCategoryChange = (categoryName: string) => {
    // Jeśli wybrano "all", ustaw pustą kategorię
    const actualCategory = categoryName === 'all' ? '' : categoryName;
    setSelectedCategory(actualCategory);
    setSelectedDishId('');
    // 🔥 BUGFIX Issue #1: Clear ingredients when dish is deselected
    setIngredients([]);
    setInstructions([""]);
  };

  const recalculateMacros = (ingredient: any) => {
    // 🎯 CRITICAL FIX: Use pre-calculated macros from AI if available
    // AI optimization returns precise macros for exact quantities - don't recalculate!
    // Check if ingredient has meaningful pre-calculated macros (not all zeros)
    const hasMeaningfulMacros = ingredient.calories !== undefined &&
        ingredient.protein !== undefined &&
        ingredient.fat !== undefined &&
        ingredient.carbs !== undefined &&
        (ingredient.calories > 0 || ingredient.protein > 0 || ingredient.fat > 0 || ingredient.carbs > 0);

    if (hasMeaningfulMacros) {
      return {
        calories: ingredient.calories,
        protein: ingredient.protein,
        fat: ingredient.fat,
        carbs: ingredient.carbs,
        fiber: ingredient.fiber || 0
      };
    }

    // Safe product lookup
    const product = findProduct(products, ingredient.ingredient_id, ingredient.name);

    if (!product) {
      // Jeśli produkt nie został znaleziony, zwróć istniejące wartości lub zera
      return {
        calories: ingredient.calories || 0,
        protein: ingredient.protein || 0,
        carbs: ingredient.carbs || 0,
        fat: ingredient.fat || 0,
        fiber: ingredient.fiber || 0,
      };
    }

    // Use consolidated unit weight calculation
    const unitWeight = calculateUnitWeight(ingredient, product);

    return calculateNutritionMacros(ingredient.quantity, {
      calories: product.calories || 0,
      protein: product.protein || 0,
      carbs: product.carbs || 0,
      fat: product.fat || 0,
      fiber: product.fiber || 0
    }, unitWeight, ingredient.unit);
  };


  function adjustIngredientsForMacro(ingredients: Ingredient[], macroKey: "protein" | "carbs" | "fat", targetValue: number): Ingredient[] {
    const currentTotal = ingredients.reduce((sum, ing) => sum + (ing[macroKey] || 0), 0);
    if (currentTotal === 0 || targetValue === 0) return ingredients;

    // 🔧 FIXED Issue #2: Use scaleIngredientsByRatio for precise scaling
    const scaledIngredients = scaleIngredientsByRatio(ingredients, targetValue, currentTotal);

    // Recalculate macros for each scaled ingredient
    return scaledIngredients.map(ing => {
      const macros = recalculateMacros(ing);
      return { ...ing, ...macros };
    });
  }

  const handleMacroInputChange = (macroKey: "protein" | "carbs" | "fat", targetValue: number) => {
    setMacroDraft(prev => ({ ...prev, [macroKey]: targetValue }));
    setIngredients(prevIngredients =>
      adjustIngredientsForMacro(prevIngredients, macroKey, targetValue)
    );
  };

  // ✅ OPTIMIZATION 4: Memoized data conversion functions to prevent redundant calls
  
  // Format A (DishSelectionModal) → Format B (EditableNutritionSection)
  const convertToSelectedIngredients = useMemo((): SelectedIngredient[] => {
    if (!ingredients.length) return [];

    const result = ingredients.map((ing, index) => {
      // Safe product ID mapping with type safety
      let productId = ing.ingredient_id || '';

      // Jeśli ingredient_id jest puste, spróbuj znaleźć product po nazwie
      if (!productId && ing.name) {
        const foundProduct = findProduct(products, undefined, ing.name);
        if (foundProduct) {
          productId = foundProduct.id;
        }
      }

      const result: SelectedIngredient = {
        // ✅ OPTIMIZATION 5: More stable ID generation with deterministic fallbacks
        id: ing.id || `stable_ingredient_${productId}_${index}`,
        productId: productId,
        nazwa: ing.name || '',
        quantity: ing.quantity || 0,
        unit: ing.unit || 'g',
        unit_weight: typeof ing.unit_weight === 'number' ? ing.unit_weight : 100
      };

      return result;
    });

    return result;
  }, [ingredients, products]); // Only recalculate when ingredients or products change

  // Format B (EditableNutritionSection) → Format A (DishSelectionModal)
  const convertToMealIngredients = (selectedIngredients: SelectedIngredient[]): Ingredient[] => {
    return selectedIngredients.map(ing => {
      const macros = recalculateMacros({
        ingredient_id: ing.productId,
        name: ing.nazwa,
        quantity: ing.quantity,
        unit: ing.unit,
        unit_weight: ing.unit_weight
      });
      
      return {
        id: ing.id,
        ingredient_id: ing.productId,  // KEY MAPPING: productId → ingredient_id
        name: ing.nazwa,               // KEY MAPPING: nazwa → name
        quantity: ing.quantity,
        unit: ing.unit,
        unit_weight: ing.unit_weight,
        calories: macros.calories,
        protein: macros.protein,
        carbs: macros.carbs,
        fat: macros.fat,
        fiber: macros.fiber
      };
    });
  };

  // 🚀 OPTIMIZED: Debounced quantity update handler
  const updateQuantityImmediate = useCallback((index: number, newQuantity: number) => {
    const updated = [...ingredients];
    updated[index] = { ...updated[index], quantity: newQuantity };
    const macros = recalculateMacros(updated[index]);
    updated[index].calories = macros.calories;
    updated[index].protein = macros.protein;
    updated[index].carbs = macros.carbs;
    updated[index].fat = macros.fat;
    updated[index].fiber = macros.fiber;
    setIngredients(updated);
  }, [ingredients]);

  // 🚀 OPTIMIZED: Polish number formatting with precise calculations
  const formatPLNumber = useCallback((value: number | string): string => {
    if (value === "" || value === null || value === undefined) return "";
    // 🔧 FIXED Issue #2: Use formatPolishNumber for better precision
    return formatPolishNumber(value, 1);
  }, []);


  // 🚀 OPTIMIZED: Mock watch function using memoized nutrition
  const mockWatch = useMemo(() => {
    const mockWatch = ((field: string) => {
      const fieldMap: Record<string, any> = {
        'kcal': nutrition.calories,
        'macro.białko': nutrition.protein,
        'macro.węglowodany': nutrition.carbs,
        'macro.tłuszcz': nutrition.fat
      };
      return fieldMap[field] || 0;
    }) as any;
    return mockWatch;
  }, [nutrition]); // Uses memoized nutrition instead of recalculating

  return (
    <>
      <Dialog open={isOpen} onOpenChange={handleConfirmationClose}>
      <DialogContent className="max-w-[95vw] sm:max-w-4xl lg:max-w-6xl max-h-[90vh] overflow-y-auto bg-zinc-900 border-zinc-800">
        <DialogHeader className="text-left">
          <DialogTitle className="text-zinc-100 text-left">
            {meal && meal.name
              ? `Edytuj posiłek: ${mealName}${selectedDish?.name ? ` (${selectedDish.name})` : ""}`
              : "Dodaj nowy posiłek"}
          </DialogTitle>
          <DialogDescription className="text-zinc-400 text-left">
            {meal && meal.name
              ? "Modyfikuj istniejący posiłek, dostosuj składniki i instrukcje."
              : "Stwórz nowy posiłek, wybierz danie i dostosuj składniki do potrzeb."}
          </DialogDescription>
        </DialogHeader>
        {isEditingLoading ? (
          <div className="flex flex-col items-center justify-center py-16">
            <LoadingSpinner />
            <div className="mt-4 text-zinc-400">Ładowanie danych posiłku...</div>
          </div>
        ) : (
          <div className="space-y-4 sm:space-y-6 w-full max-w-full overflow-hidden">
            {currentStep === 1 && (
            <>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="mealName" className="text-zinc-200">Nazwa posiłku <span className="text-red-500">*</span></Label>
                  <Input
                    id="mealName"
                    value={mealName}
                    onChange={(e) => setMealName(e.target.value)}
                    placeholder="np. Śniadanie, Obiad"
                    className="bg-zinc-800 border-zinc-700 text-zinc-100 focus:border-[#a08032] focus:ring-[#a08032]"
                  />
                </div>
                <div className="flex items-center space-x-3 p-4 bg-zinc-800 rounded-lg border border-zinc-700">
                  <Switch
                    id="countCalories"
                    checked={countTowardsDailyCalories}
                    onCheckedChange={setCountTowardsDailyCalories}
                  />
                  <Label htmlFor="countCalories" className="text-zinc-200 font-medium">
                    Liczy się do dziennych kalorii
                  </Label>
                </div>
                <div>
                  <Label htmlFor="dish-category" className="text-zinc-200">Kategoria dania (opcjonalne)</Label>
                  {categoriesLoading ? (
                    <div className="text-zinc-400 py-2">Ładowanie kategorii...</div>
                  ) : categoriesError ? (
                    <div className="text-red-400 py-2">Błąd ładowania kategorii</div>
                  ) : (
                    <Select value={selectedCategory} onValueChange={handleCategoryChange}>
                      <SelectTrigger id="dish-category" className="bg-zinc-800 border-zinc-700 text-zinc-100 focus:border-[#a08032] focus:ring-[#a08032]">
                        <SelectValue placeholder="Wybierz kategorię dania" />
                      </SelectTrigger>
                      <SelectContent className="bg-zinc-800 border-zinc-700">
                        <SelectItem value="all" className="text-zinc-100 focus:bg-zinc-700">
                          Wszystkie kategorie
                        </SelectItem>
                        {categories?.map((category) => (
                          <SelectItem key={category.id} value={category.name} className="text-zinc-100 focus:bg-zinc-700">
                            {category.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>
                <div>
                  <Label className="text-zinc-200">Nazwa dania <span className="text-red-500">*</span></Label>
                  <Popover open={dishSearchOpen} onOpenChange={setDishSearchOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        role="combobox"
                        aria-expanded={dishSearchOpen}
                        className="w-full justify-between bg-zinc-800 border-zinc-700 text-zinc-100 hover:bg-zinc-700 hover:border-zinc-600 focus:border-[#a08032] focus:ring-[#a08032]"
                      >
                        {selectedDishId
                          ? filteredDishes.find((dish) => dish.id === selectedDishId)?.name
                          : "Wybierz danie..."}
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0 bg-zinc-800 border-zinc-700">
                      <Command className="bg-zinc-800">
                        <CommandInput 
                          placeholder="Wyszukaj danie..." 
                          className="h-9 bg-zinc-800 text-zinc-100 border-zinc-700 m-2"
                        />
                        <CommandList>
                          <CommandEmpty className="py-6 text-center text-sm text-zinc-400">
                            {selectedCategory ? `Brak dań w kategorii "${selectedCategory}"` : "Brak dostępnych dań"}
                          </CommandEmpty>
                          <CommandGroup>
                            {filteredDishes.map((dish) => (
                              <CommandItem
                                key={dish.id}
                                value={dish.name}
                                onSelect={() => {
                                  setSelectedDishId(dish.id);
                                  setSelectedCategory(dish.category || '');
                                  setDishSearchOpen(false);
                                }}
                                className="text-zinc-100 hover:bg-zinc-700 focus:bg-zinc-700"
                              >
                                <Check
                                  className={`mr-2 h-4 w-4 ${
                                    selectedDishId === dish.id ? "opacity-100" : "opacity-0"
                                  }`}
                                />
                                {dish.name}
                                {dish.category && (
                                  <span className="ml-auto text-xs text-zinc-400">
                                    {dish.category}
                                  </span>
                                )}
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                </div>
                <div className="flex flex-col sm:flex-row justify-end gap-2 pt-4">
                  <Button onClick={() => handleConfirmationClose()} variant="outline" className="border-zinc-700 text-zinc-300 hover:bg-zinc-700 w-full sm:w-auto">
                    <X className="h-4 w-4 mr-2" />
                    Anuluj
                  </Button>
                  <Button
                    onClick={() => {
                      // 🔧 FIX: Ładuj składniki z potrawy dla NOWYCH posiłków LUB gdy user zmienił potrawę w EDIT
                      // W trybie EDIT bez zmiany potrawy zostaw customowe składniki użytkownika (meal.ingredients)
                      if (selectedDish && (!meal?.id || selectedDishId !== initialDishIdInEditMode)) {
                        if (Array.isArray(selectedDish.ingredients_json)) {
                          setIngredients(selectedDish.ingredients_json.map((ing: any, idx: number) => {
                            const macros = recalculateMacros(ing);
                            return {
                              id: `ingredient_${ing.ingredient_id}_${idx}`,
                              ingredient_id: ing.ingredient_id,
                              name: ing.name,
                              quantity: ing.quantity,
                              unit: ing.unit || "g",
                              unit_weight: ing.unit_weight || 100,
                              kcal: ing.kcal || 0,
                              proteinBase: ing.protein || 0,
                              carbsBase: ing.carbs || 0,
                              fatBase: ing.fat || 0,
                              fiberBase: ing.fiber || 0,
                              calories: macros.calories,
                              protein: macros.protein,
                              carbs: macros.carbs,
                              fat: macros.fat,
                              fiber: macros.fiber
                            };
                          }));
                        }
                        if (Array.isArray(selectedDish.instructions)) {
                          setInstructions(selectedDish.instructions.length > 0 ? selectedDish.instructions : [""]);
                        } else if (typeof selectedDish.instructions === "string") {
                          setInstructions([selectedDish.instructions]);
                        } else {
                          setInstructions([""]);
                        }
                      }
                      setCurrentStep(2);
                    }}
                    disabled={
                      !mealName.trim() ||
                      !selectedDishId
                    }
                    className="bg-gradient-to-r from-[#a08032] to-[#e6d280] hover:from-[#8a6c2b] hover:to-[#d4c06b] text-zinc-900 font-medium w-full sm:w-auto"
                  >
                    Dalej - Dostosuj składniki
                  </Button>
                </div>
              </div>
            </>
          )}
          {currentStep === 2 && (
            <>
              {/* 🎨 KOMPAKTOWY UI: Połączone składniki i wartości odżywcze */}
              <div className="space-y-3 sm:space-y-4">
                <h3 className="text-zinc-200 font-medium text-left">Składniki i wartości odżywcze</h3>

                <div className="bg-zinc-900/50 rounded-lg p-3 sm:p-4 space-y-3 w-full max-w-full">
                  {/* Desktop header labels - hidden on mobile */}
                  <div className="hidden md:grid grid-cols-12 gap-1 px-2">
                    <div className="col-span-4">
                      <label className="text-xs text-zinc-500">Nazwa składnika</label>
                    </div>
                    <div className="col-span-2">
                      <label className="text-xs text-zinc-500">Ilość</label>
                    </div>
                    <div className="col-span-1 text-center">
                      <label className="text-xs text-zinc-500">Kcal</label>
                    </div>
                    <div className="col-span-1 text-center">
                      <label className="text-xs text-zinc-500">Białko</label>
                    </div>
                    <div className="col-span-1 text-center">
                      <label className="text-xs text-zinc-500">Węgl.</label>
                    </div>
                    <div className="col-span-1 text-center">
                      <label className="text-xs text-zinc-500">Tł.</label>
                    </div>
                    <div className="col-span-1 text-center">
                      <label className="text-xs text-zinc-500">Bł.</label>
                    </div>
                    <div className="col-span-1">
                      <label className="text-xs text-zinc-500"></label>
                    </div>
                  </div>

                  {/* Ingredients list - responsive */}
                  <div className="space-y-2 w-full max-w-full">
                    {ingredients.length === 0 ? (
                      <div className="p-6 text-center text-zinc-400">
                        <p>Brak składników. Użyj wyszukiwarki poniżej, aby dodać składniki.</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {ingredients.map((ingredient, index) => {
                          const nutrition = getIngredientDisplayNutrition(ingredient);
                          return (
                            <div key={ingredient.id || index}>
                              {/* Mobile layout - stack vertically */}
                              <div className="md:hidden space-y-3 w-full max-w-full overflow-hidden">
                                <div className="bg-zinc-800 rounded-lg p-3 space-y-3">
                                  <div className="flex justify-between items-center">
                                    <h4 className="text-sm font-medium text-zinc-200 truncate flex-1 min-w-0 mr-2">{ingredient.name}</h4>
                                    <Button
                                      onClick={() => setIngredients(ingredients.filter((_, i) => i !== index))}
                                      size="sm"
                                      variant="ghost"
                                      className="text-red-400 hover:text-red-300 hover:bg-red-900/20 p-1.5 h-8 w-8 flex-shrink-0"
                                    >
                                      <X className="h-4 w-4" />
                                    </Button>
                                  </div>

                                  <div className="grid grid-cols-2 gap-3">
                                    <div>
                                      <Label htmlFor={`ingredient-qty-mobile-${index}`} className="text-xs text-zinc-500 block mb-1">Ilość</Label>
                                      <div className="relative">
                                        <NumericInput
                                          id={`ingredient-qty-mobile-${index}`}
                                          name={`ingredient-qty-mobile-${index}`}
                                          type="decimal"
                                          value={ingredient.quantity}
                                          onChange={(newQuantity) => {
                                            updateQuantityImmediate(index, newQuantity);
                                          }}
                                          showPlaceholderForZero={false}
                                          className="pr-8 bg-zinc-700 border-zinc-600 text-zinc-100 text-sm h-9 w-full"
                                          placeholder="100"
                                        />
                                        <span className="absolute right-2 top-1/2 transform -translate-y-1/2 text-zinc-400 text-xs pointer-events-none">
                                          {shortenUnit(ingredient.unit)}
                                        </span>
                                      </div>
                                    </div>

                                    <div>
                                      <label className="text-xs text-zinc-500 block mb-1">Kalorie</label>
                                      <div className="px-3 py-2 text-sm text-zinc-300">
                                        {formatPLNumber(nutrition.calories)} kcal
                                      </div>
                                    </div>
                                  </div>

                                  <div className="grid grid-cols-4 gap-2">
                                    <div>
                                      <label className="text-xs text-zinc-500 block mb-1">Białko</label>
                                      <div className="py-1.5 text-xs text-zinc-300">
                                        {formatPLNumber(nutrition.protein)}g
                                      </div>
                                    </div>
                                    <div>
                                      <label className="text-xs text-zinc-500 block mb-1">Węgl.</label>
                                      <div className="py-1.5 text-xs text-zinc-300">
                                        {formatPLNumber(nutrition.carbs)}g
                                      </div>
                                    </div>
                                    <div>
                                      <label className="text-xs text-zinc-500 block mb-1">Tł.</label>
                                      <div className="py-1.5 text-xs text-zinc-300">
                                        {formatPLNumber(nutrition.fat)}g
                                      </div>
                                    </div>
                                    <div>
                                      <label className="text-xs text-zinc-500 block mb-1">Bł.</label>
                                      <div className="py-1.5 text-xs text-zinc-300">
                                        {formatPLNumber(nutrition.fiber)}g
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              </div>

                              {/* Desktop layout - table row */}
                              <div className="hidden md:grid grid-cols-12 gap-1 p-1 bg-zinc-800 rounded items-center">
                                {/* Nazwa składnika */}
                                <div className="col-span-4 truncate" title={ingredient.name}>
                                  <span className="text-zinc-100 text-sm">{ingredient.name}</span>
                                </div>

                                {/* Ilość z jednostką - kompaktowe */}
                                <div className="col-span-2">
                                  <div className="relative">
                                    <NumericInput
                                      id={`ingredient-qty-desktop-${index}`}
                                      name={`ingredient-qty-desktop-${index}`}
                                      type="decimal"
                                      value={ingredient.quantity}
                                      onChange={(newQuantity) => {
                                        updateQuantityImmediate(index, newQuantity);
                                      }}
                                      showPlaceholderForZero={false}
                                      className="pr-6 bg-zinc-700 border-zinc-600 text-zinc-100 text-xs h-7"
                                      placeholder="100"
                                    />
                                    <span className="absolute right-1 top-1/2 transform -translate-y-1/2 text-zinc-400 text-xs pointer-events-none">
                                      {shortenUnit(ingredient.unit)}
                                    </span>
                                  </div>
                                </div>

                                {/* Makroskładniki - kompaktowe */}
                                <div className="col-span-1 text-center">
                                  <span className="text-zinc-100 text-xs">{formatPLNumber(nutrition.calories)}</span>
                                </div>
                                <div className="col-span-1 text-center">
                                  <span className="text-zinc-100 text-xs">{formatPLNumber(nutrition.protein)}</span>
                                </div>
                                <div className="col-span-1 text-center">
                                  <span className="text-zinc-100 text-xs">{formatPLNumber(nutrition.carbs)}</span>
                                </div>
                                <div className="col-span-1 text-center">
                                  <span className="text-zinc-100 text-xs">{formatPLNumber(nutrition.fat)}</span>
                                </div>
                                <div className="col-span-1 text-center">
                                  <span className="text-zinc-100 text-xs">{formatPLNumber(nutrition.fiber)}</span>
                                </div>

                                {/* Przycisk usuń - kompaktowy */}
                                <div className="col-span-1 flex justify-center">
                                  <Button
                                    onClick={() => setIngredients(ingredients.filter((_, i) => i !== index))}
                                    size="sm"
                                    variant="ghost"
                                    className="text-red-400 hover:text-red-300 hover:bg-red-900/20 p-0.5 h-6 w-6"
                                  >
                                    <Trash2 className="h-3 w-3" />
                                  </Button>
                                </div>
                              </div>
                            </div>
                          );
                        })}

                        {/* Summary row - responsive */}
                        {ingredients.length > 0 && (
                          <>
                            {/* Mobile summary */}
                            <div className="md:hidden bg-zinc-800/30 rounded-lg p-3 border-t-2 border-zinc-600 mt-3">
                              <h4 className="text-sm font-medium text-zinc-200 mb-2">PODSUMOWANIE</h4>
                              <div className="grid grid-cols-2 gap-3">
                                <div className="px-3 py-2">
                                  <div className="text-xs text-zinc-400">Kalorie</div>
                                  <div className="text-sm font-medium text-zinc-200">{formatPLNumber(nutrition.calories)} kcal</div>
                                </div>
                                <div className="px-3 py-2">
                                  <div className="text-xs text-zinc-400">Razem</div>
                                  <div className="text-xs text-zinc-300">P: {formatPLNumber(nutrition.protein)}g</div>
                                  <div className="text-xs text-zinc-300">W: {formatPLNumber(nutrition.carbs)}g</div>
                                  <div className="text-xs text-zinc-300">T: {formatPLNumber(nutrition.fat)}g</div>
                                </div>
                              </div>
                            </div>

                            {/* Desktop summary */}
                            <div className="hidden md:grid grid-cols-12 gap-1 p-1 bg-zinc-700/50 rounded items-center border-t-2 border-zinc-600 mt-1">
                              <div className="col-span-4">
                                <span className="text-sm font-medium text-zinc-200">SUMA</span>
                              </div>
                              <div className="col-span-2 text-center">
                              </div>
                              <div className="col-span-1 text-center">
                                <span className="text-xs font-medium text-zinc-200">{formatPLNumber(nutrition.calories)}</span>
                              </div>
                              <div className="col-span-1 text-center">
                                <span className="text-xs font-medium text-zinc-200">{formatPLNumber(nutrition.protein)}</span>
                              </div>
                              <div className="col-span-1 text-center">
                                <span className="text-xs font-medium text-zinc-200">{formatPLNumber(nutrition.carbs)}</span>
                              </div>
                              <div className="col-span-1 text-center">
                                <span className="text-xs font-medium text-zinc-200">{formatPLNumber(nutrition.fat)}</span>
                              </div>
                              <div className="col-span-1 text-center">
                                <span className="text-xs font-medium text-zinc-200">{formatPLNumber(nutrition.fiber)}</span>
                              </div>
                              <div className="col-span-1"></div>
                            </div>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                  
                  {/* SearchableIngredientInput - używa wyszukiwania przez PostgreSQL RPC */}
                  <div className="pt-2 border-t border-zinc-800">
                    <SearchableIngredientInput
                      onIngredientSelect={(selectedProduct: any) => {
                        // BUGFIX 2025-01-06: Validate no duplicate ingredients
                        const isDuplicate = ingredients.some(
                          (ing) => ing.ingredient_id === selectedProduct.id
                        );

                        if (isDuplicate) {
                          toast({
                            variant: "destructive",
                            title: "Składnik już istnieje",
                            description: `"${selectedProduct.nazwa || selectedProduct.name}" jest już w posiłku. Zwiększ jego ilość zamiast dodawać ponownie.`,
                          });
                          return; // Prevent adding duplicate
                        }

                        const qty = getDefaultQuantityForUnit(selectedProduct.unit || "");

                        // 🔧 FIXED Issue #2: Use calculateNutritionMacros for precise calculations
                        const macros = calculateNutritionMacros(qty, {
                          calories: selectedProduct.calories ?? selectedProduct.kcal ?? 0,
                          protein: selectedProduct.macro?.białko ?? selectedProduct.protein ?? 0,
                          carbs: selectedProduct.macro?.węglowodany ?? selectedProduct.carbs ?? 0,
                          fat: selectedProduct.macro?.tłuszcz ?? selectedProduct.fat ?? 0,
                          fiber: selectedProduct.blonnik ?? selectedProduct.fiber ?? 0
                        }, selectedProduct.unit_weight || 100, selectedProduct.unit);

                        const newIngredient: any = {
                          ingredient_id: selectedProduct.id,
                          name: selectedProduct.nazwa || selectedProduct.name || "",
                          quantity: qty,
                          unit: selectedProduct.unit || "g",
                          unit_weight: selectedProduct.unit_weight || 100,
                          ...macros
                        };
                        setIngredients([...ingredients, newIngredient]);
                      }}
                      placeholder="Wyszukaj składnik do dodania..."
                    />
                  </div>
                  
                  {/* EditableNutritionSection - inline w tym samym kontenerze */}
                  <div className="pt-2 border-t border-zinc-800">
                    <EditableNutritionSection
                      watch={mockWatch}
                      onMacroChange={handleMacroInputChange}
                      macroDraft={macroDraft}
                      selectedIngredients={convertToSelectedIngredients}
                      products={products}
                      context="meal"
                      onIngredientsChange={(newSelectedIngredients) => {
                        const convertedIngredients = convertToMealIngredients(newSelectedIngredients);
                        setIngredients(convertedIngredients);
                      }}
                    />
                    {!countTowardsDailyCalories && (
                      <Badge variant="outline" className="border-orange-500 text-orange-400 bg-orange-900/20 mt-2">
                        Nie liczy się do dziennych kalorii
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
              {/* Instructions Section */}
              <div className="space-y-3 sm:space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <h3 className="text-zinc-200 font-medium text-left">Instrukcje przygotowania</h3>
                  <Button onClick={() => setInstructions([...instructions, ""])} size="sm" variant="outline" className="text-zinc-300 border-zinc-700 hover:bg-zinc-700 w-full sm:w-auto">
                    <Plus className="h-4 w-4 mr-2" />
                    <span className="hidden sm:inline">Dodaj instrukcję</span>
                    <span className="sm:hidden">Dodaj</span>
                  </Button>
                </div>
                <div className="space-y-4">
                  {instructions.map((instruction, index) => {
                    return (
                      <div key={index} className="space-y-2">
                        <div className="flex items-center justify-between">
                          <Label htmlFor={`instruction-${index}`} className="text-sm text-zinc-400">Instrukcja {index + 1}</Label>
                          {instructions.length > 1 && (
                            <Button
                              onClick={() => setInstructions(instructions.filter((_, i) => i !== index))}
                              size="sm"
                              variant="ghost"
                              className="text-red-400 hover:text-red-300 hover:bg-red-900/20 p-1.5 h-8 w-8"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                        <Textarea
                          id={`instruction-${index}`}
                          name={`instruction-${index}`}
                          data-instruction-textarea
                          value={instruction}
                          onChange={(e) => {
                            const updated = [...instructions];
                            updated[index] = e.target.value;
                            setInstructions(updated);
                            // autosize
                            const textarea = e.target;
                            textarea.style.height = "auto";
                            textarea.style.height = textarea.scrollHeight + "px";
                          }}
                          placeholder={`Opisz krok ${index + 1} przygotowania...`}
                          className="bg-zinc-800 border-zinc-700 text-zinc-100 min-h-[80px] focus:border-[#a08032] focus:ring-[#a08032] resize-none w-full"
                          rows={3}
                          style={{ overflow: "hidden" }}
                        />
                      </div>
                    );
                  })}
                </div>
              </div>
              {/* Actions for Step 2 */}
              <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-3 pt-6 border-t border-zinc-700">
                <Button onClick={() => setCurrentStep(1)} variant="outline" className="text-zinc-300 border-zinc-700 hover:bg-zinc-700 w-full sm:w-auto order-2 sm:order-1">
                  Wstecz
                </Button>
                <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 order-1 sm:order-2">
                  <Button onClick={() => handleConfirmationClose()} variant="outline" className="text-zinc-300 border-zinc-700 hover:bg-zinc-700 w-full sm:w-auto">
                    <X className="h-4 w-4 mr-2" />
                    Anuluj
                  </Button>
                  <Button
                    onClick={async (e) => {
                      // 🛡️ VALIDATION: Check meal name and ingredients
                      if (!mealName.trim()) {
                        alert("Proszę podać nazwę posiłku");
                        return;
                      }

                      if (ingredients.length === 0) {
                        alert("Proszę dodać przynajmniej jeden składnik do posiłku");
                        return;
                      }

                      if (isSaving || externalIsSaving) return;

                      // 🎯 FIX: Block scroll IMMEDIATELY before any async operations
                      blockScrollImmediate();

                      setIsSaving(true);
                      // 🚀 OPTIMIZED: Use memoized nutrition instead of recalculating
                      const mealData = {
                        name: mealName,
                        dish: selectedDish?.name || "",
                        instructions,
                        calories: nutrition.calories,
                        protein: nutrition.protein,
                        carbs: nutrition.carbs,
                        fat: nutrition.fat,
                        fiber: nutrition.fiber,
                        count_in_daily_total: countTowardsDailyCalories, // Używamy poprawnej nazwy kolumny
                        time: meal?.time ?? "",
                        order_index: meal?.order_index,
                          ingredients: Array.isArray(ingredients)
                            ? ingredients.map((ing, idx) => {
                                // 🔧 FIXED Issue #2: Use calculated nutrition instead of raw ingredient values
                                const calculatedNutrition = getIngredientDisplayNutrition(ing);

                                // 🛠️ AUTO-FIX: If ingredient_id is missing, find it by name (self-healing)
                                let finalIngredientId = ing.ingredient_id;
                                if (!finalIngredientId || finalIngredientId === 'null' || finalIngredientId === 'undefined') {
                                  const foundProduct = findProduct(products, undefined, ing.name);
                                  if (foundProduct) {
                                    finalIngredientId = foundProduct.id;
                                    logger.info(`[AUTO-FIX] Updated ingredient_id for "${ing.name}": null → ${foundProduct.id}`);
                                  }
                                }

                                return {
                                  id: ing.id && typeof ing.id === "string" && ing.id.startsWith("ingredient_") ? ing.id : `ingredient_${Date.now()}_${idx}`,
                                  name: ing.name,
                                  quantity: ing.quantity,
                                  unit: ing.unit,
                                  unit_weight: ing.unit_weight || 100,  // Cache unit_weight
                                  ingredient_id: finalIngredientId,  // Use fixed ingredient_id
                                  calories: calculatedNutrition.calories,
                                  protein: calculatedNutrition.protein,
                                  carbs: calculatedNutrition.carbs,
                                  fat: calculatedNutrition.fat,
                                  fiber: calculatedNutrition.fiber
                                };
                              })
                            : []
                      };
                      try {
                        let effectiveDayPlanId = dayPlanId;
                        if (context === 'templateBuilder') {
                          if (!effectiveDayPlanId && user?.id) {
                            const { dayPlanId: createdDayPlanId } = await findOrCreateTemplateAndDayPlan(user.id);
                            effectiveDayPlanId = createdDayPlanId;
                          }
                          // Dla template builder zachowujemy poprzednią logikę zapisu
                          let result;
                          const finalMealData = {
                            ...mealData,
                            countTowardsDailyCalories: mealData.count_in_daily_total,
                          };

                          if (meal && meal.id) {
                            const { updateMealWithIngredients } = await import("@/utils/supabaseTemplates");
                            result = await updateMealWithIngredients({ ...finalMealData, id: meal.id }, effectiveDayPlanId);
                          } else {
                            const { saveMealWithIngredients } = await import("@/utils/supabaseTemplates");
                            result = await saveMealWithIngredients(finalMealData, effectiveDayPlanId);
                          }

                          if (result.success) {
                            const callbackData = {
                              ...mealData,
                              id: result.mealId,
                              countTowardsDailyCalories: mealData.count_in_daily_total,
                            };
                            if (typeof onSave === "function") {
                              await onSave(callbackData);
                            }
                            if (typeof onRefreshData === "function") {
                              onRefreshData();
                            }
                            // 🎯 FIX: Unblock scroll before closing
                            unblockScrollImmediate();
                            handleConfirmationClose(true); // Force close after successful save
                          } else {
                            alert("Błąd zapisu: " + (result.error?.message || "Nieznany błąd"));
                            // 🎯 FIX: Unblock scroll on error
                            unblockScrollImmediate();
                            setIsSaving(false);
                          }
                        } else {
                          // 🎯 HOTFIX 4: Dla clientDiet NIE zapisujemy w modalu - tylko przekazujemy dane
                          // ClientDietManager.handleSaveMeal sam zajmie się zapisem do bazy
                          const callbackData = {
                            ...mealData,
                            id: meal?.id, // Zachowaj ID jeśli edytujemy
                            countTowardsDailyCalories: mealData.count_in_daily_total,
                          };

                          // 🎯 Issue #4 FIX: Przekaż dane + dayPlanId do ClientDietManager
                          if (typeof onSelectDish === "function") {
                            await onSelectDish(callbackData as Meal);
                          }

                          // 🎯 FIX: Unblock scroll before closing
                          unblockScrollImmediate();
                          handleConfirmationClose(true); // Force close after successful save
                        }
                      } catch (err: any) {
                        alert("Błąd zapisu: " + (err?.message || "Nieznany błąd"));
                        // 🎯 FIX: Unblock scroll on error
                        unblockScrollImmediate();
                        setIsSaving(false);
                      }
                    }}
                    disabled={!mealName.trim() || ingredients.length === 0 || isSaving || externalIsSaving}
                    className="bg-gradient-to-r from-[#a08032] to-[#e6d280] hover:from-[#8a6c2b] hover:to-[#d4c06b] text-zinc-900 font-medium disabled:opacity-50 disabled:cursor-not-allowed w-full sm:w-auto"
                    title={!mealName.trim() ? "Proszę podać nazwę posiłku" : ingredients.length === 0 ? "Proszę dodać przynajmniej jeden składnik" : ""}
                  >
                    {(isSaving || externalIsSaving) ? (
                      <>
                        <LoadingSpinner />
                        <span className="ml-2">Zapisywanie...</span>
                      </>
                    ) : (
                      <>
                        <Save className="h-4 w-4 mr-2" />
                        Zapisz
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </>
          )}
        </div>
        )}
      </DialogContent>
    </Dialog>
    {confirmationDialog}

    {/* Meal Saving Overlay Modal - Rendered via portal for full-screen coverage */}
    {isSavingActive && ReactDOM.createPortal(
      <div
        id="meal-saving-modal-portal"
        className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
        }}
      >
        <div
          className="bg-zinc-900 border-2 border-zinc-700 rounded-xl shadow-2xl p-8 max-w-md w-full mx-4 animate-in zoom-in-95 duration-200"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Loading Header */}
          <div className="flex items-center justify-center mb-6">
            <div className="relative">
              <Loader2 className="h-12 w-12 text-[#a08032] animate-spin" />
              <div className="absolute inset-0 h-12 w-12 text-[#a08032]/20 animate-ping" />
            </div>
          </div>

          {/* Title */}
          <h3 className="text-xl font-semibold text-zinc-100 text-center mb-2">
            Zapisywanie posiłku...
          </h3>

          {/* Description */}
          <p className="text-sm text-zinc-400 text-center mb-6">
            Trwa zapisywanie zmian do bazy danych.
          </p>

          {/* Progress dots animation */}
          <div className="flex justify-center gap-2 mb-6">
            <div className="h-2 w-2 bg-[#a08032] rounded-full animate-bounce [animation-delay:-0.3s]" />
            <div className="h-2 w-2 bg-[#a08032] rounded-full animate-bounce [animation-delay:-0.15s]" />
            <div className="h-2 w-2 bg-[#a08032] rounded-full animate-bounce" />
          </div>

          {/* Timer */}
          {savingStartTime && elapsedSeconds > 0 && (
            <div className="text-center text-xs text-zinc-500">
              Czas: {elapsedSeconds}s
            </div>
          )}
        </div>
      </div>,
      document.body
    )}
    </>
  );
};

export default DishSelectionModal;
