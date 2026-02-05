import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Save, ChevronDown, ChevronRight, ChevronLeft, Plus, Trash2, GripVertical, Utensils, Trash, User, X, Check, HelpCircle, Edit, Copy, ClipboardPaste, XCircle, MoreVertical } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
import { useCopyPaste } from "@/hooks/useCopyPaste";
import { useCopyPasteDay } from "@/hooks/useCopyPasteDay";
import { CopyDayModal, CopyDayOptions } from "@/components/CopyDayModal";
import { debounce } from "@/utils/debounce";
import { addTemplateWithRelations } from "@/utils/supabaseTemplates";
import { getCategories } from "@/utils/supabasePotrawy";
import { errorLogger } from "@/services/errorLoggingService";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import DishSelectionModal from "@/components/DishSelectionModal";
import ClientAssignmentModal from "@/components/ClientAssignmentModal";
import { UndoRedoNavigation } from "@/components/UndoRedoNavigation";
import { useUndoRedo } from "@/hooks/useUndoRedo";
import { logger } from '@/utils/logger';

// Typy do obsługi jadłospisów
interface Ingredient {
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

interface Meal {
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

interface DayPlan {
  id: string;
  name: string;
  meals: Meal[];
}

import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

import SortableMeal from "@/components/SortableMeal";

const TemplateEdit = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { templateId } = useParams();
  const queryClient = useQueryClient();

  // 🎯 COPY-PASTE: Initialize copy-paste hook (for meals)
  const { copyPasteState, copyMeal, pasteMeal, clearClipboard } = useCopyPaste();

  // 🎯 DAY COPY-PASTE: Initialize day-level copy-paste hook
  const { copyPasteDayState, copyDay, pasteDay, clearClipboard: clearDayClipboard } = useCopyPasteDay();
  const [isCopyDayModalOpen, setIsCopyDayModalOpen] = useState(false);

  // 🎯 COPY-PASTE: Modal state for exit confirmation
  const [showExitCopyModeModal, setShowExitCopyModeModal] = useState(false);
  const [pendingAction, setPendingAction] = useState<(() => void) | null>(null);

  const [templateTitle, setTemplateTitle] = useState("");
  const [templateDescription, setTemplateDescription] = useState("");
  const [isImportantNotesOpen, setIsImportantNotesOpen] = useState(true);
  const [activeDay, setActiveDay] = useState("");
  const [newDayName, setNewDayName] = useState("");
  const [dayPlans, setDayPlans] = useState<DayPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAssignmentModalOpen, setIsAssignmentModalOpen] = useState(false);

  // Day name editing state
  const [editingDayId, setEditingDayId] = useState<string | null>(null);
  const [editingDayName, setEditingDayName] = useState("");
  const editInputRef = useRef<HTMLInputElement>(null);

  // Scrollable tabs state
  const tabsScrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  // Pobierz dane szablonu z Supabase na podstawie templateId
  const fetchTemplateData = async () => {
    setLoading(true);
    try {
      const { supabase } = await import("@/utils/supabase");
      const { data: template, error: templateError } = await supabase
        .from("templates")
        .select("id, title, description")
        .eq("id", templateId)
        .single();

      if (templateError || !template) {
        toast({
          title: "Błąd",
          description: "Nie udało się pobrać szablonu.",
          variant: "destructive"
        });
        setLoading(false);
        return;
      }

      setTemplateTitle(template.title || "");
      setTemplateDescription(template.description || "");

      // Pobierz day_plans i meals
      const { data: days, error: daysError } = await supabase
        .from("day_plans")
        .select("id, name, day_number")
        .eq("template_id", templateId)
        .order("day_number", { ascending: true });

      if (daysError || !days) {
        toast({
          title: "Błąd",
          description: "Nie udało się pobrać dni szablonu.",
          variant: "destructive"
        });
        setLoading(false);
        return;
      }

      // Pobierz posiłki dla każdego dnia
      const dayPlansWithMeals: DayPlan[] = [];
      for (const day of days) {
        const { data: meals, error: mealsError } = await supabase
          .from("meals")
          .select("*")
          .eq("day_plan_id", day.id)
          .order('order_index', { ascending: true });

        if (mealsError || !meals) {
          toast({
            title: "Błąd",
            description: "Nie udało się pobrać posiłków.",
            variant: "destructive"
          });
          setLoading(false);
          return;
        }

        // Pobierz składniki dla każdego posiłku
        for (const meal of meals) {
          // Mapuj count_in_daily_total na countTowardsDailyCalories
          meal.countTowardsDailyCalories = meal.count_in_daily_total;

          const { data: ingredients, error: ingredientsError } = await supabase
            .from("meal_ingredients")
            .select("*")
            .eq("meal_id", meal.id)
            .order("order_index");

          // Zawsze nadpisuj składniki z bazy
          meal.ingredients = Array.isArray(ingredients) ? [...ingredients] : [];

          // Zabezpiecz instructions - upewnij się że jest tablicą
          meal.instructions = Array.isArray(meal.instructions) ? meal.instructions : [];
        }

        dayPlansWithMeals.push({
          id: day.id,
          name: day.name,
          meals: meals.sort((a, b) => (a.order_index || 0) - (b.order_index || 0))
        });
      }

      setDayPlans(dayPlansWithMeals);
      if (dayPlansWithMeals.length > 0) {
        // Zachowaj aktualnie wybrany dzień jeśli nadal istnieje
        const dayExists = activeDay && dayPlansWithMeals.some(day => day.id === activeDay);
        if (!dayExists) {
          setActiveDay(dayPlansWithMeals[0].id);
        }
      }
      setLoading(false);
    } catch (err) {
      toast({
        title: "Błąd",
        description: "Wystąpił błąd podczas pobierania szablonu.",
        variant: "destructive"
      });
      setLoading(false);
    }
  };

  useEffect(() => {
    if (templateId) {
      fetchTemplateData();
    }
  }, [templateId, toast]);
  // Undo/redo niepotrzebne w trybie edycji istniejącego szablonu
  // Meal editing modal state

  // Pobierz kategorie z bazy Supabase
  const { data: categories, isLoading: categoriesLoading, error: categoriesError } = useQuery({
    queryKey: ['categories'],
    queryFn: getCategories,
  });

  const [isMealEditModalOpen, setIsMealEditModalOpen] = useState(false);
  const [isDishSelectionModalOpen, setIsDishSelectionModalOpen] = useState(false);
  const [editingMeal, setEditingMeal] = useState<Meal | undefined>(undefined);
  const [currentDayId, setCurrentDayId] = useState<string>("");

  // Expanded meals state (domyślnie wszystkie zwinięte)
  const [expandedMeals, setExpandedMeals] = useState<Set<string>>(new Set());

  // Drag and drop sensors
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Funkcje do obsługi przewijania tabów
  const checkScrollability = () => {
    if (!tabsScrollRef.current) return;
    
    const element = tabsScrollRef.current;
    const canScrollLeftValue = element.scrollLeft > 0;
    const canScrollRightValue = element.scrollLeft < (element.scrollWidth - element.clientWidth);
    
    setCanScrollLeft(canScrollLeftValue);
    setCanScrollRight(canScrollRightValue);
  };

  const scrollLeft = () => {
    if (!tabsScrollRef.current) return;
    
    const element = tabsScrollRef.current;
    const scrollAmount = Math.min(200, element.clientWidth / 2);
    element.scrollBy({ left: -scrollAmount, behavior: 'smooth' });
  };

  const scrollRight = () => {
    if (!tabsScrollRef.current) return;
    
    const element = tabsScrollRef.current;
    const scrollAmount = Math.min(200, element.clientWidth / 2);
    element.scrollBy({ left: scrollAmount, behavior: 'smooth' });
  };

  // Set initial active day
  useEffect(() => {
    if (dayPlans.length > 0 && !activeDay) {
      setActiveDay(dayPlans[0].id);
    }
  }, [dayPlans, activeDay]);

  // Effect do sprawdzania przewijalności przy zmianie dni lub rozmiarze okna
  useEffect(() => {
    const timer = setTimeout(() => {
      checkScrollability();
    }, 100);

    const handleResize = () => {
      checkScrollability();
    };

    window.addEventListener('resize', handleResize);

    return () => {
      clearTimeout(timer);
      window.removeEventListener('resize', handleResize);
    };
  }, [dayPlans.length]);

  const handleAddDay = async () => {
    if (!newDayName.trim() || !templateId) return;

    const { addDayPlan } = await import("@/utils/supabaseTemplates");
    const day_number = dayPlans.length + 1;
    const result = await addDayPlan(templateId, newDayName.trim(), day_number);

    if (result.success && result.dayPlan) {
      const newDay: DayPlan = {
        id: result.dayPlan.id,
        name: result.dayPlan.name,
        meals: []
      };
      const newDayPlans = [...dayPlans, newDay];
      setDayPlans(newDayPlans);
      setActiveDay(newDay.id);
      setNewDayName("");

      toast({
        title: "Dzień dodany",
        description: `Dodano nowy dzień: ${newDay.name}`
      });
    } else {
      toast({
        title: "Błąd",
        description: "Nie udało się dodać dnia.",
        variant: "destructive"
      });
    }
  };

  const handleRemoveDay = async (dayId: string) => {
    const { deleteDayPlan } = await import("@/utils/supabaseTemplates");
    const result = await deleteDayPlan(dayId);

    if (result.success) {
      const newDayPlans = dayPlans.filter(day => day.id !== dayId);
      setDayPlans(newDayPlans);

      if (activeDay === dayId && newDayPlans.length > 0) {
        setActiveDay(newDayPlans[0].id);
      }

      toast({
        title: "Dzień usunięty",
        description: "Dzień został pomyślnie usunięty."
      });
    } else {
      toast({
        title: "Błąd",
        description: "Nie udało się usunąć dnia.",
        variant: "destructive"
      });
    }
  };

  const handleUpdateDayName = async (dayId: string, newName: string) => {
    const newDayPlans = dayPlans.map(day => 
      day.id === dayId ? { ...day, name: newName } : day
    );
    setDayPlans(newDayPlans);

    const { updateDayPlan } = await import("@/utils/supabaseTemplates");
    await updateDayPlan(dayId, newName);
  };

  // Day name editing functions
  const startEditing = (dayId: string, currentName: string) => {
    setEditingDayId(dayId);
    setEditingDayName(currentName);

    // Focus input after state update and dropdown close
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        editInputRef.current?.focus();
        editInputRef.current?.select();
      });
    });
  };

  const finishEditing = async () => {
    if (editingDayId && editingDayName.trim()) {
      await handleUpdateDayName(editingDayId, editingDayName.trim());
    }
    setEditingDayId(null);
    setEditingDayName("");
  };

  const cancelEditing = () => {
    setEditingDayId(null);
    setEditingDayName("");
  };

  const handleDoubleClick = (day: DayPlan) => {
    startEditing(day.id, day.name);
  };

  const handleAddMeal = (dayId: string) => {
    setCurrentDayId(dayId);
    setEditingMeal(undefined);
    setIsDishSelectionModalOpen(true);
  };

  const handleEditMeal = (meal: Meal) => {
    const dayWithMeal = dayPlans.find(day => 
      day.meals.some(m => m.id === meal.id)
    );
    if (dayWithMeal) {
      setCurrentDayId(dayWithMeal.id);
      setEditingMeal(meal);
      setIsDishSelectionModalOpen(true);
    }
  };

  const handleSaveMeal = async (savedMeal: Meal) => {
    // DishSelectionModal już wywołuje onRefreshData={fetchTemplateData}, więc nie potrzeba tutaj podwójnego odświeżania

    toast({
      title: editingMeal ? "Posiłek zaktualizowany" : "Posiłek dodany",
      description: editingMeal ? "Zmiany zostały zapisane." : "Nowy posiłek został dodany."
    });

    // Reset modal state
    setIsMealEditModalOpen(false);
    setIsDishSelectionModalOpen(false);
    setEditingMeal(undefined);
    setCurrentDayId("");
  };

  const handleDeleteMeal = async (dayId: string, mealId: string) => {
    const { deleteMeal } = await import("@/utils/supabaseTemplates");
    const success = await deleteMeal(mealId);
    if (success) {
      await fetchTemplateData();
      toast({
        title: "Posiłek usunięty",
        description: "Posiłek został pomyślnie usunięty."
      });
    } else {
      toast({
        title: "Błąd",
        description: "Nie udało się usunąć posiłku.",
        variant: "destructive"
      });
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    if (!over || active.id === over.id) return;

    const currentDay = dayPlans.find(day => day.id === activeDay);
    if (!currentDay) return;

    const oldIndex = currentDay.meals.findIndex(meal => meal.id === active.id);
    const newIndex = currentDay.meals.findIndex(meal => meal.id === over.id);

    if (oldIndex !== -1 && newIndex !== -1) {
      // 🚀 OPTIMISTIC UPDATE: Natychmiastowa aktualizacja UI state
      const newMeals = arrayMove(currentDay.meals, oldIndex, newIndex).map((meal, idx) => ({
        ...meal,
        order_index: idx
      }));

      // Aktualizuj lokalny state natychmiast
      setDayPlans(
        dayPlans.map(day =>
          day.id === activeDay ? { ...day, meals: newMeals } : day
        )
      );

      // Zapisz do bazy w tle
      try {
        const { updateMealsOrder } = await import("@/utils/supabaseTemplates");
        await updateMealsOrder(newMeals.map(meal => ({ id: meal.id, order_index: meal.order_index })));
      } catch (error) {
        // W przypadku błędu zapisu, przywróć poprzedni stan
        logger.error("Błąd podczas aktualizacji kolejności posiłków:", error);

        // Log error to database
        errorLogger.logDatabaseError({
          message: error instanceof Error ? error.message : 'Błąd aktualizacji kolejności posiłków',
          component: 'TemplateEdit',
          error: error,
          severity: 'error'
        }).catch(err => logger.warn('Failed to log meals order error:', err));

        await fetchTemplateData(); // Rollback do stanu z bazy
        toast({
          title: "Błąd",
          description: "Nie udało się zmienić kolejności posiłków.",
          variant: "destructive"
        });
      }
    }
  };

  const toggleMealCollapse = (mealId: string) => {
    setExpandedMeals(prev => {
      const newSet = new Set(prev);
      if (newSet.has(mealId)) {
        newSet.delete(mealId);
      } else {
        newSet.add(mealId);
      }
      return newSet;
    });
  };

  // 🎯 COPY-PASTE: Modal protection helper
  const executeOrConfirmExitCopyMode = useCallback((action: () => void) => {
    if (copyPasteState?.isActive) {
      setPendingAction(() => action);
      setShowExitCopyModeModal(true);
    } else {
      action();
    }
  }, [copyPasteState]);

  const handleConfirmExitCopyMode = useCallback(() => {
    if (pendingAction) {
      clearClipboard();
      pendingAction();
      setPendingAction(null);
    }
    setShowExitCopyModeModal(false);
  }, [pendingAction, clearClipboard]);

  const handleCancelExitCopyMode = useCallback(() => {
    setPendingAction(null);
    setShowExitCopyModeModal(false);
  }, []);

  // 🎯 COPY-PASTE: Copy meal handler
  const handleCopyMeal = useCallback((meal: Meal, dayId: string, orderIndex: number) => {
    copyMeal(meal, dayId, orderIndex);
    toast({
      title: "Posiłek skopiowany",
      description: `Posiłek "${meal.name}" został skopiowany. Kliknij "Wklej posiłek" w wybranym dniu.`,
      variant: "default",
    });
  }, [copyMeal, toast]);

  // 🎯 COPY-PASTE: Paste meal handler (templates use auto-save, no snapshots)
  const handlePasteMeal = useCallback(async (targetDayId: string) => {
    if (!templateId) return;

    const clonedMeal = pasteMeal(targetDayId);

    if (!clonedMeal) {
      toast({
        title: "Błąd",
        description: "Brak skopiowanego posiłku w schowku.",
        variant: "destructive",
      });
      return;
    }

    try {
      // Save meal to database
      const { saveMealWithIngredients } = await import("@/utils/supabaseTemplates");
      const mealDataForDb = {
        ...clonedMeal,
        countTowardsDailyCalories: clonedMeal.countTowardsDailyCalories,
      };

      const result = await saveMealWithIngredients(mealDataForDb, targetDayId);

      if (!result.success) {
        toast({
          title: "Błąd",
          description: result.error?.message || "Nie udało się wkleić posiłku.",
          variant: "destructive",
        });
        return;
      }

      // Refresh template data
      await fetchTemplateData();

      toast({
        title: "Sukces!",
        description: `Posiłek "${clonedMeal.name}" został wklejony do planu.`,
        variant: "default",
      });
    } catch (error: any) {
      toast({
        title: "Błąd",
        description: error?.message || "Wystąpił nieoczekiwany błąd podczas wklejania.",
        variant: "destructive",
      });
    }
  }, [templateId, pasteMeal, toast, fetchTemplateData]);

  // 🎯 DAY COPY: Copy entire day handler
  const handleCopyDay = useCallback((dayPlan: DayPlan) => {
    copyDay(dayPlan);
    setIsCopyDayModalOpen(true);

    toast({
      title: "Dzień skopiowany",
      description: `Dzień "${dayPlan.name}" został skopiowany.`,
      variant: "default",
    });
  }, [copyDay, toast]);

  // 🎯 DAY COPY: Confirm paste with modal (supports NEW and EXISTING modes)
  const handleConfirmPasteDay = useCallback(async (options: CopyDayOptions) => {
    if (!templateId) return;

    try {
      const clonedDay = pasteDay();
      if (!clonedDay) {
        throw new Error("Failed to clone day");
      }

      if (options.mode === 'new') {
        // ===== MODE: NEW DAY =====
        if (!options.newDayName) {
          throw new Error("Day name is required for new mode");
        }

        // Update day name from modal input
        clonedDay.name = options.newDayName;

        // Save to database with batch operation
        const { copyDayPlanTemplate } = await import("@/utils/clientStorage");
        const result = await copyDayPlanTemplate(templateId, clonedDay, options.newDayName);

        if (!result) {
          throw new Error("Failed to save day to database");
        }

        // Refresh template data
        await fetchTemplateData();

        // Close modal
        setIsCopyDayModalOpen(false);

        toast({
          title: "Dzień skopiowany",
          description: `Dzień "${options.newDayName}" został dodany do szablonu z ${clonedDay.meals.length} posiłkami.`,
          variant: "default",
        });
      } else {
        // ===== MODE: EXISTING DAY =====
        const targetDayId = options.targetDayId!;
        const {
          replaceExistingTemplateDayMeals,
          appendMealsToExistingTemplateDay,
          updateTemplateDayName,
        } = await import("@/utils/supabaseTemplates");

        // 1. Handle meals (replace or append)
        if (options.replaceMeals) {
          // Replace: Delete all meals + insert new
          await replaceExistingTemplateDayMeals(targetDayId, clonedDay.meals);
        } else {
          // Append: Add new meals to end
          await appendMealsToExistingTemplateDay(targetDayId, clonedDay.meals);
        }

        // 2. Update day name if edited
        if (options.editedDayName) {
          await updateTemplateDayName(targetDayId, options.editedDayName);
        }

        // Refresh template data
        await fetchTemplateData();

        // Close modal
        setIsCopyDayModalOpen(false);

        const action = options.replaceMeals ? 'zastąpiono' : 'dołączono';
        toast({
          title: "Dzień zaktualizowany",
          description: `Posiłki zostały ${action} w dniu "${options.editedDayName}" (${clonedDay.meals.length} posiłków).`,
          variant: "default",
        });
      }
    } catch (error: any) {
      toast({
        title: "Błąd",
        description: error?.message || "Nie udało się skopiować dnia.",
        variant: "destructive",
      });
    }
  }, [templateId, pasteDay, fetchTemplateData, toast]);

  // 🎯 COPY-PASTE: beforeunload protection (meals + days)
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (copyPasteState?.isActive || copyPasteDayState?.isActive) {
        e.preventDefault();
        e.returnValue = '';
        return '';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [copyPasteState, copyPasteDayState]);

  // Auto-save funkcja - zapisuje gdy użytkownik wychodzi z inputa
  const autoSaveTemplateDetails = useCallback(async () => {
    if (!templateId || !templateTitle.trim()) {
      return;
    }


    try {
      const { updateTemplateDetails } = await import("@/utils/supabaseTemplates");
      const result = await updateTemplateDetails(templateId, templateTitle, templateDescription);

      if (result.success) {
        toast({
          title: "Zapisano",
          description: "Zmiany zostały zapisane",
        });
      } else {
        logger.error("❌ AUTO-SAVE ERROR:", result.error);
        toast({
          title: "Błąd zapisu",
          description: result.error || "Nie udało się zapisać zmian",
          variant: "destructive"
        });
      }
    } catch (error) {
      logger.error("❌ AUTO-SAVE CATCH ERROR:", error);

      // Log error to database
      errorLogger.logDatabaseError({
        message: error instanceof Error ? error.message : 'Błąd auto-save szablonu',
        component: 'TemplateEdit',
        error: error,
        severity: 'error'
      }).catch(err => logger.warn('Failed to log template save error:', err));

      toast({
        title: "Błąd zapisu",
        description: "Wystąpił błąd podczas zapisu",
        variant: "destructive"
      });
    }
  }, [templateId, templateTitle, templateDescription, toast]);

  const handleSaveTemplate = async () => {
    
    if (!templateId) {
      toast({
        title: "Błąd",
        description: "Brak identyfikatora szablonu",
        variant: "destructive"
      });
      return;
    }
    
    if (!templateTitle.trim()) {
      toast({
        title: "Błąd",
        description: "Podaj tytuł szablonu",
        variant: "destructive"
      });
      return;
    }

    // Manualne zapisanie i przejście do listy
    try {
      const { updateTemplateDetails } = await import("@/utils/supabaseTemplates");
      const result = await updateTemplateDetails(templateId, templateTitle, templateDescription);

      if (result.success) {
        toast({
          title: "Szablon zapisany",
          description: `Szablon "${templateTitle}" został pomyślnie zaktualizowany.`,
        });
        navigate("/jadlospisy");
      } else {
        toast({
          title: "Błąd",
          description: result.error || "Nie udało się zaktualizować szablonu",
          variant: "destructive"
        });
      }
    } catch (error) {
      // Log error to database
      errorLogger.logDatabaseError({
        message: error instanceof Error ? error.message : 'Błąd zapisu szablonu',
        component: 'TemplateEdit',
        error: error,
        severity: 'error'
      }).catch(err => logger.warn('Failed to log template save error:', err));

      toast({
        title: "Błąd",
        description: "Wystąpił błąd podczas zapisu szablonu",
        variant: "destructive"
      });
    }
  };

  const currentDay = dayPlans.find(day => day.id === activeDay);
  const dayNutrition = currentDay ? {
    calories: currentDay.meals
      .filter(meal => meal.countTowardsDailyCalories)
      .reduce((sum, meal) => sum + meal.calories, 0),
    protein: currentDay.meals
      .filter(meal => meal.countTowardsDailyCalories)
      .reduce((sum, meal) => sum + meal.protein, 0),
    carbs: currentDay.meals
      .filter(meal => meal.countTowardsDailyCalories)
      .reduce((sum, meal) => sum + meal.carbs, 0),
    fat: currentDay.meals
      .filter(meal => meal.countTowardsDailyCalories)
      .reduce((sum, meal) => sum + meal.fat, 0),
    fiber: currentDay.meals
      .filter(meal => meal.countTowardsDailyCalories)
      .reduce((sum, meal) => sum + meal.fiber, 0)
  } : { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 };

  return (
    <div className="page-background p-4 md:p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4 mb-6">
          <Button
            variant="ghost"
            size="sm"
            className="p-2 sm:p-3 brand-text-secondary hover:bg-zinc-800 self-start"
            onClick={() => executeOrConfirmExitCopyMode(() => navigate("/jadlospisy"))}
          >
            <ArrowLeft className="h-4 w-4 mr-0 sm:mr-2" />
            <span className="hidden sm:inline">Powrót</span>
          </Button>

          <div className="flex-1 min-w-0">
            <h1 className="text-xl sm:text-2xl md:text-3xl font-bold brand-text-secondary">
              Nowy szablon jadłospisu
            </h1>
            <p className="brand-text-gray mt-1 text-sm md:text-base">
              Utwórz szablon jadłospisu do wykorzystania z klientami
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto">
            {/* Przycisk "Zapisz szablon" ukryty - używamy auto-save */}
            {/* <Button onClick={handleSaveTemplate}>
              <Save className="h-4 w-4 mr-2" />
              Zapisz szablon
            </Button> */}
            <Button
              variant="outline"
              onClick={() => executeOrConfirmExitCopyMode(() => setIsAssignmentModalOpen(true))}
              className="w-full sm:w-auto"
              disabled={!templateId}
            >
              <User className="h-4 w-4 mr-2" />
              <span className="hidden sm:inline">Przepisz do klienta</span>
              <span className="sm:hidden">Przepisz</span>
            </Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="destructive"
                  className="w-full sm:w-auto"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  <span className="hidden sm:inline">Usuń szablon</span>
                  <span className="sm:hidden">Usuń</span>
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Usuń szablon</AlertDialogTitle>
                  <AlertDialogDescription>
                    Czy na pewno chcesz usunąć ten szablon? Ta operacja jest nieodwracalna.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Anuluj</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={async () => {
                      executeOrConfirmExitCopyMode(async () => {
                        const { deleteTemplate } = await import("@/utils/supabaseTemplates");
                        const result = await deleteTemplate(templateId);
                        if (result.success) {
                          // Invalidate templates cache before navigation
                          queryClient.invalidateQueries({ queryKey: ['templates'] });
                          toast({
                            title: "Szablon usunięty",
                            description: "Szablon został pomyślnie usunięty."
                          });
                          navigate("/jadlospisy");
                        } else {
                          toast({
                            title: "Błąd",
                            description: "Nie udało się usunąć szablonu.",
                            variant: "destructive"
                          });
                        }
                      });
                    }}
                  >
                    Usuń
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>

        <div className="space-y-6">
          {/* Template Details */}
          <Card className="component-card">
            <CardHeader>
              <CardTitle className="text-lg md:text-xl brand-text-secondary">
                Szczegóły szablonu
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="block text-sm font-medium brand-text-secondary mb-2">
                  Tytuł szablonu *
                </label>
                <Input
                  value={templateTitle}
                  onChange={(e) => setTemplateTitle(e.target.value)}
                  onBlur={autoSaveTemplateDetails}
                  placeholder="np. Dieta redukcyjna - podstawowa"
                  className="input-dark"
                />
              </div>
            </CardContent>
          </Card>

          {/* Important Notes */}
          <Card className="component-card">
            <Collapsible open={isImportantNotesOpen} onOpenChange={setIsImportantNotesOpen}>
              <CollapsibleTrigger asChild>
                <CardHeader className="cursor-pointer hover:bg-zinc-800/50 transition-colors">
                  <CardTitle className="flex items-center justify-between text-lg brand-text-secondary">
                    <span>Ważne informacje</span>
                    <ChevronDown className={`h-5 w-5 transition-transform ${isImportantNotesOpen ? '' : '-rotate-90'}`} />
                  </CardTitle>
                </CardHeader>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <CardContent>
                  <div>
                    <label className="block text-sm font-medium brand-text-secondary mb-2">
                      Dodaj ważne informacje dotyczące jadłospisu
                    </label>
                    <Textarea
                      value={templateDescription}
                      onChange={(e) => setTemplateDescription(e.target.value)}
                      onBlur={autoSaveTemplateDetails}
                      placeholder="Opisz szczegóły diety, przeciwwskazania, zalecenia..."
                      className="min-h-[100px] input-dark"
                    />
                  </div>
                </CardContent>
              </CollapsibleContent>
            </Collapsible>
          </Card>

          {/* Days Management */}
          <Card className="component-card">
            <CardContent className="p-6">
              {/* Days Tabs */}
              <Tabs value={activeDay} onValueChange={setActiveDay}>
                <div className="border-b border-zinc-700/50 bg-zinc-900/50 rounded-t-lg">
                  <div className="flex flex-col lg:flex-row lg:items-center gap-4 p-4">
                    {/* Desktop Tabs Row */}
                    <div className="hidden lg:flex items-center flex-1">
                      {/* Left Arrow */}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={scrollLeft}
                        disabled={!canScrollLeft}
                        className={`h-8 w-8 p-0 flex-shrink-0 mr-2 ${
                          canScrollLeft
                            ? 'text-zinc-300 hover:text-white hover:bg-zinc-700'
                            : 'text-zinc-600 cursor-not-allowed opacity-50'
                        }`}
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </Button>

                      {/* Scrollable Tabs Container */}
                      <div className="flex-1 overflow-hidden brand-bg-light brand-border border rounded-md">
                        <div
                          ref={tabsScrollRef}
                          className="overflow-x-auto scrollbar-hide"
                          onScroll={checkScrollability}
                        >
                          <div className="flex">
                            {dayPlans.map((day) => (
                              <div key={day.id} className="flex-shrink-0 border-r border-zinc-800 last:border-r-0">
                                <div
                                  role="button"
                                  tabIndex={0}
                                  onClick={() => setActiveDay(day.id)}
                                  onDoubleClick={() => handleDoubleClick(day)}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter' || e.key === ' ') {
                                      e.preventDefault();
                                      setActiveDay(day.id);
                                    }
                                  }}
                                  className={`py-3 pl-4 pr-8 text-sm font-medium whitespace-nowrap transition-colors relative group cursor-pointer ${
                                    activeDay === day.id
                                      ? 'bg-gradient-to-r from-[#a08032] to-[#e6d280] text-white shadow-sm'
                                      : 'brand-text-gray hover:brand-text-secondary hover:bg-zinc-700'
                                  }`}
                                  title="Podwójne kliknięcie aby edytować nazwę"
                                  aria-label={`Dzień ${day.name}`}
                                >
                                  {editingDayId === day.id ? (
                                    <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                                      <input
                                        ref={editInputRef}
                                        type="text"
                                        value={editingDayName}
                                        onChange={(e) => setEditingDayName(e.target.value)}
                                        onKeyDown={(e) => {
                                          e.stopPropagation();
                                          if (e.key === 'Enter') finishEditing();
                                          if (e.key === 'Escape') cancelEditing();
                                        }}
                                        className="bg-transparent border-none outline-none text-center min-w-[100px] font-medium"
                                      />
                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          finishEditing();
                                        }}
                                        className="p-1 rounded hover:bg-green-600/30 text-green-400"
                                        title="Zapisz (Enter)"
                                      >
                                        <Check className="size-4" />
                                      </button>
                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          cancelEditing();
                                        }}
                                        className="p-1 rounded hover:bg-red-600/30 text-red-400"
                                        title="Anuluj (Escape)"
                                      >
                                        <X className="size-4" />
                                      </button>
                                    </div>
                                  ) : (
                                    <span className="text-center min-w-[120px] font-medium">{day.name}</span>
                                  )}
                                  {/* 🎯 DAY COPY: Dropdown menu - hidden during editing */}
                                  {editingDayId !== day.id && (
                                  <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                      <button
                                        type="button"
                                        onClick={(e) => e.stopPropagation()}
                                        className="absolute right-1 top-1/2 -translate-y-1/2 size-6 rounded-full grid place-items-center text-zinc-400 hover:text-zinc-200 bg-transparent hover:bg-zinc-700/50 transition-colors z-10"
                                        aria-label="Opcje dnia"
                                      >
                                        <MoreVertical className="block size-4" />
                                      </button>
                                    </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end" className="w-48 bg-zinc-800 border-zinc-700">
                                    {/* Edit day name */}
                                    <DropdownMenuItem
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        startEditing(day.id, day.name);
                                      }}
                                      className="cursor-pointer text-zinc-300 hover:text-white hover:bg-zinc-700 focus:bg-zinc-700 focus:text-white"
                                    >
                                      <Edit className="mr-2 h-4 w-4" />
                                      Edytuj nazwę
                                    </DropdownMenuItem>

                                    {/* Copy day */}
                                    <DropdownMenuItem
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleCopyDay(day);
                                      }}
                                      className="cursor-pointer text-zinc-300 hover:text-white hover:bg-zinc-700 focus:bg-zinc-700 focus:text-white"
                                    >
                                      <Copy className="mr-2 h-4 w-4" />
                                      Kopiuj dzień
                                    </DropdownMenuItem>
                                    {dayPlans.length > 1 && (
                                      <AlertDialog>
                                        <AlertDialogTrigger asChild>
                                          <DropdownMenuItem
                                            onSelect={(e) => e.preventDefault()}
                                            className="cursor-pointer text-red-400 hover:text-red-300 hover:bg-zinc-700 focus:bg-zinc-700 focus:text-red-300"
                                          >
                                            <Trash className="mr-2 h-4 w-4" />
                                            Usuń dzień
                                          </DropdownMenuItem>
                                        </AlertDialogTrigger>
                                        <AlertDialogContent className="bg-zinc-900 border-zinc-800">
                                          <AlertDialogHeader>
                                            <AlertDialogTitle className="text-zinc-100">Usuń dzień</AlertDialogTitle>
                                            <AlertDialogDescription className="text-zinc-400">
                                              Czy na pewno chcesz usunąć dzień "{day.name}"? Ta akcja jest nieodwracalna.
                                            </AlertDialogDescription>
                                          </AlertDialogHeader>
                                          <AlertDialogFooter>
                                            <AlertDialogCancel className="bg-zinc-800 border-zinc-700 text-zinc-300 hover:bg-zinc-700">
                                              Anuluj
                                            </AlertDialogCancel>
                                            <AlertDialogAction
                                              onClick={() => executeOrConfirmExitCopyMode(() => handleRemoveDay(day.id))}
                                              className="bg-red-600 hover:bg-red-700 text-white"
                                            >
                                              Usuń
                                            </AlertDialogAction>
                                          </AlertDialogFooter>
                                        </AlertDialogContent>
                                      </AlertDialog>
                                    )}
                                  </DropdownMenuContent>
                                  </DropdownMenu>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>

                      {/* Right Arrow */}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={scrollRight}
                        disabled={!canScrollRight}
                        className={`h-8 w-8 p-0 flex-shrink-0 ml-2 ${
                          canScrollRight
                            ? 'text-zinc-300 hover:text-white hover:bg-zinc-700'
                            : 'text-zinc-600 cursor-not-allowed opacity-50'
                        }`}
                      >
                        <ChevronRight className="h-4 w-4" />
                      </Button>

                      {/* Global help icon for day name editing */}
                      <div className="ml-2 relative group">
                        <HelpCircle className="h-4 w-4 text-zinc-400 hover:text-zinc-300 transition-colors cursor-help" />
                        <div className="absolute bottom-full right-0 mb-2 px-3 py-2 text-xs text-white bg-zinc-800 border border-zinc-700 rounded-md opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50">
                          Wskazówka: Podwójne kliknięcie dnia umożliwia jego edycję
                          <div className="absolute top-full right-4 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-zinc-800"></div>
                        </div>
                      </div>
                    </div>

                    {/* Mobile Day Selector */}
                    <div className="lg:hidden space-y-3">
                      <div className="flex items-center justify-between">
                        <label className="text-sm font-medium brand-text-secondary">Aktualny dzień:</label>
                        <div className="relative group">
                          <HelpCircle className="h-4 w-4 text-zinc-400 hover:text-zinc-300 transition-colors cursor-help" />
                          <div className="absolute bottom-full right-0 mb-2 px-3 py-2 text-xs text-white bg-zinc-800 border border-zinc-700 rounded-md opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50">
                            Podwójne kliknięcie dnia umożliwia edycję nazwy
                            <div className="absolute top-full right-4 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-zinc-800"></div>
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        {dayPlans.map((day) => (
                          <div key={day.id} className="relative group">
                            <div
                              role="button"
                              tabIndex={0}
                              onClick={() => setActiveDay(day.id)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter' || e.key === ' ') {
                                  e.preventDefault();
                                  setActiveDay(day.id);
                                }
                              }}
                              className={`w-full p-3 text-sm font-medium rounded-lg transition-colors relative cursor-pointer ${
                                activeDay === day.id
                                  ? 'bg-gradient-to-r from-[#a08032] to-[#e6d280] text-white shadow-sm'
                                  : 'bg-zinc-800 brand-text-gray hover:brand-text-secondary hover:bg-zinc-700 border border-zinc-700'
                              }`}
                              aria-label={`Dzień ${day.name}`}
                            >
                              {editingDayId === day.id ? (
                                <div className="flex items-center justify-center gap-1" onClick={(e) => e.stopPropagation()}>
                                  <input
                                    ref={editInputRef}
                                    type="text"
                                    value={editingDayName}
                                    onChange={(e) => setEditingDayName(e.target.value)}
                                    onKeyDown={(e) => {
                                      e.stopPropagation();
                                      if (e.key === 'Enter') finishEditing();
                                      if (e.key === 'Escape') cancelEditing();
                                    }}
                                    className="bg-transparent border-none outline-none text-center flex-1 font-medium"
                                  />
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      finishEditing();
                                    }}
                                    className="p-1 rounded hover:bg-green-600/30 text-green-400"
                                    title="Zapisz"
                                  >
                                    <Check className="size-4" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      cancelEditing();
                                    }}
                                    className="p-1 rounded hover:bg-red-600/30 text-red-400"
                                    title="Anuluj"
                                  >
                                    <X className="size-4" />
                                  </button>
                                </div>
                              ) : (
                                <span className="font-medium">{day.name}</span>
                              )}
                            </div>

                            {/* Day actions - Dropdown menu (hidden during editing) */}
                            {editingDayId !== day.id && (
                            <div className="absolute top-1/2 -translate-y-1/2 right-1">
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <button
                                    type="button"
                                    onClick={(e) => e.stopPropagation()}
                                    className="size-6 rounded-full grid place-items-center bg-transparent hover:bg-zinc-700/50 text-zinc-400 hover:text-white transition-colors"
                                    aria-label="Opcje dnia"
                                  >
                                    <MoreVertical className="size-4" />
                                  </button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-48 bg-zinc-800 border-zinc-700">
                                  {/* Edit day name */}
                                  <DropdownMenuItem
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      startEditing(day.id, day.name);
                                    }}
                                    className="cursor-pointer text-zinc-300 hover:text-white hover:bg-zinc-700 focus:bg-zinc-700 focus:text-white"
                                  >
                                    <Edit className="mr-2 h-4 w-4" />
                                    Edytuj nazwę
                                  </DropdownMenuItem>

                                  {/* Copy day */}
                                  <DropdownMenuItem
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleCopyDay(day);
                                    }}
                                    className="cursor-pointer text-zinc-300 hover:text-white hover:bg-zinc-700 focus:bg-zinc-700 focus:text-white"
                                  >
                                    <Copy className="mr-2 h-4 w-4" />
                                    Kopiuj dzień
                                  </DropdownMenuItem>

                                  {/* Delete day - only show if more than 1 day */}
                                  {dayPlans.length > 1 && (
                                    <AlertDialog>
                                      <AlertDialogTrigger asChild>
                                        <DropdownMenuItem
                                          onSelect={(e) => e.preventDefault()}
                                          className="cursor-pointer text-red-400 hover:text-red-300 hover:bg-zinc-700 focus:bg-zinc-700 focus:text-red-300"
                                        >
                                          <Trash className="mr-2 h-4 w-4" />
                                          Usuń dzień
                                        </DropdownMenuItem>
                                      </AlertDialogTrigger>
                                      <AlertDialogContent className="bg-zinc-900 border-zinc-800">
                                        <AlertDialogHeader>
                                          <AlertDialogTitle className="text-zinc-100">Usuń dzień</AlertDialogTitle>
                                          <AlertDialogDescription className="text-zinc-400">
                                            Czy na pewno chcesz usunąć dzień "{day.name}"? Ta akcja jest nieodwracalna.
                                          </AlertDialogDescription>
                                        </AlertDialogHeader>
                                    <AlertDialogFooter>
                                      <AlertDialogCancel className="bg-zinc-800 border-zinc-700 text-zinc-300 hover:bg-zinc-700">
                                        Anuluj
                                      </AlertDialogCancel>
                                      <AlertDialogAction
                                        onClick={() => executeOrConfirmExitCopyMode(() => handleRemoveDay(day.id))}
                                        className="bg-red-600 hover:bg-red-700 text-white"
                                      >
                                        Usuń
                                      </AlertDialogAction>
                                    </AlertDialogFooter>
                                      </AlertDialogContent>
                                    </AlertDialog>
                                  )}
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Add Day Input */}
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-2 lg:ml-4">
                      <Input
                        value={newDayName}
                        onChange={(e) => setNewDayName(e.target.value)}
                        placeholder="Nazwa nowego dnia"
                        className="flex-1 sm:min-w-[150px] h-10 sm:h-8 bg-zinc-800 border-zinc-700 text-zinc-100 text-sm"
                        onKeyPress={(e) => e.key === 'Enter' && executeOrConfirmExitCopyMode(handleAddDay)}
                      />
                      <Button
                        onClick={() => executeOrConfirmExitCopyMode(handleAddDay)}
                        size="sm"
                        disabled={!newDayName.trim()}
                        className="h-10 sm:h-8 w-full sm:w-auto"
                      >
                        <Plus className="h-4 w-4 mr-0 sm:mr-0" />
                        <span className="sm:hidden ml-2">Dodaj dzień</span>
                      </Button>
                    </div>
                  </div>
                </div>

                {currentDay && (
                  <TabsContent value={currentDay.id} className="mt-6 space-y-6">
                    {/* Day Summary - Compact */}
                    {currentDay.meals.length > 0 && (
                      <Card className="bg-gradient-to-r from-zinc-800 to-zinc-700 border-zinc-600">
                        <CardHeader className="pb-3">
                          <CardTitle className="text-zinc-100 text-left text-base sm:text-lg">Podsumowanie dnia</CardTitle>
                        </CardHeader>
                        <CardContent className="pt-0">
                          {/* Mobile: horizontal scroll badges */}
                          <div className="sm:hidden">
                            <div className="flex gap-3 overflow-x-auto pb-2">
                              <div className="flex items-center gap-2 bg-zinc-700/50 rounded-lg px-3 py-2 flex-shrink-0">
                                <span className="text-sm font-bold text-[#a08032]">
                                  {Math.round(dayNutrition.calories)}
                                </span>
                                <span className="text-xs text-zinc-400">kcal</span>
                              </div>
                              <div className="flex items-center gap-2 bg-zinc-700/50 rounded-lg px-3 py-2 flex-shrink-0">
                                <span className="text-sm font-bold text-zinc-100">
                                  {Math.round(dayNutrition.protein)}g
                                </span>
                                <span className="text-xs text-zinc-400">B</span>
                              </div>
                              <div className="flex items-center gap-2 bg-zinc-700/50 rounded-lg px-3 py-2 flex-shrink-0">
                                <span className="text-sm font-bold text-zinc-100">
                                  {Math.round(dayNutrition.carbs)}g
                                </span>
                                <span className="text-xs text-zinc-400">W</span>
                              </div>
                              <div className="flex items-center gap-2 bg-zinc-700/50 rounded-lg px-3 py-2 flex-shrink-0">
                                <span className="text-sm font-bold text-zinc-100">
                                  {Math.round(dayNutrition.fat)}g
                                </span>
                                <span className="text-xs text-zinc-400">T</span>
                              </div>
                              <div className="flex items-center gap-2 bg-zinc-700/50 rounded-lg px-3 py-2 flex-shrink-0">
                                <span className="text-sm font-bold text-zinc-100">
                                  {Math.round(dayNutrition.fiber * 10) / 10}g
                                </span>
                                <span className="text-xs text-zinc-400">Bł</span>
                              </div>
                            </div>
                          </div>

                          {/* Desktop: compact grid */}
                          <div className="hidden sm:grid grid-cols-5 gap-3">
                            <div className="text-center">
                              <div className="text-lg font-bold text-[#a08032]">
                                {Math.round(dayNutrition.calories)}
                              </div>
                              <div className="text-xs text-zinc-400">Kalorie</div>
                            </div>
                            <div className="text-center">
                              <div className="text-lg font-bold text-zinc-100">
                                {Math.round(dayNutrition.protein)}g
                              </div>
                              <div className="text-xs text-zinc-400">Białko</div>
                            </div>
                            <div className="text-center">
                              <div className="text-lg font-bold text-zinc-100">
                                {Math.round(dayNutrition.carbs)}g
                              </div>
                              <div className="text-xs text-zinc-400">Węglowodany</div>
                            </div>
                            <div className="text-center">
                              <div className="text-lg font-bold text-zinc-100">
                                {Math.round(dayNutrition.fat)}g
                              </div>
                              <div className="text-xs text-zinc-400">Tłuszcze</div>
                            </div>
                            <div className="text-center">
                              <div className="text-lg font-bold text-zinc-100">
                                {Math.round(dayNutrition.fiber * 10) / 10}g
                              </div>
                              <div className="text-xs text-zinc-400">Błonnik</div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    )}


                    {/* Meals - Always in Edit Mode */}
                    <DndContext
                      sensors={sensors}
                      collisionDetection={closestCenter}
                      onDragEnd={handleDragEnd}
                    >
                      <SortableContext 
                        items={currentDay.meals.map(meal => meal.id)} 
                        strategy={verticalListSortingStrategy}
                      >
                        <div className="space-y-4">
                          {currentDay.meals.map((meal, index) => (
                            <SortableMeal
                              key={meal.id}
                              meal={meal}
                              dayId={currentDay.id}
                              orderIndex={index}
                              onEdit={handleEditMeal}
                              onDelete={(mealId) => handleDeleteMeal(currentDay.id, mealId)}
                              isCollapsed={!expandedMeals.has(meal.id)}
                              onToggleCollapse={() => toggleMealCollapse(meal.id)}
                              copyPasteState={copyPasteState}
                              onCopyMeal={handleCopyMeal}
                              onClearClipboard={clearClipboard}
                            />
                          ))}
                        </div>
                      </SortableContext>
                    </DndContext>

                    {/* Add Meal Button */}
                    <div className="flex justify-center">
                      <Button
                        onClick={() => executeOrConfirmExitCopyMode(() => handleAddMeal(currentDay.id))}
                        className="w-full sm:w-auto bg-gradient-to-r from-[#a08032] to-[#e6d280] hover:from-[#8a6c2b] hover:to-[#d4c06b] text-zinc-900 font-medium"
                      >
                        <Utensils className="h-4 w-4 mr-2" />
                        Dodaj posiłek
                      </Button>
                    </div>
                  </TabsContent>
                )}
              </Tabs>
            </CardContent>
          </Card>
        </div>

      </div>

      {/* Modals */}
      <DishSelectionModal
        isOpen={isDishSelectionModalOpen}
        onClose={() => {
          setIsDishSelectionModalOpen(false);
          setEditingMeal(undefined);
          setCurrentDayId("");
        }}
        onSelectDish={handleSaveMeal}
        onRefreshData={fetchTemplateData}
        dayPlanId={currentDayId}
        meal={editingMeal}
        context="templateBuilder"
      />
      <ClientAssignmentModal
        isOpen={isAssignmentModalOpen}
        onClose={() => setIsAssignmentModalOpen(false)}
        templateId={templateId || ""}
        templateTitle={templateTitle}
        onSnapshotRefresh={undefined} // Template editor doesn't have client snapshots
      />

      {/* 🎯 DAY COPY: Copy day modal */}
      <CopyDayModal
        isOpen={isCopyDayModalOpen}
        onClose={() => setIsCopyDayModalOpen(false)}
        onConfirm={handleConfirmPasteDay}
        sourceDayPlan={copyPasteDayState.sourceDayPlan}
        availableDays={dayPlans.filter(d => d.id !== copyPasteDayState.sourceDayId)}
        isTemplate={true}
      />

      {/* 🎯 COPY-PASTE: Exit copy mode confirmation modal */}
      <AlertDialog open={showExitCopyModeModal} onOpenChange={setShowExitCopyModeModal}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Zakończyć tryb kopiowania?</AlertDialogTitle>
            <AlertDialogDescription>
              Jesteś w trybie kopiowania posiłków. Czy chcesz wyjść z tego trybu i kontynuować wybraną akcję?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleCancelExitCopyMode}>
              Anuluj
            </AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmExitCopyMode}>
              Tak, wyjdź i kontynuuj
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* 🎯 COPY-PASTE: Floating buttons - responsive (icons on mobile, full buttons on desktop) */}
      {copyPasteState?.isActive && activeDay && (
        <div className="fixed bottom-32 sm:bottom-36 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 z-40 animate-in slide-in-from-bottom duration-200">
          {/* Buttons row */}
          <div className="flex gap-2">
            {/* Wklej posiłek */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePasteMeal(activeDay)}
              className="h-10 sm:h-9 text-sm shadow-lg bg-zinc-900/95 backdrop-blur-sm border-zinc-700 hover:bg-zinc-800"
              title="Wklej posiłek"
            >
              <ClipboardPaste className="h-[18px] w-[18px]" />
              <span className="hidden sm:inline ml-2">Wklej posiłek</span>
            </Button>

            {/* Anuluj wklejanie */}
            <Button
              variant="outline"
              size="sm"
              onClick={clearClipboard}
              className="h-10 sm:h-9 text-sm shadow-lg bg-zinc-900/95 backdrop-blur-sm border-zinc-700 hover:bg-zinc-800"
              title="Anuluj tryb kopiowania"
            >
              <XCircle className="h-4 w-4" />
              <span className="hidden sm:inline ml-2">Anuluj wklejanie</span>
            </Button>
          </div>

          {/* Hint text */}
          <p className="text-xs text-zinc-400 text-center max-w-xs px-4 bg-zinc-900/80 backdrop-blur-sm rounded-md py-1">
            Aby wkleić do innego dnia, wybierz odpowiednią zakładkę
          </p>
        </div>
      )}
    </div>
  );
};

export default TemplateEdit;
