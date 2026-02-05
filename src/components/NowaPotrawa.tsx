import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { NumericInput } from "@/components/ui/numeric-input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { Loader2, Search, ChevronsUpDown, X, Sparkles } from "lucide-react";
import InstructionManager from "./InstructionManager";
import { SelectedIngredient } from "./IngredientSelector";
import SearchableIngredientInput from "./SearchableIngredientInput";
import { getCategories, getProducts, getPotrawaById, savePotrawa, updatePotrawa, transformDishToFrontend, transformFrontendToDish } from "@/utils/supabasePotrawy";
import { saveDishViaEdgeFunction, convertIngredientsForSave } from "@/services/saveDishService";
import { useMealNutrition, MealIngredient } from "@/hooks/useMealNutrition";
import { formatIngredientsString } from "@/utils/polishUnits";
import { debounce } from "@/utils/debounce";
import EditableNutritionSection from "./EditableNutritionSection";
import { shortenUnit, getDefaultQuantityForUnit } from "@/utils/formatIngredients";
import {
  calculateNutritionMacros,
  scaleIngredientsByRatio,
  parsePolishNumberSafe,
  formatPolishNumber
} from "@/utils/preciseCalculations";
import { logger } from '@/utils/logger';

// 🔧 FIXED Issue #2: Use precise formatPolishNumber instead of local implementation
function formatPLNumber(value: number | string): string {
  return formatPolishNumber(value, 1);
}

// Dynamic schema based on available categories
const createPotrawaSchema = (availableCategories: string[]) => z.object({
  nazwa: z.string().min(1, "Nazwa jest wymagana"),
  kategoria: z.enum(availableCategories as [string, ...string[]], {
    required_error: "Kategoria jest wymagana"
  }),
  kcal: z.number().min(0, "Kalorie nie mogą być ujemne"),
  macro: z.object({
    białko: z.number().min(0, "Białko nie może być ujemne"),
    tłuszcz: z.number().min(0, "Tłuszcz nie może być ujemny"),
    węglowodany: z.number().min(0, "Węglowodany nie mogą być ujemne"),
    błonnik: z.number().min(0, "Błonnik nie może być ujemny").optional() // Dodano błonnik
  }),
  instrukcje: z.array(z.string().min(1, "Instrukcja nie może być pusta")).min(1, "Wymagana jest przynajmniej jedna instrukcja")
});

/**
 * ingredients_json: pełna struktura składników potrawy (do ingredients_json w bazie).
 */
export interface IngredientJson {
  ingredient_id: string;
  name: string;
  quantity: number;
  unit: string;
  unit_weight: number;
}

export interface CreatedPotrawa {
  id: string; // Zmieniono na obowiązkowe
  nazwa: string;
  kategoria: string;
  skladniki: string;
  instrukcja: string[];
  macro: { białko: number; tłuszcz: number; węglowodany: number; błonnik?: number }; // Dodano błonnik
  kcal: number;
  ingredients_json: IngredientJson[]; // Nowe pole: pełna struktura składników
}

interface MacroTargets {
  protein: number;
  fat: number;
  carbs: number;
}

interface NowaPotrawaProps {
  potrawaId?: string; // Dodano potrawaId jako opcjonalny prop
  onClose?: () => void;
  onPotrawaCreated?: (potrawa: CreatedPotrawa) => void;
  onFormChange?: (hasChanges: boolean) => void;
}

import { v4 as uuidv4 } from "uuid";

const NowaPotrawa = ({ potrawaId, onClose, onPotrawaCreated, onFormChange }: NowaPotrawaProps) => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [selectedIngredients, setSelectedIngredients] = useState<SelectedIngredient[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [submissionId, setSubmissionId] = useState<string | null>(null);
  // Dodano macroDraft system jak w DishSelectionModal
  const [macroDraft, setMacroDraft] = useState<{ protein: number; carbs: number; fat: number }>({
    protein: 0,
    carbs: 0,
    fat: 0
  });
  const { toast } = useToast();
  const isEditMode = !!potrawaId;

  // Fetch categories and products
  const { data: categories } = useQuery({
    queryKey: ['categories'],
    queryFn: () => getCategories(),
  });

  const { data: products } = useQuery({
    queryKey: ['products'],
    queryFn: () => getProducts(),
  });

  // Fetch dish data if in edit mode
  const { data: potrawaToEdit, isLoading: isLoadingPotrawa } = useQuery({
    queryKey: ['potrawa', potrawaId],
    queryFn: () => potrawaId ? getPotrawaById(potrawaId) : Promise.resolve(null),
    enabled: isEditMode,
  });

  // Create schema with available categories
  const availableCategories = categories?.map(c => c.name) || ['białkowo-tłuszczowe', 'zwykłe'];
  const potrawaSchema = createPotrawaSchema(availableCategories);
  type PotrawaFormData = z.infer<typeof potrawaSchema>;

  const form = useForm<PotrawaFormData>({
    resolver: zodResolver(potrawaSchema),
    defaultValues: {
      nazwa: "",
      kategoria: undefined,
      kcal: 0,
      macro: {
        białko: 0,
        tłuszcz: 0,
        węglowodany: 0,
        błonnik: 0,
      },
      instrukcje: [""]
    }
  });

  // Monitor form changes for confirmation dialog
  useEffect(() => {
    const subscription = form.watch(() => {
      const isDirty = form.formState.isDirty || selectedIngredients.length > 0;
      onFormChange?.(isDirty);
    });
    return () => subscription.unsubscribe();
  }, [form, selectedIngredients, onFormChange]);

  // Populate form with dish data in edit mode
  useEffect(() => {
    if (isEditMode && potrawaToEdit && !isLoadingPotrawa && products) {
      const frontendPotrawa = transformDishToFrontend(potrawaToEdit);

      form.reset({
        nazwa: frontendPotrawa.nazwa,
        kategoria: frontendPotrawa.kategoria,
        kcal: frontendPotrawa.kcal,
        macro: {
          białko: frontendPotrawa.macro.białko,
          tłuszcz: frontendPotrawa.macro.tłuszcz,
          węglowodany: frontendPotrawa.macro.węglowodany,
          błonnik: frontendPotrawa.macro.błonnik,
        },
        instrukcje: frontendPotrawa.instrukcja,
      });
      
      // Use ingredients_json instead of regex parsing from string
      if (frontendPotrawa.ingredients_json && Array.isArray(frontendPotrawa.ingredients_json)) {
        const reconstructedIngredients: SelectedIngredient[] = frontendPotrawa.ingredients_json.map((ingredient: any, index: number) => {
          // Find product to get the most up-to-date information
          const product = products.find(p => p.id === ingredient.ingredient_id);
          return {
            // ✅ OPTIMIZATION 11: More stable ID generation
            id: `dish_ingredient_${ingredient.ingredient_id}_${index}`,
            productId: ingredient.ingredient_id,
            nazwa: product?.name || ingredient.name, // Use current product name if available
            quantity: ingredient.quantity,
            unit: ingredient.unit,
            unit_weight: product?.unit_weight || ingredient.unit_weight || 100
          };
        });
        setSelectedIngredients(reconstructedIngredients);
      } else {
        // Fallback to regex parsing if ingredients_json is not available (older dishes)
        const reconstructedIngredients: SelectedIngredient[] = frontendPotrawa.skladniki.split(',').map((item, index) => {
          const parts = item.trim().match(/(.*) - (\d+)(.*)/);
          if (parts && parts.length === 4) {
            const nazwa = parts[1].trim();
            const quantity = parseFloat(parts[2]);
            const unit = parts[3].trim();
            // Dopasuj productId po nazwie z products
            const product = products?.find(p => p.name === nazwa);
            return {
              // ✅ OPTIMIZATION 12: Stable fallback ID for regex parsing
              id: `dish_fallback_${product?.id || 'unknown'}_${index}`,
              productId: product?.id || '',
              nazwa,
              quantity,
              unit,
              unit_weight: product?.unit_weight || 100
            };
          }
          return null;
        }).filter((item): item is SelectedIngredient => item !== null);
        setSelectedIngredients(reconstructedIngredients);
      }
    }
  }, [isEditMode, potrawaToEdit, isLoadingPotrawa, form, products]);

  // 🚀 OPTIMIZATION: Memoizowana Map produktów dla O(1) lookup zamiast O(N)
  const productsMap = useMemo(() => {
    const map = new Map<string, typeof products extends (infer T)[] ? T : never>();
    if (products) {
      products.forEach(p => map.set(p.id, p));
    }
    return map;
  }, [products]);

  // 🚀 OPTIMIZATION: Konwertuj składniki do formatu dla backend RPC
  const ingredientsForRpc = useMemo((): MealIngredient[] => {
    return selectedIngredients.map(ing => ({
      id: ing.productId,
      quantity: ing.quantity,
      unit: ing.unit,
      unit_weight: ing.unit_weight
    }));
  }, [selectedIngredients]);

  // 🚀 OPTIMIZATION: Obliczenia sum na backendzie (PostgreSQL RPC) z debounce
  const { nutrition: backendNutrition, isLoading: isCalculating } = useMealNutrition(
    ingredientsForRpc,
    { debounceMs: 300 }
  );

  // Mapowanie z formatu backend na format frontend
  const nutrition = useMemo(() => ({
    kcal: backendNutrition.calories,
    białko: backendNutrition.protein,
    tłuszcz: backendNutrition.fat,
    węglowodany: backendNutrition.carbs,
    błonnik: backendNutrition.fiber
  }), [backendNutrition]);

  // Initialize macroDraft when ingredients change
  useEffect(() => {
    setMacroDraft({
      protein: nutrition.białko,
      carbs: nutrition.węglowodany,
      fat: nutrition.tłuszcz
    });
  }, [selectedIngredients, nutrition]);

  // Update form values when ingredients change
  useEffect(() => {
    form.setValue('kcal', nutrition.kcal);
    form.setValue('macro.białko', nutrition.białko);
    form.setValue('macro.tłuszcz', nutrition.tłuszcz);
    form.setValue('macro.węglowodany', nutrition.węglowodany);
    form.setValue('macro.błonnik', nutrition.błonnik);
  }, [nutrition, form]);

  // 🚀 OPTIMIZATION: Memoizowane makra per składnik (cache)
  const ingredientMacrosCache = useMemo(() => {
    const cache = new Map<string, { kcal: number; białko: number; tłuszcz: number; węglowodany: number; błonnik: number }>();

    selectedIngredients.forEach(ingredient => {
      const product = productsMap.get(ingredient.productId);

      if (product) {
        let unitWeight;
        if (ingredient.unit === "gramy" || ingredient.unit === "g") {
          unitWeight = 1;
        } else if (ingredient.unit === "mililitry" || ingredient.unit === "ml") {
          unitWeight = (product.unit_weight || 100);
        } else {
          unitWeight = product.unit_weight || ingredient.unit_weight || 100;
        }

        const macros = calculateNutritionMacros(ingredient.quantity, {
          calories: product.calories || 0,
          protein: product.protein || 0,
          carbs: product.carbs || 0,
          fat: product.fat || 0,
          fiber: product.fiber || 0
        }, unitWeight, ingredient.unit);

        cache.set(ingredient.id, {
          kcal: macros.calories,
          białko: macros.protein,
          tłuszcz: macros.fat,
          węglowodany: macros.carbs,
          błonnik: macros.fiber
        });
      } else if (ingredient.calories !== undefined && ingredient.protein !== undefined) {
        // Fallback: użyj makr z ingredient (dla RPC search)
        cache.set(ingredient.id, {
          kcal: ingredient.calories || 0,
          białko: ingredient.protein || 0,
          tłuszcz: ingredient.fat || 0,
          węglowodany: ingredient.carbs || 0,
          błonnik: ingredient.fiber || 0
        });
      } else {
        cache.set(ingredient.id, { kcal: 0, białko: 0, tłuszcz: 0, węglowodany: 0, błonnik: 0 });
      }
    });

    return cache;
  }, [selectedIngredients, productsMap]);

  // Function to get cached macros for ingredient (O(1) lookup)
  const recalculateMacros = useCallback((ingredient: SelectedIngredient) => {
    return ingredientMacrosCache.get(ingredient.id) || { kcal: 0, białko: 0, tłuszcz: 0, węglowodany: 0, błonnik: 0 };
  }, [ingredientMacrosCache]);

  // Legacy function kept for compatibility - uses O(1) Map lookup now
  const recalculateMacrosLegacy = (ingredient: SelectedIngredient) => {
    // 🚀 OPTIMIZATION: O(1) Map lookup zamiast O(N) find
    const product = productsMap.get(ingredient.productId);

    // Jeśli produkt znaleziony - oblicz makra na podstawie aktualnej ilości
    if (product) {
      // 🔧 FIXED Issue #2: Use calculateNutritionMacros for precise calculations
      let unitWeight;

      if (ingredient.unit === "gramy" || ingredient.unit === "g") {
        unitWeight = 1;
      } else if (ingredient.unit === "mililitry" || ingredient.unit === "ml") {
        unitWeight = (product.unit_weight || 100);
      } else {
        unitWeight = product?.unit_weight || ingredient.unit_weight || 100;
      }

      const macros = calculateNutritionMacros(ingredient.quantity, {
        calories: product.calories || 0,
        protein: product.protein || 0,
        carbs: product.carbs || 0,
        fat: product.fat || 0,
        fiber: product.fiber || 0
      }, unitWeight, ingredient.unit);

      return {
        kcal: macros.calories,
        białko: macros.protein,
        tłuszcz: macros.fat,
        węglowodany: macros.carbs,
        błonnik: macros.fiber
      };
    }

    // 🔧 FALLBACK: Jeśli produktu nie ma w cache, użyj makr z ingredient (dla RPC search)
    const hasMeaningfulMacros = ingredient.calories !== undefined &&
        ingredient.protein !== undefined &&
        ingredient.fat !== undefined &&
        ingredient.carbs !== undefined &&
        (ingredient.calories > 0 || ingredient.protein > 0 ||
         ingredient.fat > 0 || ingredient.carbs > 0);

    if (hasMeaningfulMacros) {
      return {
        kcal: ingredient.calories,
        białko: ingredient.protein,
        tłuszcz: ingredient.fat,
        węglowodany: ingredient.carbs,
        błonnik: ingredient.fiber || 0
      };
    }

    // Brak danych - zwróć zera
    return { kcal: 0, białko: 0, tłuszcz: 0, węglowodany: 0, błonnik: 0 };
  };

  // 🔧 FIXED Issue #2: Use precise scaling with scaleIngredientsByRatio
  const adjustIngredientsForMacro = (ingredients: SelectedIngredient[], macroKey: "białko" | "węglowodany" | "tłuszcz", targetValue: number): SelectedIngredient[] => {
    const currentTotal = ingredients.reduce((sum, ing) => {
      const macros = recalculateMacros(ing);
      return sum + (macros[macroKey] || 0);
    }, 0);

    if (currentTotal === 0 || targetValue === 0) return ingredients;

    // Use precise scaling from preciseCalculations
    return scaleIngredientsByRatio(ingredients, targetValue, currentTotal);
  };

  // Handle macro target changes - simplified version like in DishSelectionModal
  const handleMacroTargetChange = (macros: MacroTargets) => {
    if (macros.protein > 0) {
      setSelectedIngredients(prev => adjustIngredientsForMacro(prev, "białko", macros.protein));
    }
    if (macros.carbs > 0) {
      setSelectedIngredients(prev => adjustIngredientsForMacro(prev, "węglowodany", macros.carbs));
    }
    if (macros.fat > 0) {
      setSelectedIngredients(prev => adjustIngredientsForMacro(prev, "tłuszcz", macros.fat));
    }
  };

  // ✅ OPTIMIZATION: Fixed hook order - Always at component top level
  const convertedSelectedIngredients = useMemo(() => {
    // ✅ Performance monitoring for NowaPotrawa conversion
    const conversionStart = Date.now();
    
    // Convert NowaPotrawa SelectedIngredients to EditableNutritionSection format
    const converted = selectedIngredients.map((ing, index) => ({
      id: ing.id,
      productId: ing.productId,
      nazwa: ing.nazwa,
      quantity: ing.quantity,
      unit: ing.unit,
      unit_weight: ing.unit_weight
    }));
    
    const conversionTime = Date.now() - conversionStart;
    
    return converted;
  }, [selectedIngredients]);

  const handleIngredientsChange = useCallback((newIngredients) => {
    
    // Convert back to NowaPotrawa format with optimized mapping
    const convertedIngredients = newIngredients.map(ing => ({
      id: ing.id,
      productId: ing.productId,
      nazwa: ing.nazwa,
      quantity: ing.quantity,
      unit: ing.unit,
      unit_weight: ing.unit_weight
    }));
    
    setSelectedIngredients(convertedIngredients);
  }, [selectedIngredients]);

  // Handle macro input changes - exactly like in DishSelectionModal
  const handleMacroInputChange = useCallback((macroKey: "protein" | "carbs" | "fat", targetValue: number) => {
    setMacroDraft(prev => ({ ...prev, [macroKey]: targetValue }));
    
    // Map frontend macro keys to Polish backend keys for adjustIngredientsForMacro
    const macroKeyMap = {
      "protein": "białko" as const,
      "carbs": "węglowodany" as const,
      "fat": "tłuszcz" as const
    };
    
    setSelectedIngredients(prevIngredients =>
      adjustIngredientsForMacro(prevIngredients, macroKeyMap[macroKey], targetValue)
    );
  }, []);

  // Raw submit function
  const handleSubmit = async (data: PotrawaFormData) => {
    // Multiple layers of duplicate submission prevention
    if (hasSubmitted) {
      return;
    }
    if (isSubmitting) {
      return;
    }

    // Generate unique submission ID for this attempt
    const currentSubmissionId = uuidv4();
    
    setIsSubmitting(true);
    setHasSubmitted(true);
    setSubmissionId(currentSubmissionId);
    
    try {
      // Convert selected ingredients to string format with proper Polish grammar
      const ingredientsString = formatIngredientsString(selectedIngredients);

      // Filter out empty instructions for saving
      const validInstrukcje = data.instrukcje.filter(instruction => instruction && instruction.trim());

      // Utwórz ingredients_json z selectedIngredients
      const ingredientsJson: IngredientJson[] = selectedIngredients.map(ing => ({
        ingredient_id: ing.productId,
        name: ing.nazwa,
        quantity: ing.quantity,
        unit: ing.unit,
        unit_weight: products?.find(p => p.id === ing.productId)?.unit_weight || 100
      }));

      // Create the dish object for Supabase
      const dishData = transformFrontendToDish({
        id: potrawaId, // Pass ID if in edit mode
        nazwa: data.nazwa,
        kategoria: data.kategoria,
        skladniki: ingredientsString,
        instrukcja: validInstrukcje,
        macro: {
          białko: data.macro.białko || 0,
          tłuszcz: data.macro.tłuszcz || 0,
          węglowodany: data.macro.węglowodany || 0,
          błonnik: data.macro.błonnik || 0,
        },
        kcal: data.kcal,
        ingredients_json: ingredientsJson // Przekazanie pełnej struktury składników
      });

      let resultPotrawa: CreatedPotrawa;

      if (isEditMode && potrawaId) {
        // Update existing dish
        const updatedDish = await updatePotrawa(potrawaId, dishData);
        resultPotrawa = transformDishToFrontend(updatedDish);

        // 🔧 FIX: Invalidate React Query cache to refetch fresh data
        queryClient.invalidateQueries({ queryKey: ['potrawa', potrawaId] });
        queryClient.invalidateQueries({ queryKey: ['potrawy'] });

        toast({
          title: "Potrawa została zaktualizowana",
          description: `${data.nazwa} została pomyślnie zaktualizowana.`,
          variant: "default",
        });
      } else {
        // FAZA 3: Save new dish via Edge Function (atomowy zapis na backendzie)
        const ingredientsForSave = convertIngredientsForSave(
          selectedIngredients.map(ing => ({
            id: ing.id,
            productId: ing.productId,
            productName: ing.nazwa,
            quantity: ing.quantity,
            unit: ing.unit,
            unit_weight: products?.find(p => p.id === ing.productId)?.unit_weight,
          }))
        );

        const savedDish = await saveDishViaEdgeFunction({
          name: data.nazwa,
          category: data.kategoria,
          ingredients_json: ingredientsForSave,
          instructions: validInstrukcje,
          // Pass calculated macros (from useMealNutrition)
          protein: data.macro.białko || 0,
          fat: data.macro.tłuszcz || 0,
          carbs: data.macro.węglowodany || 0,
          fiber: data.macro.błonnik || 0,
          calories: data.kcal,
        });

        resultPotrawa = {
          id: savedDish.id,
          nazwa: savedDish.name,
          kategoria: savedDish.category,
          skladniki: savedDish.ingredients_description,
          instrukcja: savedDish.instructions,
          macro: {
            białko: savedDish.protein,
            tłuszcz: savedDish.fat,
            węglowodany: savedDish.carbs,
            błonnik: savedDish.fiber,
          },
          kcal: savedDish.calories,
          ingredients_json: savedDish.ingredients_json,
        };

        // 🔧 FIX: Invalidate React Query cache to refetch fresh data
        queryClient.invalidateQueries({ queryKey: ['potrawy'] });

        toast({
          title: "Potrawa została dodana",
          description: `${data.nazwa} została pomyślnie zapisana.`,
          variant: "default",
        });
      }

      if (onPotrawaCreated) {
        onPotrawaCreated(resultPotrawa);
      }
      
      // Navigate back to potrawy list or close modal
      if (onClose) {
        onClose();
      } else {
        navigate("/potrawy"); // Only navigate if not in a modal context
      }
    } catch (error) {
      logger.error('Error saving/updating dish:', error);
      
      // Handle specific error types with better messages
      let errorMessage = "Nie udało się zapisać/zaktualizować potrawy. Spróbuj ponownie.";
      
      if (error instanceof Error) {
        if (error.message.includes('Potrawa o tej nazwie już istnieje')) {
          errorMessage = `Potrawa o nazwie "${data.nazwa}" już istnieje. Wybierz inną nazwę.`;
        } else if (error.message.includes('Potrawa o identycznych składnikach już istnieje')) {
          errorMessage = "Potrawa o identycznych składnikach już istnieje. Zmień składniki lub nazwę.";
        } else if (error.message.includes('duplicate')) {
          errorMessage = `Potrawa o nazwie "${data.nazwa}" już istnieje. Wybierz inną nazwę.`;
        }
      }
      
      toast({
        title: "Błąd zapisu",
        description: errorMessage,
        variant: "destructive"
      });
      setHasSubmitted(false); // Reset flag on error to allow retry
    } finally {
      setIsSubmitting(false);
    }
  };

  // Validation toast handler
  const handleValidationErrors = (errors: any) => {
    const errorMessages = [];
    
    if (errors.nazwa) {
      errorMessages.push("Nazwa potrawy jest wymagana");
    }
    if (errors.kategoria) {
      errorMessages.push("Kategoria jest wymagana");
    }
    if (errors.kcal) {
      errorMessages.push("Kalorie są wymagane i muszą być większe niż 0");
    }
    if (errors.macro?.białko) {
      errorMessages.push("Białko nie może być ujemne");
    }
    if (errors.macro?.tłuszcz) {
      errorMessages.push("Tłuszcz nie może być ujemny");
    }
    if (errors.macro?.węglowodany) {
      errorMessages.push("Węglowodany nie mogą być ujemne");
    }
    if (errors.macro?.błonnik) {
      errorMessages.push("Błonnik nie może być ujemny");
    }
    if (errors.instrukcje) {
      errorMessages.push("Wymagana jest przynajmniej jedna niepusta instrukcja");
    }
    
    if (errorMessages.length > 0) {
      toast({
        title: "Błędy w formularzu",
        description: errorMessages.join(". "),
        variant: "destructive"
      });
    }
  };

  // Enhanced submit function with validation toasts
  const submitWithValidation = (data: PotrawaFormData) => {
    // Check for form validation errors first
    const errors = form.formState.errors;
    if (Object.keys(errors).length > 0) {
      handleValidationErrors(errors);
      return;
    }
    
    // If no validation errors, proceed with actual submit
    handleSubmit(data);
  };

  // Create debounced submit function to prevent rapid submissions
  const onSubmit = debounce(submitWithValidation, 1000);

  // Show loading state when loading dish data for editing
  if (isEditMode && isLoadingPotrawa) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-[#a08032]" />
          <p className="text-zinc-400">Ładowanie danych potrawy...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-full overflow-hidden">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 sm:space-y-6 w-full max-w-full overflow-x-hidden">
        {/* Name and Category Fields */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
          <FormField
            control={form.control}
            name="nazwa"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-gray-100">Nazwa</FormLabel>
                <FormControl>
                  <Input
                    placeholder="Nazwa potrawy"
                    {...field}
                    className="bg-zinc-800 border-zinc-700 text-zinc-100 focus:border-[#a08032] focus:ring-[#a08032]"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="kategoria"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-gray-100">Kategoria</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger id="potrawa-kategoria" className="bg-zinc-800 border-zinc-700 text-zinc-100 focus:border-[#a08032] focus:ring-[#a08032]">
                      <SelectValue placeholder="Wybierz kategorię" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent className="bg-gray-700 border-gray-600">
                    {availableCategories.map((categoryName) => (
                      <SelectItem
                        key={categoryName}
                        value={categoryName}
                        className="text-gray-100 hover:bg-gray-600 focus:bg-gray-600"
                      >
                        {categoryName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* 📱 RESPONSYWNY UI: Składniki i wartości odżywcze */}
        <div className="w-full max-w-full space-y-2 overflow-hidden">
          <Label className="text-gray-100">Składniki i wartości odżywcze</Label>

          <div className="bg-zinc-900/50 rounded-lg p-2 sm:p-3 space-y-2 w-full max-w-full">
            {/* Desktop Header - ukryty na mobile */}
            <div className="hidden md:grid grid-cols-12 gap-1 px-2">
              <div className="col-span-4">
                <Label className="text-xs text-zinc-500">Nazwa składnika</Label>
              </div>
              <div className="col-span-2">
                <Label className="text-xs text-zinc-500">Ilość</Label>
              </div>
              <div className="col-span-1 text-center">
                <Label className="text-xs text-zinc-500">Kcal</Label>
              </div>
              <div className="col-span-1 text-center">
                <Label className="text-xs text-zinc-500">Białko</Label>
              </div>
              <div className="col-span-1 text-center">
                <Label className="text-xs text-zinc-500">Węgl.</Label>
              </div>
              <div className="col-span-1 text-center">
                <Label className="text-xs text-zinc-500">Tł.</Label>
              </div>
              <div className="col-span-1 text-center">
                <Label className="text-xs text-zinc-500">Bł.</Label>
              </div>
              <div className="col-span-1">
                <Label className="text-xs text-zinc-500"></Label>
              </div>
            </div>

            {/* Ingredients list - responsywne */}
            <div className="space-y-2">
              {selectedIngredients.map((ingredient) => {
                const macros = recalculateMacros(ingredient);
                const unitShort = shortenUnit(ingredient.unit);

                return (
                  <div key={ingredient.id} className="bg-zinc-800 rounded-lg p-2 sm:p-3 w-full max-w-full">
                    {/* Mobile Layout */}
                    <div className="md:hidden space-y-3 w-full max-w-full overflow-hidden">
                      <div className="flex justify-between items-center">
                        <h4 className="text-sm font-medium text-zinc-200 truncate flex-1 min-w-0 mr-2 text-left">{ingredient.nazwa}</h4>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setSelectedIngredients(selectedIngredients.filter(ing => ing.id !== ingredient.id));
                          }}
                          className="h-8 w-8 p-0 text-zinc-400 hover:text-red-400"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <Label htmlFor={`ingredient-qty-mobile-${ingredient.id}`} className="text-xs text-zinc-500 mb-1 block">Ilość</Label>
                          <div className="relative">
                            <NumericInput
                              id={`ingredient-qty-mobile-${ingredient.id}`}
                              name={`ingredient-qty-mobile-${ingredient.id}`}
                              type="decimal"
                              value={ingredient.quantity}
                              onChange={(newQuantity) => {
                                // Enforce minimum value based on unit
                                let finalQuantity = newQuantity;
                                if (newQuantity === 0) {
                                  finalQuantity = ingredient.unit === 'sztuka' || ingredient.unit === 'szt' ? 1 : 0.1;
                                }
                                const updated = selectedIngredients.map(ing =>
                                  ing.id === ingredient.id
                                    ? { ...ing, quantity: finalQuantity }
                                    : ing
                                );
                                setSelectedIngredients(updated);
                              }}
                              showPlaceholderForZero={false}
                              placeholder="100"
                              className="bg-zinc-600 border-zinc-500 text-zinc-100 text-sm pr-8 h-8"
                            />
                            <span className="absolute right-2 top-1/2 transform -translate-y-1/2 text-zinc-400 text-xs pointer-events-none">
                              {unitShort}
                            </span>
                          </div>
                        </div>

                        <div>
                          <Label className="text-xs text-zinc-500 mb-1 block">Kalorie</Label>
                          <div className="py-1.5 text-sm text-zinc-300">
                            {formatPLNumber(macros.kcal)} kcal
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-4 gap-2">
                        <div>
                          <Label className="text-xs text-zinc-500 block mb-1">Białko</Label>
                          <div className="py-1.5 text-xs text-zinc-300">{formatPLNumber(macros.białko)}g</div>
                        </div>
                        <div>
                          <Label className="text-xs text-zinc-500 block mb-1">Węgl.</Label>
                          <div className="py-1.5 text-xs text-zinc-300">{formatPLNumber(macros.węglowodany)}g</div>
                        </div>
                        <div>
                          <Label className="text-xs text-zinc-500 block mb-1">Tł.</Label>
                          <div className="py-1.5 text-xs text-zinc-300">{formatPLNumber(macros.tłuszcz)}g</div>
                        </div>
                        <div>
                          <Label className="text-xs text-zinc-500 block mb-1">Bł.</Label>
                          <div className="py-1.5 text-xs text-zinc-300">{formatPLNumber(macros.błonnik)}g</div>
                        </div>
                      </div>
                    </div>

                    {/* Desktop Layout - ukryty na mobile */}
                    <div className="hidden md:grid grid-cols-12 gap-1 items-center">
                      {/* Nazwa składnika */}
                      <div className="col-span-4 flex items-center">
                        <span className="text-sm text-zinc-300 font-medium px-1">
                          {ingredient.nazwa}
                        </span>
                      </div>

                      {/* Ilość */}
                      <div className="col-span-2">
                        <div className="relative">
                          <NumericInput
                            id={`ingredient-qty-desktop-${ingredient.id}`}
                            name={`ingredient-qty-desktop-${ingredient.id}`}
                            aria-label={`Ilość ${ingredient.nazwa}`}
                            type="decimal"
                            value={ingredient.quantity}
                              onChange={(newQuantity) => {
                                const updated = selectedIngredients.map(ing =>
                                  ing.id === ingredient.id
                                    ? { ...ing, quantity: newQuantity }
                                    : ing
                                );
                                setSelectedIngredients(updated);
                              }}
                            showPlaceholderForZero={false}
                            placeholder="100"
                            className="bg-zinc-600 border-zinc-500 text-zinc-100 text-xs ring-2 ring-blue-500/50 focus:ring-blue-400 pr-6 h-7"
                          />
                          <span className="absolute right-1 top-1/2 transform -translate-y-1/2 text-zinc-400 text-xs pointer-events-none">
                            {unitShort}
                          </span>
                        </div>
                      </div>

                      {/* Makroskładniki */}
                      <div className="col-span-1 flex items-center justify-center">
                        <span className="text-xs text-zinc-300 font-medium">
                          {formatPLNumber(macros.kcal)}
                        </span>
                      </div>
                      <div className="col-span-1 flex items-center justify-center">
                        <span className="text-xs text-zinc-300 font-medium">
                          {formatPLNumber(macros.białko)}
                        </span>
                      </div>
                      <div className="col-span-1 flex items-center justify-center">
                        <span className="text-xs text-zinc-300 font-medium">
                          {formatPLNumber(macros.węglowodany)}
                        </span>
                      </div>
                      <div className="col-span-1 flex items-center justify-center">
                        <span className="text-xs text-zinc-300 font-medium">
                          {formatPLNumber(macros.tłuszcz)}
                        </span>
                      </div>
                      <div className="col-span-1 flex items-center justify-center">
                        <span className="text-xs text-zinc-300 font-medium">
                          {formatPLNumber(macros.błonnik)}
                        </span>
                      </div>

                      {/* Przycisk usuń */}
                      <div className="col-span-1 flex items-center justify-center">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setSelectedIngredients(selectedIngredients.filter(ing => ing.id !== ingredient.id));
                          }}
                          className="h-6 w-6 p-0.5 text-zinc-400 hover:text-red-400"
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}

              {/* Wiersz SUMA - responsywny */}
              {selectedIngredients.length > 0 && (() => {
                const totals = selectedIngredients.reduce((sum, ingredient) => {
                  const macros = recalculateMacros(ingredient);
                  return {
                    kcal: sum.kcal + (macros.kcal || 0),
                    białko: sum.białko + (macros.białko || 0),
                    węglowodany: sum.węglowodany + (macros.węglowodany || 0),
                    tłuszcz: sum.tłuszcz + (macros.tłuszcz || 0),
                    błonnik: sum.błonnik + (macros.błonnik || 0)
                  };
                }, { kcal: 0, białko: 0, węglowodany: 0, tłuszcz: 0, błonnik: 0 });

                return (
                  <div className="bg-zinc-700/50 rounded-lg p-3 border-t-2 border-zinc-600 mt-2">
                    {/* Mobile Summary */}
                    <div className="md:hidden">
                      <h4 className="text-sm font-medium text-zinc-200 mb-3 text-left">SUMA</h4>
                      <div className="grid grid-cols-2 gap-3 mb-3">
                        <div>
                          <Label className="text-xs text-zinc-400 block mb-1">Kalorie</Label>
                          <div className="text-sm font-medium text-zinc-300">{formatPLNumber(totals.kcal)} kcal</div>
                        </div>
                        <div></div>
                      </div>
                      <div className="grid grid-cols-4 gap-2">
                        <div>
                          <Label className="text-xs text-zinc-400 block mb-1">Białko</Label>
                          <div className="text-xs text-zinc-300">{formatPLNumber(totals.białko)}g</div>
                        </div>
                        <div>
                          <Label className="text-xs text-zinc-400 block mb-1">Węgl.</Label>
                          <div className="text-xs text-zinc-300">{formatPLNumber(totals.węglowodany)}g</div>
                        </div>
                        <div>
                          <Label className="text-xs text-zinc-400 block mb-1">Tł.</Label>
                          <div className="text-xs text-zinc-300">{formatPLNumber(totals.tłuszcz)}g</div>
                        </div>
                        <div>
                          <Label className="text-xs text-zinc-400 block mb-1">Bł.</Label>
                          <div className="text-xs text-zinc-300">{formatPLNumber(totals.błonnik)}g</div>
                        </div>
                      </div>
                    </div>

                    {/* Desktop Summary */}
                    <div className="hidden md:grid grid-cols-12 gap-1 items-center">
                      <div className="col-span-4">
                        <span className="text-sm font-medium text-zinc-200">SUMA</span>
                      </div>
                      <div className="col-span-2 text-center">
                      </div>
                      <div className="col-span-1 text-center">
                        <span className="text-xs font-medium text-zinc-200">{formatPLNumber(totals.kcal)}</span>
                      </div>
                      <div className="col-span-1 text-center">
                        <span className="text-xs font-medium text-zinc-200">{formatPLNumber(totals.białko)}</span>
                      </div>
                      <div className="col-span-1 text-center">
                        <span className="text-xs font-medium text-zinc-200">{formatPLNumber(totals.węglowodany)}</span>
                      </div>
                      <div className="col-span-1 text-center">
                        <span className="text-xs font-medium text-zinc-200">{formatPLNumber(totals.tłuszcz)}</span>
                      </div>
                      <div className="col-span-1 text-center">
                        <span className="text-xs font-medium text-zinc-200">{formatPLNumber(totals.błonnik)}</span>
                      </div>
                      <div className="col-span-1"></div>
                    </div>
                  </div>
                );
              })()}
            </div>

            {/* SearchableIngredientInput - używa wyszukiwania przez PostgreSQL RPC */}
            <div className="pt-2 border-t border-zinc-800">
              <SearchableIngredientInput
                onIngredientSelect={(selectedProduct: any) => {
                  // BUGFIX 2025-01-06: Validate no duplicate ingredients
                  const isDuplicate = selectedIngredients.some(
                    (ing) => ing.productId === selectedProduct.id
                  );

                  if (isDuplicate) {
                    toast({
                      variant: "destructive",
                      title: "Składnik już istnieje",
                      description: `"${selectedProduct.name}" jest już w potrawie. Zwiększ jego ilość zamiast dodawać ponownie.`,
                    });
                    return; // Prevent adding duplicate
                  }

                  const qty = getDefaultQuantityForUnit(selectedProduct.unit || "");
                  const unitWeight = selectedProduct.unit_weight || 100;

                  // 🔧 FIX: Oblicz makra bezpośrednio z danych RPC (nie wymaga lookup w products)
                  const macros = calculateNutritionMacros(qty, {
                    calories: selectedProduct.calories ?? 0,
                    protein: selectedProduct.protein ?? 0,
                    carbs: selectedProduct.carbs ?? 0,
                    fat: selectedProduct.fat ?? 0,
                    fiber: selectedProduct.fiber ?? 0
                  }, unitWeight, selectedProduct.unit);

                  const newIngredient: SelectedIngredient = {
                    id: `dish_new_${selectedProduct.id}_${Date.now()}`,
                    productId: selectedProduct.id,
                    nazwa: selectedProduct.name || "",
                    quantity: qty,
                    unit: selectedProduct.unit || "gramy",
                    unit_weight: unitWeight,
                    // Przekaż przeliczone makra - recalculateMacros użyje ich bezpośrednio
                    calories: macros.calories,
                    protein: macros.protein,
                    fat: macros.fat,
                    carbs: macros.carbs,
                    fiber: macros.fiber
                  };
                  setSelectedIngredients([...selectedIngredients, newIngredient]);
                }}
                placeholder="Wyszukaj składnik do dodania..."
              />
            </div>
            
            {/* EditableNutritionSection - inline w tym samym kontenerze */}
            <div className="pt-2 border-t border-zinc-800">
              <EditableNutritionSection
                watch={form.watch}
                onMacroChange={handleMacroInputChange}
                form={form}
                macroDraft={macroDraft}
                selectedIngredients={convertedSelectedIngredients}
                products={products}
                context="dish"
                onIngredientsChange={handleIngredientsChange}
              />
            </div>
          </div>
        </div>

        <InstructionManager
          control={form.control}
          name="instrukcje"
        />

        <div className="flex flex-col sm:flex-row justify-end gap-3 pt-4">
          <Button
            type="button"
            variant="outline"
            onClick={onClose || (() => navigate("/potrawy"))}
            className="w-full sm:w-auto"
          >
            Anuluj
          </Button>
          <Button
            type="submit"
            disabled={isSubmitting || Object.keys(form.formState.errors).length > 0}
            className="w-full sm:w-auto"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                {isEditMode ? "Zapisywanie..." : "Zapisywanie..."}
              </>
            ) : (
              isEditMode ? "Zapisz zmiany" : "Zapisz Potrawę"
            )}
          </Button>
        </div>
        </form>
      </Form>
    </div>
  );
};

export default NowaPotrawa;
