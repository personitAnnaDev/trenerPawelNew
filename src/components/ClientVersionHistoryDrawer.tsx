import React, { useState, useEffect } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { History, Calendar, RotateCcw, Save, Loader2, Trash2, Plus } from "lucide-react";
import { getDietSnapshots, restoreDietSnapshot, createDietSnapshot, deleteDietSnapshots, ensureCurrentSnapshot, DietSnapshot, SnapshotStack } from "@/utils/clientStorage";
import { useToast } from "@/hooks/use-toast";
import { errorLogger } from "@/services/errorLoggingService";
import { logger } from '@/utils/logger';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction
} from "@/components/ui/alert-dialog";

interface ClientVersionHistoryDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  clientName: string;
  clientId: string;
  onDataChange?: () => void;
  currentSnapshotId?: string | null; // 🎯 REACTIVE: Current snapshot ID from undo/redo hook
  snapshotStack?: SnapshotStack | null; // 🎯 STACK FILTER: Show only snapshots in active stack
}

export const ClientVersionHistoryDrawer: React.FC<ClientVersionHistoryDrawerProps> = ({
  isOpen,
  onClose,
  clientName,
  clientId,
  onDataChange,
  currentSnapshotId,
  snapshotStack
}) => {
  const [snapshots, setSnapshots] = useState<DietSnapshot[]>([]);
  const [loading, setLoading] = useState(false);
  const [restoringId, setRestoringId] = useState<string | null>(null);
  const [creatingManual, setCreatingManual] = useState(false);
  const [selectedSnapshots, setSelectedSnapshots] = useState<string[]>([]);
  const [deletingSnapshots, setDeletingSnapshots] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [activeTab, setActiveTab] = useState<'manual' | 'automatic'>('automatic'); // 🆕 Tab state - default to automatic
  const { toast } = useToast();

  // Załaduj snapshoty gdy drawer się otwiera
  useEffect(() => {
    if (isOpen && clientId) {
      loadSnapshots();
    }
  }, [isOpen, clientId]);

  // 🎯 REACTIVE: Update local is_current flag when currentSnapshotId changes (undo/redo happened)
  // NEW: With skipRefresh, DB is now accurate - reload to get fresh is_current flags
  useEffect(() => {
    if (clientId && currentSnapshotId && isOpen) {
      // Only reload if modal is open - otherwise we're wasting resources
      loadSnapshots();
    }
  }, [currentSnapshotId]); // Only depend on currentSnapshotId

  // 🆕 Reset selection when changing tabs
  useEffect(() => {
    setSelectedSnapshots([]);
  }, [activeTab]);

  const loadSnapshots = async () => {
    setLoading(true);
    try {
      // 🛡️ AUTO-FIX: Ensure at least one snapshot is marked as current
      await ensureCurrentSnapshot(clientId);

      // 🆕 Load ALL snapshots (including manual) for version history display
      const data = await getDietSnapshots(clientId, { limit: 50 });
      setSnapshots(data);
    } catch (error) {
      logger.error('Błąd ładowania snapshoty:', error);
      toast({
        title: "Błąd",
        description: "Nie udało się załadować historii wersji.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRestoreVersion = async (snapshotId: string) => {
    setRestoringId(snapshotId);
    try {
      // Find the snapshot to determine its type
      const targetSnapshot = snapshots.find(s => s.id === snapshotId);
      if (!targetSnapshot) {
        toast({
          title: "Błąd",
          description: "Nie znaleziono snapshotu.",
          variant: "destructive",
        });
        return;
      }

      logger.debug('🔍 DEBUG: targetSnapshot.trigger_type:', targetSnapshot.trigger_type);
      logger.debug('🔍 DEBUG: targetSnapshot:', targetSnapshot);

      // Choose restore function based on snapshot type
      let success = false;
      if (targetSnapshot.trigger_type === 'important_notes_updated') {
        logger.debug('✅ DEBUG: Using restoreImportantNotesSnapshot');
        const { restoreImportantNotesSnapshot } = await import("@/utils/clientStorage");
        success = await restoreImportantNotesSnapshot(snapshotId);
      } else {
        logger.debug('⚠️ DEBUG: Using restoreDietSnapshot (trigger_type is not important_notes_updated)');
        success = await restoreDietSnapshot(snapshotId);
      }

      if (success) {
        toast({
          title: "Sukces!",
          description: "Wersja została przywrócona.",
        });
        await loadSnapshots(); // Odśwież listę snapshoty
        await onDataChange?.(); // ✅ Wait for data refresh before closing drawer
        onClose();
      } else {
        toast({
          title: "Błąd",
          description: "Nie udało się przywrócić wersji.",
          variant: "destructive",
        });
      }
    } catch (error) {
      logger.error('Błąd przywracania:', error);

      // Log error to database
      errorLogger.logDatabaseError({
        message: error instanceof Error ? error.message : 'Nieznany błąd przywracania snapshota',
        component: 'ClientVersionHistoryDrawer',
        error: error,
        severity: 'error'
      }).catch(err => logger.warn('Failed to log restore error:', err));

      toast({
        title: "Błąd",
        description: "Wystąpił błąd podczas przywracania wersji.",
        variant: "destructive",
      });
    } finally {
      setRestoringId(null);
    }
  };

  const handleCreateManualSnapshot = async () => {
    setCreatingManual(true);
    try {
      const snapshot = await createDietSnapshot(clientId, {
        trigger_type: 'manual',
        trigger_description: 'Ręczny snapshot utworzony przez trenera',
        version_name: `Wersja z ${new Date().toLocaleDateString('pl-PL')}`
      });
      
      if (snapshot) {
        toast({
          title: "Sukces!",
          description: "Utworzono ręczny snapshot jadłospisu.",
        });
        await loadSnapshots(); // Odśwież listę
      } else {
        toast({
          title: "Błąd",
          description: "Nie udało się utworzyć snapshotu.",
          variant: "destructive",
        });
      }
    } catch (error) {
      logger.error('Błąd tworzenia snapshotu:', error);

      // Log error to database
      errorLogger.logDatabaseError({
        message: error instanceof Error ? error.message : 'Nieznany błąd tworzenia snapshota',
        component: 'ClientVersionHistoryDrawer',
        error: error,
        severity: 'error'
      }).catch(err => logger.warn('Failed to log create snapshot error:', err));

      toast({
        title: "Błąd",
        description: "Wystąpił błąd podczas tworzenia snapshotu.",
        variant: "destructive",
      });
    } finally {
      setCreatingManual(false);
    }
  };

  const handleDeleteSelectedSnapshots = async () => {
    if (selectedSnapshots.length === 0) return;
    setShowDeleteConfirm(true);
  };

  const confirmDeleteSnapshots = async () => {
    setShowDeleteConfirm(false);
    setDeletingSnapshots(true);
    try {
      const success = await deleteDietSnapshots(selectedSnapshots);
      if (success) {
        toast({
          title: "Sukces!",
          description: `Usunięto ${selectedSnapshots.length} wersji jadłospisu.`,
        });
        setSelectedSnapshots([]);
        await loadSnapshots();
      } else {
        toast({
          title: "Błąd",
          description: "Nie udało się usunąć wybranych wersji.",
          variant: "destructive",
        });
      }
    } catch (error) {
      logger.error('Błąd usuwania snapshoty:', error);

      // Show specific error message for current snapshot protection
      const errorMessage = error instanceof Error
        ? error.message
        : "Wystąpił błąd podczas usuwania wersji.";

      // Log error to database
      errorLogger.logDatabaseError({
        message: errorMessage,
        component: 'ClientVersionHistoryDrawer',
        error: error,
        severity: 'error'
      }).catch(err => logger.warn('Failed to log delete error:', err));

      toast({
        title: "Błąd",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setDeletingSnapshots(false);
    }
  };

  const handleToggleSnapshot = (snapshotId: string) => {
    // 🛡️ PROTECTION: Don't allow selecting current snapshots for deletion
    const snapshot = snapshots.find(s => s.id === snapshotId);
    if (snapshot?.is_current) {
      return; // Block selection of current snapshot
    }

    setSelectedSnapshots(prev =>
      prev.includes(snapshotId)
        ? prev.filter(id => id !== snapshotId)
        : [...prev, snapshotId]
    );
  };

  const handleToggleAll = () => {
    // 🛡️ PROTECTION: Only work with non-current snapshots
    const selectableSnapshots = snapshots.filter(s => !s.is_current);

    if (selectedSnapshots.length === selectableSnapshots.length) {
      setSelectedSnapshots([]);
    } else {
      setSelectedSnapshots(selectableSnapshots.map(s => s.id));
    }
  };

  // 🎯 STACK FILTER: Don't filter by stack - show all snapshots from database
  // The stack excludes manual snapshots, so filtering by it would hide manual snapshots in the drawer
  // We want to show ALL snapshots (manual + automatic) in the history drawer
  const stackSnapshotIds = null; // Disabled - was causing manual snapshots to be hidden

  const stackFilteredSnapshots = snapshots; // Show all snapshots from database

  // 🔄 NEWEST FIRST: Display snapshots with newest on top (most recent first)
  // Snapshots from DB are already sorted by created_at DESC, so no need to reverse
  const reversedSnapshots = stackFilteredSnapshots;

  // 🆕 Filter snapshots based on active tab
  // Manual snapshots: ALL manual triggers (including current version)
  const manualSnapshots = reversedSnapshots.filter(s => s.trigger_type === 'manual');
  // Automatic snapshots: ONLY non-manual triggers
  const automaticSnapshots = reversedSnapshots.filter(s => s.trigger_type !== 'manual');
  const displayedSnapshots = activeTab === 'manual' ? manualSnapshots : automaticSnapshots;


  // Update selection state logic to only consider non-current snapshots from displayed snapshots
  const selectableSnapshots = displayedSnapshots.filter(s => !s.is_current);
  const isAllSelected = selectableSnapshots.length > 0 && selectedSnapshots.length === selectableSnapshots.length;
  const isPartiallySelected = selectedSnapshots.length > 0 && selectedSnapshots.length < selectableSnapshots.length;

  const formatTriggerType = (triggerType: string) => {
    const types: { [key: string]: string } = {
      'calculator': 'Kalkulator',
      'meal_added': 'Dodano posiłek',
      'meal_deleted': 'Usunięto posiłek',
      'meal_edited': 'Edycja posiłku',
      'manual': 'Ręczny',
      'important_notes_updated': 'Informacje',
      'template_applied': 'Zastosowano szablon',
      'client_created': 'Nowy klient',
      'meal_reorder': 'Zmiana kolejności'
    };
    return types[triggerType] || triggerType;
  };

  const getTriggerColor = (triggerType: string) => {
    const colors: { [key: string]: string } = {
      'calculator': 'bg-blue-800 text-blue-200',
      'meal_added': 'bg-green-800 text-green-200',
      'meal_deleted': 'bg-red-800 text-red-200',
      'meal_edited': 'bg-yellow-800 text-yellow-200',
      'manual': 'bg-purple-800 text-purple-200',
      'important_notes_updated': 'bg-orange-800 text-orange-200',
      'template_applied': 'bg-indigo-800 text-indigo-200',
      'client_created': 'bg-teal-800 text-teal-200',
      'meal_reorder': 'bg-cyan-800 text-cyan-200'
    };
    return colors[triggerType] || 'bg-gray-800 text-gray-200';
  };

  const formatMacros = (snapshot: DietSnapshot) => {
    const protein = snapshot.total_protein?.toFixed(0) || '0';
    const fat = snapshot.total_fat?.toFixed(0) || '0';
    const carbs = snapshot.total_carbs?.toFixed(0) || '0';
    return `P: ${protein}g, T: ${fat}g, W: ${carbs}g`;
  };

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent side="right" className="w-full sm:max-w-xl bg-zinc-900 border-zinc-800 overflow-y-auto">
        <SheetHeader className="pb-4 sm:pb-6">
          <SheetTitle className="flex items-center text-zinc-100 text-sm sm:text-lg lg:text-xl">
            <History className="h-4 w-4 sm:h-5 sm:w-5 lg:h-6 lg:w-6 mr-2 sm:mr-3 text-zinc-400" />
            <span className="sm:hidden">Historia - {clientName}</span>
            <span className="hidden sm:inline">Historia wersji - {clientName}</span>
          </SheetTitle>
          <SheetDescription className="text-zinc-400 text-xs sm:text-sm">
            <span className="sm:hidden">Przeglądaj i przywracaj wcześniejsze wersje</span>
            <span className="hidden sm:inline">Przeglądaj i przywracaj wcześniejsze wersje jadłospisu oraz ważnych informacji</span>
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-3 sm:space-y-4 lg:space-y-6">
          {/* 🆕 Save Button - Always visible at top */}
          <div className="flex justify-end">
            <Button
              onClick={handleCreateManualSnapshot}
              disabled={creatingManual}
              variant="outline"
              size="sm"
              className="flex items-center gap-1 sm:gap-2 bg-zinc-800 border-zinc-700 text-zinc-100 hover:bg-zinc-700 text-xs sm:text-sm"
            >
              {creatingManual ? (
                <Loader2 className="h-3 w-3 sm:h-4 sm:w-4 animate-spin" />
              ) : (
                <Save className="h-3 w-3 sm:h-4 sm:w-4" />
              )}
              <span className="sm:hidden">Zapisz</span>
              <span className="hidden sm:inline">Zapisz aktualny stan</span>
            </Button>
          </div>

          {/* 🆕 Tab Navigation */}
          <div className="flex gap-0.5 sm:gap-1 p-0.5 sm:p-1 bg-zinc-800/50 border border-zinc-700 rounded-lg">
            <Button
              onClick={() => setActiveTab('automatic')}
              variant={activeTab === 'automatic' ? 'default' : 'ghost'}
              size="sm"
              className={`flex-1 transition-colors text-xs sm:text-sm px-2 sm:px-3 py-1.5 sm:py-2 ${
                activeTab === 'automatic'
                  ? 'bg-[#a08032] hover:bg-[#8d6d2a] text-white'
                  : 'text-zinc-300 hover:bg-zinc-700 hover:text-zinc-100'
              }`}
            >
              <span className="sm:hidden">Auto ({automaticSnapshots.length})</span>
              <span className="hidden sm:inline">Historia automatyczna ({automaticSnapshots.length})</span>
            </Button>
            <Button
              onClick={() => setActiveTab('manual')}
              variant={activeTab === 'manual' ? 'default' : 'ghost'}
              size="sm"
              className={`flex-1 transition-colors text-xs sm:text-sm px-2 sm:px-3 py-1.5 sm:py-2 ${
                activeTab === 'manual'
                  ? 'bg-[#a08032] hover:bg-[#8d6d2a] text-white'
                  : 'text-zinc-300 hover:bg-zinc-700 hover:text-zinc-100'
              }`}
            >
              <span className="sm:hidden">Zapisane ({manualSnapshots.length})</span>
              <span className="hidden sm:inline">Zapisane wersje ({manualSnapshots.length})</span>
            </Button>
          </div>

          {/* Kontrolki zarządzania */}
          <div className="flex flex-col gap-2 sm:gap-3">

            {/* Multi-select kontrolki - pokazuj tylko gdy są snapshoty do zaznaczenia */}
            {selectableSnapshots.length > 0 && (
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-2 sm:p-3 bg-zinc-800/50 border border-zinc-700 rounded-lg">
                <div className="flex items-center gap-2 sm:gap-3">
                  <Checkbox
                    checked={isAllSelected}
                    onCheckedChange={handleToggleAll}
                    className="border-zinc-600 data-[state=checked]:bg-[#a08032] data-[state=checked]:border-[#a08032]"
                  />
                  <div className="flex flex-col sm:flex-row sm:items-center sm:gap-3">
                    <span className="text-xs sm:text-sm text-zinc-300">
                      {isAllSelected ? 'Odznacz wszystkie' : 'Zaznacz wszystkie'}
                    </span>
                    {selectedSnapshots.length > 0 && (
                      <span className="text-xs text-zinc-400">
                        ({selectedSnapshots.length} zaznaczonych)
                      </span>
                    )}
                  </div>
                </div>

                {selectedSnapshots.length > 0 && (
                  <>
                    <Button
                      onClick={handleDeleteSelectedSnapshots}
                      disabled={deletingSnapshots}
                      variant="destructive"
                      size="sm"
                      className="flex items-center gap-1 sm:gap-2 bg-red-700 hover:bg-red-600 text-xs sm:text-sm px-2 sm:px-3 py-1.5 sm:py-2"
                    >
                      {deletingSnapshots ? (
                        <Loader2 className="h-3 w-3 sm:h-4 sm:w-4 animate-spin" />
                      ) : (
                        <Trash2 className="h-3 w-3 sm:h-4 sm:w-4" />
                      )}
                      <span className="sm:hidden">Usuń ({selectedSnapshots.length})</span>
                      <span className="hidden sm:inline">Usuń zaznaczone ({selectedSnapshots.length})</span>
                    </Button>
                    <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
                      <AlertDialogContent className="bg-zinc-900 border-zinc-800">
                        <AlertDialogHeader>
                          <AlertDialogTitle className="text-zinc-100">
                            Usuń zaznaczone wersje
                          </AlertDialogTitle>
                          <AlertDialogDescription className="text-zinc-400">
                            Czy na pewno chcesz usunąć {selectedSnapshots.length} zaznaczonych wersji? Ta akcja jest nieodwracalna.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel className="bg-zinc-800 border-zinc-700 text-zinc-100 hover:bg-zinc-700">
                            Anuluj
                          </AlertDialogCancel>
                          <AlertDialogAction
                            onClick={confirmDeleteSnapshots}
                            className="bg-red-600 hover:bg-red-700"
                          >
                            Usuń ({selectedSnapshots.length})
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </>
                )}
              </div>
            )}
          </div>

          {/* Loading state */}
          {loading && (
            <div className="flex justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-zinc-400" />
            </div>
          )}

          {/* Lista snapshoty */}
          {!loading && snapshots.length > 0 && (
            <div className="space-y-2 sm:space-y-3">
              {displayedSnapshots.length === 0 ? (
                <div className="text-center py-8 sm:py-12 text-zinc-400">
                  <History className="h-12 w-12 sm:h-16 sm:w-16 mx-auto mb-3 sm:mb-4 opacity-30" />
                  <p className="text-base sm:text-lg mb-2">
                    {activeTab === 'manual'
                      ? 'Brak zapisanych wersji'
                      : 'Brak historii automatycznej'
                    }
                  </p>
                  <p className="text-xs sm:text-sm px-2">
                    {activeTab === 'manual'
                      ? 'Użyj przycisku "Zapisz aktualny stan" aby utworzyć ręczny snapshot.'
                      : 'Snapshoty będą tworzone automatycznie przy zmianach w jadłospisie.'
                    }
                  </p>
                </div>
              ) : (
                displayedSnapshots.map((snapshot, index) => (
                  <div
                    key={snapshot.id}
                    className="flex flex-col sm:flex-row sm:items-center gap-3 p-3 sm:p-4 border border-zinc-700 rounded-lg hover:bg-zinc-800 transition-colors"
                  >
                    {/* Mobile: Checkbox and content in same row */}
                    <div className="flex items-center gap-3 flex-1">
                      {/* Checkbox dla snapshot */}
                      <Checkbox
                        checked={selectedSnapshots.includes(snapshot.id)}
                        onCheckedChange={() => handleToggleSnapshot(snapshot.id)}
                        disabled={snapshot.is_current}
                        className="border-zinc-600 data-[state=checked]:bg-[#a08032] data-[state=checked]:border-[#a08032] disabled:opacity-50 disabled:cursor-not-allowed"
                      />

                      <div className="flex-1 min-w-0">
                        <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 mb-2">
                          <div className="flex items-center text-zinc-400">
                            <Calendar className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2 flex-shrink-0" />
                            <span className="text-xs sm:text-sm">
                              {new Date(snapshot.created_at).toLocaleDateString('pl-PL', {
                                day: '2-digit',
                                month: '2-digit',
                                year: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </span>
                          </div>
                          <span className={`inline-flex items-center px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-full text-xs font-medium ${getTriggerColor(snapshot.trigger_type)} flex-shrink-0`}>
                            {formatTriggerType(snapshot.trigger_type)}
                          </span>
                        </div>


                        {snapshot.trigger_description && (
                          <div className="text-xs text-zinc-400 italic mb-1">
                            {snapshot.trigger_description}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Button - full width on mobile, right-aligned on desktop */}
                    <div className="flex sm:flex-shrink-0">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleRestoreVersion(snapshot.id)}
                        disabled={restoringId === snapshot.id || snapshot.is_current}
                        className={`flex items-center gap-1 sm:gap-2 disabled:opacity-50 w-full sm:w-auto text-xs sm:text-sm px-2 sm:px-3 py-1.5 sm:py-2 ${
                          snapshot.is_current
                            ? 'bg-green-800 border-green-700 text-green-200 cursor-not-allowed'
                            : 'bg-zinc-800 border-zinc-700 text-zinc-100 hover:bg-zinc-700'
                        }`}
                      >
                        {restoringId === snapshot.id ? (
                          <>
                            <Loader2 className="h-3 w-3 sm:h-4 sm:w-4 animate-spin" />
                            <span className="sm:hidden">Przywracanie...</span>
                            <span className="hidden sm:inline">Przywracanie...</span>
                          </>
                        ) : (
                          <>
                            {snapshot.is_current ? (
                              <span className="text-xs font-medium">
                                Aktualna
                              </span>
                            ) : (
                              <>
                                <RotateCcw className="h-3 w-3 sm:h-4 sm:w-4" />
                                <span className="sm:hidden">Przywróć</span>
                                <span className="hidden sm:inline">Przywróć</span>
                              </>
                            )}
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
};
