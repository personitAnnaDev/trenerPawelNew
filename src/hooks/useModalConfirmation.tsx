import React, { useState, useCallback } from 'react';
import { logger } from '@/utils/logger';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface ModalConfirmationOptions {
  title?: string;
  message?: string;
  hasUnsavedChanges?: () => boolean;
  onSave?: () => Promise<void> | void;
  onDiscard?: () => void;
}

interface ModalConfirmationState {
  isConfirmationOpen: boolean;
  pendingClose: boolean;
}

interface ModalConfirmationReturn {
  handleClose: (forceClose?: boolean) => void;
  confirmationState: ModalConfirmationState;
  confirmationDialog: JSX.Element;
}

export const useModalConfirmation = ({
  title = "Niezapisane zmiany",
  message = "Masz niezapisane zmiany. Co chcesz zrobić?",
  hasUnsavedChanges,
  onSave,
  onDiscard
}: ModalConfirmationOptions): ModalConfirmationReturn => {
  const [confirmationState, setConfirmationState] = useState<ModalConfirmationState>({
    isConfirmationOpen: false,
    pendingClose: false
  });

  const handleClose = useCallback((forceClose = false) => {
    // Jeśli forceClose lub brak sprawdzania zmian, zamknij od razu
    if (forceClose || !hasUnsavedChanges) {
      if (onDiscard) onDiscard();
      return;
    }

    // Sprawdź czy są niezapisane zmiany
    const hasChanges = hasUnsavedChanges && hasUnsavedChanges();

    if (hasChanges) {
      setConfirmationState({
        isConfirmationOpen: true,
        pendingClose: true
      });
    } else {
      if (onDiscard) onDiscard();
    }
  }, [hasUnsavedChanges, onDiscard]);

  const handleSaveAndClose = async () => {
    try {
      if (onSave) {
        await onSave();
      }
      setConfirmationState({
        isConfirmationOpen: false,
        pendingClose: false
      });
      if (onDiscard) onDiscard(); // Wywołaj finalnie onDiscard (zamknięcie modala)
    } catch (error) {
      logger.error('Błąd podczas zapisywania:', error);
      // Pozostaw modal otwarty w przypadku błędu
    }
  };

  const handleDiscardAndClose = () => {
    setConfirmationState({
      isConfirmationOpen: false,
      pendingClose: false
    });
    if (onDiscard) onDiscard();
  };

  const handleCancelClose = () => {
    setConfirmationState({
      isConfirmationOpen: false,
      pendingClose: false
    });
  };

  // JSX element zamiast funkcji komponentu - zapobiega remountowaniu przy każdym renderze
  const confirmationDialog = (
    <AlertDialog open={confirmationState.isConfirmationOpen} onOpenChange={() => {}}>
      <AlertDialogContent className="bg-zinc-900 border-zinc-800">
        <AlertDialogHeader>
          <AlertDialogTitle className="text-zinc-100">
            {title}
          </AlertDialogTitle>
          <AlertDialogDescription className="text-zinc-400">
            {message}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="flex-col sm:flex-row gap-2">
          <AlertDialogCancel
            onClick={handleCancelClose}
            className="bg-zinc-800 border-zinc-700 text-zinc-100 hover:bg-zinc-700"
          >
            Anuluj
          </AlertDialogCancel>
          <div className="flex gap-2">
            <AlertDialogAction
              onClick={handleDiscardAndClose}
              className="bg-red-600 hover:bg-red-700 text-white flex-1"
            >
              Tak, zamknij
            </AlertDialogAction>
            {onSave && (
              <AlertDialogAction
                onClick={handleSaveAndClose}
                className="bg-gradient-to-r from-[#a08032] to-[#e6d280] hover:from-[#8a6c2b] hover:to-[#d4c06b] text-zinc-900 font-medium flex-1"
              >
                Zapisz i zamknij
              </AlertDialogAction>
            )}
          </div>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );

  return {
    handleClose,
    confirmationState,
    confirmationDialog
  };
};