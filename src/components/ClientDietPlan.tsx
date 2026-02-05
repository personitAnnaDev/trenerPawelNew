import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Badge } from "@/components/ui/badge";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { ChevronDown, ChevronUp, ChevronRight, ChevronLeft, Edit, FileText, Download, Plus, Trash, GripVertical, Link, ClipboardPaste, XCircle, MoreVertical, Copy } from "lucide-react";
import type { Client } from "@/utils/clientStorage";
import { useToast } from "@/hooks/use-toast";
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { useSearchParams } from 'react-router-dom';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { SaveTemplateModal } from "@/components/SaveTemplateModal";
import { TemplateSelectionModal } from "@/components/TemplateSelectionModal";
import DishSelectionModal from "@/components/DishSelectionModal";
import SortableMeal from "@/components/SortableMeal";
import { useDietPDFGenerator } from '@/hooks/useDietPDFGenerator';
import { PDFDaySelectionModal } from "@/components/PDFDaySelectionModal";
import { MacroPlanning, CalculatorResults as CalculatorResultsType } from "@/types/macro-planning";
import { CopyPasteState } from "@/hooks/useCopyPaste";
import { logger } from '@/utils/logger';

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
  order_index?: number;
}

interface DayPlan {
  id: string;
  name: string;
  meals: Meal[];
}

interface ClientDietPlanProps {
  client: Client;
  dayPlans: DayPlan[];
  dayCalories: { [dayId: string]: number };
  dayMacros: { [dayId: string]: MacroPlanning };
  calculatorResults: CalculatorResultsType | null;
  onDayPlansChange: (dayPlans: DayPlan[]) => void;
  onDayCaloriesChange: (dayCalories: { [dayId: string]: number }) => void;
  onDayMacrosChange: (dayMacros: { [dayId: string]: MacroPlanning }) => void;
  initialImportantNotes: string;
  onAddMeal: (dayId: string) => void;
  onEditMeal: (dayId: string, meal: Meal) => void;
  onDeleteMeal?: (dayId: string, mealId: string) => void;
  onDragEnd?: (dayId: string, activeId: string, overId: string) => void;
  undo?: () => void;
  redo?: () => void;
  onImportantNotesChange?: (newNotes: string) => Promise<void>;
  onImportantNotesBlur?: () => void;
  onImportantNotesFocus?: () => void;
  canUndo?: boolean;
  canRedo?: boolean;
  onSelectTemplate?: () => void;
  onSaveAsTemplate?: () => void;
  // Copy-paste props (meals)
  copyPasteState?: CopyPasteState;
  onPasteMeal?: (dayId: string) => void;
  onCopyMeal?: (meal: Meal, dayId: string, orderIndex: number) => void;
  onClearClipboard?: () => void;
  // Copy-paste props (days) - FAZA 3 (simplified: copy = immediate modal)
  onCopyDay?: (dayPlan: DayPlan) => void;
  onDeleteDay?: (dayId: string) => void; // Delete day (with validation: length > 1)
}

import { debounceAsync } from "@/utils/debounce";
import { shareOrCopyText } from "@/utils/shareUtils";

export const ClientDietPlan: React.FC<ClientDietPlanProps> = React.memo(({
  client,
  dayPlans,
  dayCalories,
  dayMacros,
  calculatorResults,
  onDayPlansChange,
  onDayCaloriesChange,
  onDayMacrosChange,
  initialImportantNotes,
  onAddMeal,
  onEditMeal,
  onDeleteMeal,
  onDragEnd,
  onSelectTemplate,
  onSaveAsTemplate,
  onImportantNotesChange,
  onImportantNotesBlur,
  onImportantNotesFocus,
  copyPasteState,
  onPasteMeal,
  onCopyMeal,
  onClearClipboard,
  onCopyDay,
  onDeleteDay
}) => {
  // ✅ WSZYSTKIE HOOKI NA POCZĄTKU (rules-of-hooks fix)
  const { toast } = useToast();
  const [isImportantNotesOpen, setIsImportantNotesOpen] = useState(false);
  const [isClientInfoOpen, setIsClientInfoOpen] = useState(false);
  const [importantNotes, setImportantNotes] = useState(initialImportantNotes);
  const [mealCollapsedState, setMealCollapsedState] = useState<{ [mealId: string]: boolean }>({});

  // 🎯 COPY-PASTE: Modal potwierdzenia wyjścia z trybu kopiowania
  const [showExitCopyModeModal, setShowExitCopyModeModal] = useState(false);
  const [pendingAction, setPendingAction] = useState<(() => void) | null>(null);

  // 🎯 UNDO/REDO FIX: Sync local state with props when initialImportantNotes changes
  useEffect(() => {
    setImportantNotes(initialImportantNotes);
  }, [initialImportantNotes]);
  const [isCopyingLink, setIsCopyingLink] = useState(false);
  const [pdfModalOpen, setPdfModalOpen] = useState(false);
  
  // Scrollable tabs state
  const tabsScrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  // Ref dla textarea - auto-resize
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // dayPlans przekazywane przez props
  // Inicjalizuj activeTab - zostanie ustawiony przez useEffect na podstawie pozycji z URL
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState<string>("");

  // 🎯 FIX: Hooks sensors na top-level (nie w .map())
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  // Defensywna tablica dayPlans z mapowaniem składników i sortowaniem po day_number
  const safeDayPlans = Array.isArray(dayPlans)
    ? dayPlans
        .map(day => ({
          ...day,
          meals: Array.isArray(day.meals)
            ? day.meals.map(meal => ({
                ...meal,
                ingredients: meal.ingredients ?? (meal as any).ingredients_json ?? [],
                instructions: typeof meal.instructions === "string" && meal.instructions ? String(meal.instructions).split('\n') : Array.isArray(meal.instructions) ? meal.instructions : []
              }))
            : []
        }))
        // 🎯 Issue #10 FIX: Sortuj dni po day_number dla prawidłowej kolejności
        .sort((a, b) => (a.day_number || 0) - (b.day_number || 0))
    : [];

  // 🎯 FIX: Handler do zmiany dnia z synchronizacją URL - używa pozycji zamiast ID
  const handleDayChange = useCallback((dayId: string) => {
    setActiveTab(dayId);
    // Znajdź pozycję dnia w sortowanej liście
    const dayIndex = safeDayPlans.findIndex(d => d.id === dayId);
    const newParams = new URLSearchParams(searchParams);
    if (dayIndex >= 0) {
      newParams.set('day', dayIndex.toString()); // Zapisz pozycję zamiast ID
    }
    setSearchParams(newParams, { replace: true });
  }, [setActiveTab, searchParams, setSearchParams, safeDayPlans]);

  // 🎯 FIX: Zachowaj pozycję dnia z URL podczas undo/redo (odporny na zmiany ID)
  useEffect(() => {

    if (safeDayPlans.length > 0) {
      // Sprawdź pozycję dnia z URL
      const urlDayIndex = searchParams.get('day');
      const dayIndexNumber = urlDayIndex ? parseInt(urlDayIndex, 10) : -1;
      const isValidIndex = dayIndexNumber >= 0 && dayIndexNumber < safeDayPlans.length;
      const targetDayId = isValidIndex ? safeDayPlans[dayIndexNumber].id : null;


      if (targetDayId && activeTab !== targetDayId) {
        // Zachowaj pozycję dnia z URL po undo/redo
        setActiveTab(targetDayId);
      } else if (!activeTab && !isValidIndex) {
        // Tylko jeśli brak activeTab i brak prawidłowej pozycji - ustaw pierwszy dzień
        const firstDayId = safeDayPlans[0].id;
        handleDayChange(firstDayId); // To zaktualizuje też URL
      } else if (!targetDayId && activeTab && !safeDayPlans.some(d => d.id === activeTab)) {
        // activeTab nie istnieje w dayPlans - resetuj do pierwszego
        const firstDayId = safeDayPlans[0].id;
        handleDayChange(firstDayId);
      }
    } else if (safeDayPlans.length === 0) {
      setActiveTab("");
    }
  }, [safeDayPlans, activeTab, searchParams, handleDayChange]);

  // Debounced save function dla ważnych informacji
  const debouncedSaveImportantNotes = useMemo(() =>
    debounceAsync(async (value: string) => {
      if (!client?.id) return;

      try {
        const { updateClient } = await import("@/utils/clientStorage");
        await updateClient(client.id, { wazneInformacje: value });
        toast({
          title: "Zapisano",
          description: "Zaktualizowano ważne informacje",
          variant: "default",
        });
      } catch (error) {
        logger.error('Debounced save error:', error);
        toast({
          title: "Błąd zapisu",
          description: "Nie udało się zapisać ważnych informacji",
          variant: "destructive",
        });
      }
    }, 1500), // 1.5 sekundy debounce
    [client?.id, toast]
  );

  const handleImportantNotesChange = (value: string) => {
    // 🎯 SNAPSHOT FIX: Removed premature onBlur call - snapshot only on actual blur

    // Natychmiastowa zmiana UI (optymistyczna aktualizacja)
    setImportantNotes(value);

    // 🎯 UNDO/REDO FIX: Use parent callback if provided, otherwise use debounced save
    if (onImportantNotesChange) {
      onImportantNotesChange(value);
    } else {
      // Fallback to original debounced save
      debouncedSaveImportantNotes(value);
    }
  };

  // Funkcja auto-resize dla textarea
  const autoResizeTextarea = () => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px';
    }
  };

  // Effect do auto-resize przy zmianie treści
  useEffect(() => {
    autoResizeTextarea();
  }, [importantNotes]);

  // Effect do auto-resize przy pierwszym renderze i zmianie isImportantNotesOpen
  useEffect(() => {
    if (isImportantNotesOpen) {
      setTimeout(autoResizeTextarea, 100); // Delay dla animacji collapse
    }
  }, [isImportantNotesOpen]);

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
  }, [safeDayPlans.length]);

  // Funkcja do kolorowego kodowania porównań między zaplanowanymi a rzeczywistymi wartościami
  const getComparisonColor = (planned: number, actual: number) => {
    if (planned === 0) return "text-zinc-300"; // Brak planu
    const diff = Math.abs(planned - actual) / planned;
    if (diff <= 0.02) return "text-green-400"; // ±2% - bardzo blisko celu
    if (diff <= 0.10) return "text-yellow-400"; // ±3-10% - akceptowalne
    return "text-red-400"; // >10% - wymaga uwagi
  };

  // Funkcja kopiowania/udostępniania linku współdzielenia (iOS fix)
  const handleCopyShareLink = async () => {
    if (!client?.id) {
      toast({
        title: "Błąd",
        description: "Brak danych klienta.",
        variant: "destructive",
      });
      return;
    }

    setIsCopyingLink(true);

    try {
      // Generuj lub pobierz istniejący token
      const { generateShareToken } = await import("@/utils/clientStorage");
      const token = await generateShareToken(client.id);

      if (!token) {
        toast({
          title: "Błąd",
          description: "Nie udało się wygenerować linku współdzielenia.",
          variant: "destructive",
        });
        return;
      }

      // Stwórz publiczny URL
      const shareUrl = `${window.location.origin}/jadlospis/${token}`;

      // Użyj shareOrCopyText - iOS używa Web Share API, desktop Clipboard API
      const shareResult = await shareOrCopyText(shareUrl, {
        title: 'Link do jadłospisu',
        shareText: `Jadłospis dla ${client.imie || 'klienta'}`
      });

      // Pokaż odpowiedni toast w zależności od wyniku
      if (shareResult.result === 'shared' || shareResult.result === 'copied') {
        toast({
          title: shareResult.result === 'shared' ? "Link udostępniony!" : "Link skopiowany!",
          description: shareResult.message,
          variant: "default",
        });
      } else if (shareResult.result === 'cancelled') {
        // Użytkownik anulował - nie pokazuj błędu
        toast({
          title: "Anulowano",
          description: shareResult.message,
          variant: "default",
        });
      } else {
        // Error - wszystkie metody zawiodły
        toast({
          title: "Błąd kopiowania",
          description: shareResult.message,
          variant: "destructive",
        });
      }

    } catch (error) {
      toast({
        title: "Błąd kopiowania",
        description: "Nie udało się skopiować linku. Spróbuj ponownie.",
        variant: "destructive",
      });
    } finally {
      setIsCopyingLink(false);
    }
  };

  // Hook do nowego generatora PDF z pełnym wsparciem polskich znaków
  const { downloadPDF, isLoading: isGeneratingPDF } = useDietPDFGenerator();

  // ✅ Early return PO wszystkich hookach (rules-of-hooks fix)
  if (!client) {
    return <div>Ładowanie...</div>;
  }

  // 🎯 COPY-PASTE: Helper function - sprawdza czy jesteśmy w trybie kopiowania
  // Jeśli TAK → pokazuje modal potwierdzenia
  // Jeśli NIE → wykonuje akcję od razu
  const executeOrConfirmExitCopyMode = (action: () => void) => {
    if (copyPasteState?.isActive) {
      setPendingAction(() => action);
      setShowExitCopyModeModal(true);
    } else {
      action();
    }
  };

  // 🎯 COPY-PASTE: Handler dla potwierdzenia wyjścia z trybu kopiowania
  const handleConfirmExitCopyMode = () => {
    if (pendingAction) {
      onClearClipboard?.(); // Wyczyść clipboard
      pendingAction(); // Wykonaj pending action
      setPendingAction(null);
    }
    setShowExitCopyModeModal(false);
  };

  // 🎯 COPY-PASTE: Handler dla anulowania wyjścia
  const handleCancelExitCopyMode = () => {
    setPendingAction(null);
    setShowExitCopyModeModal(false);
  };

  // Otwórz modal wyboru dni do PDF
  const handleDownloadPDF = async () => {
    if (!client || safeDayPlans.length === 0) {
      toast({
        title: "Brak danych",
        description: "Nie można wygenerować PDF - brak jadłospisu lub danych klienta.",
        variant: "destructive",
      });
      return;
    }

    setPdfModalOpen(true);
  };

  // Generuj PDF dla wybranych dni
  const handleGeneratePDF = async (selectedDayIds: string[]) => {
    if (!client || safeDayPlans.length === 0) {
      toast({
        title: "Brak danych",
        description: "Nie można wygenerować PDF - brak jadłospisu lub danych klienta.",
        variant: "destructive",
      });
      return;
    }


    try {
      toast({
        title: "Generowanie PDF",
        description: "Generowanie PDF z fontami Roboto i obrazami nagłówka/stopki...",
        variant: "default",
      });

      // Przygotuj dane dla nowego generatora PDF z filtrowanymi dniami
      const pdfData = {
        client,
        dayPlans: safeDayPlans,
        dayCalories,
        dayMacros,
        calculatorResults,
        importantNotes,
        showMacros: client.showMacrosInJadlospis ?? true,
        selectedDayIds // Nowy parametr do filtrowania dni
      };

      // Generuj i pobierz PDF przy użyciu nowej biblioteki (iOS: Web Share API)
      const pdfResult = await downloadPDF(pdfData);

      // Pokaż odpowiedni toast w zależności od wyniku
      if (pdfResult.result === 'shared' || pdfResult.result === 'copied') {
        toast({
          title: pdfResult.result === 'shared' ? "PDF udostępniony!" : "PDF wygenerowany! 🎉",
          description: pdfResult.message,
          variant: "default",
        });
      } else if (pdfResult.result === 'cancelled') {
        toast({
          title: "Anulowano",
          description: pdfResult.message,
          variant: "default",
        });
      } else {
        toast({
          title: "Błąd generowania PDF",
          description: pdfResult.message,
          variant: "destructive",
        });
      }

    } catch (error) {
      toast({
        title: "Błąd generowania PDF",
        description: "Nie udało się wygenerować pliku PDF. Spróbuj ponownie.",
        variant: "destructive",
      });
    } finally {
      setPdfModalOpen(false);
    }
  };

  // const safeDayPlans = Array.isArray(dayPlans) ? dayPlans : [];

  return (
    <div className="space-y-6">
      {/* Diet Header */}
      <Card className="component-card">
        <CardHeader>
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <CardTitle className="text-2xl md:text-3xl brand-text-primary">
              Dieta dla {client.imie} {client.nazwisko}
            </CardTitle>
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                onClick={() => executeOrConfirmExitCopyMode(() => onSelectTemplate?.())}
              >
                <FileText className="h-4 w-4 mr-2" />
                Wybierz szablon
              </Button>
              <Button
                variant="outline"
                onClick={() => executeOrConfirmExitCopyMode(() => onSaveAsTemplate?.())}
              >
                <FileText className="h-4 w-4 mr-2" />
                Zapisz jako szablon
              </Button>
              <Button
                variant="outline"
                onClick={() => executeOrConfirmExitCopyMode(handleDownloadPDF)}
                disabled={isGeneratingPDF}
              >
                {isGeneratingPDF ? (
                  <>
                    <LoadingSpinner size="sm" className="mr-2" />
                    Generowanie...
                  </>
                ) : (
                  <>
                    <Download className="h-4 w-4 mr-2" />
                    Pobierz PDF
                  </>
                )}
              </Button>
              <Button 
                variant="outline"
                onClick={handleCopyShareLink}
                disabled={isCopyingLink}
              >
                {isCopyingLink ? (
                  <>
                    <LoadingSpinner size="sm" className="mr-2" />
                    Kopiowanie...
                  </>
                ) : (
                  <>
                    <Link className="h-4 w-4 mr-2" />
                    Kopiuj link
                  </>
                )}
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Important Notes - Separate Collapsible */}
      <Collapsible open={isImportantNotesOpen} onOpenChange={setIsImportantNotesOpen}>
        <Card className="component-card">
          <CollapsibleTrigger asChild>
            <CardHeader className="px-2 py-1 cursor-pointer hover:bg-zinc-800/50 transition-colors">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base brand-text-secondary">Ważne informacje</CardTitle>
                {isImportantNotesOpen ? (
                  <ChevronUp className="h-3 w-3 transition-transform" />
                ) : (
                  <ChevronDown className="h-3 w-3 transition-transform" />
                )}
              </div>
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent className="pt-0">
              <Textarea
                ref={textareaRef}
                value={importantNotes}
                onFocus={() => {
                  // 🎯 UNDO/REDO FIX: Save state when user starts editing
                  if (onImportantNotesFocus) {
                    onImportantNotesFocus();
                  }
                }}
                onChange={(e) => {
                  handleImportantNotesChange(e.target.value);
                  autoResizeTextarea();
                }}
                onBlur={() => {
                  // 🎯 UNDO/REDO FIX: Save state to undo history when user finishes editing
                  if (onImportantNotesBlur) {
                    onImportantNotesBlur();
                  }
                }}
                placeholder="Dodaj ważne informacje dotyczące jadłospisu..."
                className="min-h-[100px] input-dark resize-none overflow-hidden"
                style={{ height: 'auto' }}
              />
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      {/* Client Info - Separate Collapsible */}
      <Collapsible open={isClientInfoOpen} onOpenChange={setIsClientInfoOpen}>
        <Card className="component-card">
          <CollapsibleTrigger asChild>
            <CardHeader className="px-2 py-1 cursor-pointer hover:bg-zinc-800/50 transition-colors">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base brand-text-secondary">Informacje o kliencie</CardTitle>
                {isClientInfoOpen ? (
                  <ChevronUp className="h-3 w-3 transition-transform" />
                ) : (
                  <ChevronDown className="h-3 w-3 transition-transform" />
                )}
              </div>
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent className="pt-0">
              <div className="grid gap-3">
                <div>
                  <label className="block text-xs font-medium brand-text-secondary mb-1">
                    Lista produktów, których nie lubi jeść:
                  </label>
                  <div className="p-2 brand-bg-gray rounded border brand-border">
                    <p className="text-xs brand-text-secondary leading-relaxed">
                      {client.produktyNielubiane || "Brak informacji"}
                    </p>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium brand-text-secondary mb-1">
                    Alergie żywieniowe:
                  </label>
                  <div className="p-2 brand-bg-gray rounded border brand-border">
                    <p className="text-xs brand-text-secondary leading-relaxed">
                      {client.alergieZywieniowe || "Brak informacji"}
                    </p>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium brand-text-secondary mb-1">
                    Problemy ze zdrowiem (przebyte i obecne):
                  </label>
                  <div className="p-2 brand-bg-gray rounded border brand-border">
                    <p className="text-xs brand-text-secondary leading-relaxed">
                      {client.problemyZdrowotne || "Brak informacji"}
                    </p>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium brand-text-secondary mb-1">
                    Obecny proces:
                  </label>
                  <div className="p-2 brand-bg-gray rounded border brand-border">
                    <p className="text-xs brand-text-secondary leading-relaxed">
                      {client.obecnyProces || "Brak informacji"}
                    </p>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium brand-text-secondary mb-1">
                    Notatki ogólne:
                  </label>
                  <div className="p-2 brand-bg-gray rounded border brand-border">
                    <p className="text-xs brand-text-secondary leading-relaxed">
                      {client.notatkiOgolne || "Brak informacji"}
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      {/* Day Tabs - Diet Creation Interface */}
      <Card className="component-card">
        <CardContent className="p-0">
          {(safeDayPlans.length === 0) ? (
            <div key="no-days" className="p-12 text-center text-zinc-400">
              Brak dni w jadłospisie. Dodaj dzień, aby rozpocząć planowanie.
            </div>
          ) : (
            <Tabs key="tabs-container" value={activeTab} onValueChange={handleDayChange} className="w-full">
              <div className="brand-border border-b">
                <div className="flex items-center py-4 px-2">
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
                      <div key="day-buttons-container" className="flex">
                        {safeDayPlans.map((day) => (
                          <div
                            key={day.id}
                            className="border-r border-zinc-800 last:border-r-0 flex-shrink-0 relative"
                          >
                            <button
                              onClick={() => handleDayChange(day.id)}
                              data-testid={`day-tab-${day.id}`}
                              className={`py-3 pl-4 pr-8 text-sm font-medium whitespace-nowrap transition-colors group ${
                                activeTab === day.id
                                  ? 'bg-gradient-to-r from-[#a08032] to-[#e6d280] text-white shadow-sm'
                                  : 'brand-text-gray hover:brand-text-secondary hover:bg-zinc-700'
                              }`}
                            >
                              {day.name}
                            </button>
                            {/* 🎯 FAZA 3: Day dropdown menu (3 dots) - positioned outside button to avoid nesting */}
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
                            <DropdownMenuContent align="end" className="w-56">
                              {onCopyDay && (
                                <DropdownMenuItem onClick={() => onCopyDay(day)}>
                                  <Copy className="mr-2 h-4 w-4" />
                                  Kopiuj dzień
                                </DropdownMenuItem>
                              )}

                              {safeDayPlans.length > 1 && onDeleteDay && (
                                <>
                                  <DropdownMenuSeparator />
                                  <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                      <DropdownMenuItem
                                        onSelect={(e) => e.preventDefault()}
                                        className="cursor-pointer text-red-400 hover:text-red-300 hover:bg-zinc-700 focus:bg-zinc-700"
                                      >
                                        <Trash className="mr-2 h-4 w-4" />
                                        Usuń dzień
                                      </DropdownMenuItem>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent>
                                      <AlertDialogHeader>
                                        <AlertDialogTitle>Usuń dzień</AlertDialogTitle>
                                        <AlertDialogDescription>
                                          Czy na pewno chcesz usunąć dzień "{day.name}"? Tej operacji nie można cofnąć.
                                        </AlertDialogDescription>
                                      </AlertDialogHeader>
                                      <AlertDialogFooter>
                                        <AlertDialogCancel>Anuluj</AlertDialogCancel>
                                        <AlertDialogAction
                                          onClick={() => onDeleteDay(day.id)}
                                          className="bg-red-500 hover:bg-red-600"
                                        >
                                          Usuń
                                        </AlertDialogAction>
                                      </AlertDialogFooter>
                                    </AlertDialogContent>
                                  </AlertDialog>
                                </>
                              )}
                            </DropdownMenuContent>
                            </DropdownMenu>
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
                </div>
              </div>

              {safeDayPlans.map((day) => {
                // 🎯 FIX: Round each meal's macros first, then sum - to match displayed values
                // This ensures sum matches what user sees (e.g., 34g + 14g = 48g, not 47g)
                const actualTotals = {
                  calories: day.meals.reduce((sum, meal) => sum + (meal.countTowardsDailyCalories ? Math.round(meal.calories) : 0), 0),
                  protein: day.meals.reduce((sum, meal) => sum + (meal.countTowardsDailyCalories ? Math.round(meal.protein) : 0), 0),
                  fat: day.meals.reduce((sum, meal) => sum + (meal.countTowardsDailyCalories ? Math.round(meal.fat) : 0), 0),
                  carbs: day.meals.reduce((sum, meal) => sum + (meal.countTowardsDailyCalories ? Math.round(meal.carbs) : 0), 0),
                  fiber: day.meals.reduce((sum, meal) => sum + (meal.countTowardsDailyCalories ? Math.round(meal.fiber) : 0), 0)
                };

                const plannedCalories = dayCalories[day.id] || 0;
                const plannedProtein = dayMacros[day.id]?.proteinGrams || 0;
                const plannedFat = dayMacros[day.id]?.fatGrams || 0;
                const plannedCarbs = dayMacros[day.id]?.carbsGrams || 0;
                const plannedFiber = dayMacros[day.id]?.fiberGrams || 0;

                return (
                  <TabsContent key={day.id} value={day.id} className="p-6">
                    {/* Day Summary */}
                    {(day.meals.length > 0 || plannedCalories > 0) && (
                      <div className="mb-6 p-4 brand-bg-gray rounded-lg brand-border border">
                        <h4 className="font-medium brand-text-primary mb-3">Podsumowanie dnia:</h4>
                        
                        {(client?.bmr || client?.tdee || calculatorResults) && (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4 pb-4 border-b border-zinc-700">
                            <div>
                              <span className="text-zinc-300">PPM:</span>
                              <div className="font-bold text-[#e6d280]">
                                {client?.bmr || calculatorResults?.bmr} kcal/dzień
                              </div>
                            </div>
                            <div>
                              <span className="text-zinc-300">CPM:</span>
                              <div className="font-bold text-[#e6d280]">
                                {client?.tdee || calculatorResults?.tdee} kcal/dzień
                              </div>
                            </div>
                          </div>
                        )}

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 text-sm">
                          <div className="space-y-2">
                            <div>
                              <span className="text-zinc-300">Zaplanowane kalorie:</span>
                              <div className="font-bold text-white">
                                {plannedCalories > 0 ? `${Math.round(plannedCalories)} kcal` : "Nie ustawiono"}
                              </div>
                            </div>
                            <div>
                              <span className="text-zinc-300">Kalorie:</span>
                              <div className={`font-bold ${getComparisonColor(plannedCalories, actualTotals.calories)}`}>
                                {actualTotals.calories} kcal
                              </div>
                            </div>
                          </div>
                          
                          <div className="space-y-2">
                            <div>
                              <span className="text-zinc-300">Zaplanowane białko:</span>
                              <div className="font-bold text-white">
                                {plannedProtein > 0 ? `${Math.round(plannedProtein)}g` : "Nie ustawiono"}
                              </div>
                            </div>
                            <div>
                              <span className="text-zinc-300">Białko:</span>
                              <div className={`font-bold ${getComparisonColor(plannedProtein, actualTotals.protein)}`}>
                                {actualTotals.protein}g
                              </div>
                            </div>
                          </div>
                          
                          <div className="space-y-2">
                            <div>
                              <span className="text-zinc-300">Zaplanowane tłuszcze:</span>
                              <div className="font-bold text-white">
                                {plannedFat > 0 ? `${Math.round(plannedFat)}g` : "Nie ustawiono"}
                              </div>
                            </div>
                            <div>
                              <span className="text-zinc-300">Tłuszcze:</span>
                              <div className={`font-bold ${getComparisonColor(plannedFat, actualTotals.fat)}`}>
                                {actualTotals.fat}g
                              </div>
                            </div>
                          </div>

                          <div className="space-y-2">
                            <div>
                              <span className="text-zinc-300">Zaplanowane węglowodany:</span>
                              <div className="font-bold text-white">
                                {plannedCarbs > 0 ? `${Math.round(plannedCarbs)}g` : "Nie ustawiono"}
                              </div>
                            </div>
                            <div>
                              <span className="text-zinc-300">Węglowodany:</span>
                              <div className={`font-bold ${getComparisonColor(plannedCarbs, actualTotals.carbs)}`}>
                                {actualTotals.carbs}g
                              </div>
                            </div>
                          </div>

                          <div className="space-y-2">
                            <div>
                              <span className="text-zinc-300">Zaplanowany błonnik:</span>
                              <div className="font-bold text-white">
                                {plannedFiber > 0 ? `${Math.round(plannedFiber)}g` : "Nie ustawiono"}
                              </div>
                            </div>
                            <div>
                              <span className="text-zinc-300">Błonnik:</span>
                              <div className={`font-bold ${getComparisonColor(plannedFiber, actualTotals.fiber)}`}>
                                {actualTotals.fiber}g
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {day.meals.length > 0 ? (
                      <DndContext
                        sensors={sensors}
                        collisionDetection={closestCenter}
                        onDragEnd={event => {
                          const { active, over } = event;
                          if (active.id !== over?.id && onDragEnd) {
                            onDragEnd(day.id, String(active.id), String(over?.id));
                          }
                        }}
                      >
                        <SortableContext
                          items={day.meals.map(meal => meal.id)}
                          strategy={verticalListSortingStrategy}
                        >
                          <div className="space-y-4">
                            {[...day.meals]
                              .sort((a, b) => (a.order_index ?? 0) - (b.order_index ?? 0))
                              .map((meal) => (
                                <SortableMeal
                                  key={meal.id}
                                  meal={meal}
                                  onEdit={() => onEditMeal?.(day.id, meal)}
                                  onDelete={(mealId) => onDeleteMeal?.(day.id, mealId)}
                                  isCollapsed={mealCollapsedState[meal.id] ?? true}
                                  onToggleCollapse={() => {
                                    setMealCollapsedState(prev => ({
                                      ...prev,
                                      [meal.id]: !prev[meal.id]
                                    }));
                                  }}
                                  dayId={day.id}
                                  orderIndex={meal.order_index ?? 0}
                                  copyPasteState={copyPasteState}
                                  onCopyMeal={(meal, dayId, orderIndex) => onCopyMeal?.(meal, dayId, orderIndex)}
                                  onClearClipboard={() => onClearClipboard?.()}
                                />
                              ))}
                          </div>
                        </SortableContext>
                      </DndContext>
                    ) : (
                      <div className="text-center brand-text-gray py-8">
                        <p>Jadłospis dla dnia "{day.name}" - w przygotowaniu</p>
                      </div>
                    )}
                    
                    <div className="mt-4 flex justify-center">
                      <Button
                        onClick={() => executeOrConfirmExitCopyMode(() => activeTab && onAddMeal(activeTab))}
                        data-testid="add-meal-button"
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Dodaj posiłek
                      </Button>
                    </div>
                  </TabsContent>
                );
              })}
            </Tabs>
          )}
        </CardContent>
      </Card>

      {/* PDF Day Selection Modal */}
      <PDFDaySelectionModal
        isOpen={pdfModalOpen}
        onClose={() => setPdfModalOpen(false)}
        dayPlans={safeDayPlans}
        onGenerate={handleGeneratePDF}
        clientName={`${client.imie} ${client.nazwisko}`}
        isGenerating={isGeneratingPDF}
        showMacros={client.showMacrosInJadlospis ?? true} // Przekaż ustawienie showMacros do modalu
      />

      {/* 🎯 COPY-PASTE: Modal potwierdzenia wyjścia z trybu kopiowania */}
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

      {/* Modal jest teraz zarządzany przez ClientDietManager */}

      {/* 🎯 COPY-PASTE: Floating buttons - responsive (icons on mobile, full buttons on desktop) */}
      {copyPasteState?.isActive && onPasteMeal && activeTab && (
        <div className="fixed bottom-32 sm:bottom-36 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 z-40 animate-in slide-in-from-bottom duration-200">
          {/* Buttons row */}
          <div className="flex gap-2">
            {/* Wklej posiłek */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPasteMeal(activeTab)}
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
              onClick={() => onClearClipboard?.()}
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
});
