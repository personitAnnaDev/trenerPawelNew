import { useState, useCallback } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useModalConfirmation } from "@/hooks/useModalConfirmation";
import { logger } from '@/utils/logger';

interface SaveTemplateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (title: string) => void;
  clientName?: string;
}

export const SaveTemplateModal = ({ isOpen, onClose, onSave, clientName }: SaveTemplateModalProps) => {
  const [title, setTitle] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // Function to check if there are unsaved changes
  const hasUnsavedChanges = useCallback(() => {
    return true; // Always require confirmation
  }, []);

  // Confirmation modal hook
  const { handleClose: handleConfirmationClose, confirmationDialog } = useModalConfirmation({
    title: "Zamknąć zapisywanie szablonu?",
    message: "Czy na pewno chcesz zamknąć okno zapisywania szablonu?",
    hasUnsavedChanges,
    onDiscard: () => {
      setTitle("");
      onClose();
    }
  });

  const handleSave = async () => {
    if (!title.trim()) return;

    setIsLoading(true);
    try {
      await onSave(title.trim());
      setTitle("");
      handleConfirmationClose(true); // Force close after successful save
    } catch (error) {
      logger.error("Error saving template:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={handleConfirmationClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Zapisz jako szablon</DialogTitle>
          <DialogDescription>
            Zapisz obecny jadłospis jako szablon, który będzie można użyć dla innych klientów.
            {clientName && (
              <span className="block mt-1 text-sm text-gray-600">
                Szablon zostanie utworzony na podstawie jadłospisu dla {clientName}.
              </span>
            )}
          </DialogDescription>
        </DialogHeader>
        
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="title" className="text-right">
              Nazwa szablonu *
            </Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Wprowadź nazwę szablonu"
              className="col-span-3"
              maxLength={100}
              autoFocus
            />
          </div>
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={handleConfirmationClose} disabled={isLoading}>
            Anuluj
          </Button>
          <Button 
            onClick={handleSave} 
            disabled={!title.trim() || isLoading}
          >
            {isLoading ? "Zapisywanie..." : "Zapisz"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
    {confirmationDialog}
    </>
  );
};
