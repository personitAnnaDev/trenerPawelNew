import { useState, useEffect, useMemo, useCallback, useRef, createRef } from "react";
import { useParams, Link, useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, User, FileText, Trash2 } from "lucide-react";
import {
  getClientById,
  deleteClient,
  updateClient,
  Client,
} from "@/utils/clientStorage";
import { useSnapshotUndoRedo } from "@/hooks/useSnapshotUndoRedo";
import { debounceAsync } from "@/utils/debounce";
import { logger } from "@/utils/logger";
import ClientBasicInfo from "@/components/ClientBasicInfo";
import ClientPhysicalParams from "@/components/ClientPhysicalParams";
import ClientDietSettings from "@/components/ClientDietSettings";
import ClientAdditionalInfo from "@/components/ClientAdditionalInfo";
import ClientDietManager from "@/components/ClientDietManager";
import { FloatingActionGroup } from "@/components/FloatingActionGroup";
import { ClientCalorieCalculatorDrawer } from "@/components/ClientCalorieCalculatorDrawer";
import { ClientVersionHistoryDrawer } from "@/components/ClientVersionHistoryDrawer";
import { SaveVersionModal } from "@/components/SaveVersionModal";
import { SaveTemplateModal } from "@/components/SaveTemplateModal";
import { TemplateSelectionModal } from "@/components/TemplateSelectionModal";
import { getTemplateById, addTemplateWithRelations } from "@/utils/supabaseTemplates";
import { supabase } from "@/utils/supabase";
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
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { MacroPlanning, CalculatorResults } from "@/types/macro-planning";
import { useCopyPaste } from "@/hooks/useCopyPaste";

const KlientSzczegoly = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState(searchParams.get('tab') || "szczegoly");
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [client, setClient] = useState<Client | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isDietLoading, setIsDietLoading] = useState(false);

  // 🎯 COPY-PASTE: Initialize useCopyPaste hook at top level
  const { copyPasteState, copyMeal, pasteMeal, clearClipboard } = useCopyPaste();

  // 🎯 COPY-PASTE: Modal potwierdzenia wyjścia z trybu kopiowania
  const [showExitCopyModeModal, setShowExitCopyModeModal] = useState(false);
  const [pendingAction, setPendingAction] = useState<(() => void) | null>(null);
  const [isSavingState, setIsSavingState] = useState<{ [key: string]: boolean }>({});
  const [formData, setFormData] = useState({
    imie: "",
    nazwisko: "",
    dataUrodzenia: "",
    plec: "",
    statusWspolpracy: "",
    rodzajWspolpracy: "",
    statusPlatnosci: "",
    paymentDate: "",
    paymentExpiresAt: "",
    wagaPoczatkowa: 0,
    wzrost: 0,
    obecnyProces: "",
    produktyNielubiane: "",
    alergieZywieniowe: "",
    problemyZdrowotne: "",
    notatkiOgolne: "",
    showMacrosInJadlospis: true,
  });

  // Floating Action Group states
  const [showCalculatorDrawer, setShowCalculatorDrawer] = useState(false);
  const [showHistoryDrawer, setShowHistoryDrawer] = useState(false);
  const [showSaveVersionModal, setShowSaveVersionModal] = useState(false);
  const [isTemplateSelectionModalOpen, setIsTemplateSelectionModalOpen] = useState(false);
  const [isSaveAsTemplateModalOpen, setIsSaveAsTemplateModalOpen] = useState(false);

  // 🔒 REALTIME GUARD ref (used to block Realtime callbacks during undo/redo)
  const isRestoringSnapshotRef = useRef(false);

  // 🔄 Ref to hold refreshDietDataSilent for use in useSnapshotUndoRedo callback
  const refreshDietDataSilentRef = useRef<(preserveHistory?: boolean) => Promise<void>>(async () => {});

  // 🎯 SNAPSHOT UNDO/REDO: Database-backed undo/redo system
  const {
    undo,
    redo,
    canUndo,
    canRedo,
    isLoading: undoRedoLoading,
    refreshSnapshots,
    addNewSnapshot,
    currentSnapshotId: hookSnapshotId,
    snapshotStack: hookSnapshotStack
  } = useSnapshotUndoRedo(
    client?.id || '',
    async () => {
      await refreshDietDataSilentRef.current(true);
    },
    () => {
      // 🚪 FORCE CLOSE: Ensure calculator stays closed after undo/redo
      setShowCalculatorDrawer(false);
      isUsingCalculatorRef.current = false;
      logger.debug('🚪 CALCULATOR FORCED CLOSED via undo/redo callback');
    },
    (active: boolean) => {
      // 🔒 REALTIME GUARD: Control flag from hook BEFORE restore starts
      isRestoringSnapshotRef.current = active;
      logger.debug(active ? '🔒 REALTIME GUARD activated' : '🔓 REALTIME GUARD released');
    }
  );

  // Stany dla jadłospisu - teraz bezpośrednio z bazy, bez undo/redo cache
  const [dayPlans, setDayPlans] = useState<any[]>([]);
  const [dayCalories, setDayCalories] = useState<{ [dayId: string]: number }>({});
  const [dayMacros, setDayMacros] = useState<{ [dayId: string]: MacroPlanning }>({});
  const [calculatorResults, setCalculatorResults] = useState<CalculatorResults | null>(null);
  const [calculatorForceRefresh, setCalculatorForceRefresh] = useState(0); // 🎯 NEW: Force refresh trigger

  // 🎯 UNDO/REDO FIX: Track when user starts editing important notes
  const isEditingImportantNotesRef = useRef(false);
  const isUsingCalculatorRef = useRef(false);

  // 🎯 NEW: Local state for important notes (to avoid DB spam on onChange)
  const [localImportantNotes, setLocalImportantNotes] = useState("");

  // 🎯 NEW: Current snapshot ID for key-based re-mounting
  const [currentSnapshotId, setCurrentSnapshotId] = useState<string | null>(null);

  // 🎯 Height input highlight - for navigation from calculator when height is missing
  const heightInputRef = useRef<HTMLDivElement>(null);
  const [highlightHeight, setHighlightHeight] = useState(false);

  // 🎯 SYNC: Update local snapshot ID when hook provides new one
  useEffect(() => {
    if (hookSnapshotId !== currentSnapshotId) {
      setCurrentSnapshotId(hookSnapshotId);
    }
  }, [hookSnapshotId, currentSnapshotId]);

  // 🎯 SYNC: Update localImportantNotes when client.wazneInformacje changes (e.g., after snapshot restore)
  useEffect(() => {
    if (client?.wazneInformacje !== undefined) {
      setLocalImportantNotes(client.wazneInformacje);
    }
  }, [client?.wazneInformacje]);

  // 🎯 REACT KEY FIX: Stabilne referencje dla dayPlans bez syntetycznych markerów
  const stableDayPlans = useMemo(() => {
    // Zwróć stabilne referencje dla dayPlans z bazy danych z sortowaniem
    return [...dayPlans].sort((a, b) => (a.day_number || 0) - (b.day_number || 0));
  }, [dayPlans]);

  // 🔒 KEYBOARD SHORTCUTS: Protected undo/redo with Ctrl+Z/Ctrl+Y
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Only handle shortcuts on the diet planning tab
      if (activeTab !== 'jadlospis') return;

      // Check for Ctrl+Z (Undo)
      if (event.ctrlKey && event.key === 'z' && !event.shiftKey) {
        event.preventDefault();

        // 🔒 PROTECTION: Check if operation can proceed
        if (canUndo && !undoRedoLoading) {
          logger.debug('🎹 KEYBOARD UNDO: Ctrl+Z pressed');
          undo();
        } else {
          logger.debug('🚫 KEYBOARD UNDO BLOCKED:', { canUndo, undoRedoLoading });
        }
      }

      // Check for Ctrl+Y or Ctrl+Shift+Z (Redo)
      if (event.ctrlKey && (event.key === 'y' || (event.key === 'z' && event.shiftKey))) {
        event.preventDefault();

        // 🔒 PROTECTION: Check if operation can proceed
        if (canRedo && !undoRedoLoading) {
          logger.debug('🎹 KEYBOARD REDO: Ctrl+Y/Ctrl+Shift+Z pressed');
          redo();
        } else {
          logger.debug('🚫 KEYBOARD REDO BLOCKED:', { canRedo, undoRedoLoading });
        }
      }
    };

    // Add event listener
    document.addEventListener('keydown', handleKeyDown);

    // Cleanup
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [activeTab, canUndo, canRedo, undoRedoLoading, undo, redo]);

  // 🎯 COPY-PASTE: Helper function - sprawdza czy jesteśmy w trybie kopiowania
  // Jeśli TAK → pokazuje modal potwierdzenia
  // Jeśli NIE → wykonuje akcję od razu
  const executeOrConfirmExitCopyMode = useCallback((action: () => void) => {
    if (copyPasteState?.isActive) {
      setPendingAction(() => action);
      setShowExitCopyModeModal(true);
    } else {
      action();
    }
  }, [copyPasteState]);

  // Handler do zmiany tab z synchronizacją URL
  const handleTabChange = useCallback((newTab: string) => {
    // 🎯 COPY-PASTE: Sprawdź czy próbujemy wyjść z trybu kopiowania
    if (copyPasteState?.isActive && newTab !== 'jadlospis') {
      executeOrConfirmExitCopyMode(() => {
        setActiveTab(newTab);
        const newParams = new URLSearchParams(searchParams);
        if (newTab === "szczegoly") {
          newParams.delete('tab'); // clean URL for default tab
        } else {
          newParams.set('tab', newTab);
        }
        setSearchParams(newParams, { replace: true });
      });
    } else {
      setActiveTab(newTab);
      const newParams = new URLSearchParams(searchParams);
      if (newTab === "szczegoly") {
        newParams.delete('tab'); // clean URL for default tab
      } else {
        newParams.set('tab', newTab);
      }
      setSearchParams(newParams, { replace: true });
    }
  }, [searchParams, setSearchParams, copyPasteState, executeOrConfirmExitCopyMode]);

  // 🎯 COPY-PASTE: Handler dla potwierdzenia wyjścia z trybu kopiowania
  const handleConfirmExitCopyMode = useCallback(() => {
    if (pendingAction) {
      clearClipboard(); // Wyczyść clipboard
      pendingAction(); // Wykonaj pending action
      setPendingAction(null);
    }
    setShowExitCopyModeModal(false);
  }, [pendingAction, clearClipboard]);

  // 🎯 COPY-PASTE: Handler dla anulowania wyjścia
  const handleCancelExitCopyMode = useCallback(() => {
    setPendingAction(null);
    setShowExitCopyModeModal(false);
  }, []);

  // 🎯 COPY-PASTE: beforeunload protection - warn user on page refresh/close during copy mode
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (copyPasteState?.isActive) {
        e.preventDefault();
        e.returnValue = ''; // Chrome requires returnValue to be set
        return ''; // Some browsers show this message
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [copyPasteState]);

  // Load client data on component mount
  useEffect(() => {
    const loadClient = async () => {
      if (!id) return;
      setIsLoading(true);
      try {
        const clientData = await getClientById(id);
        if (clientData) {
          setClient(clientData);
          setFormData({
            imie: clientData.imie || "",
            nazwisko: clientData.nazwisko || "",
            dataUrodzenia: clientData.dataUrodzenia || "",
            plec: clientData.plec || "",
            statusWspolpracy: clientData.statusWspolpracy || "",
            rodzajWspolpracy: clientData.rodzajWspolpracy || "",
            statusPlatnosci: clientData.statusPlatnosci || "",
            paymentDate: clientData.paymentDate ?? "",
            paymentExpiresAt: clientData.paymentExpiresAt ?? "",
            wagaPoczatkowa: Number(clientData.wagaPoczatkowa) || 0,
            wzrost: Number(clientData.wzrost) || 0,
            obecnyProces: clientData.obecnyProces || "",
            produktyNielubiane: clientData.produktyNielubiane || "",
            alergieZywieniowe: clientData.alergieZywieniowe || "",
            problemyZdrowotne: clientData.problemyZdrowotne || "",
            notatkiOgolne: clientData.notatkiOgolne || "",
            showMacrosInJadlospis: clientData.showMacrosInJadlospis ?? true,
          });

          // 🎯 SYNC: Initialize local important notes from client data
          setLocalImportantNotes(clientData.wazneInformacje || "");

          // Pobierz day_plans i client_diet_settings
          const { getClientDietPlansAndSettings } = await import("@/utils/clientStorage");
          const result = await getClientDietPlansAndSettings(clientData.id);
          if (result && result.settings && result.dayPlans) {
            const loadedDayPlans = result.dayPlans.map((dp: any) => ({
              id: dp.id,
              name: dp.name,
              meals: (dp.meals || []).map((meal: any) => ({
                ...meal,
                countTowardsDailyCalories: meal.count_in_daily_total ?? true
              }))
            }));
            // Set dayPlans state with new data from database
            setDayPlans(loadedDayPlans);

            const calories: { [dayId: string]: number } = {};
            const macros: { [dayId: string]: any } = {};
            result.settings.forEach((s: any) => {
              calories[s.day_plan_id] = Number(s.target_calories) || 0;

              // 🎯 FIX: Populate all MacroPlanning fields correctly (sync with refreshClientData)
              const proteinGrams = Number(s.target_protein_grams) || 0;
              const fatGrams = Number(s.target_fat_grams) || 0;
              const carbsGrams = Number(s.target_carbs_grams) || 0;
              const fiberGrams = Number(s.target_fiber_grams) || 0;

              macros[s.day_plan_id] = {
                calories: Number(s.target_calories) || 0,
                proteinPercentage: Number(s.target_protein_percentage) || 0,
                proteinPerKg: proteinGrams,
                proteinGrams: proteinGrams,
                fatPercentage: Number(s.target_fat_percentage) || 0,
                fatPerKg: fatGrams,
                fatGrams: fatGrams,
                carbsPercentage: Number(s.target_carbs_percentage) || 0,
                carbsPerKg: carbsGrams,
                carbsGrams: carbsGrams,
                fiberPerKg: fiberGrams,
                fiberGrams: fiberGrams
              };
            });
            setDayCalories(calories);
            setDayMacros(macros);
            setCalculatorResults(null);
          }
        }
      } catch (error) {
        toast({
          title: "Błąd",
          description: "Nie udało się załadować danych klienta.",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };

    loadClient();
  }, [id, toast]);

  // Funkcja pomocnicza do mapowania nazw pól na czytelne nazwy
  const getFieldDisplayName = (fieldName: string): string => {
    const fieldNames: { [key: string]: string } = {
      imie: "imię",
      nazwisko: "nazwisko", 
      dataUrodzenia: "datę urodzenia",
      plec: "płeć",
      statusWspolpracy: "status współpracy",
      rodzajWspolpracy: "rodzaj współpracy",
      statusPlatnosci: "status płatności",
      paymentDate: "datę płatności",
      paymentExpiresAt: "datę ważności płatności",
      wagaPoczatkowa: "wagę początkową",
      wzrost: "wzrost",
      obecnyProces: "obecny proces",
      produktyNielubiane: "produkty nielubiane",
      alergieZywieniowe: "alergie żywieniowe", 
      problemyZdrowotne: "problemy zdrowotne",
      notatkiOgolne: "notatki ogólne",
      showMacrosInJadlospis: "ustawienia makroskładników"
    };
    return fieldNames[fieldName] || fieldName;
  };

  // Debounced save function - zapisuje po 1.5 sekundy od ostatniej zmiany
  const debouncedSave = useMemo(() =>
    debounceAsync(async (field: string, value: string | boolean | null) => {
      if (!id || !client) return;
      
      setIsSavingState(prev => ({ ...prev, [field]: true }));
      
      try {
        const updatedClient = { ...client, [field]: value };
        await updateClient(id, updatedClient);
        
        // Aktualizuj client state
        setClient(updatedClient);
        
        // Toast z nazwą pola
        toast({
          title: "Zapisano",
          description: `Zaktualizowano ${getFieldDisplayName(field)}`,
          variant: "default",
        });
      } catch (error) {
        logger.error('Debounced save error:', error);
        toast({
          title: "Błąd zapisu",
          description: `Nie udało się zapisać zmiany w polu: ${getFieldDisplayName(field)}`,
          variant: "destructive",
        });
      } finally {
        setIsSavingState(prev => ({ ...prev, [field]: false }));
      }
    }, 1500), // 1.5 sekundy debounce
    [id, client, toast]
  );

  // Handle form field changes with debounced auto-save
  const handleFormDataChange = useCallback((field: string, value: string | boolean | null) => {
    // Natychmiastowa zmiana UI (optymistyczna aktualizacja)
    setFormData((prev) => ({ ...prev, [field]: value }));

    // Opóźniony zapis do bazy danych
    debouncedSave(field, value);
  }, [debouncedSave]);

  // Handle immediate save without debounce (for critical changes)
  const handleImmediateSave = useCallback(async (updates: Record<string, string | boolean | null>) => {
    if (!id || !client) return;

    try {
      // Natychmiastowa zmiana UI
      setFormData((prev) => ({ ...prev, ...updates }));

      // Natychmiastowy zapis do bazy
      const updatedClient = { ...client, ...updates };
      await updateClient(id, updatedClient);

      // Aktualizuj client state
      setClient(updatedClient);

      toast({
        title: "Zapisano",
        description: "Zmiany zostały zapisane",
        variant: "default",
      });
    } catch (error) {
      logger.error('Immediate save error:', error);
      toast({
        title: "Błąd zapisu",
        description: "Nie udało się zapisać zmian",
        variant: "destructive",
      });
    }
  }, [id, client, toast]);

  // Handle client deletion
  const handleDeleteClient = useCallback(async () => {
    if (!id) return;

    try {
      await deleteClient(id);
      toast({
        title: "Sukces!",
        description: "Klient został usunięty.",
        variant: "default",
      });
      navigate("/klienci");
    } catch (error) {
      toast({
        title: "Błąd",
        description: "Nie udało się usunąć klienta. Spróbuj ponownie.",
        variant: "destructive",
      });
    }
  }, [id, navigate, toast]);
  // Funkcja do odświeżania danych klienta po zmianach - teraz precyzyjna aktualizacja
  const refreshClientData = useCallback(async () => {
    if (!id) return;
    setIsDietLoading(true);
    try {
      const clientData = await getClientById(id);
      if (clientData) {
        setClient(clientData);
        // Pobierz day_plans i client_diet_settings
        const { getClientDietPlansAndSettings } = await import("@/utils/clientStorage");
        const result = await getClientDietPlansAndSettings(clientData.id);
        if (result && result.settings && result.dayPlans) {
          const newDayPlans = result.dayPlans.map((dp: any) => ({
            id: dp.id,
            name: dp.name,
            meals: (dp.meals || []).map((meal: any) => ({
              ...meal,
              countTowardsDailyCalories: meal.count_in_daily_total ?? true
            }))
          }));
          const newDayCalories: { [dayId: string]: number } = {};
          const newDayMacros: { [dayId: string]: any } = {};
          result.settings.forEach((s: any) => {
            newDayCalories[s.day_plan_id] = Number(s.target_calories) || 0;
            // 🎯 FIX: Populate all MacroPlanning fields correctly
            // *PerKg and *Grams are the same value (absolute grams)
            const proteinGrams = Number(s.target_protein_grams) || 0;
            const fatGrams = Number(s.target_fat_grams) || 0;
            const carbsGrams = Number(s.target_carbs_grams) || 0;
            const fiberGrams = Number(s.target_fiber_grams) || 0;

            newDayMacros[s.day_plan_id] = {
              calories: Number(s.target_calories) || 0,
              proteinPercentage: Number(s.target_protein_percentage) || 0,
              proteinPerKg: proteinGrams,
              proteinGrams: proteinGrams,
              fatPercentage: Number(s.target_fat_percentage) || 0,
              fatPerKg: fatGrams,
              fatGrams: fatGrams,
              carbsPercentage: Number(s.target_carbs_percentage) || 0,
              carbsPerKg: carbsGrams,
              carbsGrams: carbsGrams,
              fiberPerKg: fiberGrams,
              fiberGrams: fiberGrams
            };
          });
          // 🎯 FIX: Force React to detect changes by creating new array references
          setDayPlans([...newDayPlans]);
          setDayCalories({...newDayCalories});
          setDayMacros({...newDayMacros});
        }
      }
    } catch (error) {
      logger.error("refreshClientData error:", error);
    } finally {
      setIsDietLoading(false);
    }
  }, [id, setClient, setDayPlans, setDayCalories, setDayMacros, setIsDietLoading]);

  // 🎯 Calculator close handler - extracted from JSX for proper React practices
  const handleCalculatorClose = useCallback(() => {
    setShowCalculatorDrawer(false);
    isUsingCalculatorRef.current = false;
  }, []);

  // 🎯 Navigate to details tab handler - for missing height warning in calculator
  const handleNavigateToDetails = useCallback(() => {
    setShowCalculatorDrawer(false);
    isUsingCalculatorRef.current = false;
    handleTabChange('szczegoly');

    // 🎯 Scroll to height input and highlight it after tab change
    setTimeout(() => {
      if (heightInputRef.current) {
        // Smooth scroll to the input
        heightInputRef.current.scrollIntoView({
          behavior: 'smooth',
          block: 'center'
        });

        // Highlight with golden color
        setHighlightHeight(true);

        // Focus the input
        const input = heightInputRef.current.querySelector('input');
        if (input) {
          input.focus();
        }
      }
    }, 100); // Small delay to ensure tab has switched
  }, [handleTabChange]);

  // 🎯 MEMORY LEAK FIX: Use useRef for calculatorForceRefresh to prevent infinite callback recreation
  const calculatorForceRefreshRef = useRef(0);

  // 🎯 RACE CONDITION FIX: Operation queue for snapshot creation to prevent concurrent operations
  const snapshotOperationQueueRef = useRef<Promise<any>>(Promise.resolve());

  // 🎯 ENHANCED: Complete data refresh including client data for undo/redo synchronization
  const refreshDietDataSilent = useCallback(async (preserveHistory = false, cachedData?: { dietData: any, clientData: any }) => {
    if (!id) return;

    logger.debug('🔄 REFRESH DIET DATA:', {
      clientId: id,
      preserveHistory,
      usingCachedData: !!cachedData,
      triggeredBy: 'manual_refresh_or_undo_redo',
      timestamp: new Date().toISOString()
    });

    try {
      // 🚀 OPTIMIZATION: Use cached data if provided, otherwise fetch from DB
      let clientData: any;
      let result: any;

      if (cachedData) {
        clientData = cachedData.clientData;
        result = cachedData.dietData;
      } else {
        // ✅ Fetch from database
        clientData = await getClientById(id);
        if (clientData) {
          const { getClientDietPlansAndSettings } = await import("@/utils/clientStorage");
          result = await getClientDietPlansAndSettings(clientData.id);
        }
      }

      if (clientData) {
        setClient(clientData); // This will update ważne informacje in UI
        // 🎯 SYNC: Update local important notes from refreshed client data
        setLocalImportantNotes(clientData.wazneInformacje || "");

        if (result && result.settings && result.dayPlans) {
          const newDayPlans = result.dayPlans.map((dp: any) => ({
            id: dp.id,
            name: dp.name,
            meals: (dp.meals || []).map((meal: any) => ({
              ...meal,
              countTowardsDailyCalories: meal.count_in_daily_total ?? true
            }))
          }));
          const newDayCalories: { [dayId: string]: number } = {};
          const newDayMacros: { [dayId: string]: any } = {};
          result.settings.forEach((s: any) => {
            newDayCalories[s.day_plan_id] = Number(s.target_calories) || 0;
            newDayMacros[s.day_plan_id] = {
              calories: Number(s.target_calories) || 0,
              proteinPerKg: Number(s.target_protein_grams) || 0,
              proteinGrams: Number(s.target_protein_grams) || 0,
              proteinPercentage: Number(s.target_protein_percentage) || 0,
              fatPerKg: Number(s.target_fat_grams) || 0,
              fatGrams: Number(s.target_fat_grams) || 0,
              fatPercentage: Number(s.target_fat_percentage) || 0,
              carbsPerKg: Number(s.target_carbs_grams) || 0,
              carbsGrams: Number(s.target_carbs_grams) || 0,
              carbsPercentage: Number(s.target_carbs_percentage) || 0,
              fiberPerKg: Number(s.target_fiber_grams) || 0,
              fiberGrams: Number(s.target_fiber_grams) || 0
            };
          });
          // Użyj preserveHistory aby zdecydować czy zachować undo/redo history
          logger.debug('🔄 SETTING NEW DAY PLANS:', {
            preserveHistory,
            newDayPlansLength: newDayPlans.length,
            newDayPlansIds: newDayPlans.map(d => d.id),
            timestamp: new Date().toISOString()
          });
          // 🎯 FIX: Force React to detect changes by creating new array references
          setDayPlans([...newDayPlans]);
          setDayCalories({...newDayCalories});
          setDayMacros({...newDayMacros});
        }
      }

      // 🎯 FIX: Skip snapshot refresh during undo/redo to preserve local stack state
      // During undo/redo (preserveHistory=true), the hook manages stack locally
      // Calling loadSnapshots would rebuild from database and break navigation
      if (!preserveHistory) {
        await refreshSnapshots();
        logger.debug('📸 SNAPSHOTS REFRESHED:', {
          reason: 'after_data_refresh',
          timestamp: new Date().toISOString()
        });
      } else {
        logger.debug('⏭️ SKIPPING snapshot refresh (undo/redo mode - stack managed locally)');
      }

      // 🎯 MEMORY LEAK FIX: Use ref instead of state to prevent dependency cycle
      if (showCalculatorDrawer) {
        calculatorForceRefreshRef.current += 1;
        setCalculatorForceRefresh(calculatorForceRefreshRef.current);
        logger.debug('🔄 CALCULATOR FORCE REFRESH TRIGGERED:', {
          newRefreshValue: calculatorForceRefreshRef.current,
          reason: 'undo_redo_operation',
          timestamp: new Date().toISOString()
        });
      }
    } catch (error) {
      logger.error("refreshDietDataSilent error:", error);
    }
    // Brak setIsDietLoading - nie pokazuje loadera
  }, [
    id,
    setClient,
    setDayPlans,
    setDayCalories,
    setDayMacros,
    refreshSnapshots,
    showCalculatorDrawer,
    setCalculatorForceRefresh
    // ✅ REMOVED: calculatorForceRefresh (now using ref to break dependency cycle)
  ]);

  // 🔄 Update ref with latest refreshDietDataSilent for use in useSnapshotUndoRedo callback
  useEffect(() => {
    refreshDietDataSilentRef.current = refreshDietDataSilent;
  }, [refreshDietDataSilent]);

  // 🔄 REALTIME: Subscribe to meals and meal_ingredients changes for multi-tab sync
  useEffect(() => {
    if (!id) return;

    // Subscribe to meals table changes
    const mealsChannel = supabase
      .channel(`client-meals-${id}`)
      .on('postgres_changes', {
        event: '*',           // INSERT, UPDATE, DELETE
        schema: 'public',
        table: 'meals'
      }, (payload) => {
        // 🔒 REALTIME GUARD: Skip refresh during undo/redo operations
        if (isRestoringSnapshotRef.current) {
          logger.debug('🔒 Meals changed - SKIPPED (undo/redo in progress)');
          return;
        }
        logger.debug('🔄 Meals changed:', payload);
        // Refresh diet data when meals change
        refreshDietDataSilent(true);
      })
      .subscribe();

    // Subscribe to meal_ingredients table changes
    const ingredientsChannel = supabase
      .channel(`client-meal-ingredients-${id}`)
      .on('postgres_changes', {
        event: '*',           // INSERT, UPDATE, DELETE
        schema: 'public',
        table: 'meal_ingredients'
      }, (payload) => {
        // 🔒 REALTIME GUARD: Skip refresh during undo/redo operations
        if (isRestoringSnapshotRef.current) {
          logger.debug('🔒 Meal ingredients changed - SKIPPED (undo/redo in progress)');
          return;
        }
        logger.debug('🔄 Meal ingredients changed:', payload);
        // Refresh diet data when ingredients change
        refreshDietDataSilent(true);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(mealsChannel);
      supabase.removeChannel(ingredientsChannel);
    };
  }, [id, refreshDietDataSilent]);

  // Funkcja zapisu manualnej wersji
  const handleSaveManualVersion = async (versionName?: string) => {
    if (!client?.id) return;

    const { createDietSnapshot } = await import("@/utils/clientStorage");

    const finalVersionName = versionName ||
      `Manualna wersja ${new Date().toLocaleDateString('pl-PL')} ${new Date().toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' })}`;

    try {
      const newSnapshot = await createDietSnapshot(client.id, {
        trigger_type: 'manual',
        version_name: finalVersionName,
        trigger_description: `Manualne zapisanie wersji: ${finalVersionName}`,
        skipThrottling: true // Manualne snapshoty omijają throttling
      });

      // Add new snapshot to stack locally (O(1) operation)
      if (newSnapshot) {
        addNewSnapshot(newSnapshot);
      }

      toast({
        title: "Wersja zapisana",
        description: `Utworzono manualną wersję: "${finalVersionName}"`,
        variant: "default",
      });
    } catch (error) {
      logger.error("Błąd zapisywania manualnej wersji:", error);
      toast({
        title: "Błąd",
        description: "Nie udało się zapisać wersji jadłospisu",
        variant: "destructive",
      });
      throw error; // Przekaż błąd do modalu
    }
  };

  // 🎯 COPY-PASTE: Handler for copying a meal
  const handleCopyMeal = useCallback((meal: any, dayId: string, orderIndex: number) => {
    copyMeal(meal, dayId, orderIndex);
    toast({
      title: "Posiłek skopiowany",
      description: `Posiłek "${meal.name}" został skopiowany. Kliknij "Wklej posiłek" w wybranym dniu.`,
      variant: "default",
    });
  }, [copyMeal, toast]);

  // 🎯 COPY-PASTE: Handler for pasting a meal
  const handlePasteMeal = useCallback(async (targetDayId: string) => {
    if (!client?.id) return;

    // Get cloned meal from clipboard
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
      const { saveMealWithIngredients } = await import("@/utils/supabaseTemplates");
      const { getClientDietPlansAndSettings, getClientById, createDietSnapshot } = await import("@/utils/clientStorage");

      const mealDataForDb = {
        ...clonedMeal,
        countTowardsDailyCalories: clonedMeal.countTowardsDailyCalories,
      };

      // Save cloned meal to database
      const result = await saveMealWithIngredients(mealDataForDb, targetDayId);

      if (!result.success) {
        toast({
          title: "Błąd",
          description: result.error?.message || "Nie udało się wkleić posiłku.",
          variant: "destructive",
        });
        return;
      }

      // 🚀 OPTIMIZATION: Pobierz świeże dane raz i przekaż je wszędzie
      const freshDietData = await getClientDietPlansAndSettings(client.id);
      const freshClientData = await getClientById(client.id);

      // 🚀 OPTIMIZATION: Refresh UI with cached data
      if (freshDietData && freshClientData) {
        await refreshDietDataSilent(true, { dietData: freshDietData, clientData: freshClientData });
      }

      // 🚀 OPTIMIZATION: Create snapshot with same cached data
      const newSnapshot = await createDietSnapshot(client.id, {
        trigger_type: 'meal_added',
        trigger_description: `Wklejono posiłek: ${clonedMeal.name} (${clonedMeal.calories || 0} kcal)`,
        clearFutureSnapshots: true,
        cachedDietData: freshDietData || undefined,
        cachedClientData: freshClientData || undefined
      });

      // Add new snapshot to stack locally
      if (newSnapshot) {
        addNewSnapshot(newSnapshot);
      }

      // 🎯 UX: Find target day name for toast
      const targetDay = freshDietData?.dayPlans?.find((dp: any) => dp.id === targetDayId);
      const targetDayName = targetDay?.name || 'wybranego dnia';

      // Success toast with day name
      toast({
        title: "Sukces!",
        description: `Posiłek "${clonedMeal.name}" wklejony do ${targetDayName}.`,
        variant: "default",
      });

      // 🎯 UX: Auto-scroll to pasted meal after UI updates
      if (result.mealId) {
        setTimeout(() => {
          const mealElement = document.querySelector(`[data-meal-id="${result.mealId}"]`);
          if (mealElement) {
            mealElement.scrollIntoView({
              behavior: 'smooth',
              block: 'center'
            });
          }
        }, 300); // Wait for UI to render
      }

    } catch (error: any) {
      toast({
        title: "Błąd",
        description: error?.message || "Wystąpił nieoczekiwany błąd podczas wklejania posiłku.",
        variant: "destructive",
      });
    }
  }, [client, toast, pasteMeal, refreshDietDataSilent, addNewSnapshot]);

  const handleApplyTemplate = async (templateId: string) => {
    if (!client) return;

    try {
      // Zamknij modal natychmiast
      setIsTemplateSelectionModalOpen(false);
      
      // Wyczyść stary widok i pokaż loading
      setDayPlans([]);
      setDayCalories({});
      setDayMacros({});
      setIsDietLoading(true);

      // Użyj nowej funkcji applyTemplateToClient z clientStorage
      const { applyTemplateToClient } = await import("@/utils/clientStorage");
      const success = await applyTemplateToClient(client.id, templateId);

      if (success) {
        // Odśwież dane po zastosowaniu szablonu
        await refreshClientData();
        // Ręcznie odśwież snapshoty po zastosowaniu szablonu
        await refreshSnapshots();
        
        
        toast({
          title: "Szablon zastosowany!",
          description: "Jadłospis z szablonu został pomyślnie załadowany do bazy danych.",
          variant: "default",
        });
      } else {
        throw new Error("Operacja zastosowania szablonu nie powiodła się");
      }
    } catch (error) {
      logger.error("Błąd podczas stosowania szablonu:", error);
      toast({
        title: "Błąd",
        description: "Nie udało się zastosować szablonu. Spróbuj ponownie.",
        variant: "destructive",
      });
      // W przypadku błędu, odśwież dane aby przywrócić poprzedni stan
      await refreshClientData();
    }
  };

  // 🎯 EXTRACTED CALLBACK: Calculator save handler moved outside JSX for better performance
  const handleCalculatorSave = useCallback(async (data: any) => {
    if (!client?.id) return;

    // 🎯 CRITICAL FIX: Don't create snapshots during undo/redo operations
    if (undoRedoLoading) {
      return;
    }

    const { updateClient, updateClientDietSettings, createDietSnapshot } = await import("@/utils/clientStorage");

    // Track significant changes for snapshot creation
    let shouldCreateSnapshot = false;
    const changes: string[] = [];

    // Prepare all updates in parallel arrays
    const clientUpdates: any = {};
    const daySettingsUpdates: Array<{dayId: string, settings: any}> = [];

    // Collect client updates
    const currentWeight = client.current_weight ? Number(client.current_weight) : 0;
    if (data.weight !== currentWeight) {
      clientUpdates.current_weight = data.weight;
      changes.push(`waga: ${client.current_weight || 'brak'} → ${data.weight} kg`);
      shouldCreateSnapshot = true;
    }

    if (data.activityLevel !== (client.current_activity_level ?? 1.6)) {
      clientUpdates.current_activity_level = data.activityLevel;
      changes.push(`poziom aktywności: ${client.current_activity_level ?? 1.6} → ${data.activityLevel}`);
      shouldCreateSnapshot = true;
    }

    if (data.results) {
      if (data.results.bmr !== client.bmr) {
        clientUpdates.bmr = data.results.bmr;
      }
      if (data.results.tdee !== client.tdee) {
        clientUpdates.tdee = data.results.tdee;
      }
    }

    // Collect day settings updates
    for (const [dayId, calories] of Object.entries(data.dayCalories)) {
      const currentCalories = dayCalories[dayId];
      const currentMacros = dayMacros[dayId];
      const newMacros = data.dayMacros[dayId];

      // 🎯 FIX: Get day name, handle temp-IDs properly
      const dayPlan = stableDayPlans.find(day => day.id === dayId);
      let dayName = dayPlan?.name || "nowy dzień";

      // Clean up temp-ID references for display
      if (dayId.startsWith('temp-')) {
        dayName = dayPlan?.name || "nowy dzień";
      }

      let hasChanges = false;
      const settings: any = {};

      // Check calories
      if (calories !== currentCalories) {
        const oldCal = currentCalories || 0;
        const newCal = calories || 0;
        settings.target_calories = newCal;
        hasChanges = true;

        // Track calorie changes for snapshot (simplified)
        if (oldCal === 0 && newCal > 0) {
          changes.push(`dodano kalorie dla ${dayName}`);
          shouldCreateSnapshot = true;
        } else if (oldCal > 0 && newCal > 0 && oldCal !== newCal) {
          const changePercent = Math.abs((newCal - oldCal) / oldCal) * 100;
          if (changePercent >= 5) {
            changes.push(`zmieniono kalorie ${dayName}`);
            shouldCreateSnapshot = true;
          }
        }
      }

      // Check macros
      if (newMacros && JSON.stringify(newMacros) !== JSON.stringify(currentMacros)) {
        settings.target_protein_grams = newMacros.proteinPerKg || 0;
        settings.target_protein_percentage = newMacros.proteinPercentage || 0;
        settings.target_fat_grams = newMacros.fatPerKg || 0;
        settings.target_fat_percentage = newMacros.fatPercentage || 0;
        settings.target_carbs_grams = newMacros.carbsPerKg || 0;
        settings.target_carbs_percentage = newMacros.carbsPercentage || 0;
        settings.target_fiber_grams = newMacros.fiberPerKg || 0;
        hasChanges = true;
      }

      if (hasChanges) {
        daySettingsUpdates.push({ dayId, settings });
      }
    }

    // Map temp-ID → real UUID for new days
    const tempIdMapping: { [tempId: string]: string } = {};

    // 🎯 Handle day operations (add, remove, rename)
    if (data.dayOperations) {
      const { addDayPlanAndSettings, deleteDayPlanAndSettings, updateDayPlanName, createDietSnapshot } = await import("@/utils/clientStorage");

      // Handle new days
      for (const newDay of data.dayOperations.newDays) {
        const result = await addDayPlanAndSettings(client.id, newDay.name);
        if (result && newDay.tempId) {
          // Map temp-ID to real UUID
          tempIdMapping[newDay.tempId] = result.dayPlanId;
          changes.push(`dodano dzień "${newDay.name}"`);
          shouldCreateSnapshot = true;
        }
      }

      // Handle removed days
      for (const removedDay of data.dayOperations.removedDays) {
        const result = await deleteDayPlanAndSettings(removedDay.id);
        if (result) {
          changes.push(`usunięto dzień "${removedDay.name}"`);
          shouldCreateSnapshot = true;
        }
      }

      // Handle renamed days
      for (const renamedDay of data.dayOperations.renamedDays) {
        const success = await updateDayPlanName(renamedDay.id, renamedDay.newName);
        if (success) {
          changes.push(`zmieniono nazwę na "${renamedDay.newName}"`);
          shouldCreateSnapshot = true;
        }
      }
    }

    // Refresh client data if day operations were performed
    if (data.dayOperations && (
      data.dayOperations.newDays.length > 0 ||
      data.dayOperations.removedDays.length > 0 ||
      data.dayOperations.renamedDays.length > 0
    )) {
      await refreshClientData();
    }

    // 🎯 PARTIAL FAILURE FIX: Execute all updates with proper error handling
    const promises: Promise<any>[] = [];

    // Update client
    if (Object.keys(clientUpdates).length > 0) {
      promises.push(updateClient(client.id, clientUpdates));
    }

    // Update day settings (map temp IDs to real UUIDs for new days)
    daySettingsUpdates.forEach(({dayId, settings}) => {
      let realDayId = dayId;

      // If it's a temp-ID, try to map it to real UUID
      if (dayId.startsWith('temp-') && tempIdMapping[dayId]) {
        realDayId = tempIdMapping[dayId];
      }

      // Only update if we have a real UUID (not temp-ID without mapping)
      if (!realDayId.startsWith('temp-')) {
        promises.push(updateClientDietSettings(realDayId, settings));
      }
    });

    // Execute all database updates in parallel with allSettled to catch partial failures
    const results = await Promise.allSettled(promises);

    // Check for any failures
    const failures = results.filter(r => r.status === 'rejected');

    if (failures.length > 0) {
      logger.error('❌ Partial failure in calculator save:', failures);

      toast({
        title: "Błąd częściowy",
        description: `${failures.length} z ${promises.length} operacji nie powiodło się. Odświeżam dane...`,
        variant: "destructive",
      });

      // Refresh to sync with DB state
      await refreshClientData();
      return; // Don't proceed with snapshot creation
    }

    // Update local state immediately
    if (Object.keys(clientUpdates).length > 0) {
      setClient({ ...client, ...clientUpdates });
    }
    setDayCalories(data.dayCalories);
    // 🎯 No transformation needed - StepCalorieCalculator now populates all fields correctly
    setDayMacros(data.dayMacros);
    setCalculatorResults(data.results);

    // 🎯 UNDO/REDO FIX: Properly save state to undo/redo history after calculator changes
    // Create comprehensive state snapshot including all updated data
    if (shouldCreateSnapshot || data.dayCalories || data.dayMacros) {
      // Refresh data from database and save to undo history
      await refreshDietDataSilent(true);
    }

    // Create snapshot asynchronously (don't wait for it)
    if (shouldCreateSnapshot && changes.length > 0) {
      // Helper function for proper Polish pluralization
      const getChangesText = (count: number) => {
        if (count === 1) return "1 zmiana";
        if (count >= 2 && count <= 4) return `${count} zmiany`;
        return `${count} zmian`;
      };

      // Create simplified description
      const description = changes.length === 1
        ? `Kalkulator: ${changes[0]}`
        : `Kalkulator: ${getChangesText(changes.length)} w planie`;

      // 🎯 RACE CONDITION FIX: Queue snapshot creation to prevent concurrent operations
      snapshotOperationQueueRef.current = snapshotOperationQueueRef.current
        .then(async () => {
          try {
            const newSnapshot = await createDietSnapshot(client.id, {
              trigger_type: 'calculator',
              trigger_description: description,
            });

            // Add new snapshot to stack locally (O(1) operation)
            if (newSnapshot) {
              addNewSnapshot(newSnapshot);
            }

            toast({
              title: "Zmiany zapisane",
              description: "Kalkulator został zaktualizowany",
              variant: "default",
            });

            return newSnapshot;
          } catch (error) {
            logger.error("❌ Snapshot creation failed:", error);
            toast({
              title: "Błąd",
              description: "Nie udało się utworzyć wersji jadłospisu",
              variant: "destructive",
            });
            throw error;
          }
        })
        .catch((error) => {
          // Prevent queue blocking on errors
          logger.error("❌ Snapshot queue error:", error);
        });
    }
  }, [
    client,
    dayCalories,
    dayMacros,
    stableDayPlans,
    undoRedoLoading,
    refreshClientData,
    refreshDietDataSilent,
    refreshSnapshots,
    setClient,
    setDayCalories,
    setDayMacros,
    setCalculatorResults,
    toast
  ]);

  const handleSaveAsTemplate = async (templateName: string, templateDescription?: string) => {
    if (!client || !stableDayPlans) return;

    try {
      const templateData = {
        title: templateName,
        description: localImportantNotes || templateDescription, // Kopiuj ważne informacje klienta do opisu szablonu
        user_id: client.user_id, // Zakładając, że obiekt client ma user_id
        dayPlans: dayPlans.map((day, index) => ({
          name: day.name,
          day_number: index + 1,
          meals: day.meals
            .sort((a, b) => (a.order_index || 0) - (b.order_index || 0)) // Sortuj po order_index
            .map((meal: any, mealIndex: number) => ({
              ...meal,
              order_index: mealIndex, // Explicit order dla template
              count_in_daily_total: meal.countTowardsDailyCalories,
            })),
        })),
      };

      const result = await addTemplateWithRelations(templateData);

      if (result.success) {
        toast({
          title: "Szablon zapisany",
          description: `Jadłospis został pomyślnie zapisany jako szablon "${templateName}".`,
          variant: "default",
        });
        setIsSaveAsTemplateModalOpen(false);
      } else {
        throw new Error("Nie udało się zapisać szablonu w bazie danych.");
      }
    } catch (error) {
      logger.error("Błąd podczas zapisywania szablonu:", error);
      toast({
        title: "Błąd",
        description: "Nie udało się zapisać jadłospisu jako szablon.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="min-h-screen bg-background p-4 md:p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 mb-6">
          <Button
            variant="ghost"
            size="sm"
            className="p-2 sm:p-3 text-zinc-100 hover:bg-zinc-800"
            onClick={() => executeOrConfirmExitCopyMode(() => navigate('/klienci'))}
          >
            <ArrowLeft className="h-4 w-4 mr-0 sm:mr-2" />
            <span className="hidden sm:inline">Powrót</span>
          </Button>
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl md:text-3xl font-bold text-zinc-100 truncate">
              {formData.imie} {formData.nazwisko}
            </h1>
            <p className="text-zinc-400 mt-1 text-sm md:text-base">
              Szczegóły klienta
            </p>
          </div>
        </div>
        <Tabs
          value={activeTab}
          onValueChange={handleTabChange}
          className="space-y-6"
        >
          {/* ... existing tabs ... */}
          <TabsList className="grid w-full grid-cols-2 h-auto bg-zinc-800 border border-zinc-700">
            <TabsTrigger
              value="szczegoly"
              className="flex items-center justify-center p-3 text-sm data-[state=active]:bg-gradient-to-r data-[state=active]:from-[#a08032] data-[state=active]:to-[#e6d280] data-[state=active]:text-white data-[state=active]:shadow-sm data-[state=inactive]:text-zinc-400 data-[state=inactive]:hover:text-zinc-100 data-[state=inactive]:hover:bg-zinc-700"
            >
              <User className="h-4 w-4 mr-2" />
              <span className="hidden sm:inline">Szczegóły</span>
              <span className="sm:hidden">Info</span>
            </TabsTrigger>
            <TabsTrigger
              value="jadlospis"
              data-testid="diet-tab"
              className="flex items-center justify-center p-3 text-sm data-[state=active]:bg-gradient-to-r data-[state=active]:from-[#a08032] data-[state=active]:to-[#e6d280] data-[state=active]:text-white data-[state=active]:shadow-sm data-[state=inactive]:text-zinc-400 data-[state=inactive]:hover:text-zinc-100 data-[state=inactive]:hover:bg-zinc-700"
            >
              <FileText className="h-4 w-4 mr-2" />
              <span className="hidden sm:inline">Jadłospis</span>
              <span className="sm:hidden">Plan</span>
            </TabsTrigger>
          </TabsList>
          {/* Szczegóły Tab Content */}
          <TabsContent value="szczegoly">
            <div className="space-y-6">
              {/* Delete Button - At the top of Szczegóły tab */}
              <div className="flex justify-end">
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      variant="destructive"
                      size="sm"
                      className="bg-red-600 hover:bg-red-700"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Usuń klienta
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent className="bg-zinc-900 border-zinc-800">
                    <AlertDialogHeader>
                      <AlertDialogTitle className="text-zinc-100">
                        Czy na pewno chcesz usunąć klienta?
                      </AlertDialogTitle>
                      <AlertDialogDescription className="text-zinc-400">
                        Ta akcja jest nieodwracalna. Wszystkie dane klienta{" "}
                        {formData.imie} {formData.nazwisko} zostaną permanentnie
                        usunięte.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel className="bg-zinc-800 border-zinc-700 text-zinc-100 hover:bg-zinc-700">
                        Anuluj
                      </AlertDialogCancel>
                      <AlertDialogAction
                        onClick={handleDeleteClient}
                        className="bg-red-600 hover:bg-red-700 text-white"
                      >
                        Usuń
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
              <ClientBasicInfo
                formData={formData}
                onFormDataChange={handleFormDataChange}
                onImmediateSave={handleImmediateSave}
              />

              <ClientPhysicalParams
                formData={formData}
                onFormDataChange={handleFormDataChange}
                heightInputRef={heightInputRef}
                highlightHeight={highlightHeight}
                onHeightFocus={() => setHighlightHeight(false)}
              />

              <ClientDietSettings
                formData={formData}
                onFormDataChange={handleFormDataChange}
              />

              <ClientAdditionalInfo
                formData={formData}
                onFormDataChange={handleFormDataChange}
              />

              {/* Unified Save and Cancel Buttons */}
            </div>
          </TabsContent>
<TabsContent value="jadlospis">
            {isLoading || isDietLoading ? (
              <div className="flex flex-col items-center justify-center py-12 space-y-4">
                <LoadingSpinner size="lg" />
                <p className="text-zinc-400 text-sm">
                  {isLoading ? "Ładowanie danych klienta..." : "Aktualizowanie jadłospisu..."}
                </p>
              </div>
            ) : (
              <ClientDietManager
                  client={client}
                  dayPlans={stableDayPlans}
                dayCalories={dayCalories}
                dayMacros={dayMacros}
                calculatorResults={calculatorResults}
                initialImportantNotes={localImportantNotes}
                onRefreshData={(cachedData) => refreshDietDataSilent(true, cachedData)}
                setUndoDayPlans={setDayPlans}
                undoDayPlans={stableDayPlans}
                onSelectTemplate={() => executeOrConfirmExitCopyMode(() => setIsTemplateSelectionModalOpen(true))}
                onSaveAsTemplate={() => executeOrConfirmExitCopyMode(() => setIsSaveAsTemplateModalOpen(true))}
                addNewSnapshot={addNewSnapshot}
                copyPasteState={copyPasteState}
                onCopyMeal={handleCopyMeal}
                onPasteMeal={handlePasteMeal}
                onClearClipboard={clearClipboard}
                onImportantNotesChange={(newNotes: string) => {
                  // 🎯 ONLY LOCAL STATE: Update only local state, no DB writes on every keystroke
                  setLocalImportantNotes(newNotes);
                }}
                onImportantNotesFocus={() => {
                  // 🎯 REACT KEY FIX: Zapisz stan przed edycją bez syntetycznych markerów
                  if (!isEditingImportantNotesRef.current) {
                    // Zapisz obecny stan jako punkt undo
                    // 🎯 SNAPSHOT UNDO/REDO: No manual state needed - snapshots handle history
                    isEditingImportantNotesRef.current = true;
                  }
                }}
                onImportantNotesBlur={async () => {
                  // Reset editing flag when user stops editing
                  isEditingImportantNotesRef.current = false;

                  // 🎯 ATOMIC OPERATION: Save to database + create snapshot together
                  if (client?.id) {
                    try {
                      // 1. Save to database first
                      await updateClient(client.id, { wazneInformacje: localImportantNotes });

                      // 2. Update local client state
                      setClient({ ...client, wazneInformacje: localImportantNotes });

                      // 3. Create snapshot with the saved data
                      const { createImportantNotesSnapshot } = await import("@/utils/clientStorage");
                      const newSnapshot = await createImportantNotesSnapshot(client.id, localImportantNotes, {
                      });

                      // 4. Add new snapshot to stack locally (O(1) operation)
                      if (newSnapshot) {
                        addNewSnapshot(newSnapshot);
                      }
                    } catch (error) {
                      logger.error('Error in atomic important notes operation:', error);
                      // 🔄 ROLLBACK: Sync local state back to client data on error
                      setLocalImportantNotes(client.wazneInformacje || "");
                    }
                  }
                }}
                />
            )}
          </TabsContent>
          {/* ... other tabs ... */}
        </Tabs>

        {/* ... existing components ... */}
      {/* Floating Action Buttons */}
      {activeTab === 'jadlospis' && (
        <FloatingActionGroup
          onOpenCalculator={() => executeOrConfirmExitCopyMode(() => {
            // 🎯 REACT KEY FIX: Zapisz stan przed otwarciem kalkulatora bez syntetycznych markerów
            if (!isUsingCalculatorRef.current) {
              // Zapisz obecny stan jako punkt undo
              // 🎯 SNAPSHOT UNDO/REDO: No manual state needed - snapshots handle history
              isUsingCalculatorRef.current = true;
            }
            setShowCalculatorDrawer(true);
          })}
          onOpenHistory={() => executeOrConfirmExitCopyMode(() => setShowHistoryDrawer(true))}
          onUndo={() => {
            undo();
          }}
          onRedo={() => {
            redo();
          }}
          canUndo={canUndo}
          canRedo={canRedo}
          onSaveVersion={() => executeOrConfirmExitCopyMode(() => setShowSaveVersionModal(true))}
          isUndoRedoLoading={undoRedoLoading}
        />
      )}

      {/* Kalkulator kalorii */}
      <ClientCalorieCalculatorDrawer
        isOpen={showCalculatorDrawer}
        onClose={handleCalculatorClose}
        clientAge={client?.dataUrodzenia ? new Date().getFullYear() - new Date(client.dataUrodzenia).getFullYear() : 0}
        clientGender={client?.plec || ""}
        clientHeight={client?.wzrost || ""}
        clientId={client?.id || ""}
        dayPlans={stableDayPlans}
        dayCalories={dayCalories}
        dayMacros={dayMacros}
        calculatorResults={calculatorResults}
        clientWeight={client?.current_weight ? Number(client.current_weight) : 0}
        initialActivityLevel={[client?.current_activity_level ?? 1.6]}
        onSave={handleCalculatorSave}
        onAddDay={undefined}
        onRemoveDay={undefined}
        onDayNameChange={undefined}
        onDataChange={refreshClientData}
        onNavigateToDetails={handleNavigateToDetails}
      />

      {/* Historia wersji */}
      <ClientVersionHistoryDrawer
        isOpen={showHistoryDrawer}
        onClose={() => setShowHistoryDrawer(false)}
        clientName={`${client?.imie || ""} ${client?.nazwisko || ""}`}
        clientId={client?.id || ""}
        onDataChange={refreshClientData}
        currentSnapshotId={hookSnapshotId} // 🎯 REACTIVE: Pass current snapshot ID for reactive updates
        snapshotStack={hookSnapshotStack} // 🎯 STACK FILTER: Pass stack to show only active undo/redo history
      />

      {/* Modal zapisywania wersji */}
      <SaveVersionModal
        isOpen={showSaveVersionModal}
        onClose={() => setShowSaveVersionModal(false)}
        onSave={handleSaveManualVersion}
        clientName={`${client?.imie || ""} ${client?.nazwisko || ""}`}
      />

      <TemplateSelectionModal
        isOpen={isTemplateSelectionModalOpen}
        onClose={() => setIsTemplateSelectionModalOpen(false)}
        onSelectTemplate={handleApplyTemplate}
      />

      <SaveTemplateModal
        isOpen={isSaveAsTemplateModalOpen}
        onClose={() => setIsSaveAsTemplateModalOpen(false)}
        onSave={handleSaveAsTemplate}
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
      </div>
    </div>
  );
};

export default KlientSzczegoly;
