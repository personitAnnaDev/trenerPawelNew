import React, { useState, useEffect, useCallback } from "react";
import { ClientDietPlan } from "./ClientDietPlan";
import { useUndoRedo } from "@/hooks/useUndoRedo";
import DishSelectionModal from "@/components/DishSelectionModal";
import { CopyDayModal, CopyDayOptions } from "@/components/CopyDayModal";
import { useToast } from "@/hooks/use-toast";
import { createDietSnapshot, copyDayPlan } from "@/utils/clientStorage";
import { arrayMove } from '@dnd-kit/sortable';
import { CopyPasteState } from "@/hooks/useCopyPaste";
import { useCopyPasteDay } from "@/hooks/useCopyPasteDay";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { logger } from '@/utils/logger';

interface ClientDietManagerProps {
  client: any;
  dayPlans: any[];
  dayCalories: { [dayId: string]: string };
  dayMacros: { [dayId: string]: any };
  calculatorResults: any;
  initialImportantNotes: string;
  onRefreshData?: (cachedData?: { dietData: any, clientData: any }) => Promise<void>;
  setUndoDayPlans: (newDayPlans: any[]) => void;
  undoDayPlans: any[];
  onSelectTemplate?: () => void;
  onSaveAsTemplate?: () => void;
  onImportantNotesChange?: (newNotes: string) => Promise<void>;
  onImportantNotesBlur?: () => void;
  onImportantNotesFocus?: () => void;
  addNewSnapshot?: (snapshot: import('@/utils/clientStorage').DietSnapshot) => void;
  // 🎯 COPY-PASTE: Props from parent (KlientSzczegoly)
  copyPasteState?: CopyPasteState;
  onCopyMeal?: (meal: any, dayId: string, orderIndex: number) => void;
  onPasteMeal?: (dayId: string) => void;
  onClearClipboard?: () => void;
}

const ClientDietManager: React.FC<ClientDietManagerProps> = ({
  client,
  dayPlans: initialDayPlans,
  dayCalories,
  dayMacros,
  calculatorResults,
  initialImportantNotes,
  onRefreshData,
  setUndoDayPlans,
  undoDayPlans,
  onSelectTemplate,
  onSaveAsTemplate,
  onImportantNotesChange,
  onImportantNotesBlur,
  onImportantNotesFocus,
  addNewSnapshot,
  // 🎯 COPY-PASTE: Props from parent
  copyPasteState,
  onCopyMeal,
  onPasteMeal,
  onClearClipboard,
}) => {
  const { toast } = useToast();
  const [isDishSelectionModalOpen, setIsDishSelectionModalOpen] = useState(false);
  const [editingMeal, setEditingMeal] = useState<any | undefined>(undefined);
  const [currentDayId, setCurrentDayId] = useState<string>("");
  // 🎯 HOTFIX: Zabezpieczenie przed wielokrotnym kliknięciem
  const [isSavingMeal, setIsSavingMeal] = useState(false);
  // 🎯 FIX: Counter dla wymuszenia re-mount modalu ze świeżymi danymi
  const [modalRefreshCounter, setModalRefreshCounter] = useState(0);

  // 🎯 FAZA 3: Day copy-paste functionality
  const { copyPasteDayState, copyDay, pasteDay, clearClipboard: clearDayClipboard, canPaste: canPasteDay } = useCopyPasteDay();
  const [isCopyDayModalOpen, setIsCopyDayModalOpen] = useState(false);
  const [sourceDietSettings, setSourceDietSettings] = useState<any>(null);
  // 🎯 Empty day warning modal
  const [isEmptyDayWarningOpen, setIsEmptyDayWarningOpen] = useState(false);
  const [pendingDayPlan, setPendingDayPlan] = useState<any>(null);


  const handleDayPlansChange = useCallback((newDayPlans: any[]) => {
    setUndoDayPlans(newDayPlans);
  }, [setUndoDayPlans]);

  // Te funkcje nie są już potrzebne - kalkulator będzie aktualizował dane bezpośrednio w komponencie nadrzędnym
  // These functions are no longer needed as the parent component manages the state.
  const handleDayCaloriesChange = useCallback((newDayCalories: { [dayId: string]: string }) => {}, []);
  const handleDayMacrosChange = useCallback((newDayMacros: { [dayId: string]: any }) => {}, []);

  const handleAddMeal = useCallback((dayId: string) => {
    setCurrentDayId(dayId);
    setEditingMeal(undefined);
    setIsDishSelectionModalOpen(true);
  }, []);

  const handleEditMeal = useCallback((dayId: string, mealToEdit: any) => {
    // 🔧 FIX: Znajdź najświeższą wersję posiłku w undoDayPlans (zaktualizowane po save)
    const freshMeal = undoDayPlans
      .flatMap(plan => plan.meals)
      .find(meal => meal.id === mealToEdit.id);

    setCurrentDayId(dayId);
    setEditingMeal(freshMeal || mealToEdit); // Użyj świeżego jeśli znaleziony
    setIsDishSelectionModalOpen(true);
  }, [undoDayPlans]); // 🔧 FIX: zależność od undoDayPlans zapewnia najświeższe dane po save

  const handleSaveMeal = async (savedMeal: any, targetDayId?: string) => {
    // 🎯 Issue #4 FIX: Użyj targetDayId jeśli jest podany, w przeciwnym razie fallback na currentDayId
    const dayIdToUse = targetDayId || currentDayId;

    // 🎯 HOTFIX: Zabezpieczenie przed wielokrotnym kliknięciem
    if (isSavingMeal) {
      return;
    }

    // Sprawdzenie czy dayIdToUse nie jest pusty
    if (!dayIdToUse) {
      toast({
        title: "Błąd",
        description: "Nie można określić dnia do zapisania posiłku. Spróbuj ponownie.",
        variant: "destructive",
      });
      return;
    }

    setIsSavingMeal(true);

    try {
      const { saveMealWithIngredients, updateMealWithIngredients } = await import("@/utils/supabaseTemplates");

      const mealDataForDb = {
        ...savedMeal,
        countTowardsDailyCalories: savedMeal.count_in_daily_total,
      };

      let result;
      if (editingMeal) {
        // 🎯 Issue #4 FIX: Użyj dayIdToUse zamiast currentDayId
        result = await updateMealWithIngredients({ ...mealDataForDb, id: editingMeal.id }, dayIdToUse);
      } else {
        // 🎯 Issue #4 FIX: Użyj dayIdToUse zamiast currentDayId
        result = await saveMealWithIngredients(mealDataForDb, dayIdToUse);
      }


      if (!result.success) {
        toast({
          title: "Błąd",
          description: result.error?.message || "Nie udało się zapisać posiłku.",
          variant: "destructive",
        });
        return;
      }

      // 🚀 OPTIMIZATION: Pobierz świeże dane raz i przekaż je wszędzie
      const { getClientDietPlansAndSettings, getClientById } = await import("@/utils/clientStorage");
      const freshDietData = await getClientDietPlansAndSettings(client.id);
      const freshClientData = await getClientById(client.id);

      // 🚀 OPTIMIZATION: Refresh UI with cached data - NO duplicate queries!
      if (onRefreshData && freshDietData && freshClientData) {
        await onRefreshData({ dietData: freshDietData, clientData: freshClientData });
      }

      // 🚀 OPTIMIZATION: Create snapshot with same cached data
      const newSnapshot = await createDietSnapshot(client.id, {
        trigger_type: editingMeal ? 'meal_edited' : 'meal_added',
        trigger_description: editingMeal
          ? `Edytowano posiłek: ${savedMeal.name}`
          : `Dodano posiłek: ${savedMeal.name} (${savedMeal.calories || 0} kcal)`,
        clearFutureSnapshots: true, // Clear future history when creating new change
        // 🚀 OPTIMIZATION: Przekaż już pobrane dane aby uniknąć duplikacji zapytań
        cachedDietData: freshDietData || undefined,
        cachedClientData: freshClientData || undefined
      });

      // Add new snapshot to stack locally if available
      if (newSnapshot && addNewSnapshot) {
        addNewSnapshot(newSnapshot);
      }

      // Sukces toast
      toast({
        title: "Sukces!",
        description: editingMeal
          ? `Posiłek "${savedMeal.name}" został zaktualizowany.`
          : `Posiłek "${savedMeal.name}" został dodany do planu żywieniowego.`,
        variant: "default",
      });

      // 🎯 FIX: Inkrementuj counter aby wymusić świeże dane przy następnym otwarciu
      setModalRefreshCounter(prev => prev + 1);

      // Zamknij i zresetuj modal
      setIsDishSelectionModalOpen(false);
      setEditingMeal(undefined);
      setCurrentDayId("");

    } catch (error: any) {
      toast({
        title: "Błąd",
        description: error?.message || "Wystąpił nieoczekiwany błąd podczas zapisu.",
        variant: "destructive",
      });
    } finally {
      // 🎯 HOTFIX: Zawsze resetuj stan zapisywania
      setIsSavingMeal(false);
    }
  };


  // Obsługa usuwania posiłku
  const handleDeleteMeal = async (dayId: string, mealId: string) => {
    // Pobierz dane posiłku przed usunięciem (dla snapshotu)
    const mealToDelete = undoDayPlans.find((day: any) => day.id === dayId)?.meals.find((m: any) => m.id === mealId);

    // Usuń z lokalnego stanu
    setUndoDayPlans(
      undoDayPlans.map((day: any) =>
        day.id === dayId
          ? { ...day, meals: day.meals.filter((m: any) => m.id !== mealId) }
          : day
      )
    );
    
    // Usuń z bazy
    const { supabase } = await import("@/utils/supabase");
    await supabase.from("meals").delete().eq("id", mealId);

    // 🚀 OPTIMIZATION: Pobierz świeże dane raz po usunięciu
    const { getClientDietPlansAndSettings, getClientById } = await import("@/utils/clientStorage");
    const freshDietData = await getClientDietPlansAndSettings(client.id);
    const freshClientData = await getClientById(client.id);

    // 🚀 OPTIMIZATION: Refresh UI with cached data - NO duplicate queries!
    if (onRefreshData && freshDietData && freshClientData) {
      await onRefreshData({ dietData: freshDietData, clientData: freshClientData });
    }

    // Utwórz snapshot po usunięciu posiłku z cached data
    if (mealToDelete) {
      try {
        const deleteSnapshot = await createDietSnapshot(client.id, {
          trigger_type: 'meal_deleted',
          trigger_description: `Usunięto posiłek: ${mealToDelete.name} (${mealToDelete.calories || 0} kcal)`,
          // 🚀 OPTIMIZATION: Przekaż już pobrane dane aby uniknąć duplikacji zapytań
          cachedDietData: freshDietData || undefined,
          cachedClientData: freshClientData || undefined
        });

        // Add new snapshot to stack locally if available
        if (deleteSnapshot && addNewSnapshot) {
          addNewSnapshot(deleteSnapshot);
        }

        toast({
          title: "Posiłek usunięty",
          description: `Posiłek "${mealToDelete.name}" został usunięty z planu żywieniowego.`,
          variant: "default",
        });
      } catch (error) {
        logger.error("Błąd tworzenia snapshotu:", error);
        // Nie blokujemy usuwania posiłku jeśli snapshot się nie uda
        toast({
          title: "Posiłek usunięty",
          description: `Posiłek "${mealToDelete.name}" został usunięty z planu żywieniowego.`,
          variant: "default",
        });
      }
    }
  };

  // 🎯 FAZA 3: Copy entire day (immediate modal - simplified UX)
  const handleCopyDay = useCallback((dayPlan: any) => {
    // 🎯 VALIDATION: Check if day has 0 meals
    if (!dayPlan.meals || dayPlan.meals.length === 0) {
      // Show warning modal for empty day
      setPendingDayPlan(dayPlan);
      setIsEmptyDayWarningOpen(true);
      return;
    }

    // Normal flow: day has meals
    copyDay(dayPlan);

    // Store source diet settings for macro targets copy
    // Map MacroPlanning format to client_diet_settings format (target_* fields)
    const macros = dayMacros[dayPlan.id];
    const settings = macros ? {
      target_calories: macros.calories,
      target_protein_grams: macros.proteinGrams,
      target_protein_percentage: macros.proteinPercentage,
      target_fat_grams: macros.fatGrams,
      target_fat_percentage: macros.fatPercentage,
      target_carbs_grams: macros.carbsGrams,
      target_carbs_percentage: macros.carbsPercentage,
      target_fiber_grams: macros.fiberGrams,
    } : null;
    setSourceDietSettings(settings);

    // Open modal immediately (copy = immediate action)
    setIsCopyDayModalOpen(true);
  }, [copyDay, dayMacros]);

  // 🎯 Empty day warning: User confirmed copying empty day
  const handleConfirmCopyEmptyDay = useCallback(() => {
    if (!pendingDayPlan) return;

    // Execute normal copy flow
    copyDay(pendingDayPlan);

    // Store source diet settings for macro targets copy
    const macros = dayMacros[pendingDayPlan.id];
    const settings = macros ? {
      target_calories: macros.calories,
      target_protein_grams: macros.proteinGrams,
      target_protein_percentage: macros.proteinPercentage,
      target_fat_grams: macros.fatGrams,
      target_fat_percentage: macros.fatPercentage,
      target_carbs_grams: macros.carbsGrams,
      target_carbs_percentage: macros.carbsPercentage,
      target_fiber_grams: macros.fiberGrams,
    } : null;
    setSourceDietSettings(settings);

    // Close warning modal and open copy modal
    setIsEmptyDayWarningOpen(false);
    setPendingDayPlan(null);
    setIsCopyDayModalOpen(true);
  }, [pendingDayPlan, copyDay, dayMacros]);

  // 🎯 Empty day warning: User cancelled
  const handleCancelCopyEmptyDay = useCallback(() => {
    setIsEmptyDayWarningOpen(false);
    setPendingDayPlan(null);
  }, []);

  // 🎯 FAZA 3: Confirm paste with modal (supports NEW and EXISTING modes)
  const handleConfirmPasteDay = async (options: CopyDayOptions) => {
    try {
      if (options.mode === 'new') {
        // ===== MODE: NEW DAY (existing behavior) =====
        // Get cloned day from hook (with new UUIDs)
        const clonedDay = pasteDay();
        if (!clonedDay) {
          throw new Error("Failed to clone day");
        }

        // Update day name from modal input
        clonedDay.name = options.newDayName!;

        // Save to database with batch operation
        const result = await copyDayPlan(
          client.id,
          clonedDay,
          options.newDayName!,
          sourceDietSettings
        );

        if (!result) {
          throw new Error("Failed to save day to database");
        }

        // Refresh data after paste
        const { getClientDietPlansAndSettings, getClientById } = await import("@/utils/clientStorage");
        const freshDietData = await getClientDietPlansAndSettings(client.id);
        const freshClientData = await getClientById(client.id);

        if (onRefreshData && freshDietData && freshClientData) {
          await onRefreshData({ dietData: freshDietData, clientData: freshClientData });
        }

        // Create snapshot after copying day
        try {
          const pasteSnapshot = await createDietSnapshot(client.id, {
            trigger_type: 'day_copied',
            trigger_description: `Skopiowano dzień: ${options.newDayName} (${clonedDay.meals.length} posiłków)`,
            clearFutureSnapshots: true,
            cachedDietData: freshDietData || undefined,
            cachedClientData: freshClientData || undefined,
          });

          if (pasteSnapshot && addNewSnapshot) {
            addNewSnapshot(pasteSnapshot);
          }

          toast({
            title: "Dzień skopiowany",
            description: `Dzień "${options.newDayName}" został skopiowany z ${clonedDay.meals.length} posiłkami.`,
            variant: "default",
          });
        } catch (snapshotError) {
          logger.error("Error creating snapshot:", snapshotError);
          toast({
            title: "Dzień skopiowany",
            description: `Dzień "${options.newDayName}" został skopiowany (snapshot nie utworzony).`,
            variant: "default",
          });
        }

        setIsCopyDayModalOpen(false);
      } else {
        // ===== MODE: EXISTING DAY (new feature) =====
        const clonedDay = pasteDay();
        if (!clonedDay) {
          throw new Error("Failed to clone day");
        }

        const targetDayId = options.targetDayId!;
        const {
          replaceExistingDayMeals,
          appendMealsToExistingDay,
          updateDietSettings,
          updateDayName,
          getClientDietPlansAndSettings,
          getClientById
        } = await import("@/utils/clientStorage");

        // 1. Handle meals (replace or append)
        if (options.replaceMeals) {
          // Replace: Delete all meals + insert new
          await replaceExistingDayMeals(targetDayId, clonedDay.meals);
        } else {
          // Append: Add new meals to end
          await appendMealsToExistingDay(targetDayId, clonedDay.meals);
        }

        // 2. Handle macro targets (replace or keep)
        if (options.replaceTargets && sourceDietSettings) {
          await updateDietSettings(targetDayId, client.id, sourceDietSettings);
        }

        // 3. Update day name if edited
        if (options.editedDayName) {
          await updateDayName(targetDayId, options.editedDayName);
        }

        // Refresh data after paste
        const freshDietData = await getClientDietPlansAndSettings(client.id);
        const freshClientData = await getClientById(client.id);

        if (onRefreshData && freshDietData && freshClientData) {
          await onRefreshData({ dietData: freshDietData, clientData: freshClientData });
        }

        // Create snapshot after copying to existing day
        try {
          const action = options.replaceMeals ? 'zastąpiono' : 'dołączono';
          const pasteSnapshot = await createDietSnapshot(client.id, {
            trigger_type: 'day_copied',
            trigger_description: `Kopiowanie do istniejącego dnia: ${action} ${clonedDay.meals.length} posiłków w "${options.editedDayName}"`,
            clearFutureSnapshots: true,
            cachedDietData: freshDietData || undefined,
            cachedClientData: freshClientData || undefined,
          });

          if (pasteSnapshot && addNewSnapshot) {
            addNewSnapshot(pasteSnapshot);
          }

          toast({
            title: "Dzień zaktualizowany",
            description: `Posiłki zostały ${action} w dniu "${options.editedDayName}".`,
            variant: "default",
          });
        } catch (snapshotError) {
          logger.error("Error creating snapshot:", snapshotError);
          toast({
            title: "Dzień zaktualizowany",
            description: `Posiłki zostały zaktualizowane (snapshot nie utworzony).`,
            variant: "default",
          });
        }

        setIsCopyDayModalOpen(false);
      }
    } catch (error) {
      logger.error("Error copying day:", error);
      toast({
        title: "Błąd",
        description: "Wystąpił błąd podczas kopiowania dnia.",
        variant: "destructive",
      });
    }
  };

  // Delete entire day
  const handleDeleteDay = useCallback(async (dayId: string) => {
    try {
      // Get day name for toast message
      const dayToDelete = undoDayPlans.find((d: any) => d.id === dayId);
      const dayName = dayToDelete?.name || "Dzień";

      // Delete from database (cascades to meals and meal_ingredients via RLS)
      const { deleteDayPlanAndSettings } = await import("@/utils/clientStorage");
      const success = await deleteDayPlanAndSettings(dayId);

      if (!success) {
        throw new Error("Failed to delete day");
      }

      // Refresh data after delete
      const { getClientDietPlansAndSettings, getClientById } = await import("@/utils/clientStorage");
      const freshDietData = await getClientDietPlansAndSettings(client.id);
      const freshClientData = await getClientById(client.id);

      if (onRefreshData && freshDietData && freshClientData) {
        await onRefreshData({ dietData: freshDietData, clientData: freshClientData });
      }

      // Create snapshot after deleting day
      try {
        const deleteSnapshot = await createDietSnapshot(client.id, {
          trigger_type: 'day_deleted',
          trigger_description: `Usunięto dzień: ${dayName}`,
          clearFutureSnapshots: true,
          cachedDietData: freshDietData || undefined,
          cachedClientData: freshClientData || undefined,
        });

        if (deleteSnapshot && addNewSnapshot) {
          addNewSnapshot(deleteSnapshot);
        }

        toast({
          title: "Dzień usunięty",
          description: `Dzień "${dayName}" został usunięty z planu żywieniowego.`,
          variant: "default",
        });
      } catch (snapshotError) {
        logger.error("Error creating snapshot:", snapshotError);
        toast({
          title: "Dzień usunięty",
          description: `Dzień "${dayName}" został usunięty (snapshot nie utworzony).`,
          variant: "default",
        });
      }
    } catch (error) {
      logger.error("Error deleting day:", error);
      toast({
        title: "Błąd",
        description: "Wystąpił błąd podczas usuwania dnia.",
        variant: "destructive",
      });
    }
  }, [client.id, undoDayPlans, onRefreshData, createDietSnapshot, addNewSnapshot, toast]);

  return (
    <div>
      <ClientDietPlan
        client={client}
        dayPlans={undoDayPlans}
        dayCalories={dayCalories}
        dayMacros={dayMacros}
        calculatorResults={calculatorResults}
        initialImportantNotes={initialImportantNotes}
        onDayPlansChange={handleDayPlansChange}
        onDayCaloriesChange={handleDayCaloriesChange}
        onDayMacrosChange={handleDayMacrosChange}
        onAddMeal={handleAddMeal}
        onEditMeal={handleEditMeal}
        onDeleteMeal={handleDeleteMeal}
        onSelectTemplate={onSelectTemplate}
        onSaveAsTemplate={onSaveAsTemplate}
        onImportantNotesChange={onImportantNotesChange}
        onImportantNotesBlur={onImportantNotesBlur}
        onImportantNotesFocus={onImportantNotesFocus}
        copyPasteState={copyPasteState}
        onPasteMeal={onPasteMeal}
        onCopyMeal={onCopyMeal}
        onClearClipboard={onClearClipboard}
        onCopyDay={handleCopyDay}
        onDeleteDay={handleDeleteDay}
        onDragEnd={async (dayId, activeId, overId) => {
          const day = undoDayPlans.find((d: any) => d.id === dayId);
          if (!day) return;
          const oldIndex = day.meals.findIndex((m: any) => m.id === activeId);
          const newIndex = day.meals.findIndex((m: any) => m.id === overId);
          if (oldIndex === -1 || newIndex === -1) return;

          // Get meal names for snapshot description
          const movedMeal = day.meals[oldIndex];
          const targetMeal = day.meals[newIndex];

          const newMeals = arrayMove(day.meals, oldIndex, newIndex).map((meal: any, idx: number) => ({
            ...meal,
            order_index: idx
          }));

          setUndoDayPlans(
            undoDayPlans.map((d: any) =>
              d.id === dayId ? { ...d, meals: newMeals } : d
            )
          );

          const { updateMealsOrder } = await import("@/utils/supabaseTemplates");
          await updateMealsOrder(newMeals.map((m: any) => ({ id: m.id, order_index: m.order_index })));

          // 🚀 OPTIMIZATION: Pobierz świeże dane raz po reorder
          const { getClientDietPlansAndSettings, getClientById } = await import("@/utils/clientStorage");
          const freshDietData = await getClientDietPlansAndSettings(client.id);
          const freshClientData = await getClientById(client.id);

          // 🚀 OPTIMIZATION: Refresh UI with cached data - NO duplicate queries!
          if (onRefreshData && freshDietData && freshClientData) {
            await onRefreshData({ dietData: freshDietData, clientData: freshClientData });
          }

          // Create snapshot for meal reorder operation with cached data
          try {
            const reorderSnapshot = await createDietSnapshot(client.id, {
              trigger_type: 'meal_reorder',
              trigger_description: `Zmieniono kolejność posiłków: "${movedMeal?.name || 'Nieznany'}" z pozycji ${oldIndex + 1} na ${newIndex + 1}`,
              // 🚀 OPTIMIZATION: Przekaż już pobrane dane aby uniknąć duplikacji zapytań
              cachedDietData: freshDietData || undefined,
              cachedClientData: freshClientData || undefined
            });

            // Add new snapshot to stack locally if available
            if (reorderSnapshot && addNewSnapshot) {
              addNewSnapshot(reorderSnapshot);
            }
          } catch (error) {
            logger.error('Błąd tworzenia snapshotu dla zmiany kolejności:', error);
            // Nie blokujemy operacji jeśli snapshot się nie uda
          }
        }}
      />
      <DishSelectionModal
        key={`${editingMeal?.id || 'new'}-v${modalRefreshCounter}`} // 🎯 FIX: Counter-based key for fresh data
        isOpen={isDishSelectionModalOpen}
        context="clientDiet"
        onClose={() => {
          setIsDishSelectionModalOpen(false);
          setEditingMeal(undefined);
          setCurrentDayId("");
        }}
        meal={editingMeal}
        onSelectDish={handleSaveMeal}
        dayPlanId={currentDayId}
        isSaving={isSavingMeal}
      />
      <CopyDayModal
        isOpen={isCopyDayModalOpen}
        onClose={() => setIsCopyDayModalOpen(false)}
        onConfirm={handleConfirmPasteDay}
        sourceDayPlan={copyPasteDayState.sourceDayPlan}
        availableDays={undoDayPlans.filter(d => d.id !== copyPasteDayState.sourceDayId)}
        isTemplate={false}
      />
      {/* 🎯 Empty day warning modal */}
      <AlertDialog open={isEmptyDayWarningOpen} onOpenChange={setIsEmptyDayWarningOpen}>
        <AlertDialogContent className="bg-zinc-900 border-zinc-800">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-zinc-100">
              Dzień nie ma posiłków
            </AlertDialogTitle>
            <AlertDialogDescription className="text-zinc-400">
              Wybrany dzień "{pendingDayPlan?.name}" nie zawiera żadnych posiłków.
              Czy chcesz kontynuować i utworzyć pustą kopię?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col sm:flex-row gap-2">
            <AlertDialogCancel
              onClick={handleCancelCopyEmptyDay}
              className="bg-zinc-800 border-zinc-700 text-zinc-100 hover:bg-zinc-700"
            >
              Anuluj
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmCopyEmptyDay}
              className="bg-gradient-to-r from-[#a08032] to-[#e6d280] hover:from-[#8a6c2b] hover:to-[#d4c06b] text-zinc-900 font-medium"
            >
              Kontynuuj
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default ClientDietManager;
