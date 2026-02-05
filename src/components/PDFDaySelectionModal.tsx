import React, { useState, useEffect, useCallback } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { Badge } from "@/components/ui/badge";
import { FileDown } from "lucide-react";
import { useModalConfirmation } from "@/hooks/useModalConfirmation";
import { logger } from '@/utils/logger';

interface Meal {
  id: string;
  name: string;
  dish: string;
  instructions: string[];
  ingredients: any[];
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
  countTowardsDailyCalories: boolean;
}

interface DayPlan {
  id: string;
  name: string;
  meals: Meal[];
}

interface PDFDaySelectionModalProps {
  dayPlans: DayPlan[];
  isOpen: boolean;
  onClose: () => void;
  onGenerate: (selectedDayIds: string[]) => Promise<void>;
  clientName: string;
  isGenerating?: boolean;
  showMacros?: boolean; // Nowy prop do kontrolowania wyświetlania makro
}

export const PDFDaySelectionModal: React.FC<PDFDaySelectionModalProps> = ({
  dayPlans,
  isOpen,
  onClose,
  onGenerate,
  clientName,
  isGenerating = false,
  showMacros = true // Domyślnie true dla kompatybilności wstecznej
}) => {
  const [selectedDayIds, setSelectedDayIds] = useState<string[]>([]);
  const [isAllSelected, setIsAllSelected] = useState(true);

  // Function to check if there are unsaved changes
  const hasUnsavedChanges = useCallback(() => {
    return true; // Always require confirmation
  }, []);

  // Confirmation modal hook
  const { handleClose: handleConfirmationClose, confirmationDialog } = useModalConfirmation({
    title: "Zamknąć wybór dni do PDF?",
    message: "Czy na pewno chcesz zamknąć okno wyboru dni do eksportu PDF?",
    hasUnsavedChanges,
    onDiscard: () => {
      // Reset state and close modal
      setSelectedDayIds([]);
      setIsAllSelected(true);
      onClose();
    }
  });

  // Debug log dla selectedDayIds
  useEffect(() => {
  }, [selectedDayIds]);

  // Filter only days that have meals
  const daysWithMeals = dayPlans.filter(day => day.meals && day.meals.length > 0);
  
  // All days for display (including those without meals)
  const allDays = dayPlans;

  // Initialize selection - all days selected by default
  useEffect(() => {
    if (isOpen && daysWithMeals.length > 0) {
      const allDayIds = daysWithMeals.map(day => day.id);
      setSelectedDayIds(allDayIds);
      setIsAllSelected(true);
    } else if (isOpen && daysWithMeals.length === 0) {
      setSelectedDayIds([]);
      setIsAllSelected(false);
    }
  }, [isOpen, dayPlans.length]); // Użyj dayPlans.length zamiast daysWithMeals

  // Update "all selected" state when individual selections change
  useEffect(() => {
    if (daysWithMeals.length === 0) {
      setIsAllSelected(false);
      return;
    }
    
    const allDayIds = daysWithMeals.map(day => day.id);
    setIsAllSelected(
      allDayIds.length > 0 &&
      selectedDayIds.length === allDayIds.length &&
      allDayIds.every(id => selectedDayIds.includes(id))
    );
  }, [selectedDayIds, dayPlans.length]); // Użyj dayPlans.length zamiast daysWithMeals

  const handleDayToggle = (dayId: string, checked: boolean | string) => {
    const isChecked = checked === true || checked === 'true';
    
    if (isChecked) {
      setSelectedDayIds(prev => {
        if (!prev.includes(dayId)) {
          return [...prev, dayId];
        }
        return prev;
      });
    } else {
      setSelectedDayIds(prev => prev.filter(id => id !== dayId));
    }
  };

  const handleSelectAll = (checked: boolean | string) => {
    const isChecked = checked === true || checked === 'true';
    
    if (isChecked) {
      const allDayIds = daysWithMeals.map(day => day.id);
      setSelectedDayIds(allDayIds);
      setIsAllSelected(true);
    } else {
      setSelectedDayIds([]);
      setIsAllSelected(false);
    }
  };

  const handleGenerate = async () => {
    if (selectedDayIds.length === 0) return;
    
    try {
      await onGenerate(selectedDayIds);
      handleConfirmationClose(true); // Force close after successful generation
    } catch (error) {
      // Error handling będzie w parent component
      logger.error('PDF generation failed:', error);
    }
  };

  const calculateDayTotals = (day: DayPlan) => {
    return day.meals.reduce((totals, meal) => ({
      calories: totals.calories + (meal.countTowardsDailyCalories ? meal.calories : 0),
      protein: totals.protein + (meal.countTowardsDailyCalories ? meal.protein : 0),
      fat: totals.fat + (meal.countTowardsDailyCalories ? meal.fat : 0),
      carbs: totals.carbs + (meal.countTowardsDailyCalories ? meal.carbs : 0),
      fiber: totals.fiber + (meal.countTowardsDailyCalories ? meal.fiber : 0),
      meals: totals.meals + 1
    }), { calories: 0, protein: 0, fat: 0, carbs: 0, fiber: 0, meals: 0 });
  };

  const hasValidSelection = selectedDayIds.length > 0;

  if (daysWithMeals.length === 0) {
    return (
      <>
        <Dialog open={isOpen} onOpenChange={handleConfirmationClose}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-zinc-100">
              <FileDown className="h-5 w-5" />
              Generowanie PDF
            </DialogTitle>
            <DialogDescription className="text-zinc-400">
              Proszę czekać, trwa generowanie pliku PDF...
            </DialogDescription>
          </DialogHeader>
          <div className="py-6 text-center">
            <div className="text-zinc-400 mb-4">
              Brak dni z posiłkami do wygenerowania PDF.
            </div>
            <Button onClick={handleConfirmationClose} className="w-full">
              Zamknij
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      {confirmationDialog}
      </>
    );
  }

  return (
    <>
      <Dialog open={isOpen} onOpenChange={handleConfirmationClose}>
      <DialogContent className="sm:max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="flex items-center gap-2 text-zinc-100">
            <FileDown className="h-5 w-5" />
            Wybierz dni do PDF
          </DialogTitle>
          <DialogDescription className="text-sm text-zinc-400 mt-2">
            Wybierz które dni mają być uwzględnione w jadłospisie dla <span className="font-medium text-zinc-200">{clientName}</span>
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto py-4">
          {/* Master Checkbox - Select All */}
          <div className="mb-6 p-3 bg-zinc-800/50 rounded-lg border border-zinc-700">
            <div className="flex items-center space-x-3">
              <Checkbox
                id="select-all"
                checked={isAllSelected}
                onCheckedChange={handleSelectAll}
                disabled={isGenerating}
                className="data-[state=checked]:bg-[#a08032] data-[state=checked]:border-[#a08032]"
              />
              <label htmlFor="select-all" className="text-sm font-medium text-zinc-200 cursor-pointer">
                Wszystkie dni ({daysWithMeals.length})
              </label>
              {isAllSelected && (
                <Badge variant="secondary" className="bg-[#a08032]/20 text-[#e6d280] border-[#a08032]/30">
                  Wybrano wszystkie
                </Badge>
              )}
            </div>
          </div>

          {/* Individual Day Selection */}
          <div className="space-y-3">
            {allDays.map((day) => {
              const hasMeals = day.meals && day.meals.length > 0;
              const totals = hasMeals ? calculateDayTotals(day) : { calories: 0, protein: 0, fat: 0, carbs: 0, fiber: 0, meals: 0 };
              const isSelected = selectedDayIds.includes(day.id);
              const isDisabled = !hasMeals || isGenerating;

              return (
                <div key={day.id} className={`p-4 rounded-lg border transition-all ${
                  isDisabled
                    ? 'bg-zinc-800/20 border-zinc-700/50 opacity-60'
                    : isSelected
                      ? 'bg-[#a08032]/10 border-[#a08032]/30 shadow-sm'
                      : 'bg-zinc-800/30 border-zinc-700 hover:bg-zinc-800/50'
                }`}>
                  <div className="flex items-start space-x-3">
                    <Checkbox
                      id={`day-${day.id}`}
                      checked={isSelected && hasMeals}
                      onCheckedChange={hasMeals ? (checked) => handleDayToggle(day.id, checked as boolean) : undefined}
                      disabled={isDisabled}
                      className="mt-1 data-[state=checked]:bg-[#a08032] data-[state=checked]:border-[#a08032]"
                    />
                    <div className="flex-1 min-w-0">
                      <label htmlFor={`day-${day.id}`} className={`block ${hasMeals ? 'cursor-pointer' : 'cursor-not-allowed'}`}>
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className={`text-base font-semibold ${hasMeals ? 'text-zinc-100' : 'text-zinc-400'}`}>
                            {day.name}
                          </h3>
                          {isSelected && hasMeals && (
                            <Badge variant="outline" className="border-[#a08032]/50 text-[#e6d280] bg-[#a08032]/10">
                              Wybrano
                            </Badge>
                          )}
                          {!hasMeals && (
                            <Badge variant="outline" className="border-zinc-600 text-zinc-500 bg-zinc-800/30 text-xs">
                              Niedostępny
                            </Badge>
                          )}
                        </div>
                        
                        {hasMeals ? (
                          <>
                            <div className="flex items-center gap-2 text-sm text-zinc-400 flex-wrap">
                              <span>{totals.meals} posiłków</span>
                              {showMacros && (
                                <>
                                  <span>•</span>
                                  <span>{Math.round(totals.calories)} kcal</span>
                                  <span>•</span>
                                  <span>B: {Math.round(totals.protein)}g</span>
                                  <span>•</span>
                                  <span>T: {Math.round(totals.fat)}g</span>
                                  <span>•</span>
                                  <span>W: {Math.round(totals.carbs)}g</span>
                                  {totals.fiber > 0 && (
                                    <>
                                      <span>•</span>
                                      <span>Bł: {Math.round(totals.fiber)}g</span>
                                    </>
                                  )}
                                </>
                              )}
                            </div>
                            <div className="mt-2 text-xs text-zinc-500">
                              {day.meals.slice(0, 3).map(meal => meal.name).join(', ')}
                              {day.meals.length > 3 && ` i ${day.meals.length - 3} więcej...`}
                            </div>
                          </>
                        ) : (
                          <div className="text-xs text-zinc-500">
                            Ten dzień nie zawiera żadnych posiłków i nie może być uwzględniony w PDF
                          </div>
                        )}
                      </label>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Selection Summary */}
          {selectedDayIds.length > 0 && (
            <div className="mt-6 p-3 bg-zinc-800/50 rounded-lg border border-zinc-700">
              <div className="text-sm text-zinc-300">
                <strong>Wybrano:</strong> {selectedDayIds.length} z {daysWithMeals.length} dni
              </div>
              <div className="text-xs text-zinc-500 mt-1">
                PDF będzie zawierał {selectedDayIds.length === 1 ? 'jeden dzień' : `${selectedDayIds.length} dni`} z oddzielnymi sekcjami ważnych informacji i instrukcji dla każdego dnia.
              </div>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex-shrink-0 flex items-center gap-3 pt-4 border-t border-zinc-700">
          <Button
            variant="outline"
            onClick={handleConfirmationClose}
            disabled={isGenerating}
            className="flex-1"
          >
            Anuluj
          </Button>
          <Button
            onClick={handleGenerate}
            disabled={!hasValidSelection || isGenerating}
            className="flex-1 bg-gradient-to-r from-[#a08032] to-[#e6d280] hover:from-[#8a6b28] hover:to-[#d4b860] text-white font-medium"
          >
            {isGenerating ? (
              <>
                <LoadingSpinner size="sm" className="mr-2" />
                Generowanie PDF...
              </>
            ) : (
              <>
                <FileDown className="h-4 w-4 mr-2" />
                Generuj PDF ({selectedDayIds.length} {selectedDayIds.length === 1 ? 'dzień' : 'dni'})
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
    {confirmationDialog}
    </>
  );
};

export default PDFDaySelectionModal;