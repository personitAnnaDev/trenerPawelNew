import { useState, useEffect, useRef, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NumericInput } from "@/components/ui/numeric-input";
import { Label } from "@/components/ui/label";
import { Calculator } from "lucide-react";
import { ActivityFactorSelector } from "./calorie-calculator/ActivityFactorSelector";
import { CalculatorResults } from "./calorie-calculator/CalculatorResults";
import { MacroPlanningSection } from "./calorie-calculator/MacroPlanningSection";
import { calculateGramsFromPercentageNum, calculatePercentageFromGramsNum } from "./calorie-calculator/utils";
import { createDietSnapshot } from "@/utils/clientStorage";
import { MacroPlanning, CalculatorResults as CalculatorResultsType } from "@/types/macro-planning";

interface DayPlan {
  id: string;
  name: string;
  meals: any[];
}

interface StepCalorieCalculatorProps {
  clientAge: number;
  clientGender: string;
  clientHeight: string;
  dayPlans?: DayPlan[];
  onDayCalorieChange?: (dayId: string, value: number) => void;
  onDayCalorieBlur?: (dayId: string, value: number, oldValue?: number) => void;
  onMacroChange?: (dayId: string, macros: MacroPlanning) => void;
  onWeightChange?: (weight: number) => void;
  onWeightBlur?: (weight: number, oldWeight?: number) => void;
  onResultsChange?: (results: CalculatorResultsType | null) => void;
  initialWeight?: number;
  initialActivityLevel?: number[];
  onActivityLevelChange?: (level: number[]) => void;
  initialDayCalories?: { [dayId: string]: number };
  initialDayMacros?: { [dayId: string]: MacroPlanning };
  onAddDay?: (dayName: string) => void;
  onRemoveDay?: (dayId: string) => void;
  onDayNameChange?: (dayId: string, newName: string) => void;
}

export const StepCalorieCalculator = ({
  clientAge,
  clientGender,
  clientHeight,
  dayPlans = [],
  onDayCalorieChange,
  onDayCalorieBlur,
  onMacroChange,
  onWeightChange,
  onWeightBlur,
  onResultsChange,
  initialWeight = 0,
  initialActivityLevel = [1.6],
  onActivityLevelChange,
  initialDayCalories = {},
  initialDayMacros = {},
  onAddDay,
  onRemoveDay,
  onDayNameChange
}: StepCalorieCalculatorProps) => {
  const [weight, setWeight] = useState(initialWeight);
  const [previousWeight, setPreviousWeight] = useState(initialWeight);
  const [activityLevel, setActivityLevel] = useState(initialActivityLevel);
  const [result, setResult] = useState<CalculatorResultsType | null>(null);
  const [dayCalories, setDayCalories] = useState<{ [dayId: string]: number }>(initialDayCalories);
  const [dayMacros, setDayMacros] = useState<{ [dayId: string]: MacroPlanning }>(initialDayMacros);
  const [previousDayCalories, setPreviousDayCalories] = useState<{ [dayId: string]: number }>(initialDayCalories);

  // 🎯 FIX: Move openPopover state here to survive MacroPlanningSection mount/unmount
  const [openPopover, setOpenPopover] = useState<string | null>(null);

  // 🎯 FIX Issue #1: useRef for dayCalories to avoid stale state in handleMacroFieldChange
  // Problem: setDayCalories hack caused stale calories when user typed grams before state updated
  const dayCaloriesRef = useRef<{ [dayId: string]: number }>(initialDayCalories);

  // Initialize weight - always sync with initialWeight prop
  useEffect(() => {
    setWeight(initialWeight);
    setPreviousWeight(initialWeight);
  }, [initialWeight]);

  // Update local state when initial props change (e.g., switching clients)
  useEffect(() => {
    setDayCalories(initialDayCalories);
    dayCaloriesRef.current = initialDayCalories; // 🎯 FIX Issue #1: Sync ref on init
  }, [initialDayCalories]);

  // 🎯 FIX Issue #1: Keep ref in sync with state for handleMacroFieldChange
  useEffect(() => {
    dayCaloriesRef.current = dayCalories;
  }, [dayCalories]);

  useEffect(() => {
    setDayMacros(initialDayMacros);
  }, [initialDayMacros]);

  // Notify parent of weight changes and auto-recalculate
  useEffect(() => {
    if (onWeightChange) {
      onWeightChange(weight);
    }
    // Auto-recalculate when weight changes
    if (weight && result) {
      calculateBMR();
    }
  }, [weight]); // ✅ Usunięto onWeightChange - przerywa pętlę re-renderów

  // Notify parent of activity level changes and auto-recalculate
  useEffect(() => {
    if (onActivityLevelChange) {
      onActivityLevelChange(activityLevel);
    }
    // Auto-recalculate when activity level changes
    if (weight && activityLevel) {
      calculateBMR();
    }
  }, [activityLevel]); // ✅ Usunięto onActivityLevelChange - przerywa pętlę re-renderów

  // Pass results to parent
  useEffect(() => {
    if (onResultsChange) {
      onResultsChange(result);
    }
  }, [result]); // ✅ Usunięto onResultsChange - przerywa pętlę re-renderów

  // Auto-calculate BMR/TDEE przy każdej zmianie danych wejściowych
  useEffect(() => {
    if (weight && clientHeight && activityLevel) {
      calculateBMR();
    }
  }, [weight, clientHeight, activityLevel, clientAge, clientGender]);

  const calculateBMR = () => {
    if (!weight || !clientHeight) return;

    const weightNum = weight;
    const heightNum = parseFloat(clientHeight);
    const age = clientAge;

    let bmr: number;

    // Wzór Harrisa-Benedicta
    if (clientGender === "mężczyzna") {
      bmr = 88.362 + (13.397 * weightNum) + (4.799 * heightNum) - (5.677 * age);
    } else {
      bmr = 447.593 + (9.247 * weightNum) + (3.098 * heightNum) - (4.330 * age);
    }

    const selectedActivityFactor = activityLevel[0];
    const totalCalories = bmr * selectedActivityFactor;

    const calculatedResult = {
      bmr: Math.round(bmr),
      tdee: Math.round(totalCalories)
    };

    setResult(calculatedResult);
  };

  const handleWeightChange = useCallback((value: number) => {
    setWeight(value);
  }, []);

  const handleWeightBlur = useCallback(() => {
    if (onWeightBlur && weight !== previousWeight) {
      onWeightBlur(weight, previousWeight);
      setPreviousWeight(weight);
    }
  }, [onWeightBlur, weight, previousWeight]);

  const handleActivityLevelChange = useCallback((level: number[]) => {
    setActivityLevel(level);
  }, []);

  const handleDayCalorieChange = useCallback((dayId: string, value: number) => {
    setDayCalories(prev => {
      // Save the previous value before updating
      setPreviousDayCalories(prevCalories => ({
        ...prevCalories,
        [dayId]: prev[dayId] || 0
      }));

      return {
        ...prev,
        [dayId]: value
      };
    });

    // 🎯 FIX: Recalculate percentages immediately when calories change
    // This fixes the stale closure bug - we use `value` directly (not from state)
    if (value > 0) {
      setDayMacros(prevMacros => {
        const macros = prevMacros[dayId];
        if (!macros) return prevMacros;

        const updatedMacros = { ...macros };
        let hasChanges = false;

        // Recalculate percentages from existing grams
        if (macros.proteinPerKg && macros.proteinPerKg > 0) {
          const newPercentage = calculatePercentageFromGramsNum(macros.proteinPerKg, value, 'protein');
          if (newPercentage !== macros.proteinPercentage) {
            updatedMacros.proteinPercentage = newPercentage;
            updatedMacros.proteinGrams = macros.proteinPerKg;
            hasChanges = true;
          }
        }

        if (macros.fatPerKg && macros.fatPerKg > 0) {
          const newPercentage = calculatePercentageFromGramsNum(macros.fatPerKg, value, 'fat');
          if (newPercentage !== macros.fatPercentage) {
            updatedMacros.fatPercentage = newPercentage;
            updatedMacros.fatGrams = macros.fatPerKg;
            hasChanges = true;
          }
        }

        if (macros.carbsPerKg && macros.carbsPerKg > 0) {
          const newPercentage = calculatePercentageFromGramsNum(macros.carbsPerKg, value, 'carbs');
          if (newPercentage !== macros.carbsPercentage) {
            updatedMacros.carbsPercentage = newPercentage;
            updatedMacros.carbsGrams = macros.carbsPerKg;
            hasChanges = true;
          }
        }

        if (macros.fiberPerKg && macros.fiberPerKg > 0) {
          updatedMacros.fiberGrams = macros.fiberPerKg;
        }

        if (hasChanges && onMacroChange) {
          onMacroChange(dayId, updatedMacros);
        }

        return hasChanges ? { ...prevMacros, [dayId]: updatedMacros } : prevMacros;
      });
    }

    if (onDayCalorieChange) {
      onDayCalorieChange(dayId, value);
    }
  }, [onDayCalorieChange, onMacroChange]);

  const handleMacroChange = useCallback((dayId: string, field: keyof MacroPlanning, value: number, calories: number) => {
    // Use functional form to access current state without dependencies
    setDayMacros(prevMacros => {
      const currentMacros: MacroPlanning = prevMacros[dayId] || {
        calories: 0,
        proteinPercentage: 0,
        proteinPerKg: 0,
        proteinGrams: 0,
        fatPercentage: 0,
        fatPerKg: 0,
        fatGrams: 0,
        carbsPercentage: 0,
        carbsPerKg: 0,
        carbsGrams: 0,
        fiberPerKg: 0,
        fiberGrams: 0
      };

      const updatedMacros: MacroPlanning = {
        ...currentMacros,
        [field]: value
      };

      // Handle bidirectional conversion using passed calories parameter
      // 🔧 FIX: Use !== undefined check to allow 0 values
      // 🎯 SYNC: Always keep *PerKg and *Grams in sync (they're the same value, different names)
      if (field === 'proteinPercentage' && value !== undefined && value !== null && calories) {
        const grams = calculateGramsFromPercentageNum(value, calories, 'protein');
        updatedMacros.proteinPerKg = grams;
        updatedMacros.proteinGrams = grams;
      } else if (field === 'proteinPerKg' && value !== undefined && value !== null && calories) {
        updatedMacros.proteinPercentage = calculatePercentageFromGramsNum(value, calories, 'protein');
        updatedMacros.proteinGrams = value;
      } else if (field === 'proteinGrams' && value !== undefined && value !== null && calories) {
        updatedMacros.proteinPercentage = calculatePercentageFromGramsNum(value, calories, 'protein');
        updatedMacros.proteinPerKg = value;
      } else if (field === 'fatPercentage' && value !== undefined && value !== null && calories) {
        const grams = calculateGramsFromPercentageNum(value, calories, 'fat');
        updatedMacros.fatPerKg = grams;
        updatedMacros.fatGrams = grams;
      } else if (field === 'fatPerKg' && value !== undefined && value !== null && calories) {
        updatedMacros.fatPercentage = calculatePercentageFromGramsNum(value, calories, 'fat');
        updatedMacros.fatGrams = value;
      } else if (field === 'fatGrams' && value !== undefined && value !== null && calories) {
        updatedMacros.fatPercentage = calculatePercentageFromGramsNum(value, calories, 'fat');
        updatedMacros.fatPerKg = value;
      } else if (field === 'carbsPercentage' && value !== undefined && value !== null && calories) {
        const grams = calculateGramsFromPercentageNum(value, calories, 'carbs');
        updatedMacros.carbsPerKg = grams;
        updatedMacros.carbsGrams = grams;
      } else if (field === 'carbsPerKg' && value !== undefined && value !== null && calories) {
        updatedMacros.carbsPercentage = calculatePercentageFromGramsNum(value, calories, 'carbs');
        updatedMacros.carbsGrams = value;
      } else if (field === 'carbsGrams' && value !== undefined && value !== null && calories) {
        updatedMacros.carbsPercentage = calculatePercentageFromGramsNum(value, calories, 'carbs');
        updatedMacros.carbsPerKg = value;
      } else if (field === 'fiberPerKg' && value !== undefined && value !== null) {
        updatedMacros.fiberGrams = value;
      } else if (field === 'fiberGrams' && value !== undefined && value !== null) {
        updatedMacros.fiberPerKg = value;
      }

      if (onMacroChange) {
        onMacroChange(dayId, updatedMacros);
      }

      return {
        ...prevMacros,
        [dayId]: updatedMacros
      };
    });
  }, [onMacroChange]);

  // Wrapper function for MacroPlanningSection - converts field/value calls to handleMacroChange with calories
  // 🎯 FIX Issue #1: Use useRef to get current calories (avoids stale state from setState hack)
  const handleMacroFieldChange = useCallback((dayId: string, field: keyof MacroPlanning, value: number) => {
    // Read calories from ref (always current, no stale state issues)
    const calories = dayCaloriesRef.current[dayId] || 0;
    handleMacroChange(dayId, field, value, calories);
  }, [handleMacroChange]);

  // Handle calorie blur - notify parent component
  // Note: Percentage recalculation now happens in handleDayCalorieChange (fixes stale closure bug)
  const handleDayCalorieBlur = useCallback((dayId: string, value: number, oldValue?: number) => {
    const previousValue = oldValue || previousDayCalories[dayId] || 0;

    if (onDayCalorieBlur) {
      onDayCalorieBlur(dayId, value, previousValue);
    }
  }, [previousDayCalories, onDayCalorieBlur]);


  return (
    <Card className="bg-zinc-900 border-zinc-800">
      <CardHeader>
        <CardTitle className="text-zinc-100 text-sm sm:text-base">
          <span className="sm:hidden">Kalkulator Kalorii</span>
          <span className="hidden sm:inline">Kalkulator Kalorii (Wzór Harrisa-Benedicta)</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="step-calc-age" className="text-zinc-100">Wiek</Label>
            <Input id="step-calc-age" value={`${clientAge} lat`} disabled className="bg-zinc-700 text-zinc-300 border-zinc-600" />
          </div>
          <div>
            <Label htmlFor="step-calc-gender" className="text-zinc-100">Płeć</Label>
            <Input id="step-calc-gender" value={clientGender} disabled className="bg-zinc-700 text-zinc-300 border-zinc-600" />
          </div>
          <div>
            <Label htmlFor="step-calc-height" className="text-zinc-100">Wzrost</Label>
            <Input id="step-calc-height" value={`${parseFloat(clientHeight).toLocaleString('pl-PL')} cm`} disabled className="bg-zinc-700 text-zinc-300 border-zinc-600" />
          </div>
          <div>
            <Label htmlFor="step-calc-weight" className="text-zinc-100">Aktualna/docelowa waga (kg)</Label>
            <NumericInput
              id="step-calc-weight"
              name="step-calc-weight"
              type="decimal"
              value={weight}
              onChange={handleWeightChange}
              onBlur={handleWeightBlur}
              placeholder="np. 70,5"
              className="bg-zinc-800 border-zinc-700 text-zinc-100 placeholder:text-zinc-400 focus:border-[#a08032] focus:bg-zinc-700"
              showPlaceholderForZero={true}
            />
          </div>
        </div>

        <ActivityFactorSelector
          activityLevel={activityLevel}
          onActivityLevelChange={handleActivityLevelChange}
        />

        {weight > 0 ? (
          <>
            {/* 🎯 FIX: Always render MacroPlanningSection for stability */}
            {result && <CalculatorResults result={result} />}

            <div className="mt-6">
              <h3 className="text-lg font-semibold text-zinc-100 mb-2">Planowanie Makroskładników</h3>
              <p className="text-sm text-zinc-300 mb-4">
                Ustaw docelowe wartości makroskładników dla każdego typu dnia dla jadłospisu klienta
              </p>
            </div>

            <MacroPlanningSection
              dayPlans={dayPlans}
              dayCalories={dayCalories}
              dayMacros={dayMacros}
              onDayCalorieChange={handleDayCalorieChange}
              onDayCalorieBlur={handleDayCalorieBlur}
              onMacroChange={handleMacroFieldChange}
              onAddDay={onAddDay}
              onRemoveDay={onRemoveDay}
              onDayNameChange={onDayNameChange}
              openPopover={openPopover}
              setOpenPopover={setOpenPopover}
              result={result}
            />
          </>
        ) : (
          <div className="mt-6 bg-zinc-800 border border-zinc-700 rounded-lg p-4 text-center">
            <p className="text-zinc-300 text-sm">
              Aby zaplanować makroskładniki wpisz aktualną/docelową wagę klienta
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
