import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Sparkles, Loader2 } from "lucide-react";
import { useAIOptimization } from "@/hooks/useAIOptimization";
import { toast } from "@/components/ui/use-toast";
import { parseDecimal } from "@/utils/numberParser";

type MacroTotals = {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber?: number;
};

interface MacroIngredientTableProps {
  currentTotals: MacroTotals;
  onMacroChange: (macroKey: "protein" | "carbs" | "fat", targetValue: number) => void;
  ingredients?: any[];
  products?: any[];
  mealName?: string;
  dayPlanId?: string;
}

const MacroIngredientTable = ({
  currentTotals,
  onMacroChange,
  ingredients = [],
  products = [],
  mealName = "",
  dayPlanId = ""
}: MacroIngredientTableProps) => {
  const [localValues, setLocalValues] = useState({
    protein: currentTotals.protein === 0 ? "" : currentTotals.protein.toString(),
    carbs: currentTotals.carbs === 0 ? "" : currentTotals.carbs.toString(),
    fat: currentTotals.fat === 0 ? "" : currentTotals.fat.toString()
  });

  useEffect(() => {
    setLocalValues({
      protein: currentTotals.protein === 0 ? "" : currentTotals.protein.toString(),
      carbs: currentTotals.carbs === 0 ? "" : currentTotals.carbs.toString(),
      fat: currentTotals.fat === 0 ? "" : currentTotals.fat.toString()
    });
  }, [currentTotals]);

  const triggerMacroChange = () => {
    const parsedValues = {
      protein: parseDecimal(localValues.protein) || 0,
      carbs: parseDecimal(localValues.carbs) || 0,
      fat: parseDecimal(localValues.fat) || 0
    };
    if (parsedValues.protein > 0 && parsedValues.carbs > 0 && parsedValues.fat > 0) {
      onMacroChange("protein", parsedValues.protein);
      onMacroChange("carbs", parsedValues.carbs);
      onMacroChange("fat", parsedValues.fat);
    }
  };

  const handleMacroInputChange = (field: "protein" | "carbs" | "fat", value: string) => {
    // Update local state only - no automatic recalculation
    setLocalValues(prev => ({ ...prev, [field]: value }));
  };

  // AI Optimization Hook
  const {
    optimize,
    isOptimizing,
    result,
    error,
    reset: resetAI
  } = useAIOptimization();

  const hasEmptyMacros =
    (parseDecimal(localValues.protein) || 0) === 0 ||
    (parseDecimal(localValues.carbs) || 0) === 0 ||
    (parseDecimal(localValues.fat) || 0) === 0;

  const handleAIOptimization = () => {

    const targetMacros = {
      protein: parseDecimal(localValues.protein) || 0,
      fat: parseDecimal(localValues.fat) || 0,
      carbs: parseDecimal(localValues.carbs) || 0
    };


    if (targetMacros.protein === 0 || targetMacros.fat === 0 || targetMacros.carbs === 0) {
      toast({
        title: "Błąd optymalizacji",
        description: "Wprowadź wszystkie wartości makroskładników przed optymalizacją AI",
        variant: "destructive"
      });
      return;
    }

    // Check if there are ingredients to optimize
    if (!ingredients || ingredients.length === 0) {
      toast({
        title: "Brak składników",
        description: "Dodaj przynajmniej jeden składnik przed optymalizacją AI",
        variant: "destructive"
      });
      return;
    }


    // Convert ingredients to AI format
    const currentIngredients = ingredients.map(ing => ({
      id: ing.ingredient_id || ing.id || '',
      name: ing.name,
      quantity: ing.quantity,
      unit: ing.unit,
      calories: ing.calories,
      protein: ing.protein,
      fat: ing.fat,
      carbs: ing.carbs,
      fiber: ing.fiber
    }));


    if (currentIngredients.length === 0) {
      toast({
        title: "Błąd składników",
        description: "Nie można przetworzyć składników do optymalizacji",
        variant: "destructive"
      });
      return;
    }

    const optimizationRequest = {
      meal_name: mealName || "Optymalizacja makroskładników",
      target_macros: targetMacros,
      current_ingredients: currentIngredients,
      context: {
        template_id: undefined,
        day_plan_id: dayPlanId,
        client_id: undefined
      }
    };

    
    // Call AI optimization with real ingredients
    optimize(optimizationRequest);
  };

  const handleProportionalRecalculation = () => {
    const parsedValues = {
      protein: Number(localValues.protein) || 0,
      carbs: Number(localValues.carbs) || 0,
      fat: Number(localValues.fat) || 0
    };
    
    if (parsedValues.protein === 0 && parsedValues.carbs === 0 && parsedValues.fat === 0) {
      toast({
        title: "Brak wartości",
        description: "Wprowadź przynajmniej jedną wartość makroskładnika",
        variant: "destructive"
      });
      return;
    }

    // Call parent callback for each macro that has a value
    if (parsedValues.protein > 0) {
      onMacroChange("protein", parsedValues.protein);
    }
    if (parsedValues.carbs > 0) {
      onMacroChange("carbs", parsedValues.carbs);
    }
    if (parsedValues.fat > 0) {
      onMacroChange("fat", parsedValues.fat);
    }

    toast({
      title: "Przeliczono proporcjonalnie",
      description: "Składniki zostały dostosowane do wprowadzonych wartości makroskładników",
      variant: "default"
    });
  };

  return (
    <div className="space-y-3">
      {/* Ultra-kompaktowa tabela makroskładników */}
      <div>
        <h4 className="text-zinc-300 font-medium mb-2 text-sm">Makroskładniki</h4>
        <div className="bg-zinc-800 rounded-lg border border-zinc-700 overflow-hidden">
          {/* Header */}
          <div className="grid grid-cols-6 gap-2 p-3 bg-zinc-700 text-zinc-300 text-sm font-medium">
            <div></div>
            <div className="text-center">Kalorie</div>
            <div className="text-center">Białko</div>
            <div className="text-center">Węgl.</div>
            <div className="text-center">Tłuszcze</div>
            <div></div>
          </div>
          
          {/* Aktualne wartości (read-only) */}
          <div className="grid grid-cols-6 gap-2 p-3 border-b border-zinc-700">
            <div className="flex items-center text-zinc-300 text-sm font-medium">Aktualne</div>
            <div className="flex items-center justify-center px-2 py-1 text-zinc-300 text-center text-sm">
              {Math.round(currentTotals.calories)}
            </div>
            <div className="flex items-center justify-center px-2 py-1 text-zinc-300 text-center text-sm">
              {currentTotals.protein.toLocaleString('pl-PL', { maximumFractionDigits: 1 })}g
            </div>
            <div className="flex items-center justify-center px-2 py-1 text-zinc-300 text-center text-sm">
              {currentTotals.carbs.toLocaleString('pl-PL', { maximumFractionDigits: 1 })}g
            </div>
            <div className="flex items-center justify-center px-2 py-1 text-zinc-300 text-center text-sm">
              {currentTotals.fat.toLocaleString('pl-PL', { maximumFractionDigits: 1 })}g
            </div>
            <div></div>
          </div>
          
          {/* Docelowe wartości (editable) */}
          <div className="grid grid-cols-6 gap-2 p-3">
            <div className="flex items-center text-zinc-300 text-sm font-medium">Docelowe</div>
            <div className="flex items-center justify-center text-zinc-500 text-sm">---</div>
            
            {/* Protein Input */}
            <div className="relative">
              <input
                type="text"
                inputMode="decimal"
                value={localValues.protein}
                onChange={e => handleMacroInputChange("protein", e.target.value)}
                className="bg-zinc-800 border border-zinc-600 text-zinc-100 text-center text-sm h-8 pr-4 rounded w-full focus:outline-none focus:border-[#a08032] focus:ring-1 focus:ring-[#a08032]"
                placeholder="15"
                onFocus={e => e.target.select()}
              />
              <span className="absolute right-1 top-1/2 transform -translate-y-1/2 text-zinc-400 text-xs pointer-events-none">g</span>
            </div>
            
            {/* Carbs Input */}
            <div className="relative">
              <input
                type="text"
                inputMode="decimal"
                value={localValues.carbs}
                onChange={e => handleMacroInputChange("carbs", e.target.value)}
                className="bg-zinc-800 border border-zinc-600 text-zinc-100 text-center text-sm h-8 pr-4 rounded w-full focus:outline-none focus:border-[#a08032] focus:ring-1 focus:ring-[#a08032]"
                placeholder="30"
                onFocus={e => e.target.select()}
              />
              <span className="absolute right-1 top-1/2 transform -translate-y-1/2 text-zinc-400 text-xs pointer-events-none">g</span>
            </div>
            
            {/* Fat Input */}
            <div className="relative">
              <input
                type="text"
                inputMode="decimal"
                value={localValues.fat}
                onChange={e => handleMacroInputChange("fat", e.target.value)}
                className="bg-zinc-800 border border-zinc-600 text-zinc-100 text-center text-sm h-8 pr-4 rounded w-full focus:outline-none focus:border-[#a08032] focus:ring-1 focus:ring-[#a08032]"
                placeholder="8"
                onFocus={e => e.target.select()}
              />
              <span className="absolute right-1 top-1/2 transform -translate-y-1/2 text-zinc-400 text-xs pointer-events-none">g</span>
            </div>
            
            <div></div>
          </div>
          
          {/* Action buttons */}
          <div className="p-3 pt-0">
            <div className="grid grid-cols-2 gap-3">
              <Button
                type="button"
                onClick={handleAIOptimization}
                disabled={isOptimizing || hasEmptyMacros}
                className="bg-gradient-to-r from-[#a08032] to-[#e6d280] hover:from-[#8a6c2b] hover:to-[#d4c06b] text-zinc-900 font-medium px-2 py-1.5 w-full text-xs"
              >
                {isOptimizing ? (
                  <>
                    <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                    AI...
                  </>
                ) : (
                  "Zastosuj AI"
                )}
              </Button>
              {/*
              <Button
                type="button"
                onClick={handleProportionalRecalculation}
                disabled={hasEmptyMacros}
                variant="outline"
                className="border-zinc-600 text-zinc-200 hover:bg-zinc-700 hover:text-zinc-100 px-2 py-1.5 w-full text-xs"
              >
                Przelicz proporcjonalnie
              </Button>
              */}
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
                className="border-zinc-600 text-zinc-200 hover:bg-zinc-700 hover:text-zinc-100 px-2 py-1.5 w-full text-xs"
              >
                Resetuj
              </Button>
            </div>
          </div>

          {hasEmptyMacros && (
            <div className="px-3 pb-3">
              <div className="bg-amber-500/10 border border-amber-500/20 rounded-md p-2">
                <p className="text-amber-400 text-xs text-center">
                  Uzupełnij przynajmniej jedną wartość makroskładnika do przeliczenia.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MacroIngredientTable;
