import { useState, useCallback, useEffect, useRef } from 'react';
import { getDietSnapshots, restoreDietSnapshot, restoreImportantNotesSnapshot, ensureCurrentSnapshot, DietSnapshot, SnapshotStack, buildSnapshotStack, createDietSnapshot } from '@/utils/clientStorage';
import { toast } from '@/hooks/use-toast';
import { logger } from '@/utils/logger';

interface UseSnapshotUndoRedoReturn {
  undo: () => Promise<void>;
  redo: () => Promise<void>;
  canUndo: boolean;
  canRedo: boolean;
  isLoading: boolean;
  snapshotStack: SnapshotStack | null;
  refreshSnapshots: () => Promise<void>;
  addNewSnapshot: (newSnapshot: DietSnapshot) => void;
  currentSnapshotId: string | null;
}

export function useSnapshotUndoRedo(
  clientId: string,
  onRefresh: () => Promise<void>,
  onCloseCalculator?: () => void, // 🎯 NEW: Calculator closure callback
  onSetRealtimeGuard?: (active: boolean) => void // 🔒 REALTIME GUARD: Set/unset guard before/after restore
): UseSnapshotUndoRedoReturn {
  const [snapshotStack, setSnapshotStack] = useState<SnapshotStack | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [currentSnapshotId, setCurrentSnapshotId] = useState<string | null>(null);

  // 🔒 PROTECTION: Prevent multiple simultaneous operations
  const operationInProgress = useRef(false);
  const lastOperationTime = useRef(0);
  const DEBOUNCE_DELAY = 500; // 500ms delay between operations

  // 🔒 PROTECTION: Check if operation can proceed
  const canProceedWithOperation = useCallback(() => {
    const now = Date.now();

    // Check if operation is already in progress
    if (operationInProgress.current) {
      return false;
    }

    // Check debounce delay
    if (now - lastOperationTime.current < DEBOUNCE_DELAY) {
      return false;
    }

    return true;
  }, []);

  // 🔒 PROTECTION: Start operation with protection
  const startProtectedOperation = useCallback((operationType: 'undo' | 'redo') => {
    operationInProgress.current = true;
    lastOperationTime.current = Date.now();

    // 🔔 UX: Show toast only for slow operations (>1000ms)
    const slowOperationTimer = setTimeout(() => {
      if (operationInProgress.current) {
        const toastResult = toast({
          title: operationType === 'undo' ? 'Cofanie...' : 'Przywracanie...',
          description: 'Operacja trwa dłużej niż zwykle',
          variant: 'default',
        });
        // Store toast dismiss function for cleanup
        (operationInProgress as any).activeToastDismiss = toastResult.dismiss;
      }
    }, 1000);

    // Store timer reference for cleanup
    (operationInProgress as any).slowOperationTimer = slowOperationTimer;
  }, []);

  // 🔒 PROTECTION: End operation
  const endProtectedOperation = useCallback((success: boolean, operationType: 'undo' | 'redo') => {
    const operationDuration = Date.now() - lastOperationTime.current;

    // Clear slow operation timer
    if ((operationInProgress as any).slowOperationTimer) {
      clearTimeout((operationInProgress as any).slowOperationTimer);
      (operationInProgress as any).slowOperationTimer = null;
    }

    // 🎯 AUTO-HIDE: Dismiss active loading toast when operation completes
    if ((operationInProgress as any).activeToastDismiss) {
      (operationInProgress as any).activeToastDismiss();
      (operationInProgress as any).activeToastDismiss = null;
    }

    operationInProgress.current = false;

    // 🔔 UX: Show toast only for errors or very slow operations that completed
    if (!success) {
      toast({
        title: 'Błąd',
        description: `Nie udało się ${operationType === 'undo' ? 'cofnąć' : 'przywrócić'} operacji`,
        variant: 'destructive',
      });
    } else if (operationDuration > 1000) {
      // Show success toast only for slow operations (auto-dismiss after 500ms)
      toast({
        title: operationType === 'undo' ? 'Cofnięto' : 'Przywrócono',
        description: 'Operacja została zakończona pomyślnie',
        variant: 'default',
        duration: 500, // Auto-hide after 500ms
      });
    }
    // For fast operations (<1s), no toast - user sees immediate visual feedback
  }, []);

  // Load snapshots and build stack structure
  const loadSnapshots = useCallback(async () => {
    if (!clientId) return;

    try {
      // 🎯 EXCLUDE MANUAL SNAPSHOTS: Manual snapshots are preserved but excluded from undo/redo history
      const snaps = await getDietSnapshots(clientId, { limit: 20, excludeManual: true });

      if (snaps.length === 0) {
        // 🔧 FIX: Create initial snapshot when no history exists
        // This ensures there's always a "base state" to undo to
        logger.info('📸 No snapshots found - creating initial snapshot for undo base state');
        try {
          const initialSnapshot = await createDietSnapshot(clientId, {
            trigger_type: 'client_created',
            trigger_description: 'Automatyczny snapshot początkowy - punkt bazowy dla undo',
            skipThrottling: true
          });

          if (initialSnapshot) {
            // Initialize stack with the new initial snapshot
            setSnapshotStack({
              past: [],
              current: initialSnapshot,
              future: []
            });
            setCurrentSnapshotId(initialSnapshot.id);
            logger.info('✅ Initial snapshot created:', initialSnapshot.id);
          } else {
            setSnapshotStack(null);
            setCurrentSnapshotId(null);
          }
        } catch (createError) {
          logger.error('Failed to create initial snapshot:', createError);
          setSnapshotStack(null);
          setCurrentSnapshotId(null);
        }
        return;
      }

      // 🛡️ AUTO-FIX: Ensure at least one snapshot is marked as current
      await ensureCurrentSnapshot(clientId);

      // Re-fetch snapshots after potential auto-fix
      const updatedSnaps = await getDietSnapshots(clientId, { limit: 20, excludeManual: true });

      // Build stack structure from snapshots
      const stack = buildSnapshotStack(updatedSnaps);
      setSnapshotStack(stack);

      // Set current snapshot ID for key-based re-mounting
      setCurrentSnapshotId(stack?.current.id || null);
    } catch (error) {
      logger.error('Error loading snapshots for undo/redo:', error);
      setSnapshotStack(null);
      setCurrentSnapshotId(null);
    }
  }, [clientId]);

  // Load snapshots on mount and when clientId changes
  useEffect(() => {
    loadSnapshots();
  }, [loadSnapshots]);

  // Calculate undo/redo availability
  const canUndo = snapshotStack ? snapshotStack.past.length > 0 : false;
  const canRedo = snapshotStack ? snapshotStack.future.length > 0 : false;


  // Undo operation - restore previous snapshot
  const undo = useCallback(async () => {
    if (!canUndo || isLoading || !clientId || !snapshotStack) return;

    // 🔒 PROTECTION: Check if operation can proceed
    if (!canProceedWithOperation()) {
      return;
    }

    const targetSnapshot = snapshotStack.past[0];

    // 🔒 PROTECTION: Start protected operation
    startProtectedOperation('undo');

    // 🚪 NEW: Close calculator before undo operation
    if (onCloseCalculator) {
      onCloseCalculator();
    }

    // 🔒 REALTIME GUARD: Block Realtime callbacks BEFORE restore starts
    if (onSetRealtimeGuard) {
      onSetRealtimeGuard(true);
    }

    setIsLoading(true);
    let success = true;
    try {
      // Stack-based operation: move current to future, take from past
      const newStack = {
        past: [...snapshotStack.past],
        current: snapshotStack.current,
        future: [...snapshotStack.future]
      };

      // Get target snapshot (top of past stack) - already declared above for logging
      const finalTargetSnapshot = newStack.past.shift();
      if (!finalTargetSnapshot) {
        logger.error('❌ No snapshot in past to undo to');
        success = false;
        return;
      }

      // Restore the target snapshot (update is_current in DB, but don't rebuild stack)
      success = await restoreDietSnapshot(finalTargetSnapshot.id, { skipRefresh: true });

      if (success) {
        // Update stack structure locally (O(1) operation)
        newStack.future.push(newStack.current); // Move current to future
        newStack.current = finalTargetSnapshot; // Set target as new current

        setSnapshotStack(newStack);
        setCurrentSnapshotId(finalTargetSnapshot.id);

        await onRefresh(); // Refresh UI data from database
      } else {
        logger.error('❌ Failed to restore snapshot during undo');
      }
    } catch (error) {
      logger.error('❌ Error during undo operation:', error);
      success = false;
    } finally {
      setIsLoading(false);
      // 🔒 PROTECTION: End protected operation
      endProtectedOperation(success, 'undo');
      // 🔓 REALTIME GUARD: Release guard after delay to allow pending events to be ignored
      if (onSetRealtimeGuard) {
        setTimeout(() => onSetRealtimeGuard(false), 500);
      }
    }
  }, [canUndo, isLoading, clientId, snapshotStack, onRefresh, loadSnapshots, onCloseCalculator, onSetRealtimeGuard, canProceedWithOperation, startProtectedOperation, endProtectedOperation]);

  // Redo operation - restore newer snapshot
  const redo = useCallback(async () => {
    if (!canRedo || isLoading || !clientId || !snapshotStack) return;

    // 🔒 PROTECTION: Check if operation can proceed
    if (!canProceedWithOperation()) {
      return;
    }

    // 🔒 PROTECTION: Start protected operation
    startProtectedOperation('redo');

    // 🚪 NEW: Close calculator before redo operation
    if (onCloseCalculator) {
      onCloseCalculator();
    }

    // 🔒 REALTIME GUARD: Block Realtime callbacks BEFORE restore starts
    if (onSetRealtimeGuard) {
      onSetRealtimeGuard(true);
    }

    setIsLoading(true);
    let success = true;
    try {
      // Stack-based operation: move current to past, take from future
      const newStack = {
        past: [...snapshotStack.past],
        current: snapshotStack.current,
        future: [...snapshotStack.future]
      };

      // Get target snapshot (first in future stack)
      const targetSnapshot = newStack.future.pop();
      if (!targetSnapshot) {
        logger.error('❌ No snapshot in future to redo to');
        success = false;
        return;
      }

      // Restore the target snapshot (update is_current in DB, but don't rebuild stack)
      success = await restoreDietSnapshot(targetSnapshot.id, { skipRefresh: true });

      if (success) {
        // Update stack structure locally (O(1) operation)
        newStack.past.unshift(newStack.current); // Move current to past
        newStack.current = targetSnapshot; // Set target as new current

        setSnapshotStack(newStack);
        setCurrentSnapshotId(targetSnapshot.id);

        await onRefresh(); // Refresh UI data from database
      } else {
        logger.error('❌ Failed to restore snapshot during redo');
      }
    } catch (error) {
      logger.error('❌ Error during redo operation:', error);
      success = false;
    } finally {
      setIsLoading(false);
      // 🔒 PROTECTION: End protected operation
      endProtectedOperation(success, 'redo');
      // 🔓 REALTIME GUARD: Release guard after delay to allow pending events to be ignored
      if (onSetRealtimeGuard) {
        setTimeout(() => onSetRealtimeGuard(false), 500);
      }
    }
  }, [canRedo, isLoading, clientId, snapshotStack, onRefresh, onCloseCalculator, onSetRealtimeGuard, canProceedWithOperation, startProtectedOperation, endProtectedOperation]);

  // Add new snapshot to stack (called after createDietSnapshot)
  const addNewSnapshot = useCallback((newSnapshot: DietSnapshot) => {
    if (!snapshotStack) {
      // 🔧 FIX: Initialize stack with first snapshot (enables undo after first action)
      setSnapshotStack({
        past: [],
        current: newSnapshot,
        future: []
      });
      setCurrentSnapshotId(newSnapshot.id);
      return;
    }

    // New snapshot becomes current, current moves to past, future is cleared
    const newStack: SnapshotStack = {
      past: [snapshotStack.current, ...snapshotStack.past], // Add current to top of past
      current: newSnapshot, // New snapshot becomes current
      future: [] // Clear future (branching from new point)
    };

    setSnapshotStack(newStack);
    setCurrentSnapshotId(newSnapshot.id);
  }, [snapshotStack]);

  return {
    undo,
    redo,
    canUndo,
    canRedo,
    isLoading,
    snapshotStack,
    refreshSnapshots: loadSnapshots,
    addNewSnapshot,
    currentSnapshotId
  };
}