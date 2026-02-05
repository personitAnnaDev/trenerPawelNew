import React, { useState, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Save } from "lucide-react";
import { useModalConfirmation } from "@/hooks/useModalConfirmation";
import { logger } from '@/utils/logger';

interface SaveVersionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (versionName?: string) => Promise<void>;
  clientName: string;
}

export const SaveVersionModal: React.FC<SaveVersionModalProps> = ({
  isOpen,
  onClose,
  onSave,
  clientName
}) => {
  const [versionName, setVersionName] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  // Function to check if there are unsaved changes
  const hasUnsavedChanges = useCallback(() => {
    return true; // Always require confirmation
  }, []);

  // Confirmation modal hook
  const { handleClose: handleConfirmationClose, confirmationDialog } = useModalConfirmation({
    title: "Zamknąć zapisywanie wersji?",
    message: "Czy na pewno chcesz zamknąć okno zapisywania wersji jadłospisu?",
    hasUnsavedChanges,
    onDiscard: () => {
      setVersionName("");
      onClose();
    }
  });

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onSave(versionName.trim() || undefined);
      setVersionName("");
      handleConfirmationClose(true); // Force close after successful save
    } catch (error) {
      logger.error("Błąd zapisywania wersji:", error);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={handleConfirmationClose}>
      <DialogContent className="bg-zinc-900 border-zinc-800 text-zinc-100 sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Save className="h-5 w-5 text-green-400" />
            Zapisz wersję jadłospisu
          </DialogTitle>
          <DialogDescription className="text-zinc-400">
            Utwórz manualną wersję jadłospisu dla {clientName}. 
            Nazwa jest opcjonalna - jeśli nie podasz, zostanie użyta data i godzina.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div>
            <Label htmlFor="version-name" className="text-zinc-300">
              Nazwa wersji (opcjonalnie)
            </Label>
            <Input
              id="version-name"
              name="version-name"
              value={versionName}
              onChange={(e) => setVersionName(e.target.value)}
              placeholder="np. Przed zmianą treningu, Finalna wersja"
              className="bg-zinc-800 border-zinc-700 text-zinc-100 placeholder:text-zinc-400 focus:border-green-500 mt-2"
              maxLength={100}
              disabled={isSaving}
            />
            <p className="text-xs text-zinc-500 mt-1">
              Maksymalnie 100 znaków
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={handleConfirmationClose}
            disabled={isSaving}
            className="bg-zinc-800 border-zinc-700 text-zinc-100 hover:bg-zinc-700"
          >
            Anuluj
          </Button>
          <Button
            onClick={handleSave}
            disabled={isSaving}
            className="bg-green-700 hover:bg-green-600 text-white"
          >
            {isSaving ? "Zapisywanie..." : "Zapisz wersję"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
    {confirmationDialog}
    </>
  );
};
