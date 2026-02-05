import React, { useEffect, useState, useRef, useMemo, useCallback } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { StepCalorieCalculator } from "@/components/StepCalorieCalculator";
import { Calculator, Save, X, AlertCircle } from "lucide-react";
import { getCalculatorState, saveCalculatorState } from "@/utils/clientStorage";
import { toast } from "@/hooks/use-toast";
import { MacroPlanning, CalculatorResults } from "@/types/macro-planning";
import { logger } from '@/utils/logger';

interface DayPlan {
  id: string;
  name: string;
  meals: any[];
}

interface ClientCalorieCalculatorDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  clientAge: number;
  clientGender: string;
  clientHeight: string;
  clientId: string;
  dayPlans: DayPlan[];
  dayCalories: { [dayId: string]: number };
  dayMacros: { [dayId: string]: MacroPlanning };
  calculatorResults: CalculatorResults | null;
  clientWeight: number;
  initialActivityLevel: number[];
  onSave?: (data: {
    weight: number;
    activityLevel: number;
    results: CalculatorResults | null;
    dayCalories: { [dayId: string]: number };
    dayMacros: { [dayId: string]: MacroPlanning };
    dayOperations?: {
      newDays: Array<{ name: string; day_number: number }>;
      removedDays: Array<{ id: string; name: string }>;
      renamedDays: Array<{ id: string; oldName: string; newName: string }>;
    };
  }) => void;
  onAddDay?: (dayName: string) => void;
  onRemoveDay?: (dayId: string) => void;
  onDayNameChange?: (dayId: string, newName: string) => void;
  onNavigateToDetails?: () => void; // 🎯 Callback to navigate to details tab
}


export const ClientCalorieCalculatorDrawer: React.FC<ClientCalorieCalculatorDrawerProps> = ({
  isOpen,
  onClose,
  clientAge,
  clientGender,
  clientHeight,
  clientId,
  dayPlans: initialDayPlans,
  dayCalories,
  dayMacros,
  calculatorResults,
  clientWeight,
  initialActivityLevel,
  onSave,
  onAddDay,
  onRemoveDay,
  onDayNameChange,
  onNavigateToDetails,
}) => {
  const [weight, setWeight] = useState(clientWeight);
  const [activityLevel, setActivityLevel] = useState(initialActivityLevel);
  const [results, setResults] = useState<CalculatorResults | null>(calculatorResults);
  const [localDayCalories, setLocalDayCalories] = useState(dayCalories);
  const [localDayMacros, setLocalDayMacros] = useState(dayMacros);
  const [localDayPlans, setLocalDayPlans] = useState(initialDayPlans); // 🎯 Local day plans state
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [showUnsavedDialog, setShowUnsavedDialog] = useState(false);
  const [isSaving, setIsSaving] = useState(false);


  // 🎯 GEMINI FIX: Separate useEffect for weight synchronization
  useEffect(() => {
    setWeight(clientWeight);
  }, [clientWeight]);

  // 🎯 Separate useEffect for activity level synchronization
  useEffect(() => {
    setActivityLevel(initialActivityLevel);
  }, [initialActivityLevel]);

  // Reset state when opening drawer (without weight and activity - handled above)
  useEffect(() => {
    if (isOpen) {

      // setWeight and setActivityLevel removed - handled by separate useEffects above
      setResults(calculatorResults);
      setLocalDayCalories(dayCalories);
      setLocalDayMacros(dayMacros);
      // 🎯 Reset local day plans with proper sorting
      setLocalDayPlans([...initialDayPlans].sort((a, b) => (a.day_number || 0) - (b.day_number || 0)));
      setHasUnsavedChanges(false);

    }
  }, [isOpen, calculatorResults, dayCalories, dayMacros, initialDayPlans]);


  // 🎯 Optimized change detection with memoization
  const changeDetection = useMemo(() => {
    const hasWeightChanged = weight !== clientWeight;
    const hasActivityChanged = activityLevel[0] !== initialActivityLevel[0];
    const hasResultsChanged = JSON.stringify(results) !== JSON.stringify(calculatorResults);
    const hasCaloriesChanged = JSON.stringify(localDayCalories) !== JSON.stringify(dayCalories);
    const hasMacrosChanged = JSON.stringify(localDayMacros) !== JSON.stringify(dayMacros);
    const hasDayPlansChanged = JSON.stringify(localDayPlans) !== JSON.stringify(initialDayPlans);

    return {
      hasWeightChanged,
      hasActivityChanged,
      hasResultsChanged,
      hasCaloriesChanged,
      hasMacrosChanged,
      hasDayPlansChanged,
      hasAnyChanges: hasWeightChanged || hasActivityChanged || hasResultsChanged || hasCaloriesChanged || hasMacrosChanged || hasDayPlansChanged
    };
  }, [weight, clientWeight, activityLevel, initialActivityLevel, results, calculatorResults, localDayCalories, dayCalories, localDayMacros, dayMacros, localDayPlans, initialDayPlans]);

  // Track changes to mark as unsaved
  useEffect(() => {
    setHasUnsavedChanges(changeDetection.hasAnyChanges);
  }, [changeDetection, isOpen]);

  const handleWeightChange = useCallback((value: number) => {
    setWeight(value);
  }, []);

  const handleActivityLevelChange = useCallback((level: number[]) => {
    setActivityLevel(level);
  }, []);

  const handleDayCalorieChange = useCallback((dayId: string, value: number) => {
    setLocalDayCalories(prev => ({ ...prev, [dayId]: value }));
  }, []);

  const handleMacroChange = useCallback((dayId: string, macros: MacroPlanning) => {
    setLocalDayMacros(prev => ({ ...prev, [dayId]: macros }));
  }, []);

  // 🎯 Local day management handlers (no database operations)
  const handleLocalAddDay = useCallback((dayName: string) => {
    const maxDayNumber = localDayPlans.length > 0
      ? Math.max(...localDayPlans.map(day => day.day_number || 0))
      : 0;

    const newDay = {
      id: `temp-${Date.now()}`, // Temporary ID for local state
      name: dayName,
      meals: [],
      day_number: maxDayNumber + 1
    };

    setLocalDayPlans(prev => [...prev, newDay].sort((a, b) => (a.day_number || 0) - (b.day_number || 0)));
  }, [localDayPlans]);

  const handleLocalRemoveDay = useCallback((dayId: string) => {
    setLocalDayPlans(prev => prev.filter(day => day.id !== dayId));
    // Also remove from local calories and macros
    setLocalDayCalories(prev => {
      const { [dayId]: removed, ...rest } = prev;
      return rest;
    });
    setLocalDayMacros(prev => {
      const { [dayId]: removed, ...rest } = prev;
      return rest;
    });
  }, []);

  const handleLocalDayNameChange = useCallback((dayId: string, newName: string) => {
    setLocalDayPlans(prev =>
      prev.map(day =>
        day.id === dayId
          ? { ...day, name: newName }
          : day
      )
    );
  }, []);


  const handleSave = async () => {
    if (!hasUnsavedChanges) return;

    // Kontynuuj normalny zapis
    await performSave();
  };

  const performSave = async () => {
    setIsSaving(true);
    try {
      // 🎯 Prepare day operations data
      const hasDayPlansChanged = JSON.stringify(localDayPlans) !== JSON.stringify(initialDayPlans);
      let dayOperations = undefined;

      if (hasDayPlansChanged) {
        // Detect new days (temp IDs)
        const newDays = localDayPlans
          .filter(day => day.id.startsWith('temp-'))
          .map(day => ({
            name: day.name,
            day_number: day.day_number || 1,
            tempId: day.id // Include temp-ID for mapping
          }));

        // Detect removed days
        const removedDays = initialDayPlans
          .filter(initialDay => !localDayPlans.some(localDay => localDay.id === initialDay.id))
          .map(day => ({ id: day.id, name: day.name }));

        // Detect renamed days
        const renamedDays = localDayPlans
          .filter(day => !day.id.startsWith('temp-'))
          .map(day => {
            const originalDay = initialDayPlans.find(d => d.id === day.id);
            return originalDay && originalDay.name !== day.name
              ? { id: day.id, oldName: originalDay.name, newName: day.name }
              : null;
          })
          .filter(Boolean) as Array<{ id: string; oldName: string; newName: string }>;

        if (newDays.length > 0 || removedDays.length > 0 || renamedDays.length > 0) {
          dayOperations = { newDays, removedDays, renamedDays };
        }
      }

      if (onSave) {
        await onSave({
          weight,
          activityLevel: activityLevel[0],
          results,
          dayCalories: localDayCalories,
          dayMacros: localDayMacros,
          dayOperations
        });
      }

      toast({
        title: "Zmiany zapisane",
        description: "Wszystkie zmiany w kalkulatorze zostały zapisane",
        variant: "default",
      });

      setHasUnsavedChanges(false);

      // Zamknij kalkulator po udanym zapisie
      onClose();
    } catch (error) {
      logger.error("❌ Save failed:", error);
      toast({
        title: "Błąd",
        description: "Nie udało się zapisać zmian",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };


  const handleClose = () => {
    if (hasUnsavedChanges) {
      setShowUnsavedDialog(true);
    } else {
      onClose();
    }
  };

  const handleForceClose = () => {
    setShowUnsavedDialog(false);

    // 🎯 FIX: Reset all local state to database values when force closing
    setWeight(clientWeight);
    setActivityLevel(initialActivityLevel);
    setResults(calculatorResults);
    setLocalDayCalories(dayCalories);
    setLocalDayMacros(dayMacros);
    setLocalDayPlans([...initialDayPlans].sort((a, b) => (a.day_number || 0) - (b.day_number || 0)));
    setHasUnsavedChanges(false);

    onClose();
  };

  // 🎯 Validation: Check if height is valid for calculator
  const isHeightValid = clientHeight && !isNaN(parseFloat(clientHeight));

  return (
    <>
      <Sheet open={isOpen} onOpenChange={handleClose}>
        <SheetContent side="right" className="w-full sm:max-w-2xl bg-zinc-900 border-zinc-800 overflow-y-auto">
          <SheetHeader className="pb-6">
            <SheetTitle className="text-zinc-100 text-sm sm:text-base">
              <span className="sm:hidden">Kalkulator Kalorii</span>
              <span className="hidden sm:inline">Kalkulator Kalorii (Wzór Harrisa-Benedicta)</span>
            </SheetTitle>
            <SheetDescription className="text-zinc-400">
              Oblicz zapotrzebowanie kaloryczne i zaplanuj makroskładniki dla klienta
            </SheetDescription>
          </SheetHeader>

          <div className="space-y-6">
            {!isHeightValid ? (
              // 🎯 Alert when height is missing
              <div className="flex flex-col items-center justify-center py-12 px-4 space-y-6">
                <div className="flex flex-col items-center text-center space-y-4 max-w-md">
                  <div className="rounded-full bg-amber-500/10 p-4">
                    <AlertCircle className="h-12 w-12 text-amber-500" />
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-xl font-semibold text-zinc-100">
                      Uzupełnij dane klienta
                    </h3>
                    <p className="text-zinc-400 text-sm">
                      Do kalkulacji kalorii potrzebny jest wzrost klienta. Przejdź do zakładki 'Szczegóły' i uzupełnij wzrost klienta.
                    </p>
                  </div>
                  <div className="flex gap-3 w-full pt-2">
                    <Button
                      onClick={onNavigateToDetails}
                      className="flex-1 bg-[#a08032] hover:bg-[#8a6b2b] text-white"
                    >
                      Przejdź do Szczegółów
                    </Button>
                    <Button
                      onClick={handleClose}
                      variant="outline"
                      className="flex-1 bg-zinc-800 border-zinc-700 text-zinc-100 hover:bg-zinc-700 hover:border-zinc-600"
                    >
                      <X className="h-4 w-4 mr-2" />
                      Zamknij
                    </Button>
                  </div>
                </div>
              </div>
            ) : (
              // 🎯 Normal calculator when height is valid
              <>
                <StepCalorieCalculator
                  clientAge={clientAge}
                  clientGender={clientGender}
                  clientHeight={clientHeight}
                  dayPlans={localDayPlans}
                  onDayCalorieChange={handleDayCalorieChange}
                  onMacroChange={handleMacroChange}
                  onWeightChange={handleWeightChange}
                  onResultsChange={setResults}
                  initialWeight={weight}
                  initialActivityLevel={activityLevel}
                  onActivityLevelChange={handleActivityLevelChange}
                  initialDayCalories={localDayCalories}
                  initialDayMacros={localDayMacros}
                  onAddDay={handleLocalAddDay}
                  onRemoveDay={handleLocalRemoveDay}
                  onDayNameChange={handleLocalDayNameChange}
                />

                {/* Bottom Buttons */}
                <div className="flex gap-3">
                  <Button
                    onClick={handleSave}
                    disabled={!hasUnsavedChanges || isSaving}
                    className="flex-1 bg-[#a08032] hover:bg-[#8a6b2b] text-white disabled:bg-zinc-700 disabled:text-zinc-400"
                  >
                    <Save className="h-4 w-4 mr-2" />
                    {isSaving ? "Zapisywanie..." : "Zapisz"}
                  </Button>

                  <Button
                    onClick={handleClose}
                    variant="outline"
                    className="flex-1 bg-zinc-800 border-zinc-700 text-zinc-100 hover:bg-zinc-700 hover:border-zinc-600"
                  >
                    <X className="h-4 w-4 mr-2" />
                    Zamknij
                  </Button>
                </div>
              </>
            )}
          </div>
        </SheetContent>
      </Sheet>

      <AlertDialog open={showUnsavedDialog} onOpenChange={setShowUnsavedDialog}>
        <AlertDialogContent className="bg-zinc-900 border-zinc-800">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-zinc-100">Masz niezapisane zmiany</AlertDialogTitle>
            <AlertDialogDescription className="text-zinc-300">
              Czy na pewno chcesz zamknąć kalkulator? Wszystkie niezapisane zmiany zostaną utracone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-zinc-700 text-zinc-100 hover:bg-zinc-600">
              Anuluj
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleForceClose}
              className="bg-red-600 text-white hover:bg-red-700"
            >
              Zamknij bez zapisywania
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

    </>
  );
};
