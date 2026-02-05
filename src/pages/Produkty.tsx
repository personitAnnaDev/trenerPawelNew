import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useAuth } from "@/contexts/AuthContext";
import { useModalConfirmation } from "@/hooks/useModalConfirmation";
import { logger } from '@/utils/logger';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Plus, Search } from "lucide-react";
import IngredientsTable from "@/components/IngredientsTable";
import AddIngredientForm from "@/components/AddIngredientForm";
import { supabase } from "@/utils/supabase";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";

export interface Ingredient {
  id: string;
  nazwa: string;
  kcal: number;
  macro: {
    białko: number;
    tłuszcz: number;
    węglowodany: number;
  };
  blonnik: number;
  unit: string;
  unit_weight: number;
}

const Produkty = () => {
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingIngredient, setEditingIngredient] = useState<Ingredient | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [hasAddFormChanges, setHasAddFormChanges] = useState(false);
  const [hasEditFormChanges, setHasEditFormChanges] = useState(false);

  // State for product edit warning modal
  const [showWarningModal, setShowWarningModal] = useState(false);
  const [pendingUpdate, setPendingUpdate] = useState<{
    updated: Omit<Ingredient, "id">;
    usage: {
      isUsed: boolean;
      dishCount: number;
      mealCount: number;
      templateCount: number;
      clientDietCount: number;
      dishNames: string[];
      templateNames: string[];
      clientDietNames: string[];
    };
    oldValues: Ingredient;
    changes: {
      caloriesChange: number;
      proteinChange: number;
    };
  } | null>(null);

  // State for product delete warning modal
  const [showDeleteWarningModal, setShowDeleteWarningModal] = useState(false);
  const [deleteUsageInfo, setDeleteUsageInfo] = useState<{
    isUsed: boolean;
    dishCount: number;
    mealCount: number;
    templateCount: number;
    clientDietCount: number;
    dishNames: string[];
    templateNames: string[];
    clientDietNames: string[];
  } | null>(null);

  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user } = useAuth();

  // Always show confirmation when closing
  const hasAddUnsavedChanges = useCallback(() => {
    return true; // Always require confirmation
  }, []);

  const hasEditUnsavedChanges = useCallback(() => {
    return true; // Always require confirmation
  }, []);

  // Confirmation modal hooks for ingredient add/edit
  const { handleClose: handleAddConfirmationClose, confirmationDialog: addConfirmationDialog } = useModalConfirmation({
    title: "Zamknąć dodawanie składnika?",
    message: "Czy na pewno chcesz zamknąć okno dodawania składnika?",
    hasUnsavedChanges: hasAddUnsavedChanges,
    onDiscard: () => {
      setHasAddFormChanges(false);
      setIsDialogOpen(false);
    }
  });

  const { handleClose: handleEditConfirmationClose, confirmationDialog: editConfirmationDialog } = useModalConfirmation({
    title: "Zamknąć edycję składnika?",
    message: "Czy na pewno chcesz zamknąć okno edycji składnika?",
    hasUnsavedChanges: hasEditUnsavedChanges,
    onDiscard: () => {
      setHasEditFormChanges(false);
      setIsEditDialogOpen(false);
      setEditingIngredient(null);
    }
  });

  // Handle dialog open/close with confirmation for add modal
  const handleAddDialogOpenChange = (open: boolean) => {
    if (open) {
      setIsDialogOpen(true);
    } else {
      handleAddConfirmationClose();
    }
  };

  // Handle dialog open/close with confirmation for edit modal
  const handleEditDialogOpenChange = (open: boolean) => {
    if (open) {
      setIsEditDialogOpen(true);
    } else {
      handleEditConfirmationClose();
    }
  };

  useEffect(() => {
    fetchIngredients();
  }, []);

  // 🔄 REALTIME: Subscribe to ingredients table changes for multi-tab sync
  useEffect(() => {
    const channel = supabase
      .channel('public:ingredients')
      .on('postgres_changes', {
        event: '*',           // INSERT, UPDATE, DELETE
        schema: 'public',
        table: 'ingredients'
      }, (payload) => {
        logger.log('🔄 Ingredients changed:', payload);
        // Invalidate React Query cache - refreshes all components using products
        queryClient.invalidateQueries({ queryKey: ['products'] });
        // Refresh local state in this component
        fetchIngredients();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  const checkDuplicateName = (name: string, unit: string, excludeId?: string): boolean => {
    const result = ingredients.some(
      ing => {
        const nameMatch = ing.nazwa.toLowerCase() === name.toLowerCase();
        const unitMatch = ing.unit === unit;
        const idDifferent = ing.id !== excludeId;

        return nameMatch && unitMatch && idDifferent;
      }
    );

    return result;
  };

  const fetchIngredients = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('ingredients')
        .select('*')
        .order('name');


      if (error) throw error;

      const mappedIngredients: Ingredient[] = data.map(item => ({
        id: item.id,
        nazwa: item.name || '',
        kcal: Number(item.calories) || 0,
        macro: {
          białko: Number(item.protein) || 0,
          tłuszcz: Number(item.fat) || 0,
          węglowodany: Number(item.carbs) || 0
        },
        blonnik: Number(item.fiber) || 0,
        unit: item.unit || '',
        unit_weight: Number(item.unit_weight) || 0
      }));

      setIngredients(mappedIngredients);
    } catch (error) {
      logger.error('Error fetching ingredients:', error);
      toast({
        title: "Błąd",
        description: "Nie udało się pobrać listy składników",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAddIngredient = async (newIngredient: Omit<Ingredient, "id">) => {
    // Sprawdzanie duplikatów nazwy i jednostki
    if (checkDuplicateName(newIngredient.nazwa, newIngredient.unit)) {
      toast({
        title: "Produkt już istnieje",
        description: `Produkt "${newIngredient.nazwa}" w jednostce "${newIngredient.unit}" już istnieje. Dodaj więcej szczegółów do nazwy, np. "${newIngredient.nazwa} (2%)" lub "${newIngredient.nazwa} (bio)".`,
        variant: "destructive",
      });
      return;
    }

    try {
      const { data, error } = await supabase
        .from('ingredients')
        .insert({
          name: newIngredient.nazwa,
          calories: newIngredient.kcal,
          protein: newIngredient.macro.białko,
          fat: newIngredient.macro.tłuszcz,
          carbs: newIngredient.macro.węglowodany,
          fiber: newIngredient.blonnik,
          unit: newIngredient.unit,
          unit_weight: newIngredient.unit_weight
        })
        .select()
        .single();

      if (error) throw error;

      const savedIngredient: Ingredient = {
        id: data.id,
        nazwa: data.name || '',
        kcal: Number(data.calories) || 0,
        macro: {
          białko: Number(data.protein) || 0,
          tłuszcz: Number(data.fat) || 0,
          węglowodany: Number(data.carbs) || 0
        },
        blonnik: Number(data.fiber) || 0,
        unit: data.unit || '',
        unit_weight: Number(data.unit_weight) || 0
      };

      setIngredients([...ingredients, savedIngredient]);
      setIsDialogOpen(false);

      // Invalidate products cache to refresh all components using product list
      queryClient.invalidateQueries({ queryKey: ['products'] });

      toast({
        title: "Sukces",
        description: `${newIngredient.nazwa} został dodany do bazy danych`,
      });
    } catch (error) {
      logger.error('Error adding ingredient:', error);
      toast({
        title: "Błąd",
        description: "Nie udało się dodać składnika",
        variant: "destructive",
      });
    }
  };

  // 🚀 OPTIMIZATION: Check product usage via PostgreSQL RPC (single query instead of multiple)
  const checkProductUsage = async (ingredientId: string) => {
    try {
      const { data, error } = await supabase.rpc('check_ingredient_usage', {
        p_ingredient_id: ingredientId,
        p_user_id: user?.id
      });

      if (error) {
        logger.error('Error checking product usage via RPC:', error);
        throw error;
      }

      return {
        isUsed: data?.is_used || false,
        dishCount: data?.dish_count || 0,
        mealCount: data?.meal_count || 0,
        templateCount: data?.template_count || 0,
        clientDietCount: data?.client_diet_count || 0,
        dishNames: data?.dish_names || [],
        templateNames: data?.template_names || [],
        clientDietNames: data?.client_diet_names || []
      };
    } catch (error) {
      logger.error('Error checking product usage:', error);
      return {
        isUsed: false,
        dishCount: 0,
        mealCount: 0,
        templateCount: 0,
        clientDietCount: 0,
        dishNames: [],
        templateNames: [],
        clientDietNames: []
      };
    }
  };

  // Calculate percentage change between old and new values
  const calculateChangePercentage = (oldValue: number, newValue: number): number => {
    if (oldValue === 0) return newValue > 0 ? 100 : 0;
    return Math.abs(((newValue - oldValue) / oldValue) * 100);
  };

  // Update cached macros in dishes and meal_ingredients when product is edited
  const updateCachedMacros = async (
    ingredientId: string,
    newValues: Omit<Ingredient, "id">
  ) => {
    try {
      // 1. Update dishes.ingredients_json and ingredients_description
      const { data: affectedDishes, error: dishesError } = await supabase
        .from('dishes')
        .select('id, ingredients_json')
        .eq('user_id', user?.id);

      if (dishesError) throw dishesError;

      for (const dish of affectedDishes || []) {
        if (!dish.ingredients_json) continue;

        // Check if this dish actually contains the ingredient
        const hasIngredient = dish.ingredients_json.some((ing: any) => ing.ingredient_id === ingredientId);
        if (!hasIngredient) continue;

        const updatedIngredients = dish.ingredients_json.map((ing: any) => {
          if (ing.ingredient_id !== ingredientId) return ing;

          // Recalculate macros from new product values
          const unitWeight = ing.unit === 'gramy' || ing.unit === 'g'
            ? 1
            : (ing.unit_weight || newValues.unit_weight);

          const multiplier = (ing.quantity * unitWeight) / 100;

          return {
            ...ing,
            name: newValues.nazwa,  // UPDATE NAME
            unit: newValues.unit,    // UPDATE UNIT
            unit_weight: newValues.unit_weight,  // UPDATE UNIT WEIGHT
            calories: newValues.kcal * multiplier,
            protein: newValues.macro.białko * multiplier,
            fat: newValues.macro.tłuszcz * multiplier,
            carbs: newValues.macro.węglowodany * multiplier,
            fiber: (newValues.blonnik || 0) * multiplier
          };
        });

        // Rebuild ingredients_description from updated ingredients
        const newDescription = updatedIngredients
          .map((ing: any) => `${ing.name} - ${ing.quantity} ${ing.unit}`)
          .join(', ');

        const { error: updateError } = await supabase
          .from('dishes')
          .update({
            ingredients_json: updatedIngredients,
            ingredients_description: newDescription || null
          })
          .eq('id', dish.id)
          .eq('user_id', user?.id);

        if (updateError) {
          logger.error('Error updating dish:', dish.id, updateError);
          throw updateError;
        }
      }

      // 2. Update meal_ingredients
      const { data: affectedMealIngredients, error: mealError } = await supabase
        .from('meal_ingredients')
        .select('id, quantity, unit, unit_weight')
        .eq('ingredient_id', ingredientId);

      if (mealError) throw mealError;

      for (const mi of affectedMealIngredients || []) {
        // Use cached unit_weight from meal_ingredients (not from product)
        const cachedUnitWeight = mi.unit_weight || 100;

        // Calculate grams based on unit type (same logic as calculateNutritionMacros)
        let grams: number;
        if (mi.unit === 'mililitry' || mi.unit === 'ml') {
          // For ml: (quantity / 100) * unit_weight
          grams = (mi.quantity / 100) * cachedUnitWeight;
        } else if (mi.unit === 'gramy' || mi.unit === 'g') {
          // For grams: quantity is already in grams
          grams = mi.quantity;
        } else {
          // For other units (sztuka, etc.): quantity * unit_weight
          grams = mi.quantity * cachedUnitWeight;
        }

        // Multiplier is grams / 100
        const multiplier = grams / 100;

        await supabase
          .from('meal_ingredients')
          .update({
            name: newValues.nazwa,  // UPDATE NAME
            calories: newValues.kcal * multiplier,
            protein: newValues.macro.białko * multiplier,
            fat: newValues.macro.tłuszcz * multiplier,
            carbs: newValues.macro.węglowodany * multiplier,
            fiber: (newValues.blonnik || 0) * multiplier
            // DON'T update unit - keep the original unit from meal_ingredients
          })
          .eq('id', mi.id);
      }

      return true;
    } catch (error) {
      logger.error('Error updating cached macros:', error);
      throw error;
    }
  };

  // Remove ingredient from dishes.ingredients_json and ingredients_description
  const removeIngredientFromDishes = async (ingredientId: string, ingredientName: string) => {
    try {
      // Get all dishes that contain this ingredient
      const { data: affectedDishes, error: dishesError } = await supabase
        .from('dishes')
        .select('id, ingredients_json, ingredients_description')
        .eq('user_id', user?.id);

      if (dishesError) throw dishesError;

      for (const dish of affectedDishes || []) {
        if (!dish.ingredients_json) continue;

        // Filter out the ingredient with matching ingredient_id
        const updatedIngredients = dish.ingredients_json.filter(
          (ing: any) => ing.ingredient_id !== ingredientId
        );

        // Update only if ingredients were actually removed
        if (updatedIngredients.length !== dish.ingredients_json.length) {
          // Rebuild ingredients_description from updated ingredients
          const newDescription = updatedIngredients
            .map((ing: any) => `${ing.name} - ${ing.quantity} ${ing.unit}`)
            .join(', ');

          await supabase
            .from('dishes')
            .update({
              ingredients_json: updatedIngredients,
              ingredients_description: newDescription || null
            })
            .eq('id', dish.id);
        }
      }

      return true;
    } catch (error) {
      logger.error('Error removing ingredient from dishes:', error);
      throw error;
    }
  };

  const filteredIngredients = ingredients
    .filter(ingredient =>
      ingredient.nazwa.toLowerCase().includes(searchTerm.toLowerCase())
    )
    .sort((a, b) => a.nazwa.toLowerCase().localeCompare(b.nazwa.toLowerCase()));

  const handleEditIngredient = (ingredient: Ingredient) => {
    setEditingIngredient(ingredient);
    setIsEditDialogOpen(true);
    setShowDeleteDialog(false);
  };

  const handleUpdateIngredient = async (updated: Omit<Ingredient, "id">) => {
    if (!editingIngredient) return;

    // Sprawdzanie duplikatów nazwy i jednostki (z wykluczeniem aktualnie edytowanego)
    // Tylko sprawdzaj duplikaty jeśli nazwa lub jednostka została zmieniona
    const nameChanged = updated.nazwa !== editingIngredient.nazwa;
    const unitChanged = updated.unit !== editingIngredient.unit;

    if (nameChanged || unitChanged) {
      const isDuplicate = checkDuplicateName(updated.nazwa, updated.unit, editingIngredient.id);

      if (isDuplicate) {
        toast({
          title: "Produkt już istnieje",
          description: `Produkt "${updated.nazwa}" w jednostce "${updated.unit}" już istnieje. Dodaj więcej szczegółów do nazwy, np. "${updated.nazwa} (2%)" lub "${updated.nazwa} (bio)".`,
          variant: "destructive",
        });
        return;
      }
    }

    // Check if product is used in dishes or meal_ingredients
    const usage = await checkProductUsage(editingIngredient.id);

    if (usage.isUsed) {
      // Calculate percentage changes for key macros
      const caloriesChange = calculateChangePercentage(
        editingIngredient.kcal,
        updated.kcal
      );
      const proteinChange = calculateChangePercentage(
        editingIngredient.macro.białko,
        updated.macro.białko
      );

      // Show warning modal for ANY change to a used product
      // This ensures dietitian is aware of impact on existing recipes/diets
      setPendingUpdate({
        updated,
        usage,
        oldValues: editingIngredient,
        changes: { caloriesChange, proteinChange }
      });
      setShowWarningModal(true);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('ingredients')
        .update({
          name: updated.nazwa,
          calories: updated.kcal,
          protein: updated.macro.białko,
          fat: updated.macro.tłuszcz,
          carbs: updated.macro.węglowodany,
          fiber: updated.blonnik,
          unit: updated.unit,
          unit_weight: updated.unit_weight
        })
        .eq('id', editingIngredient.id)
        .select()
        .single();

      if (error) throw error;

      const newIngredient: Ingredient = {
        id: data.id,
        nazwa: data.name || '',
        kcal: Number(data.calories) || 0,
        macro: {
          białko: Number(data.protein) || 0,
          tłuszcz: Number(data.fat) || 0,
          węglowodany: Number(data.carbs) || 0
        },
        blonnik: Number(data.fiber) || 0,
        unit: data.unit || '',
        unit_weight: Number(data.unit_weight) || 0
      };

      setIngredients(
        ingredients.map(i => (i.id === editingIngredient.id ? newIngredient : i))
      );
      setIsEditDialogOpen(false);
      setEditingIngredient(null);

      // Invalidate products cache to refresh all components using product list
      queryClient.invalidateQueries({ queryKey: ['products'] });

      toast({
        title: "Sukces",
        description: `${updated.nazwa} został zaktualizowany`,
      });
    } catch (error) {
      logger.error('Error updating ingredient:', error);
      toast({
        title: "Błąd",
        description: "Nie udało się zaktualizować składnika",
        variant: "destructive",
      });
    }
  };

  // Handle confirmation of product update strategy
  const handleConfirmUpdate = async (strategy: 'update_all' | 'update_new_only' | 'create_new') => {
    if (!pendingUpdate || !editingIngredient) return;

    try {
      if (strategy === 'create_new') {
        // Create new product variant
        const newName = `${pendingUpdate.updated.nazwa} (v2)`;
        const { error } = await supabase
          .from('ingredients')
          .insert({
            name: newName,
            calories: pendingUpdate.updated.kcal,
            protein: pendingUpdate.updated.macro.białko,
            fat: pendingUpdate.updated.macro.tłuszcz,
            carbs: pendingUpdate.updated.macro.węglowodany,
            fiber: pendingUpdate.updated.blonnik,
            unit: pendingUpdate.updated.unit,
            unit_weight: pendingUpdate.updated.unit_weight,
            user_id: user?.id
          });

        if (error) throw error;

        toast({
          title: "Sukces",
          description: `Utworzono nowy wariant: ${newName}`,
        });
      } else {
        // Update product in ingredients table
        const { data, error } = await supabase
          .from('ingredients')
          .update({
            name: pendingUpdate.updated.nazwa,
            calories: pendingUpdate.updated.kcal,
            protein: pendingUpdate.updated.macro.białko,
            fat: pendingUpdate.updated.macro.tłuszcz,
            carbs: pendingUpdate.updated.macro.węglowodany,
            fiber: pendingUpdate.updated.blonnik,
            unit: pendingUpdate.updated.unit,
            unit_weight: pendingUpdate.updated.unit_weight
          })
          .eq('id', editingIngredient.id)
          .select()
          .single();

        if (error) throw error;

        const newIngredient: Ingredient = {
          id: data.id,
          nazwa: data.name || '',
          kcal: Number(data.calories) || 0,
          macro: {
            białko: Number(data.protein) || 0,
            tłuszcz: Number(data.fat) || 0,
            węglowodany: Number(data.carbs) || 0
          },
          blonnik: Number(data.fiber) || 0,
          unit: data.unit || '',
          unit_weight: Number(data.unit_weight) || 0
        };

        setIngredients(
          ingredients.map(i => (i.id === editingIngredient.id ? newIngredient : i))
        );

        // If update_all, recalculate cached macros in dishes and meal_ingredients
        if (strategy === 'update_all') {
          await updateCachedMacros(editingIngredient.id, pendingUpdate.updated);
          toast({
            title: "Sukces",
            description: `Zaktualizowano ${pendingUpdate.updated.nazwa} oraz wszystkie przepisy i jadłospisy`,
          });
        } else {
          toast({
            title: "Sukces",
            description: `Zaktualizowano ${pendingUpdate.updated.nazwa} (tylko nowe przepisy będą używać nowych wartości)`,
          });
        }
      }

      // Clean up and refresh
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['potrawy'] });
      setShowWarningModal(false);
      setPendingUpdate(null);
      setIsEditDialogOpen(false);
      setEditingIngredient(null);
    } catch (error) {
      logger.error('Error updating ingredient:', error);
      toast({
        title: "Błąd",
        description: "Nie udało się zaktualizować składnika",
        variant: "destructive",
      });
    }
  };

  // Handle ingredient deletion with physical removal from all places
  const handleDeleteIngredient = async () => {
    if (!editingIngredient) return;

    try {
      // 1. Delete from meal_ingredients
      const { error: mealError } = await supabase
        .from('meal_ingredients')
        .delete()
        .eq('ingredient_id', editingIngredient.id);

      if (mealError) throw mealError;

      // 2. Remove from dishes.ingredients_json and ingredients_description
      await removeIngredientFromDishes(editingIngredient.id, editingIngredient.nazwa);

      // 3. Delete the product from ingredients table
      const { error: ingredientError } = await supabase
        .from('ingredients')
        .delete()
        .eq('id', editingIngredient.id);

      if (ingredientError) throw ingredientError;

      // Update UI state
      setIngredients(ingredients.filter(i => i.id !== editingIngredient.id));
      setEditingIngredient(null);
      setShowDeleteDialog(false);
      setShowDeleteWarningModal(false);
      setDeleteUsageInfo(null);
      setIsEditDialogOpen(false);

      // Invalidate cache for products and dishes
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['potrawy'] });

      const deletedCount = (deleteUsageInfo?.dishCount || 0) + (deleteUsageInfo?.templateCount || 0) + (deleteUsageInfo?.clientDietCount || 0);

      const parts = [];
      if (deleteUsageInfo?.dishCount) parts.push(`${deleteUsageInfo.dishCount} potraw`);
      if (deleteUsageInfo?.templateCount) parts.push(`${deleteUsageInfo.templateCount} szablonów`);
      if (deleteUsageInfo?.clientDietCount) parts.push(`${deleteUsageInfo.clientDietCount} jadłospisów klientów`);

      const message = deletedCount > 0
        ? `Produkt został usunięty z ${parts.join(', ')}`
        : "Produkt został pomyślnie usunięty";

      toast({
        title: "Składnik usunięty",
        description: message,
      });
    } catch (error) {
      logger.error('Error deleting ingredient:', error);
      toast({
        title: "Błąd",
        description: "Nie udało się usunąć składnika",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="container mx-auto p-4 md:p-6 bg-background min-h-screen flex flex-col overflow-hidden">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-4 md:mb-6 flex-shrink-0 gap-3 sm:gap-0">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-zinc-100">Produkty</h1>
          <p className="text-zinc-400 mt-1 md:mt-2 text-base md:text-lg">Zarządzaj składnikami i ich wartościami odżywczymi</p>
        </div>
        <>
          <Dialog open={isDialogOpen} onOpenChange={handleAddDialogOpenChange}>
            <DialogTrigger asChild>
              <Button className="bg-gradient-to-r from-[#a08032] to-[#e6d280] hover:from-[#8a6c2b] hover:to-[#d4c06b] text-white font-semibold px-6 py-3 text-base transition-colors">
                <Plus className="h-5 w-5 mr-2" />
                Dodaj Składnik
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-[95vw] sm:max-w-2xl w-full border border-zinc-700 bg-zinc-900">
              <DialogHeader>
                <DialogTitle className="text-zinc-100 text-xl font-bold">Dodaj nowy składnik</DialogTitle>
                <DialogDescription className="text-zinc-400">
                  Wprowadź dane składnika włącznie z wartościami odżywczymi
                </DialogDescription>
              </DialogHeader>
              <AddIngredientForm
                onSubmit={handleAddIngredient}
                onCancel={() => {
                  setHasAddFormChanges(false);
                  setIsDialogOpen(false);
                }}
                onFormChange={setHasAddFormChanges}
              />
            </DialogContent>
          </Dialog>

          <Dialog open={isEditDialogOpen} onOpenChange={handleEditDialogOpenChange}>
            <DialogContent className="max-w-[95vw] sm:max-w-2xl w-full border border-zinc-700 bg-zinc-900">
              <DialogHeader>
                <DialogTitle className="text-zinc-100 text-xl font-bold">Edytuj składnik</DialogTitle>
                <DialogDescription className="text-zinc-400">
                  Zmień dane składnika i zaktualizuj wartości odżywcze
                </DialogDescription>
              </DialogHeader>
              {editingIngredient && (
                <AddIngredientForm
                  onSubmit={handleUpdateIngredient}
                  onCancel={() => {
                    setHasEditFormChanges(false);
                    setIsEditDialogOpen(false);
                    setShowDeleteDialog(false);
                    setEditingIngredient(null);
                  }}
                  defaultValues={editingIngredient}
                  onDelete={async () => {
                    if (!editingIngredient) return;

                    // Check if product is used before showing delete dialog
                    const usage = await checkProductUsage(editingIngredient.id);

                    if (usage.isUsed) {
                      // Product is used - show warning modal with details
                      setDeleteUsageInfo(usage);
                      setShowDeleteWarningModal(true);
                    } else {
                      // Product is NOT used - show simple confirmation dialog
                      setShowDeleteDialog(true);
                    }
                  }}
                  onFormChange={setHasEditFormChanges}
                />
              )}
              {/* Simple delete dialog for unused products */}
              <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
                <AlertDialogContent className="bg-zinc-900 border-zinc-800">
                  <AlertDialogHeader>
                    <AlertDialogTitle className="text-zinc-100">Usuń składnik</AlertDialogTitle>
                    <AlertDialogDescription className="text-zinc-400">
                      Czy na pewno chcesz usunąć składnik <span className="font-semibold text-[#a08032]">{editingIngredient?.nazwa}</span>? Ta akcja jest nieodwracalna.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel className="bg-zinc-700 text-zinc-100 hover:bg-zinc-600">Anuluj</AlertDialogCancel>
                    <AlertDialogAction
                      className="bg-red-700 text-white hover:bg-red-800"
                      onClick={handleDeleteIngredient}
                    >
                      Usuń
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>

              {/* Warning modal for used products */}
              <AlertDialog open={showDeleteWarningModal} onOpenChange={setShowDeleteWarningModal}>
                <AlertDialogContent className="bg-zinc-900 border-zinc-800 text-zinc-100 max-w-xl">
                  <AlertDialogHeader>
                    <AlertDialogTitle className="flex items-center gap-2 text-orange-400">
                      ⚠️ Produkt jest używany w {(deleteUsageInfo?.dishCount || 0) + (deleteUsageInfo?.templateCount || 0) + (deleteUsageInfo?.clientDietCount || 0)} miejscach
                    </AlertDialogTitle>
                    <AlertDialogDescription className="text-zinc-300">
                      Usunięcie produktu spowoduje jego fizyczne usunięcie ze wszystkich przepisów i jadłospisów.
                    </AlertDialogDescription>
                  </AlertDialogHeader>

                  <div className="space-y-4 py-2">
                    <div className="text-sm text-zinc-300">
                      Składnik <strong className="text-[#a08032]">{editingIngredient?.nazwa}</strong> występuje w:
                    </div>

                    <div className="bg-zinc-800 p-3 rounded space-y-2">
                      {deleteUsageInfo && deleteUsageInfo.dishCount > 0 && (
                        <div className="text-sm text-zinc-300">
                          • <strong>{deleteUsageInfo.dishCount}</strong> {deleteUsageInfo.dishCount === 1 ? 'potrawie' : 'potrawach'}
                          {deleteUsageInfo.dishNames.length > 0 && (
                            <div className="text-zinc-400 ml-4 mt-1">
                              ({deleteUsageInfo.dishNames.join(", ")})
                            </div>
                          )}
                        </div>
                      )}

                      {deleteUsageInfo && deleteUsageInfo.templateCount > 0 && (
                        <div className="text-sm text-zinc-300">
                          • <strong>{deleteUsageInfo.templateCount}</strong> {deleteUsageInfo.templateCount === 1 ? 'szablonie' : 'szablonach'}
                          {deleteUsageInfo.templateNames.length > 0 && (
                            <div className="text-zinc-400 ml-4 mt-1">
                              ({deleteUsageInfo.templateNames.join(", ")})
                            </div>
                          )}
                        </div>
                      )}

                      {deleteUsageInfo && deleteUsageInfo.clientDietCount > 0 && (
                        <div className="text-sm text-zinc-300">
                          • <strong>{deleteUsageInfo.clientDietCount}</strong> {deleteUsageInfo.clientDietCount === 1 ? 'jadłospisie klienta' : 'jadłospisach klientów'}
                          {deleteUsageInfo.clientDietNames.length > 0 && (
                            <div className="text-zinc-400 ml-4 mt-1">
                              ({deleteUsageInfo.clientDietNames.join(", ")})
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    <div className="bg-red-900/20 border border-red-700/50 p-3 rounded">
                      <div className="text-sm text-red-300 font-semibold mb-1">
                        ⚠️ Uwaga!
                      </div>
                      <div className="text-sm text-red-200">
                        Usunięcie tego produktu spowoduje fizyczne usunięcie go ze wszystkich potraw, szablonów i jadłospisów klientów.
                        Ta akcja jest <strong>nieodwracalna</strong>.
                      </div>
                    </div>
                  </div>

                  <AlertDialogFooter className="flex-col sm:flex-row gap-2 sm:justify-between">
                    <AlertDialogCancel className="w-full sm:w-auto bg-zinc-700 hover:bg-zinc-600 mt-0">
                      Anuluj
                    </AlertDialogCancel>
                    <Button
                      onClick={handleDeleteIngredient}
                      className="w-full sm:w-auto bg-red-600 hover:bg-red-700 text-white font-semibold"
                    >
                      Usuń ze wszystkiego
                    </Button>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </DialogContent>
          </Dialog>
        </>
      </div>

      <div className="mb-6 flex-shrink-0">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-zinc-400 h-5 w-5" />
          <Input
            type="text"
            placeholder="Szukaj składników..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 border border-zinc-700 focus:ring-[#a08032] focus:border-[#a08032] bg-zinc-800 text-zinc-100 placeholder-zinc-400 text-base py-3 shadow-sm"
          />
        </div>
      </div>

      <div className="flex-1 overflow-hidden">
        <IngredientsTable
          ingredients={filteredIngredients}
          searchTerm={searchTerm}
          loading={loading}
          onEdit={handleEditIngredient}
        />
      </div>
      {addConfirmationDialog}
      {editConfirmationDialog}

      {/* Warning modal for product edit */}
      <AlertDialog open={showWarningModal} onOpenChange={setShowWarningModal}>
        <AlertDialogContent className="bg-zinc-900 border-zinc-800 text-zinc-100 max-w-xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-orange-400">
              ⚠️ Produkt jest używany w {(pendingUpdate?.usage.dishCount || 0) + (pendingUpdate?.usage.templateCount || 0) + (pendingUpdate?.usage.clientDietCount || 0)} miejscach
            </AlertDialogTitle>
            <AlertDialogDescription className="text-zinc-300">
              Edycja produktu wpłynie na wszystkie miejsca, w których jest używany.
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="space-y-4 py-2">
            <div className="text-sm text-zinc-300">
              Składnik <strong className="text-[#a08032]">{pendingUpdate?.oldValues.nazwa}</strong> występuje w:
            </div>

            <div className="bg-zinc-800 p-3 rounded space-y-2">
              {pendingUpdate && pendingUpdate.usage.dishCount > 0 && (
                <div className="text-sm text-zinc-300">
                  • <strong>{pendingUpdate.usage.dishCount}</strong> {pendingUpdate.usage.dishCount === 1 ? 'potrawie' : 'potrawach'}
                  {pendingUpdate.usage.dishNames.length > 0 && (
                    <div className="text-zinc-400 ml-4 mt-1">
                      ({pendingUpdate.usage.dishNames.join(", ")})
                    </div>
                  )}
                </div>
              )}

              {pendingUpdate && pendingUpdate.usage.templateCount > 0 && (
                <div className="text-sm text-zinc-300">
                  • <strong>{pendingUpdate.usage.templateCount}</strong> {pendingUpdate.usage.templateCount === 1 ? 'szablonie' : 'szablonach'}
                  {pendingUpdate.usage.templateNames.length > 0 && (
                    <div className="text-zinc-400 ml-4 mt-1">
                      ({pendingUpdate.usage.templateNames.join(", ")})
                    </div>
                  )}
                </div>
              )}

              {pendingUpdate && pendingUpdate.usage.clientDietCount > 0 && (
                <div className="text-sm text-zinc-300">
                  • <strong>{pendingUpdate.usage.clientDietCount}</strong> {pendingUpdate.usage.clientDietCount === 1 ? 'jadłospisie klienta' : 'jadłospisach klientów'}
                  {pendingUpdate.usage.clientDietNames.length > 0 && (
                    <div className="text-zinc-400 ml-4 mt-1">
                      ({pendingUpdate.usage.clientDietNames.join(", ")})
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="bg-orange-900/20 border border-orange-700/50 p-3 rounded">
              <div className="text-sm text-orange-300 font-semibold mb-1">⚠️ Uwaga!</div>
              <div className="text-sm text-orange-200">
                Zaakceptowanie tej zmiany spowoduje zaktualizowanie produktu we wszystkich potrawach, szablonach i jadłospisach klientów.
              </div>
            </div>
          </div>

          <AlertDialogFooter className="flex-col sm:flex-row gap-2 sm:justify-between">
            <AlertDialogCancel className="w-full sm:w-auto bg-zinc-700 hover:bg-zinc-600 mt-0">
              Anuluj
            </AlertDialogCancel>
            <Button
              onClick={() => handleConfirmUpdate('update_all')}
              className="w-full sm:w-auto bg-green-600 hover:bg-green-700 text-white font-semibold"
            >
              Zaktualizuj wszystko
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Produkty;
