import { useState, useEffect, useMemo, useCallback } from "react";
import ReactDOM from "react-dom";
import { UseFormWatch } from "react-hook-form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Sparkles, Loader2, Undo2, CheckCircle, XCircle, Info, ChevronDown, ChevronUp, X } from "lucide-react";
import { useAIOptimization } from "@/hooks/useAIOptimization";
import { toast } from "@/components/ui/use-toast";
import { shortenUnit } from "@/utils/formatIngredients";
import { parseDecimal } from "@/utils/numberParser";
import {
  calculateNutritionMacros,
  preciseMultiply,
  preciseDivide,
  formatPolishNumber,
  parsePolishNumberSafe,
  toDecimal
} from "@/utils/preciseCalculations";
import { logger } from '@/utils/logger';

// ENHANCED: Using precise Polish number formatting
// @deprecated - Use formatPolishNumber from preciseCalculations for better precision
function formatPLNumber(value: number | string): string {
  return formatPolishNumber(value, 1);
}

interface MacroTargets {
  protein: number;
  fat: number;
  carbs: number;
}

interface SelectedIngredient {
  id: string;
  productId: string;
  nazwa: string;
  quantity: number;
  unit: string;
  unit_weight: number;
}

interface Product {
  id: string;
  name: string;
  unit: string;
  unit_weight: number;
  calories: number;
  protein: number;
  fat: number;
  carbs: number;
  fiber: number;
}

interface EditableNutritionSectionProps {
  watch: UseFormWatch<any>;
  onMacroChange: (macroKey: "protein" | "carbs" | "fat", targetValue: number) => void;
  form?: any; // Add form prop for setValue access
  macroDraft?: { protein: number; carbs: number; fat: number };
  selectedIngredients?: SelectedIngredient[];
  products?: Product[];
  onIngredientsChange?: (ingredients: SelectedIngredient[]) => void;
  context?: 'dish' | 'meal'; // NEW: Context for UI texts
}

const EditableNutritionSection = ({
  watch,
  onMacroChange,
  form,
  macroDraft,
  selectedIngredients = [],
  products = [],
  onIngredientsChange,
  context = 'dish'
}: EditableNutritionSectionProps) => {
  const [editingField, setEditingField] = useState<string | null>(null);
  const [aiSuggestions, setAiSuggestions] = useState<any>(null);
  const [lastIngredients, setLastIngredients] = useState<SelectedIngredient[] | null>(null);
  const [showUndoButton, setShowUndoButton] = useState(false);
  const [isInfoCollapsed, setIsInfoCollapsed] = useState(true);
  const [optimizingModel, setOptimizingModel] = useState<string | null>(null);
  const [optimizationStartTime, setOptimizationStartTime] = useState<number | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  
  // Watch form values for ingredient-based calculation
  const formKcal = watch('kcal') || 0;
  const formProtein = watch('macro.białko') || 0;
  const formFat = watch('macro.tłuszcz') || 0;
  const formCarbs = watch('macro.węglowodany') || 0;

  // Local state for input values - always empty strings for placeholders
  const [localValues, setLocalValues] = useState({
    protein: '',
    carbs: '',
    fat: ''
  });

  // Context-aware texts
  const getContextTexts = (context: 'dish' | 'meal' = 'dish') => ({
    dish: {
      optimizeButton: 'Optymalizuj potrawę',
      aiComment: 'Propozycja AI dla potrawy:',
      description: 'AI dostosuje składniki potrawy do wprowadzonych wartości makroskładników.',
      title: 'Optymalizacja wartości odżywczych potrawy'
    },
    meal: {
      optimizeButton: 'Optymalizuj posiłek',
      aiComment: 'Propozycja AI dla posiłku:',
      description: 'AI dostosuje składniki posiłku do wprowadzonych wartości makroskładników.',
      title: 'Optymalizacja wartości odżywczych posiłku'
    }
  })[context];

  const contextTexts = getContextTexts(context);

  const {
    optimize,
    isOptimizing,
    result,
    error,
    reset
  } = useAIOptimization();

  const hasAllEmptyMacros = !localValues.protein && !localValues.carbs && !localValues.fat;

  const handleMacroInputChange = useCallback((field: 'protein' | 'carbs' | 'fat', value: string) => {
    setLocalValues(prev => ({
      ...prev,
      [field]: value
    }));
  }, []);

  // Auto-clear undo button after 10 seconds
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (showUndoButton) {
      timer = setTimeout(() => {
        setShowUndoButton(false);
        setLastIngredients(null);
      }, 10000);
    }
    return () => {
      if (timer) {
        clearTimeout(timer);
      }
    }
  }, [showUndoButton]);

  // Auto-clear undo button if showUndoButton changes to false
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (showUndoButton) {
      timer = setTimeout(() => {
        setShowUndoButton(false);
        setLastIngredients(null);
      }, 10000);
      return () => clearTimeout(timer);
    }
  }, [showUndoButton]);

  // Clear optimization state when optimization completes successfully (result available)
  useEffect(() => {
    if (!isOptimizing && result && !error) {
      // Success - hide modal
      setOptimizingModel(null);
      setOptimizationStartTime(null);
      setElapsedSeconds(0);
    }
    // Don't hide modal on error - let user read the error and close manually
  }, [isOptimizing, result, error]);

  // Block scroll and interactions when loading modal is open
  useEffect(() => {
    if (optimizingModel) {
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
      styleEl.id = 'ai-modal-override';
      styleEl.textContent = `
        #ai-optimization-modal-portal,
        #ai-optimization-modal-portal * {
          pointer-events: auto !important;
        }
      `;
      document.head.appendChild(styleEl);

      return () => {
        // Restore scroll
        document.body.style.overflow = '';
        document.body.style.position = '';
        document.body.style.top = '';
        document.body.style.width = '';
        document.body.style.pointerEvents = '';
        window.scrollTo(0, scrollY);

        // Remove style override
        const style = document.getElementById('ai-modal-override');
        if (style) style.remove();
      };
    }
  }, [optimizingModel]);

  // Update elapsed time every second during optimization
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (optimizationStartTime) {
      interval = setInterval(() => {
        setElapsedSeconds(Math.floor((Date.now() - optimizationStartTime) / 1000));
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [optimizationStartTime]);

  // Handle AI optimization result
  useEffect(() => {
    if (result && selectedIngredients && !aiSuggestions) {
      setLastIngredients([...selectedIngredients]);
      setAiSuggestions(result);
      toast({
        title: "Optymalizacja AI zakończona",
        description: "Sprawdź proponowane zmiany poniżej",
      });
    }
  }, [result, selectedIngredients, aiSuggestions]);

  // Handle AI optimization error
  useEffect(() => {
    if (error) {
      logger.error("❌ AI optimization error:", error);
      logger.log('📊 Current state:', { isOptimizing, optimizingModel, hasResult: !!result });
      // Don't show toast - error is already displayed in modal
      // toast({
      //   title: "Błąd optymalizacji AI",
      //   description: error,
      //   variant: "destructive"
      // });
    }
  }, [error, isOptimizing, optimizingModel, result]);

  // Function to convert selectedIngredients to AI format
  const convertIngredientsForAI = (selectedIngredients: SelectedIngredient[], products: Product[]) => {
    logger.log('🔄 CONVERT INGREDIENTS FOR AI:', {
      inputCount: selectedIngredients.length,
      inputNames: selectedIngredients.map(ing => ing.nazwa),
      inputProductIds: selectedIngredients.map(ing => ({ name: ing.nazwa, productId: ing.productId })),
      productsCount: products.length
    });

    const convertedResults = selectedIngredients.map(ingredient => {
      const product = products.find(p => p.id === ingredient.productId);
      if (!product) {
        logger.warn(`❌ PRODUCT NOT FOUND for ingredient: "${ingredient.nazwa}" with productId: "${ingredient.productId}"`);
        logger.log('Available products:', products.map(p => ({ id: p.id, name: p.name })).slice(0, 5));
        return null;
      }

      // KISS FIX: Warning for missing unit_weight
      if (!product.unit_weight && ingredient.unit !== "g" && ingredient.unit !== "gramy") {
        logger.warn(`⚠️ Product "${product.name}" missing unit_weight for unit "${ingredient.unit}" - AI may return in grams`);
      }

      // Konwertuj na gramy przed wysłaniem do AI
      let grams = 0;
      if (ingredient.unit === "gramy" || ingredient.unit === "g") {
        grams = ingredient.quantity;
      } else if (ingredient.unit === "mililitry" || ingredient.unit === "ml") {
        grams = (ingredient.quantity / 100) * (product.unit_weight || 100);
      } else {
        // 🔧 FIX: Prioritize product's current unit_weight over cached ingredient.unit_weight
        const unitWeight = product?.unit_weight || ingredient.unit_weight || 100;
        grams = ingredient.quantity * unitWeight;
      }

      // ENHANCED: Calculate absolute nutritional values using precise arithmetic
      const gramsQuantity = parseFloat(toDecimal(grams).toFixed(1));
      const nutritionPer100g = {
        calories: product.calories || 0,
        protein: product.protein || 0,
        fat: product.fat || 0,
        carbs: product.carbs || 0,
        fiber: product.fiber || 0
      };

      // NAPRAWIONE: Wysyłaj gramy do AI ale zachowaj kontekst oryginalnych jednostek
      const originalQuantity = ingredient.quantity;
      const originalUnit = ingredient.unit;

      // Use precise nutrition calculation instead of manual arithmetic
      // Note: gramsQuantity is already in grams, so pass 'g' as unit
      const preciseNutrition = calculateNutritionMacros(gramsQuantity, nutritionPer100g, 100, 'g');

      // 🔧 FIX: Prioritize product's current unit_weight over cached ingredient.unit_weight
      const unitWeightToSend = product?.unit_weight || ingredient.unit_weight || 100;

      // DEBUG: Log unit_weight sources
      logger.log(`📊 Unit weight for "${ingredient.nazwa}":`, {
        from_ingredient: ingredient.unit_weight,
        from_product: product.unit_weight,
        final_used: unitWeightToSend
      });

      const result = {
        id: ingredient.productId,
        name: ingredient.nazwa,
        quantity: gramsQuantity,     // Wysyłaj gramy dla spójności obliczeń
        unit: "g",                   // Zawsze gramy dla AI
        // BUGFIX: Only send macros if quantity > 0, otherwise backend calculates from DB
        // For 0-quantity ingredients (e.g., egg not yet added), backend will use database values
        ...(gramsQuantity > 0 ? {
          calories: preciseNutrition.calories,
          protein: preciseNutrition.protein,
          fat: preciseNutrition.fat,
          carbs: preciseNutrition.carbs,
          fiber: preciseNutrition.fiber,
        } : {}),
        // Meta informacje o oryginalnych jednostkach
        original_unit: originalUnit,
        original_quantity: originalQuantity,
        // CRITICAL FIX: Wyślij unit_weight z tego konkretnego składnika (nie z bazy globalnej)
        unit_weight: unitWeightToSend
      };

      return result;
    });

    const filteredResults = convertedResults.filter(ing => {
      const isValid = Boolean(ing);
      if (!isValid) {
        logger.warn('🚫 FILTERED OUT ingredient (null/undefined)');
      }
      return isValid;
    });

    logger.log('✅ FINAL CONVERTED INGREDIENTS FOR AI:', {
      outputCount: filteredResults.length,
      outputNames: filteredResults.map(ing => ing?.name).filter(Boolean)
    });

    return filteredResults;
  };

  const convertAISuggestionsToIngredients = (aiSuggestions: any): SelectedIngredient[] => {
    if (!aiSuggestions?.optimized_ingredients) {
      logger.warn("No optimized_ingredients in AI response");
      return [];
    }


    return aiSuggestions.optimized_ingredients.map((aiIngredient: any) => {
      
      // AI may return either 'id' or 'productId'
      const productId = aiIngredient.id || aiIngredient.productId;
      const product = products.find(p => p.id === productId);
      
      if (!product) {
        logger.warn(`Product not found for AI ingredient: ${productId}`, aiIngredient);
        return null;
      }


      // Znajdź oryginalny składnik dla porównania
      const originalIngredient = selectedIngredients.find(ing => 
        ing.productId === productId || ing.nazwa === aiIngredient.name
      );

      // NAPRAWIONE: AI teraz zwraca jednostki od backend po konwersji
      // Backend sam konwertuje gramy z powrotem na oryginalne jednostki
      let finalQuantity = aiIngredient.quantity;
      let finalUnit = aiIngredient.unit;


      // CRITICAL FIX: Use macros from AI backend instead of recalculating
      // Backend already calculated correct macros for the exact quantity
      const result = {
        id: originalIngredient?.id || `ai_${productId}`,
        productId: productId,
        nazwa: aiIngredient.name || product.name,
        quantity: parseFloat(toDecimal(finalQuantity).toFixed(2)), // 2 decimal places for quarter pieces (0.25)
        unit: finalUnit,
        unit_weight: originalIngredient?.unit_weight || product.unit_weight || 100,
        // USE AI MACROS - don't recalculate, backend already did it correctly
        calories: aiIngredient.calories,
        protein: aiIngredient.protein,
        fat: aiIngredient.fat,
        carbs: aiIngredient.carbs,
        fiber: aiIngredient.fiber
      };

      // DEBUG: Log AI macros for verification
      logger.log(`🔍 AI ingredient "${aiIngredient.name}":`, {
        quantity: finalQuantity,
        unit: finalUnit,
        // FIXED: Sprawdzamy czy pola ISTNIEJĄ (nie są undefined), a nie czy są > 0
        // Bo Sól ma calories===0 i to jest PRAWIDŁOWA wartość!
        has_macros: aiIngredient.calories !== undefined && aiIngredient.protein !== undefined,
        macros: {
          calories: aiIngredient.calories,
          protein: aiIngredient.protein,
          fat: aiIngredient.fat,
          carbs: aiIngredient.carbs
        }
      });

      // ENHANCED WALIDACJA: Use precise calculations for calorie validation
      // Skip validation for zero quantity (ingredient marked for removal)
      const expectedCaloriesPer100g = product.calories || 0;

      if (expectedCaloriesPer100g > 0 && finalQuantity > 0) {
        // Calculate expected calories using precise arithmetic
        let gramsForValidation = finalQuantity;

        if (finalUnit === "gramy" || finalUnit === "g") {
          gramsForValidation = finalQuantity;
        } else if (finalUnit === "mililitry" || finalUnit === "ml") {
          const unitWeight = product.unit_weight || 100;
          gramsForValidation = preciseDivide(preciseMultiply(finalQuantity, unitWeight), 100);
        } else if (finalUnit === "łyżka" || finalUnit === "łyżeczka" || finalUnit.includes("łyż")) {
          // FIXED: Dla łyżek używamy unit_weight z produktu (gramy per łyżka)
          // Backend już przeliczył gramy → łyżki używając prawidłowego unit_weight
          const unitWeight = product.unit_weight || 10; // default 10g dla łyżki jeśli brak
          gramsForValidation = preciseMultiply(finalQuantity, unitWeight);
        } else if (finalUnit === "sztuka" || finalUnit.includes("szt")) {
          // Dla sztuk (jajka, owoce)
          const unitWeight = product.unit_weight || 100;
          gramsForValidation = preciseMultiply(finalQuantity, unitWeight);
        } else {
          // Fallback dla innych jednostek
          const unitWeight = originalIngredient?.unit_weight || product.unit_weight || 100;
          gramsForValidation = preciseMultiply(finalQuantity, unitWeight);
        }

        const expectedCaloriesForQuantity = preciseDivide(preciseMultiply(expectedCaloriesPer100g, gramsForValidation), 100);
        const tolerance = preciseMultiply(expectedCaloriesForQuantity, 0.5); // 50% tolerance

        const caloriesDifference = Math.abs(parsePolishNumberSafe(aiIngredient.calories) - expectedCaloriesForQuantity);

        if (caloriesDifference > tolerance) {
          logger.warn(`⚠️ Suspicious calories for "${aiIngredient.name}":`, {
            aiCalories: aiIngredient.calories,
            expectedCalories: parseFloat(toDecimal(expectedCaloriesForQuantity).toFixed(1)),
            difference: parseFloat(toDecimal(caloriesDifference).toFixed(1)),
            quantity: finalQuantity,
            unit: finalUnit,
            gramsCalculated: gramsForValidation
          });
        }
      }

      
      return result;
    }).filter(Boolean);
  };

  // Memoize AI suggestions conversion to avoid multiple calls during render
  const memoizedConvertedSuggestions = useMemo(() => {
    if (!aiSuggestions) return [];
    return convertAISuggestionsToIngredients(aiSuggestions);
  }, [aiSuggestions, selectedIngredients, products]);

  const handleAIOptimization = async (model: string = "gpt-5") => {
    // BUGFIX: Use parseDecimal to handle Polish comma (20,5 → 20.5)
    const targetMacros = {
      protein: parseDecimal(localValues.protein) || 0,
      fat: parseDecimal(localValues.fat) || 0,
      carbs: parseDecimal(localValues.carbs) || 0
    };


    // Build dynamic targetMacros - only include filled fields
    // BUGFIX: Use parseDecimal to handle Polish comma (20,5 → 20.5)
    const dynamicTargetMacros: any = {};
    if (localValues.protein !== '' && localValues.protein !== '0') {
      dynamicTargetMacros.protein = parseDecimal(localValues.protein);
    }
    if (localValues.fat !== '' && localValues.fat !== '0') {
      dynamicTargetMacros.fat = parseDecimal(localValues.fat);
    }
    if (localValues.carbs !== '' && localValues.carbs !== '0') {
      dynamicTargetMacros.carbs = parseDecimal(localValues.carbs);
    }

    // Check if at least one macro is provided
    if (Object.keys(dynamicTargetMacros).length === 0) {
      toast({
        title: "Brak wartości makro",
        description: "Wprowadź przynajmniej jedną wartość makroskładnika do optymalizacji AI",
        variant: "destructive"
      });
      return;
    }



    // Check if there are ingredients to optimize
    if (!selectedIngredients || selectedIngredients.length === 0) {
      toast({
        title: "Brak składników",
        description: "Dodaj przynajmniej jeden składnik przed optymalizacją AI",
        variant: "destructive"
      });
      return;
    }

    // Check if products are available
    if (!products || products.length === 0) {
      toast({
        title: "Brak produktów",
        description: "Baza produktów nie została załadowana. Spróbuj ponownie.",
        variant: "destructive"
      });
      return;
    }

    // Check if ingredients have valid productIds
    const missingProductIds = selectedIngredients.filter(ing => !ing.productId || ing.productId === '');
    if (missingProductIds.length > 0) {
      toast({
        title: "Błędne dane składników",
        description: `${missingProductIds.length} składników nie ma przypisanych ID produktów. Spróbuj usunąć i dodać ponownie problematyczne składniki.`,
        variant: "destructive"
      });
      return;
    }

    // Convert ingredients to AI format
    const currentIngredients = convertIngredientsForAI(selectedIngredients, products);

    if (currentIngredients.length === 0) {
      toast({
        title: "Błąd składników",
        description: "Nie można przetworzyć składników do optymalizacji",
        variant: "destructive"
      });
      return;
    }

    // 1) FRONTEND FIX: Build clean target_macros without zeros
    // BUGFIX: Using parseDecimal to handle Polish comma (35,5 → 35.5)
    function buildTargets(raw: { protein?: any; fat?: any; carbs?: any; calories?: any }) {
      const t: any = {};
      const p = parseDecimal(raw.protein);
      const f = parseDecimal(raw.fat);
      const c = parseDecimal(raw.carbs);
      const k = parseDecimal(raw.calories);

      if (p !== undefined && p > 0) t.protein = p;
      if (f !== undefined && f > 0) t.fat = f;
      if (c !== undefined && c > 0) t.carbs = c;
      if (k !== undefined && k > 0) t.calories = k;

      return t;
    }

    const cleanTargets = buildTargets(dynamicTargetMacros);

    // 2) RUN AI OPTIMIZATION

    // Reset previous results before starting new optimization
    reset();

    const optimizationData = {
      meal_name: "Edycja posiłku",
      target_macros: cleanTargets,
      current_ingredients: currentIngredients,
      ai_model: model as any, // Pass selected AI model
    };

    // 🔍 DETAILED PAYLOAD LOGGING
    logger.log('📤 PAYLOAD WYSYŁANY DO AI BACKEND:', {
      model,
      target_macros: cleanTargets,
      ingredients_count: currentIngredients.length,
      ingredients_details: currentIngredients.map(ing => ({
        name: ing.name,
        quantity: ing.quantity,
        unit: ing.unit,
        // FIXED: Sprawdzamy czy pola ISTNIEJĄ (nie są undefined), a nie czy są > 0
        has_macros: ing.calories !== undefined && ing.protein !== undefined,
        macros: {
          calories: ing.calories,
          protein: ing.protein,
          fat: ing.fat,
          carbs: ing.carbs,
          fiber: ing.fiber
        },
        unit_weight: ing.unit_weight,
        original_unit: ing.original_unit,
        original_quantity: ing.original_quantity
      }))
    });

    // Set optimizing state with model info
    setOptimizingModel(model);
    setOptimizationStartTime(Date.now());

    optimize(optimizationData);
  };

  const handleCancelOptimization = useCallback(() => {
    reset(); // Reset AI hook state (cancels AbortController)
    setOptimizingModel(null);
    setOptimizationStartTime(null);
    toast({
      title: "Anulowano optymalizację",
      description: "Proces AI został przerwany",
    });
  }, [reset]);

  const handleAcceptAI = useCallback(() => {
    if (!aiSuggestions || !onIngredientsChange) return;

    // Use memoized conversion to avoid duplicate processing

    onIngredientsChange(memoizedConvertedSuggestions);
    setAiSuggestions(null);
    setShowUndoButton(true);
    reset(); // Clear AI hook state

    toast({
      title: "Zastosowano propozycje AI",
      description: `Zaktualizowano ${memoizedConvertedSuggestions.length} składników`,
    });
  }, [aiSuggestions, onIngredientsChange, reset, memoizedConvertedSuggestions]);

  const handleRejectAI = useCallback(() => {
    setAiSuggestions(null);
    reset(); // Clear AI hook state
    toast({
      title: "Odrzucono propozycje AI",
      description: "Składniki pozostały bez zmian",
    });
  }, [reset]);

  const handleUndoAI = useCallback(() => {
    if (!lastIngredients || !onIngredientsChange) return;

    onIngredientsChange(lastIngredients);
    setLastIngredients(null);
    setShowUndoButton(false);

    toast({
      title: "Cofnięto zmiany AI",
      description: "Przywrócono poprzednie składniki",
      variant: "default"
    });
  }, [lastIngredients, onIngredientsChange]);

  return (
    <div className="space-y-3">
      {/* Kompaktowa sekcja optymalizacji AI */}
      <div className="bg-zinc-800/50 rounded-lg p-2 sm:p-3 w-full max-w-full overflow-hidden">
        {/* Mobile layout - stack vertically */}
        <div className="sm:hidden space-y-3">
          <span className="text-sm font-medium text-zinc-300 block">Dostosuj makro:</span>

          <div className="grid grid-cols-3 gap-2">
            {/* Protein Input */}
            <div className="relative">
              <Input
                id="macro-protein-mobile"
                name="macro-protein-mobile"
                aria-label="Białko (g)"
                type="text"
                inputMode="decimal"
                value={localValues.protein}
                onChange={(e) => handleMacroInputChange('protein', e.target.value)}
                className="bg-zinc-800 border border-zinc-600 text-zinc-100 text-center text-xs h-8 w-full pr-3 focus:border-[#a08032] focus:ring-[#a08032]"
                placeholder="Białko"
                onFocus={(e) => e.target.select()}
              />
              <span className="absolute right-0.5 top-1/2 transform -translate-y-1/2 text-zinc-500 text-xs pointer-events-none">g</span>
            </div>

            {/* Carbs Input */}
            <div className="relative">
              <Input
                id="macro-carbs-mobile"
                name="macro-carbs-mobile"
                aria-label="Węglowodany (g)"
                type="text"
                inputMode="decimal"
                value={localValues.carbs}
                onChange={(e) => handleMacroInputChange('carbs', e.target.value)}
                className="bg-zinc-800 border border-zinc-600 text-zinc-100 text-center text-xs h-8 w-full pr-3 focus:border-[#a08032] focus:ring-[#a08032]"
                placeholder="Węgl."
                onFocus={(e) => e.target.select()}
              />
              <span className="absolute right-0.5 top-1/2 transform -translate-y-1/2 text-zinc-500 text-xs pointer-events-none">g</span>
            </div>

            {/* Fat Input */}
            <div className="relative">
              <Input
                id="macro-fat-mobile"
                name="macro-fat-mobile"
                aria-label="Tłuszcz (g)"
                type="text"
                inputMode="decimal"
                value={localValues.fat}
                onChange={(e) => handleMacroInputChange('fat', e.target.value)}
                className="bg-zinc-800 border border-zinc-600 text-zinc-100 text-center text-xs h-8 w-full pr-3 focus:border-[#a08032] focus:ring-[#a08032]"
                placeholder="Tłuszcz"
                onFocus={(e) => e.target.select()}
              />
              <span className="absolute right-0.5 top-1/2 transform -translate-y-1/2 text-zinc-500 text-xs pointer-events-none">g</span>
            </div>
          </div>

          {/* AI Button - GPT-5 only */}
          <div className="flex gap-2 w-full">
            {/* GPT-5 */}
            <Button
              type="button"
              onClick={() => handleAIOptimization("gpt-5")}
              disabled={isOptimizing || hasAllEmptyMacros || aiSuggestions !== null}
              size="sm"
              className="bg-gradient-to-r from-[#a08032] to-[#e6d280] hover:from-[#8a6c2b] hover:to-[#d4c06b] text-zinc-900 font-medium px-2 py-1.5 h-8 text-xs flex-1"
            >
              {isOptimizing ? (
                <>
                  <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                  Start
                </>
              ) : (
                "Start"
              )}
            </Button>
          </div>
        </div>

        {/* Desktop layout - keep horizontal */}
        <div className="hidden sm:flex items-center gap-2 w-full">
          <span className="text-sm font-medium text-zinc-300 whitespace-nowrap">Dostosuj makro:</span>
          
          {/* Protein Input */}
          <div className="relative flex-1">
            <Input
              id="macro-protein-desktop"
              name="macro-protein-desktop"
              aria-label="Białko (g)"
              type="text"
              inputMode="decimal"
              value={localValues.protein}
              onChange={(e) => handleMacroInputChange('protein', e.target.value)}
              className="bg-zinc-800 border border-zinc-600 text-zinc-100 text-center text-xs h-7 w-full pr-3 focus:border-[#a08032] focus:ring-[#a08032]"
              placeholder="B"
              onFocus={(e) => e.target.select()}
            />
            <span className="absolute right-0.5 top-1/2 transform -translate-y-1/2 text-zinc-500 text-xs pointer-events-none">g</span>
          </div>

          {/* Carbs Input */}
          <div className="relative flex-1">
            <Input
              id="macro-carbs-desktop"
              name="macro-carbs-desktop"
              aria-label="Węglowodany (g)"
              type="text"
              inputMode="decimal"
              value={localValues.carbs}
              onChange={(e) => handleMacroInputChange('carbs', e.target.value)}
              className="bg-zinc-800 border border-zinc-600 text-zinc-100 text-center text-xs h-7 w-full pr-3 focus:border-[#a08032] focus:ring-[#a08032]"
              placeholder="W"
              onFocus={(e) => e.target.select()}
            />
            <span className="absolute right-0.5 top-1/2 transform -translate-y-1/2 text-zinc-500 text-xs pointer-events-none">g</span>
          </div>

          {/* Fat Input */}
          <div className="relative flex-1">
            <Input
              id="macro-fat-desktop"
              name="macro-fat-desktop"
              aria-label="Tłuszcz (g)"
              type="text"
              inputMode="decimal"
              value={localValues.fat}
              onChange={(e) => handleMacroInputChange('fat', e.target.value)}
              className="bg-zinc-800 border border-zinc-600 text-zinc-100 text-center text-xs h-7 w-full pr-3 focus:border-[#a08032] focus:ring-[#a08032]"
              placeholder="T"
              onFocus={(e) => e.target.select()}
            />
            <span className="absolute right-0.5 top-1/2 transform -translate-y-1/2 text-zinc-500 text-xs pointer-events-none">g</span>
          </div>

          {/* AI Button - GPT-5 only */}
          <div className="flex gap-2 flex-1">
            {/* GPT-5 */}
            <Button
              type="button"
              onClick={() => handleAIOptimization("gpt-5")}
              disabled={isOptimizing || hasAllEmptyMacros || aiSuggestions !== null}
              size="sm"
              className="bg-gradient-to-r from-[#a08032] to-[#e6d280] hover:from-[#8a6c2b] hover:to-[#d4c06b] text-zinc-900 font-medium px-2 py-1 h-7 text-xs flex-1"
            >
              {isOptimizing ? (
                <>
                  <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                  Start
                </>
              ) : (
                "Start"
              )}
            </Button>
          </div>

          {/* Reset Button */}
          {!aiSuggestions && (localValues.protein || localValues.carbs || localValues.fat) && (
            <Button
              type="button"
              onClick={() => {
                setLocalValues({ protein: "", carbs: "", fat: "" });
                toast({
                  title: "Resetowano",
                  description: "Wyczyszczono wprowadzone wartości",
                  variant: "default"
                });
              }}
              variant="outline"
              size="sm"
              className="border-zinc-600 text-zinc-400 hover:bg-zinc-700 hover:text-zinc-200 px-2 py-1 h-7 text-xs flex-1"
            >
              Resetuj
            </Button>
          )}
        </div>
      </div>

      {/* Warning message when any macro is 0 */}
      {hasAllEmptyMacros && (
        <div className="mt-2">
          <div className="bg-amber-500/10 border border-amber-500/20 rounded-md p-2">
            <p className="text-amber-400 text-xs text-center">
              Uzupełnij przynajmniej jedną wartość makroskładnika do przeliczenia.
            </p>
          </div>
        </div>
      )}
      
      {/* AI Results Section */}
      {aiSuggestions && (
        <div className="bg-zinc-800/50 rounded-lg p-3">
          <div className="space-y-3">
            {/* AI Comment */}
            <div className="bg-blue-500/10 border border-blue-500/20 rounded-md p-3">
              <div className="flex items-start gap-2">
                <Sparkles className="h-4 w-4 text-blue-400 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-blue-300 text-sm font-medium mb-1">{contextTexts.aiComment}</p>
                  <p className="text-blue-200 text-xs leading-relaxed">
                    {aiSuggestions.ai_comment}
                  </p>
                </div>
              </div>
            </div>

            {/* AI Proposed Changes */}
            <div>
              <p className="text-zinc-300 text-sm font-medium mb-2">Proponowane zmiany składników:</p>
              <div className="space-y-1">
                {memoizedConvertedSuggestions.map((convertedIngredient: any, index: number) => {
                    const currentIngredient = selectedIngredients.find(ing =>
                      ing.productId === convertedIngredient.productId ||
                      ing.nazwa === convertedIngredient.nazwa
                    );

                    const unitShort = shortenUnit(convertedIngredient.unit);
                    const isZeroQuantity = convertedIngredient.quantity === 0;
                    const hasChanged = currentIngredient && Math.abs(currentIngredient.quantity - convertedIngredient.quantity) > 0.1;

                    return (
                      <div
                        key={`ai-suggestion-${index}`}
                        className={`flex justify-between items-center p-2 rounded-md text-xs ${
                          isZeroQuantity
                            ? 'bg-red-500/10 border border-red-500/20 text-red-200'
                            : hasChanged
                            ? 'bg-green-500/10 border border-green-500/20 text-green-200'
                            : 'bg-zinc-700/50 text-zinc-400'
                        }`}
                      >
                        <span className="font-medium">
                          {convertedIngredient.nazwa}
                        </span>
                        <span>
                          {isZeroQuantity ? (
                            <>
                              <span className="text-zinc-400">{formatPolishNumber(currentIngredient?.quantity || 0, 2)}{shortenUnit(currentIngredient?.unit || '')}</span>
                              <span className="mx-1 text-red-400">→</span>
                              <span className="font-medium text-red-300">do usunięcia</span>
                            </>
                          ) : hasChanged ? (
                            <>
                              <span className="text-zinc-400">{formatPolishNumber(currentIngredient.quantity, 2)}{shortenUnit(currentIngredient.unit)}</span>
                              <span className="mx-1 text-green-400">→</span>
                              <span className="font-medium text-green-300">{formatPolishNumber(convertedIngredient.quantity, 2)}{unitShort}</span>
                            </>
                          ) : (
                            `${formatPolishNumber(convertedIngredient.quantity, 2)}${unitShort}`
                          )}
                        </span>
                      </div>
                    );
                  })}
              </div>
            </div>

            {/* Proposed Macros Summary */}
            {(() => {
              const macroSummary = aiSuggestions.macro_summary;
              
              if (!macroSummary) {
                return (
                  <div className="bg-red-500/10 border border-red-500/20 rounded-md p-2">
                    <p className="text-red-300 text-xs">Błąd: Brak macro_summary w odpowiedzi AI</p>
                  </div>
                );
              }

              return (
                <div className="bg-zinc-700/30 rounded-md p-2">
                  <p className="text-zinc-300 text-xs font-medium mb-1">Po optymalizacji AI:</p>
                  <div className="grid grid-cols-4 gap-2 text-xs">
                    <div className="text-center">
                      <span className="text-zinc-400">Kcal: </span>
                      <span className="text-zinc-200 font-medium">
                        {parseFloat(toDecimal(macroSummary.total_calories || 0).toFixed(0))}
                      </span>
                    </div>
                    <div className="text-center">
                      <span className="text-zinc-400">Białko: </span>
                      <span className="text-zinc-200 font-medium">
                        {formatPolishNumber(macroSummary.total_protein || 0, 1)}g
                      </span>
                    </div>
                    <div className="text-center">
                      <span className="text-zinc-400">Węgle: </span>
                      <span className="text-zinc-200 font-medium">
                        {formatPolishNumber(macroSummary.total_carbs || 0, 1)}g
                      </span>
                    </div>
                    <div className="text-center">
                      <span className="text-zinc-400">Tłuszcz: </span>
                      <span className="text-zinc-200 font-medium">
                        {formatPolishNumber(macroSummary.total_fat || 0, 1)}g
                      </span>
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* Accept/Reject Buttons */}
            <div className="grid grid-cols-2 gap-2">
              <Button
                type="button"
                onClick={handleAcceptAI}
                className="bg-green-600 hover:bg-green-500 text-white text-xs py-2"
              >
                <CheckCircle className="h-3 w-3 mr-1" />
                Zaakceptuj
              </Button>
              <Button
                type="button"
                onClick={handleRejectAI}
                variant="outline"
                className="border-red-500/50 text-red-400 hover:bg-red-500/10 hover:text-red-300 text-xs py-2"
              >
                <XCircle className="h-3 w-3 mr-1" />
                Odrzuć
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* AI Information Box - Collapsible */}
      {!aiSuggestions && (
        <div className="bg-blue-500/10 border border-blue-500/20 rounded-md">
          {/* Collapsible Header */}
          <button
            type="button"
            onClick={() => setIsInfoCollapsed(!isInfoCollapsed)}
            className="w-full p-3 flex items-center gap-2 hover:bg-blue-500/5 transition-colors"
          >
            <Info className="h-4 w-4 text-blue-400 flex-shrink-0" />
            <span className="text-sm font-medium text-blue-200 flex-1 text-left">
              Jak działa optymalizacja AI?
            </span>
            {isInfoCollapsed ? (
              <ChevronDown className="h-4 w-4 text-blue-400" />
            ) : (
              <ChevronUp className="h-4 w-4 text-blue-400" />
            )}
          </button>
          
          {/* Collapsible Content */}
          {!isInfoCollapsed && (
            <div className="px-3 pb-3 border-t border-blue-500/10">
              <div className="pt-3">
                <ul className="space-y-1 text-xs text-blue-300/90 leading-relaxed">
                  <li>• Wypełnij jedno lub kilka pól makroskładników</li>
                  <li>• {contextTexts.description}</li>
                  <li>• Jedno pole = AI skupi się na tym makro</li>
                  <li>• Kilka pól = AI zbilansuje wszystkie wartości</li>
                  <li>• <span className="text-amber-300">Traktuj jako sugestię - AI nie zastępuje wiedzy dietetyka</span></li>
                </ul>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Undo Button - shown after AI acceptance */}
      {showUndoButton && lastIngredients && (
        <div className="mt-3">
          <Button
            type="button"
            onClick={handleUndoAI}
            variant="outline"
            className="w-full border-amber-500/50 text-amber-400 hover:bg-amber-500/10 hover:text-amber-300 text-xs py-2"
          >
            <Undo2 className="h-3 w-3 mr-1" />
            Cofnij zmiany AI
          </Button>
        </div>
      )}

      {/* AI Optimization Overlay Modal - Rendered via portal for full-screen coverage */}
      {optimizingModel && ReactDOM.createPortal(
        <div
          id="ai-optimization-modal-portal"
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
            {/* Show error state */}
            {error ? (
              <>
                {/* Error Header */}
                <div className="flex items-center justify-center mb-6">
                  <div className="relative">
                    <XCircle className="h-12 w-12 text-red-400" />
                  </div>
                </div>

                {/* Error Title */}
                <h3 className="text-xl font-semibold text-zinc-100 text-center mb-2">
                  Wystąpił błąd
                </h3>

                {/* Error Description */}
                <p className="text-sm text-zinc-400 text-center mb-6">
                  {error}
                </p>

                {/* Timer (if available) */}
                {optimizationStartTime && elapsedSeconds > 0 && (
                  <div className="text-center text-xs text-zinc-500 mb-4">
                    Próba trwała: {elapsedSeconds}s
                  </div>
                )}

                {/* Close Button */}
                <Button
                  type="button"
                  onClick={handleCancelOptimization}
                  className="w-full bg-zinc-700 hover:bg-zinc-600 text-zinc-100"
                >
                  Zamknij
                </Button>
              </>
            ) : (
              <>
                {/* Loading Header */}
                <div className="flex items-center justify-center mb-6">
                  <div className="relative">
                    <Loader2 className="h-12 w-12 text-purple-400 animate-spin" />
                    <div className="absolute inset-0 h-12 w-12 text-purple-400/20 animate-ping" />
                  </div>
                </div>

                {/* Title */}
                <h3 className="text-xl font-semibold text-zinc-100 text-center mb-2">
                  {optimizingModel === "gpt-5"
                    ? "GPT-5 pracuje..."
                    : optimizingModel === "gpt-5-mini"
                    ? "GPT-5 mini pracuje..."
                    : "GPT-4o mini pracuje..."}
                </h3>

                {/* Description */}
                <p className="text-sm text-zinc-400 text-center mb-6">
                  AI analizuje składniki i optymalizuje makroskładniki.
                  {optimizingModel === "gpt-5" && (
                    <span className="block mt-1 text-purple-400">
                      Może to potrwać do 3 minut.
                    </span>
                  )}
                  {optimizingModel === "gpt-5-mini" && (
                    <span className="block mt-1 text-blue-400">
                      Może to potrwać do 90 sekund.
                    </span>
                  )}
                </p>

                {/* Progress dots animation */}
                <div className="flex justify-center gap-2 mb-6">
                  <div className="h-2 w-2 bg-purple-400 rounded-full animate-bounce [animation-delay:-0.3s]" />
                  <div className="h-2 w-2 bg-purple-400 rounded-full animate-bounce [animation-delay:-0.15s]" />
                  <div className="h-2 w-2 bg-purple-400 rounded-full animate-bounce" />
                </div>

                {/* Timer */}
                {optimizationStartTime && (
                  <div className="text-center text-xs text-zinc-500 mb-4">
                    Czas: {elapsedSeconds}s
                  </div>
                )}

                {/* Cancel Button */}
                <Button
                  type="button"
                  onClick={handleCancelOptimization}
                  variant="outline"
                  className="w-full border-red-500/50 text-red-400 hover:bg-red-500/10 hover:border-red-500 transition-colors"
                >
                  <X className="h-4 w-4 mr-2" />
                  Anuluj
                </Button>
              </>
            )}
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

export default EditableNutritionSection;