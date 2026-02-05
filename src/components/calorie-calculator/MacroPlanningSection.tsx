import React, { useState, useMemo, useCallback, useEffect, memo, useRef } from "react";
import { Input } from "@/components/ui/input";
import { NumericInput } from "@/components/ui/numeric-input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ChevronDown, ChevronUp, Trash2, Plus, Loader2 } from "lucide-react";
import { calculateMissingGramsForMacro, formatMacroSuggestionText } from "./utils";

interface DayPlan {
  id: string;
  name: string;
  meals: any[];
}

interface MacroPlanning {
  calories: number;
  proteinPercentage: number;
  proteinPerKg: number;
  fatPercentage: number;
  fatPerKg: number;
  carbsPercentage: number;
  carbsPerKg: number;
  fiberPerKg: number;
}

interface MacroPlanningProps {
  dayPlans: DayPlan[];
  dayCalories: { [dayId: string]: number };
  dayMacros: { [dayId: string]: MacroPlanning };
  onDayCalorieChange: (dayId: string, value: number) => void;
  onDayCalorieBlur?: (dayId: string, value: number, oldValue?: number) => void;
  onMacroChange: (dayId: string, field: keyof MacroPlanning, value: number) => void;
  onAddDay?: (dayName: string) => void;
  onRemoveDay?: (dayId: string) => void;
  onDayNameChange?: (dayId: string, newName: string) => void;
  // 🎯 FIX: Add openPopover props to survive mount/unmount
  openPopover: string | null;
  setOpenPopover: (value: string | null) => void;
  // 🎯 FIX: Add result prop to show/hide content conditionally
  result?: { bmr: number; tdee: number } | null;
}

const MacroPlanningComponent = ({
  dayPlans,
  dayCalories,
  dayMacros,
  onDayCalorieChange,
  onDayCalorieBlur,
  onMacroChange,
  onAddDay,
  onRemoveDay,
  onDayNameChange,
  openPopover,
  setOpenPopover,
  result
}: MacroPlanningProps) => {
  // 🎯 FIX: Use props instead of local state - survives mount/unmount
  const [newDayName, setNewDayName] = useState("");
  const [focusValues, setFocusValues] = useState<{ [dayId: string]: number }>({});
  const [editingDay, setEditingDay] = useState<string | null>(null);
  const [editDayName, setEditDayName] = useState("");
  const [isSavingName, setIsSavingName] = useState(false);


  // 🎯 Memoized calculation of missing calories to prevent re-calculation on every render
  const missingCalories = useMemo(() => {
    return dayPlans.reduce((acc, day) => {
      const calories = dayCalories[day.id] || 0;
      const macros = dayMacros[day.id];

      if (!macros || calories === 0) {
        acc[day.id] = 0;
        return acc;
      }

      const proteinCals = (macros.proteinPerKg || 0) * 4;
      const fatCals = (macros.fatPerKg || 0) * 9;
      const carbsCals = (macros.carbsPerKg || 0) * 4;
      const totalMacroCals = proteinCals + fatCals + carbsCals;
      const missingCals = Math.round((calories - totalMacroCals) * 10) / 10;

      acc[day.id] = missingCals;
      return acc;
    }, {} as { [dayId: string]: number });
  }, [dayPlans, dayCalories, dayMacros]);

  // 🎯 Memoized conditions for showing arrows
  const shouldShowArrow = useMemo(() => {
    return dayPlans.reduce((acc, day) => {
      const missingCals = missingCalories[day.id] || 0;
      const shouldShow = Math.abs(missingCals) > 5;
      acc[day.id] = shouldShow;
      return acc;
    }, {} as { [dayId: string]: boolean });
  }, [dayPlans, missingCalories]);
  
  // Fixed color-coding function for missing calories
  const getMissingCaloriesColor = (missingCalories: number): string => {
    if (missingCalories < -5) return "text-red-400"; // Below -5: Red
    if (missingCalories >= -5 && missingCalories <= 5) return "text-green-400"; // Between -5 to +5: Green
    if (missingCalories > 5) return "text-orange-400"; // Above +5: Orange
    return "text-zinc-300"; // Default
  };

  const handleApplySuggestion = useCallback((dayId: string, macroType: 'protein' | 'fat' | 'carbs') => {
    const missingCaloriesForDay = missingCalories[dayId];

    if (missingCaloriesForDay === 0) {
      return;
    }

    const gramsToAdjust = calculateMissingGramsForMacro(missingCaloriesForDay, macroType);
    const currentGrams = dayMacros[dayId]?.[`${macroType}PerKg`] || 0;
    const newGrams = Math.max(0, currentGrams + gramsToAdjust); // Prevent negative grams

    onMacroChange(dayId, `${macroType}PerKg` as keyof MacroPlanning, newGrams);
  }, [missingCalories, dayMacros, onMacroChange]);



  // Handle adding new day
  const handleAddDay = () => {
    if (newDayName.trim() && onAddDay) {
      onAddDay(newDayName.trim());
      setNewDayName("");
    }
  };

  // Handle removing day (prevent if only one day exists)
  const handleRemoveDay = (dayId: string) => {
    if (dayPlans.length > 1 && onRemoveDay) {
      onRemoveDay(dayId);
    }
  };

  // Handle starting day name editing
  const startEditingDay = (dayId: string, currentName: string) => {
    setEditingDay(dayId);
    setEditDayName(currentName);
  };

  // Handle saving day name with loading state
  const handleSaveDayName = async (dayId: string) => {
    if (editDayName.trim() && onDayNameChange) {
      setIsSavingName(true);
      try {
        await onDayNameChange(dayId, editDayName.trim());
      } finally {
        setIsSavingName(false);
        setEditingDay(null);
        setEditDayName("");
      }
    } else {
      setEditingDay(null);
      setEditDayName("");
    }
  };

  // 🎯 FIX: Show placeholder when no result, but always render component
  if (!result) {
    return (
      <div className="mt-6 space-y-4">
        <div className="bg-zinc-800 border border-zinc-700 rounded-lg p-6 text-center">
          <p className="text-zinc-400 text-sm">
            Wpisz wagę klienta aby rozpocząć planowanie makroskładników
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="mt-6 space-y-4">
      <div className="space-y-4">
        {dayPlans.map((day) => (
          <div key={day.id} className="bg-zinc-900 p-4 rounded-lg border border-zinc-700">
            <div className="flex items-center justify-between mb-4">
              {editingDay === day.id ? (
                <div className="flex items-center gap-2 flex-1">
                  <Input
                    id={`edit-day-name-${day.id}`}
                    name={`edit-day-name-${day.id}`}
                    aria-label="Edytuj nazwę dnia"
                    value={editDayName}
                    onChange={(e) => setEditDayName(e.target.value)}
                    onBlur={() => handleSaveDayName(day.id)}
                    onKeyPress={(e) => e.key === 'Enter' && handleSaveDayName(day.id)}
                    className="bg-transparent border-none text-[#e6d280] text-lg font-medium focus:border-[#a08032] focus:bg-zinc-800 px-0 py-1"
                    disabled={isSavingName}
                    autoFocus
                  />
                  {isSavingName && (
                    <Loader2 className="h-4 w-4 animate-spin text-[#a08032]" />
                  )}
                </div>
              ) : (
                <h5 
                  className="font-medium text-[#e6d280] text-lg cursor-pointer hover:bg-zinc-800 px-0 py-1 rounded transition-colors"
                  onClick={() => startEditingDay(day.id, day.name)}
                  title="Kliknij aby edytować nazwę dnia"
                >
                  {day.name}
                </h5>
              )}
              <div className="flex items-center gap-2">
                {dayPlans.length > 1 && onRemoveDay && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRemoveDay(day.id)}
                    className="text-red-400 hover:text-red-300 hover:bg-red-900/20 p-2 min-w-[36px] min-h-[36px] opacity-100"
                    title="Usuń dzień"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <Label htmlFor={`day-calories-${day.id}`} className="text-zinc-300 text-sm mb-2 block">Kalorie (kcal)</Label>
                <NumericInput
                  id={`day-calories-${day.id}`}
                  name={`day-calories-${day.id}`}
                  type="integer"
                  value={dayCalories[day.id] || 0}
                  onChange={(value) => onDayCalorieChange(day.id, value)}
                  onFocus={(e) => {
                    setFocusValues(prev => ({ ...prev, [day.id]: dayCalories[day.id] || 0 })); // Zapisz wartość przed edycją
                  }}
                  onBlur={() => {
                    // Porównaj z wartością sprzed edycji
                    const oldValue = focusValues[day.id] || 0;
                    if (onDayCalorieBlur) {
                      onDayCalorieBlur(day.id, dayCalories[day.id] || 0, oldValue);
                    }
                  }}
                  placeholder="np. 2500"
                  className="bg-zinc-800 border-zinc-700 text-zinc-100 placeholder:text-zinc-400 focus:border-[#a08032] w-full h-10"
                  showPlaceholderForZero={false}
                />
              </div>

              <div>
                <Label htmlFor={`missing-calories-${day.id}`} className="text-zinc-300 text-sm mb-2 block">Brakujące dzienne kalorie</Label>
                <Input
                  id={`missing-calories-${day.id}`}
                  type="text"
                  value={`${missingCalories[day.id] || 0} kcal`}
                  disabled
                  placeholder="Auto-obliczane"
                  className={`bg-zinc-700 border-zinc-600 w-full h-10 font-medium ${getMissingCaloriesColor(missingCalories[day.id] || 0)}`}
                />
              </div>
            </div>

            {/* Mobile: Kolumnowy layout */}
            <div className="md:hidden space-y-4">
              {/* Białko */}
              <div className="space-y-2">
                <Label className="text-zinc-300 text-sm font-medium">Białko</Label>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <NumericInput
                      type="decimal"
                      value={dayMacros[day.id]?.proteinPercentage || 0}
                      onChange={(value) => onMacroChange(day.id, 'proteinPercentage', value)}
                      placeholder="64"
                      className="bg-zinc-800 border-zinc-700 text-zinc-100 placeholder:text-zinc-400 focus:border-[#a08032] w-full h-10 text-center"
                      showPlaceholderForZero={false}
                    />
                    <span className="text-zinc-400 text-xs min-w-[16px]">%</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <NumericInput
                      type="decimal"
                      value={dayMacros[day.id]?.proteinPerKg || 0}
                      onChange={(value) => onMacroChange(day.id, 'proteinPerKg', value)}
                      placeholder="240"
                      className="bg-zinc-800 border-zinc-700 text-zinc-100 placeholder:text-zinc-400 focus:border-[#a08032] w-full h-10 text-center"
                      showPlaceholderForZero={false}
                    />
                    <span className="text-zinc-400 text-xs min-w-[16px]">g</span>
                    {(shouldShowArrow[day.id] || openPopover === `${day.id}-protein-mobile`) && (
                      <Popover open={openPopover === `${day.id}-protein-mobile`} onOpenChange={(open) => {
                        setOpenPopover(open ? `${day.id}-protein-mobile` : null);
                      }}>
                        <PopoverTrigger asChild>
                          <Button variant="ghost" size="sm" className="p-2 h-10 w-10 text-zinc-400 hover:text-zinc-300 hover:bg-zinc-700 touch-manipulation">
                            {(missingCalories[day.id] || 0) > 0 ? <ChevronDown className="h-5 w-5" /> : <ChevronUp className="h-5 w-5" />}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-2" side="bottom">
                          <Button
                            variant="ghost"
                            size="sm"
                            onPointerDown={() => handleApplySuggestion(day.id, 'protein')}
                            onClick={() => setOpenPopover(null)}
                            className="text-xs whitespace-nowrap hover:bg-zinc-700"
                          >
                            {(() => {
                              const missingCals = missingCalories[day.id] || 0;
                              const gramsNeeded = calculateMissingGramsForMacro(missingCals, 'protein');
                              const isDeficit = missingCals > 0;
                              return formatMacroSuggestionText(gramsNeeded, isDeficit);
                            })()}
                          </Button>
                        </PopoverContent>
                      </Popover>
                    )}
                  </div>
                </div>
              </div>

              {/* Tłuszcze */}
              <div className="space-y-2">
                <Label className="text-zinc-300 text-sm font-medium">Tłuszcze</Label>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <NumericInput
                      type="decimal"
                      value={dayMacros[day.id]?.fatPercentage || 0}
                      onChange={(value) => onMacroChange(day.id, 'fatPercentage', value)}
                      placeholder="18"
                      className="bg-zinc-800 border-zinc-700 text-zinc-100 placeholder:text-zinc-400 focus:border-[#a08032] w-full h-10 text-center"
                      showPlaceholderForZero={false}
                    />
                    <span className="text-zinc-400 text-xs min-w-[16px]">%</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <NumericInput
                      type="decimal"
                      value={dayMacros[day.id]?.fatPerKg || 0}
                      onChange={(value) => onMacroChange(day.id, 'fatPerKg', value)}
                      placeholder="30"
                      className="bg-zinc-800 border-zinc-700 text-zinc-100 placeholder:text-zinc-400 focus:border-[#a08032] w-full h-10 text-center"
                      showPlaceholderForZero={false}
                    />
                    <span className="text-zinc-400 text-xs min-w-[16px]">g</span>
                    {(shouldShowArrow[day.id] || openPopover === `${day.id}-fat-mobile`) && (
                      <Popover open={openPopover === `${day.id}-fat-mobile`} onOpenChange={(open) => {
                        setOpenPopover(open ? `${day.id}-fat-mobile` : null);
                      }}>
                        <PopoverTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="p-2 h-10 w-10 text-zinc-400 hover:text-zinc-300 hover:bg-zinc-700 touch-manipulation"
                          >
                            {(missingCalories[day.id] || 0) > 0 ? <ChevronDown className="h-5 w-5" /> : <ChevronUp className="h-5 w-5" />}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-2" side="bottom">
                          <Button
                            variant="ghost"
                            size="sm"
                            onPointerDown={() => handleApplySuggestion(day.id, 'fat')}
                            onClick={() => setOpenPopover(null)}
                            className="text-xs whitespace-nowrap hover:bg-zinc-700"
                          >
                            {(() => {
                              const missingCals = missingCalories[day.id] || 0;
                              const gramsNeeded = calculateMissingGramsForMacro(missingCals, 'fat');
                              const isDeficit = missingCals > 0;
                              return formatMacroSuggestionText(gramsNeeded, isDeficit);
                            })()}
                          </Button>
                        </PopoverContent>
                      </Popover>
                    )}
                  </div>
                </div>
              </div>

              {/* Węglowodany */}
              <div className="space-y-2">
                <Label className="text-zinc-300 text-sm font-medium">Węglowodany</Label>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <NumericInput
                      type="decimal"
                      value={dayMacros[day.id]?.carbsPercentage || 0}
                      onChange={(value) => onMacroChange(day.id, 'carbsPercentage', value)}
                      placeholder="18"
                      className="bg-zinc-800 border-zinc-700 text-zinc-100 placeholder:text-zinc-400 focus:border-[#a08032] w-full h-10 text-center"
                      showPlaceholderForZero={false}
                    />
                    <span className="text-zinc-400 text-xs min-w-[16px]">%</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <NumericInput
                      type="decimal"
                      value={dayMacros[day.id]?.carbsPerKg || 0}
                      onChange={(value) => onMacroChange(day.id, 'carbsPerKg', value)}
                      placeholder="68"
                      className="bg-zinc-800 border-zinc-700 text-zinc-100 placeholder:text-zinc-400 focus:border-[#a08032] w-full h-10 text-center"
                      showPlaceholderForZero={false}
                    />
                    <span className="text-zinc-400 text-xs min-w-[16px]">g</span>
                    {(shouldShowArrow[day.id] || openPopover === `${day.id}-carbs-mobile`) && (
                      <Popover open={openPopover === `${day.id}-carbs-mobile`} onOpenChange={(open) => {
                        setOpenPopover(open ? `${day.id}-carbs-mobile` : null);
                      }}>
                        <PopoverTrigger asChild>
                          <Button variant="ghost" size="sm" className="p-2 h-10 w-10 text-zinc-400 hover:text-zinc-300 hover:bg-zinc-700 touch-manipulation">
                            {(missingCalories[day.id] || 0) > 0 ? <ChevronDown className="h-5 w-5" /> : <ChevronUp className="h-5 w-5" />}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-2" side="bottom">
                          <Button
                            variant="ghost"
                            size="sm"
                            onPointerDown={() => handleApplySuggestion(day.id, 'carbs')}
                            onClick={() => setOpenPopover(null)}
                            className="text-xs whitespace-nowrap hover:bg-zinc-700"
                          >
                            {(() => {
                              const missingCals = missingCalories[day.id] || 0;
                              const gramsNeeded = calculateMissingGramsForMacro(missingCals, 'carbs');
                              const isDeficit = missingCals > 0;
                              return formatMacroSuggestionText(gramsNeeded, isDeficit);
                            })()}
                          </Button>
                        </PopoverContent>
                      </Popover>
                    )}
                  </div>
                </div>
              </div>

              {/* Błonnik */}
              <div className="space-y-2">
                <Label className="text-zinc-300 text-sm font-medium">Błonnik</Label>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <NumericInput
                      type="decimal"
                      value={dayMacros[day.id]?.fiberPerKg || 0}
                      onChange={(value) => onMacroChange(day.id, 'fiberPerKg', value)}
                      placeholder="0"
                      className="bg-zinc-800 border-zinc-700 text-zinc-100 placeholder:text-zinc-400 focus:border-[#a08032] w-full h-10 text-center"
                      showPlaceholderForZero={false}
                    />
                    <span className="text-zinc-400 text-xs min-w-[16px]">g</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Desktop: Oryginalny poziomy layout */}
            <div className="hidden md:block space-y-4">
              <div className="flex items-center gap-4 flex-wrap">
                <div className="w-24 text-zinc-300 text-sm font-medium">Białko</div>
                <div className="flex items-center gap-2">
                  <NumericInput
                    type="decimal"
                    value={dayMacros[day.id]?.proteinPercentage || 0}
                    onChange={(value) => onMacroChange(day.id, 'proteinPercentage', value)}
                    placeholder="np. 25"
                    className="bg-zinc-800 border-zinc-700 text-zinc-100 placeholder:text-zinc-400 focus:border-[#a08032] w-20 h-10 text-center"
                    showPlaceholderForZero={false}
                  />
                  <span className="text-zinc-400 text-sm">%</span>
                </div>
                <div className="flex items-center gap-2">
                  <NumericInput
                    type="decimal"
                    value={dayMacros[day.id]?.proteinPerKg || 0}
                    onChange={(value) => onMacroChange(day.id, 'proteinPerKg', value)}
                    placeholder="np. 150"
                    className="bg-zinc-800 border-zinc-700 text-zinc-100 placeholder:text-zinc-400 focus:border-[#a08032] w-20 h-10 text-center"
                    showPlaceholderForZero={false}
                  />
                  <span className="text-zinc-400 text-sm">gramów</span>
                  {(shouldShowArrow[day.id] || openPopover === `${day.id}-protein`) && (
                    <Popover open={openPopover === `${day.id}-protein`} onOpenChange={(open) => {
                      setOpenPopover(open ? `${day.id}-protein` : null);
                    }}>
                      <PopoverTrigger asChild>
                        <Button variant="ghost" size="sm" className="p-2 h-10 w-10 text-zinc-400 hover:text-zinc-300 hover:bg-zinc-700 touch-manipulation">
                          {(missingCalories[day.id] || 0) > 0 ? <ChevronDown className="h-5 w-5" /> : <ChevronUp className="h-5 w-5" />}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-2" side="bottom">
                        <Button
                          variant="ghost"
                          size="sm"
                          onPointerDown={() => handleApplySuggestion(day.id, 'protein')}
                          onClick={() => setOpenPopover(null)}
                          className="text-xs whitespace-nowrap hover:bg-zinc-700"
                        >
                          {(() => {
                            const missingCals = missingCalories[day.id] || 0;
                            const gramsNeeded = calculateMissingGramsForMacro(missingCals, 'protein');
                            const isDeficit = missingCals > 0;
                            return formatMacroSuggestionText(gramsNeeded, isDeficit);
                          })()}
                        </Button>
                      </PopoverContent>
                    </Popover>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-4 flex-wrap">
                <div className="w-24 text-zinc-300 text-sm font-medium">Tłuszcze</div>
                <div className="flex items-center gap-2">
                  <NumericInput
                    type="decimal"
                    value={dayMacros[day.id]?.fatPercentage || 0}
                    onChange={(value) => onMacroChange(day.id, 'fatPercentage', value)}
                    placeholder="np. 30"
                    className="bg-zinc-800 border-zinc-700 text-zinc-100 placeholder:text-zinc-400 focus:border-[#a08032] w-20 h-10 text-center"
                    showPlaceholderForZero={false}
                  />
                  <span className="text-zinc-400 text-sm">%</span>
                </div>
                <div className="flex items-center gap-2">
                  <NumericInput
                    type="decimal"
                    value={dayMacros[day.id]?.fatPerKg || 0}
                    onChange={(value) => onMacroChange(day.id, 'fatPerKg', value)}
                    placeholder="np. 70"
                    className="bg-zinc-800 border-zinc-700 text-zinc-100 placeholder:text-zinc-400 focus:border-[#a08032] w-20 h-10 text-center"
                    showPlaceholderForZero={false}
                  />
                  <span className="text-zinc-400 text-sm">gramów</span>
                  {(shouldShowArrow[day.id] || openPopover === `${day.id}-fat`) && (
                    <Popover open={openPopover === `${day.id}-fat`} onOpenChange={(open) => {
                      setOpenPopover(open ? `${day.id}-fat` : null);
                    }}>
                      <PopoverTrigger asChild>
                        <Button variant="ghost" size="sm" className="p-2 h-10 w-10 text-zinc-400 hover:text-zinc-300 hover:bg-zinc-700 touch-manipulation">
                          {(missingCalories[day.id] || 0) > 0 ? <ChevronDown className="h-5 w-5" /> : <ChevronUp className="h-5 w-5" />}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-2" side="bottom">
                        <Button
                          variant="ghost"
                          size="sm"
                          onPointerDown={() => handleApplySuggestion(day.id, 'fat')}
                          onClick={() => setOpenPopover(null)}
                          className="text-xs whitespace-nowrap hover:bg-zinc-700"
                        >
                          {(() => {
                            const missingCals = missingCalories[day.id] || 0;
                            const gramsNeeded = calculateMissingGramsForMacro(missingCals, 'fat');
                            const isDeficit = missingCals > 0;
                            return formatMacroSuggestionText(gramsNeeded, isDeficit);
                          })()}
                        </Button>
                      </PopoverContent>
                    </Popover>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-4 flex-wrap">
                <div className="w-24 text-zinc-300 text-sm font-medium">Węglowodany</div>
                <div className="flex items-center gap-2">
                  <NumericInput
                    type="decimal"
                    value={dayMacros[day.id]?.carbsPercentage || 0}
                    onChange={(value) => onMacroChange(day.id, 'carbsPercentage', value)}
                    placeholder="np. 45"
                    className="bg-zinc-800 border-zinc-700 text-zinc-100 placeholder:text-zinc-400 focus:border-[#a08032] w-20 h-10 text-center"
                    showPlaceholderForZero={false}
                  />
                  <span className="text-zinc-400 text-sm">%</span>
                </div>
                <div className="flex items-center gap-2">
                  <NumericInput
                    type="decimal"
                    value={dayMacros[day.id]?.carbsPerKg || 0}
                    onChange={(value) => onMacroChange(day.id, 'carbsPerKg', value)}
                    placeholder="np. 280"
                    className="bg-zinc-800 border-zinc-700 text-zinc-100 placeholder:text-zinc-400 focus:border-[#a08032] w-20 h-10 text-center"
                    showPlaceholderForZero={false}
                  />
                  <span className="text-zinc-400 text-sm">gramów</span>
                  {(shouldShowArrow[day.id] || openPopover === `${day.id}-carbs`) && (
                    <Popover open={openPopover === `${day.id}-carbs`} onOpenChange={(open) => {
                      setOpenPopover(open ? `${day.id}-carbs` : null);
                    }}>
                      <PopoverTrigger asChild>
                        <Button variant="ghost" size="sm" className="p-2 h-10 w-10 text-zinc-400 hover:text-zinc-300 hover:bg-zinc-700 touch-manipulation">
                          {(missingCalories[day.id] || 0) > 0 ? <ChevronDown className="h-5 w-5" /> : <ChevronUp className="h-5 w-5" />}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-2" side="bottom">
                        <Button
                          variant="ghost"
                          size="sm"
                          onPointerDown={() => handleApplySuggestion(day.id, 'carbs')}
                          onClick={() => setOpenPopover(null)}
                          className="text-xs whitespace-nowrap hover:bg-zinc-700"
                        >
                          {(() => {
                            const missingCals = missingCalories[day.id] || 0;
                            const gramsNeeded = calculateMissingGramsForMacro(missingCals, 'carbs');
                            const isDeficit = missingCals > 0;
                            return formatMacroSuggestionText(gramsNeeded, isDeficit);
                          })()}
                        </Button>
                      </PopoverContent>
                    </Popover>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-4 flex-wrap">
                <div className="w-24 text-zinc-300 text-sm font-medium">Błonnik</div>
                <div className="flex items-center gap-2">
                  <NumericInput
                    type="decimal"
                    value={dayMacros[day.id]?.fiberPerKg || 0}
                    onChange={(value) => onMacroChange(day.id, 'fiberPerKg', value)}
                    placeholder="np. 25"
                    className="bg-zinc-800 border-zinc-700 text-zinc-100 placeholder:text-zinc-400 focus:border-[#a08032] w-20 h-10 text-center"
                    showPlaceholderForZero={false}
                  />
                  <span className="text-zinc-400 text-sm">gramów</span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Day Management Section */}
      {onAddDay && (
        <div className="mt-8 p-4 bg-zinc-900 rounded-lg border border-zinc-700">
          <h4 className="font-medium text-zinc-100 text-lg mb-4">Zarządzanie Dniami</h4>
          <div className="flex items-center gap-3">
            <Input
              id="new-day-name"
              name="new-day-name"
              aria-label="Nazwa nowego dnia"
              type="text"
              value={newDayName}
              onChange={(e) => setNewDayName(e.target.value)}
              placeholder="Nazwa nowego dnia (np. Dzień treningowy nogi)"
              className="bg-zinc-800 border-zinc-700 text-zinc-100 placeholder:text-zinc-400 focus:border-[#a08032] flex-1"
              onKeyPress={(e) => e.key === 'Enter' && handleAddDay()}
            />
            <Button
              onClick={handleAddDay}
              disabled={!newDayName.trim()}
              className="bg-[#a08032] hover:bg-[#8a6e2b] text-zinc-100"
            >
              <Plus className="h-4 w-4 mr-2" />
              Dodaj Dzień
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

// Custom comparison function to prevent unnecessary re-renders
const areEqual = (prevProps: MacroPlanningProps, nextProps: MacroPlanningProps): boolean => {
  // Compare primitive props
  if (prevProps.dayPlans.length !== nextProps.dayPlans.length) {
    return false;
  }

  // Deep compare dayPlans array
  for (let i = 0; i < prevProps.dayPlans.length; i++) {
    const prevDay = prevProps.dayPlans[i];
    const nextDay = nextProps.dayPlans[i];
    if (prevDay.id !== nextDay.id || prevDay.name !== nextDay.name || prevDay.meals.length !== nextDay.meals.length) {
      return false;
    }
  }

  // Deep compare dayCalories object
  const prevCaloriesKeys = Object.keys(prevProps.dayCalories);
  const nextCaloriesKeys = Object.keys(nextProps.dayCalories);
  if (prevCaloriesKeys.length !== nextCaloriesKeys.length) {
    return false;
  }

  for (const key of prevCaloriesKeys) {
    if (prevProps.dayCalories[key] !== nextProps.dayCalories[key]) {
      return false;
    }
  }

  // Deep compare dayMacros object
  const prevMacrosKeys = Object.keys(prevProps.dayMacros);
  const nextMacrosKeys = Object.keys(nextProps.dayMacros);
  if (prevMacrosKeys.length !== nextMacrosKeys.length) {
    return false;
  }

  for (const key of prevMacrosKeys) {
    const prevMacro = prevProps.dayMacros[key];
    const nextMacro = nextProps.dayMacros[key];

    if (!prevMacro && !nextMacro) continue;
    if (!prevMacro || !nextMacro) {
      return false;
    }

    // Compare all macro fields
    if (prevMacro.calories !== nextMacro.calories ||
        prevMacro.proteinPercentage !== nextMacro.proteinPercentage ||
        prevMacro.proteinPerKg !== nextMacro.proteinPerKg ||
        prevMacro.fatPercentage !== nextMacro.fatPercentage ||
        prevMacro.fatPerKg !== nextMacro.fatPerKg ||
        prevMacro.carbsPercentage !== nextMacro.carbsPercentage ||
        prevMacro.carbsPerKg !== nextMacro.carbsPerKg ||
        prevMacro.fiberPerKg !== nextMacro.fiberPerKg) {
      return false;
    }
  }

  // Function props comparison (functions should be stable with useCallback)
  const functionsEqual = (
    prevProps.onDayCalorieChange === nextProps.onDayCalorieChange &&
    prevProps.onDayCalorieBlur === nextProps.onDayCalorieBlur &&
    prevProps.onMacroChange === nextProps.onMacroChange &&
    prevProps.onAddDay === nextProps.onAddDay &&
    prevProps.onRemoveDay === nextProps.onRemoveDay &&
    prevProps.onDayNameChange === nextProps.onDayNameChange
  );

  if (!functionsEqual) {
    return false;
  }

  // 🎯 FIX: Compare openPopover and setOpenPopover props!
  if (prevProps.openPopover !== nextProps.openPopover) {
    return false;
  }

  if (prevProps.setOpenPopover !== nextProps.setOpenPopover) {
    return false;
  }

  // 🎯 FIX: Compare result prop
  if (JSON.stringify(prevProps.result) !== JSON.stringify(nextProps.result)) {
    return false;
  }

  return true;
};

// Export memoized component
export const MacroPlanningSection = memo(MacroPlanningComponent, areEqual);
