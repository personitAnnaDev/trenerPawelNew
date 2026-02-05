// Komponent reużywalny SortableMeal

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { GripVertical, Edit, Trash, ChevronRight, ChevronDown, Copy, XCircle } from "lucide-react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { formatIngredientQuantity } from "@/utils/formatIngredients";
import { CopyPasteState } from "@/hooks/useCopyPaste";

// Typy
export interface Ingredient {
  id: string;
  name: string;
  quantity: number;
  unit: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
}

export interface Meal {
  id: string;
  name: string;
  dish: string;
  instructions: string[];
  ingredients: Ingredient[];
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
  countTowardsDailyCalories: boolean;
  time?: string;
}

export interface SortableMealProps {
  meal: Meal;
  onEdit: (meal: Meal) => void;
  onDelete: (mealId: string) => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  // Copy-paste props
  dayId: string;
  orderIndex: number;
  copyPasteState?: CopyPasteState;
  onCopyMeal: (meal: Meal, dayId: string, orderIndex: number) => void;
  onClearClipboard: () => void;
}

const SortableMeal = ({
  meal,
  onEdit,
  onDelete,
  isCollapsed,
  onToggleCollapse,
  dayId,
  orderIndex,
  copyPasteState,
  onCopyMeal,
  onClearClipboard
}: SortableMealProps) => {
  // Compute copy-paste states
  const isInCopyMode = copyPasteState?.isActive ?? false;
  const isSourceMeal = isInCopyMode &&
                       copyPasteState?.sourceMeal?.id === meal.id &&
                       copyPasteState?.sourceDayId === dayId;
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({ id: meal.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  // Helper: Consistent rounding to match badge calculations
  // First round to 1 decimal place, then to integer
  // This ensures 2.47 → 2.5 → 3 (not 2.47 → 2)
  const formatMacro = (value: number): number => {
    return Math.round(parseFloat(value.toFixed(1)));
  };

  return (
    <div ref={setNodeRef} style={style} data-meal-id={meal.id}>
      <Collapsible open={!isCollapsed} onOpenChange={onToggleCollapse}>
        <Card className="component-card relative w-full">
          <div
            {...attributes}
            {...listeners}
            className="absolute top-2 left-1 sm:left-2 cursor-grab hover:cursor-grabbing p-1 rounded hover:bg-zinc-700"
            title="Przeciągnij, aby zmienić kolejność"
          >
            <GripVertical className="h-3 w-3 sm:h-4 sm:w-4 text-zinc-400" />
          </div>
          <CardHeader className="pb-3 pl-6 sm:pl-10 pr-4 sm:pr-10">
            <div className="flex flex-col lg:flex-row lg:justify-between lg:items-start gap-3 lg:gap-0">
              <div className="flex items-center gap-2 flex-1">
                <CollapsibleTrigger className="flex items-center gap-2 flex-1 cursor-pointer hover:bg-zinc-800/10 transition-colors rounded px-2 py-1 mr-2">
                  {isCollapsed ? <ChevronRight className="h-4 w-4 transition-transform" /> : <ChevronDown className="h-4 w-4 transition-transform" />}
                  <div className="flex-1 text-left">
                    <CardTitle className="text-lg sm:text-xl font-bold brand-text-primary text-left">{meal.name}</CardTitle>
                    <p className="text-sm sm:text-base text-zinc-100 font-semibold text-left">{meal.dish}</p>
                    <div className="flex flex-wrap items-center gap-1 sm:gap-2 mt-2 sm:mt-3">
                      <Badge variant="secondary" className="nutrition-kcal-badge text-xs">
                        {Math.round(meal.calories)} kcal
                      </Badge>
                      <Badge variant="secondary" className="nutrition-protein-badge text-xs">
                        B: {Math.round(meal.protein)}g
                      </Badge>
                      <Badge variant="secondary" className="nutrition-carbs-badge text-xs">
                        W: {Math.round(meal.carbs)}g
                      </Badge>
                      <Badge variant="secondary" className="nutrition-fat-badge text-xs">
                        T: {Math.round(meal.fat)}g
                      </Badge>
                      <Badge variant="secondary" className="nutrition-fiber-badge text-xs">
                        Bł: {Math.round(meal.fiber)}g
                      </Badge>
                      {!meal.countTowardsDailyCalories && (
                        <Badge variant="outline" className="border-orange-500 text-orange-400 bg-orange-900/20 text-xs">
                          Nie liczy się do dziennych kalorii
                        </Badge>
                      )}
                    </div>
                  </div>
                </CollapsibleTrigger>
              </div>
              <div className="flex items-center gap-2 lg:flex-shrink-0">
                {/* Edit button - visible only when NOT in copy mode OR when this is the source meal */}
                {!isInCopyMode && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onEdit(meal)}
                    className="flex-1 lg:flex-initial h-9 text-sm"
                  >
                    <Edit className="h-3 w-3 mr-1" />
                    <span className="hidden sm:inline">Edytuj</span>
                    <span className="sm:hidden">Edit</span>
                  </Button>
                )}

                {/* Copy/Cancel button - visible when NOT in copy mode OR when this is the source meal */}
                {(!isInCopyMode || isSourceMeal) && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => isSourceMeal ? onClearClipboard() : onCopyMeal(meal, dayId, orderIndex)}
                    className="flex-1 lg:flex-initial h-9 text-sm"
                    title={isSourceMeal ? "Anuluj kopiowanie" : "Kopiuj posiłek"}
                  >
                    {isSourceMeal ? (
                      <XCircle className="h-4 w-4 mr-1 text-orange-500" />
                    ) : (
                      <Copy className="h-4 w-4 mr-1" />
                    )}
                    <span className="hidden sm:inline">
                      {isSourceMeal ? "Anuluj" : "Kopiuj"}
                    </span>
                  </Button>
                )}

                {/* Delete button - visible only when NOT in copy mode */}
                {!isInCopyMode && (
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        title="Usuń posiłek"
                        className="flex-1 lg:flex-initial h-9 min-w-[40px]"
                      >
                        <Trash className="h-3 w-3 text-red-500" />
                        <span className="sm:hidden ml-1 text-red-500">Usuń</span>
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent className="modal-background">
                      <AlertDialogHeader>
                        <AlertDialogTitle className="brand-text-secondary">Usuń posiłek</AlertDialogTitle>
                        <AlertDialogDescription className="text-zinc-300">
                          Czy na pewno chcesz usunąć posiłek "{meal.name}"? Ta akcja nie może być cofnięta.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel className="bg-zinc-700 text-zinc-100 border-zinc-600 hover:bg-zinc-600">Anuluj</AlertDialogCancel>
                        <AlertDialogAction onClick={() => onDelete(meal.id)}>Usuń</AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                )}
              </div>
            </div>
          </CardHeader>
          <CollapsibleContent>
            <CardContent className="pt-0 pl-6 sm:pl-10 pr-6 sm:pr-10">
              {meal.ingredients && meal.ingredients.length > 0 && (
                <div className="space-y-3 mb-4">
                  <h4 className="font-medium brand-text-secondary text-left">Składniki:</h4>
                  <div className="space-y-2">
                    {meal.ingredients.map((ingredient) => (
                      <div key={ingredient.id} className="p-3 brand-bg-gray rounded-lg">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
                              <span className="font-medium text-sm brand-text-secondary truncate">
                                {ingredient.name}
                              </span>
                              <span className="text-sm font-medium brand-text-secondary sm:ml-4 flex-shrink-0">
                                {formatIngredientQuantity(ingredient.quantity, ingredient.unit)}
                              </span>
                            </div>
                            <div className="mt-2 sm:mt-1">
                              {/* Desktop: horizontal layout */}
                              <div className="hidden sm:block text-xs brand-text-gray">
                                {formatMacro(ingredient.calories)} kcal | B: {formatMacro(ingredient.protein)}g | W: {formatMacro(ingredient.carbs)}g | T: {formatMacro(ingredient.fat)}g | Bł: {formatMacro(ingredient.fiber)}g
                              </div>
                              {/* Mobile: badge layout */}
                              <div className="sm:hidden flex flex-wrap gap-1">
                                <span className="text-xs px-2 py-1 bg-zinc-700 rounded brand-text-gray">
                                  {formatMacro(ingredient.calories)} kcal
                                </span>
                                <span className="text-xs px-2 py-1 bg-zinc-700 rounded brand-text-gray">
                                  B: {formatMacro(ingredient.protein)}g
                                </span>
                                <span className="text-xs px-2 py-1 bg-zinc-700 rounded brand-text-gray">
                                  W: {formatMacro(ingredient.carbs)}g
                                </span>
                                <span className="text-xs px-2 py-1 bg-zinc-700 rounded brand-text-gray">
                                  T: {formatMacro(ingredient.fat)}g
                                </span>
                                <span className="text-xs px-2 py-1 bg-zinc-700 rounded brand-text-gray">
                                  Bł: {formatMacro(ingredient.fiber)}g
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {meal.instructions && meal.instructions.length > 0 && (
                <div className="space-y-3">
                  <h4 className="font-medium brand-text-secondary text-left">Instrukcje przygotowania:</h4>
                  <div className="space-y-3">
                    {meal.instructions.map((instruction, index) => (
                      <div key={index} className="brand-bg-gray p-3 rounded-lg brand-border border">
                        <div className="flex flex-col sm:flex-row sm:items-start gap-2">
                          <span className="font-medium brand-text-primary text-sm sm:min-w-[100px] flex-shrink-0">
                            Instrukcja {index + 1}:
                          </span>
                          <span className="text-sm brand-text-secondary leading-relaxed">
                            {instruction}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>
    </div>
  );
};

export default SortableMeal;
