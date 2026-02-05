import React, { useCallback } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle, XCircle, AlertTriangle, Sparkles, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { AIOptimizationResponse } from "@/services/aiOptimizationService";
import { SelectedIngredient } from "@/components/IngredientSelector";
import { formatIngredientQuantity } from "@/utils/formatIngredients";
import { useModalConfirmation } from "@/hooks/useModalConfirmation";

// Formatowanie liczb z przecinkiem jako separator dziesiętny
function formatPLNumber(value: number | string): string {
  if (value === "" || value === null || value === undefined) return "";
  const num = typeof value === "string" ? parseFloat(value.replace(",", ".")) : value;
  // Support 2 decimal places for quarter pieces (0.25, 0.75) and precise macro values
  return isNaN(num) ? "" : num.toLocaleString("pl-PL", { maximumFractionDigits: 2 });
}

interface AIResultsModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  result: AIOptimizationResponse['data'] | null;
  currentIngredients: SelectedIngredient[];
  targetMacros: { protein: number; fat: number; carbs: number };
  onAccept: (optimizedIngredients: SelectedIngredient[]) => void;
  onReject: () => void;
  products?: Array<{
    id: string;
    name: string;
    unit: string;
    unit_weight: number;
    calories: number;
    protein: number;
    fat: number;
    carbs: number;
    fiber: number;
  }>;
}

const AIResultsModal = ({
  isOpen,
  onOpenChange,
  result,
  currentIngredients,
  targetMacros,
  onAccept,
  onReject,
  products = []
}: AIResultsModalProps) => {

  // Function to check if there are unsaved changes
  const hasUnsavedChanges = useCallback(() => {
    return true; // Always require confirmation
  }, []);

  // Confirmation modal hook
  const { handleClose: handleConfirmationClose, confirmationDialog } = useModalConfirmation({
    title: "Zamknąć wyniki AI?",
    message: "Czy na pewno chcesz zamknąć okno z propozycjami optymalizacji AI?",
    hasUnsavedChanges,
    onDiscard: () => {
      onOpenChange(false);
    }
  });

  if (!result) return null;

  // Helper function to get achievement color
  const getAchievementColor = (achievement: number) => {
    if (achievement >= 95 && achievement <= 105) return "text-green-500";
    if (achievement >= 85 && achievement <= 115) return "text-yellow-500";
    return "text-red-500";
  };

  // Helper function to get feasibility color
  const getFeasibilityColor = (feasibility: string) => {
    switch (feasibility) {
      case 'high': return "text-green-500";
      case 'medium': return "text-yellow-500";
      case 'low': return "text-red-500";
      default: return "text-gray-500";
    }
  };

  // Helper function to get feasibility text
  const getFeasibilityText = (feasibility: string) => {
    switch (feasibility) {
      case 'high': return "Wysoka";
      case 'medium': return "Średnia";
      case 'low': return "Niska";
      default: return "Nieznana";
    }
  };

  // Convert AI optimized ingredients to SelectedIngredient format
  // IMPORTANT: AI should only modify quantities, never remove ingredients
  const convertAIResultToSelectedIngredients = (): SelectedIngredient[] => {
    // Start with current ingredients to preserve all of them
    const updatedIngredients = currentIngredients.map((ingredient, index) => {
      // Find AI suggestion for this ingredient
      const aiSuggestion = result.optimized_ingredients.find(
        ai => ai.id === ingredient.productId
      );
      
      if (aiSuggestion) {
        // Create NEW ingredient object with updated quantity and FORCE NEW ID
        return {
          ...ingredient,
          id: `ai_updated_${Date.now()}_${index}_${Math.random()}`, // Force new ID for React rerender
          quantity: aiSuggestion.quantity,
          unit: aiSuggestion.unit
        };
      } else {
        // Keep ingredient unchanged but with new ID to force rerender
        return {
          ...ingredient,
          id: `ai_unchanged_${Date.now()}_${index}_${Math.random()}`
        };
      }
    });
    
    // Add any completely new ingredients AI suggests
    result.optimized_ingredients.forEach((aiIngredient) => {
      const existsInCurrent = currentIngredients.find(
        ingredient => ingredient.productId === aiIngredient.id
      );
      
      if (!existsInCurrent) {
        const product = products.find(p => p.id === aiIngredient.id);
        if (product) {
          updatedIngredients.push({
            id: `ai_new_${Date.now()}_${Math.random()}`,
            productId: aiIngredient.id,
            nazwa: aiIngredient.name,
            quantity: aiIngredient.quantity,
            unit: aiIngredient.unit,
            unit_weight: product.unit_weight || 100
          });
        }
      }
    });
    
    return updatedIngredients;
  };

  // Handle accept changes
  const handleAccept = () => {
    const optimizedIngredients = convertAIResultToSelectedIngredients();
    onAccept(optimizedIngredients);
    handleConfirmationClose(true); // Force close after accepting
  };

  // Handle reject changes
  const handleReject = () => {
    onReject();
    handleConfirmationClose(true); // Force close after rejecting
  };

  // Calculate current totals
  const calculateCurrentTotals = () => {
    return currentIngredients.reduce((totals, ingredient) => {
      // 🎯 CRITICAL FIX: Use pre-calculated macros from AI if available
      // Check if ingredient has meaningful pre-calculated macros (not all zeros)
      const hasMeaningfulMacros = ingredient.calories !== undefined &&
          ingredient.protein !== undefined &&
          ingredient.fat !== undefined &&
          ingredient.carbs !== undefined &&
          (ingredient.calories > 0 || ingredient.protein > 0 ||
           ingredient.fat > 0 || ingredient.carbs > 0);

      if (hasMeaningfulMacros) {
        return {
          calories: totals.calories + ingredient.calories,
          protein: totals.protein + ingredient.protein,
          fat: totals.fat + ingredient.fat,
          carbs: totals.carbs + ingredient.carbs,
          fiber: totals.fiber + (ingredient.fiber || 0)
        };
      }

      const product = products.find(p => p.id === ingredient.productId);
      if (!product) return totals;

      let grams = 0;
      if (ingredient.unit === "gramy" || ingredient.unit === "g") {
        grams = ingredient.quantity;
      } else if (ingredient.unit === "mililitry" || ingredient.unit === "ml") {
        grams = (ingredient.quantity / 100) * (product.unit_weight || 100);
      } else {
        grams = ingredient.quantity * (product.unit_weight || 100);
      }

      const multiplier = grams / 100;

      return {
        calories: totals.calories + ((product.calories || 0) * multiplier),
        protein: totals.protein + ((product.protein || 0) * multiplier),
        fat: totals.fat + ((product.fat || 0) * multiplier),
        carbs: totals.carbs + ((product.carbs || 0) * multiplier),
        fiber: totals.fiber + ((product.fiber || 0) * multiplier)
      };
    }, { calories: 0, protein: 0, fat: 0, carbs: 0, fiber: 0 });
  };

  const currentTotals = calculateCurrentTotals();

  return (
    <>
      <Dialog open={isOpen} onOpenChange={handleConfirmationClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-zinc-900 border-zinc-700">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-zinc-100">
            <Sparkles className="h-5 w-5 text-[#a08032]" />
            Propozycja optymalizacji AI
          </DialogTitle>
          <DialogDescription className="text-zinc-400">
            Przeglądnij sugerowane zmiany w składnikach aby osiągnąć docelowe makroskładniki
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* AI Comment Section */}
          <Card className="bg-zinc-800 border-zinc-700">
            <CardHeader>
              <CardTitle className="text-zinc-200 text-sm flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-[#a08032]" />
                Komentarz AI
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-zinc-300 text-sm leading-relaxed">{result.ai_comment}</p>
            </CardContent>
          </Card>

          {/* Macro Comparison Section */}
          <Card className="bg-zinc-800 border-zinc-700">
            <CardHeader>
              <CardTitle className="text-zinc-200 text-sm">Porównanie makroskładników</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-zinc-700">
                      <th className="text-left text-zinc-400 font-medium py-2">Makroskładnik</th>
                      <th className="text-center text-zinc-400 font-medium py-2">Aktualne</th>
                      <th className="text-center text-zinc-400 font-medium py-2">Docelowe</th>
                      <th className="text-center text-zinc-400 font-medium py-2">Proponowane</th>
                      <th className="text-center text-zinc-400 font-medium py-2">Osiągnięcie</th>
                    </tr>
                  </thead>
                  <tbody>
                    {/* Calories */}
                    <tr className="border-b border-zinc-700/50">
                      <td className="py-3 text-zinc-300 font-medium">Kalorie</td>
                      <td className="text-center text-zinc-300">{formatPLNumber(currentTotals.calories)} kcal</td>
                      <td className="text-center text-zinc-300">---</td>
                      <td className="text-center text-zinc-300">{formatPLNumber(result.macro_summary.total_calories)} kcal</td>
                      <td className="text-center">
                        {result.comparison.calorie_difference !== 0 && (
                          <div className="flex items-center justify-center gap-1">
                            {result.comparison.calorie_difference > 0 ? (
                              <TrendingUp className="h-3 w-3 text-green-500" />
                            ) : (
                              <TrendingDown className="h-3 w-3 text-red-500" />
                            )}
                            <span className={result.comparison.calorie_difference > 0 ? "text-green-500" : "text-red-500"}>
                              {result.comparison.calorie_difference > 0 ? "+" : ""}{formatPLNumber(result.comparison.calorie_difference)}
                            </span>
                          </div>
                        )}
                        {result.comparison.calorie_difference === 0 && (
                          <Minus className="h-3 w-3 text-zinc-500 mx-auto" />
                        )}
                      </td>
                    </tr>
                    
                    {/* Protein */}
                    <tr className="border-b border-zinc-700/50">
                      <td className="py-3 text-zinc-300 font-medium">Białko</td>
                      <td className="text-center text-zinc-300">{formatPLNumber(currentTotals.protein)}g</td>
                      <td className="text-center text-[#a08032] font-medium">{formatPLNumber(targetMacros.protein)}g</td>
                      <td className="text-center text-zinc-300">{formatPLNumber(result.macro_summary.total_protein)}g</td>
                      <td className="text-center">
                        <span className={getAchievementColor(result.comparison.target_achievement.protein_achievement)}>
                          {formatPLNumber(result.comparison.target_achievement.protein_achievement)}%
                        </span>
                      </td>
                    </tr>

                    {/* Fat */}
                    <tr className="border-b border-zinc-700/50">
                      <td className="py-3 text-zinc-300 font-medium">Tłuszcze</td>
                      <td className="text-center text-zinc-300">{formatPLNumber(currentTotals.fat)}g</td>
                      <td className="text-center text-[#a08032] font-medium">{formatPLNumber(targetMacros.fat)}g</td>
                      <td className="text-center text-zinc-300">{formatPLNumber(result.macro_summary.total_fat)}g</td>
                      <td className="text-center">
                        <span className={getAchievementColor(result.comparison.target_achievement.fat_achievement)}>
                          {formatPLNumber(result.comparison.target_achievement.fat_achievement)}%
                        </span>
                      </td>
                    </tr>

                    {/* Carbs */}
                    <tr className="border-b border-zinc-700/50">
                      <td className="py-3 text-zinc-300 font-medium">Węglowodany</td>
                      <td className="text-center text-zinc-300">{formatPLNumber(currentTotals.carbs)}g</td>
                      <td className="text-center text-[#a08032] font-medium">{formatPLNumber(targetMacros.carbs)}g</td>
                      <td className="text-center text-zinc-300">{formatPLNumber(result.macro_summary.total_carbs)}g</td>
                      <td className="text-center">
                        <span className={getAchievementColor(result.comparison.target_achievement.carbs_achievement)}>
                          {formatPLNumber(result.comparison.target_achievement.carbs_achievement)}%
                        </span>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* Ingredients Comparison */}
          <Card className="bg-zinc-800 border-zinc-700">
            <CardHeader>
              <CardTitle className="text-zinc-200 text-sm">Porównanie składników (tylko ilości)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {currentIngredients.map((currentIngredient, index) => {
                  // Find corresponding AI suggestion
                  const aiSuggestion = result.optimized_ingredients.find(
                    ai => ai.id === currentIngredient.productId
                  );
                  
                  const hasChange = aiSuggestion && aiSuggestion.quantity !== currentIngredient.quantity;
                  
                  return (
                    <div
                      key={index}
                      className={`flex items-center justify-between rounded px-3 py-2 ${
                        hasChange
                          ? 'bg-amber-500/10 border border-amber-500/20'
                          : 'bg-zinc-700/50 border border-zinc-600/50'
                      }`}
                    >
                      <span className="text-zinc-300 text-sm font-medium">
                        {currentIngredient.nazwa}
                      </span>
                      <div className="flex items-center gap-3">
                        <span className={`text-sm ${hasChange ? 'text-red-400' : 'text-zinc-400'}`}>
                          {formatIngredientQuantity(currentIngredient.quantity, currentIngredient.unit)}
                        </span>
                        {hasChange && (
                          <>
                            <span className="text-zinc-500">→</span>
                            <span className="text-green-400 text-sm font-medium">
                              {formatIngredientQuantity(aiSuggestion.quantity, aiSuggestion.unit)}
                            </span>
                          </>
                        )}
                        {!hasChange && (
                          <span className="text-xs text-zinc-500">bez zmian</span>
                        )}
                      </div>
                    </div>
                  );
                })}
                
                {/* Show any new ingredients AI suggests */}
                {result.optimized_ingredients
                  .filter(aiIngredient => !currentIngredients.find(curr => curr.productId === aiIngredient.id))
                  .map((newIngredient, index) => (
                    <div key={`new-${index}`} className="flex items-center justify-between bg-green-500/10 border border-green-500/20 rounded px-3 py-2">
                      <div className="flex-1">
                        <span className="text-zinc-300 text-sm font-medium">
                          {newIngredient.name}
                        </span>
                        <p className="text-green-400 text-xs mt-1">
                          Nowy składnik dodany przez AI
                        </p>
                      </div>
                      <span className="text-green-400 text-sm font-medium">
                        {formatIngredientQuantity(newIngredient.quantity, newIngredient.unit)}
                      </span>
                    </div>
                  ))}
              </div>
            </CardContent>
          </Card>

          {/* Achievability Assessment */}
          <Card className="bg-zinc-800 border-zinc-700">
            <CardHeader>
              <CardTitle className="text-zinc-200 text-sm">Ocena osiągalności</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4 mb-3">
                <div className="flex items-center gap-2">
                  <span className="text-zinc-400 text-sm">Ogólny wynik:</span>
                  <Badge variant="outline" className="border-zinc-600">
                    {result.achievability.overall_score}/100
                  </Badge>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-zinc-400 text-sm">Wykonalność:</span>
                  <Badge 
                    variant="outline" 
                    className={`border-zinc-600 ${getFeasibilityColor(result.achievability.feasibility)}`}
                  >
                    {getFeasibilityText(result.achievability.feasibility)}
                  </Badge>
                </div>
              </div>
              
              {result.achievability.main_challenges.length > 0 && (
                <div>
                  <h5 className="text-zinc-400 text-sm mb-2 flex items-center gap-2">
                    <AlertTriangle className="h-3 w-3" />
                    Główne wyzwania:
                  </h5>
                  <ul className="space-y-1">
                    {result.achievability.main_challenges.map((challenge, index) => (
                      <li key={index} className="text-zinc-300 text-sm flex items-start gap-2">
                        <span className="text-zinc-500 mt-1">•</span>
                        <span>{challenge}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end gap-3 pt-4 border-t border-zinc-700">
          <Button
            variant="outline"
            onClick={handleReject}
            className="border-zinc-600 text-zinc-200 hover:bg-zinc-700"
          >
            Odrzuć
          </Button>
          <Button
            onClick={handleAccept}
            className="bg-gradient-to-r from-[#a08032] to-[#e6d280] hover:from-[#8a6c2b] hover:to-[#d4c06b] text-zinc-900 font-medium"
          >
            Zatwierdź zmiany
          </Button>
        </div>
      </DialogContent>
    </Dialog>
    {confirmationDialog}
    </>
  );
};

export default AIResultsModal;