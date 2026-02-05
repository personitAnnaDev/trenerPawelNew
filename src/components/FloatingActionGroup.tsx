import React from 'react';
import { Button } from "@/components/ui/button";
import { ChefHat, History, Undo2, Redo2, Save, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface FloatingActionGroupProps {
  onOpenCalculator: () => void;
  onOpenHistory: () => void;
  onUndo: () => void;
  onRedo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  onSaveVersion?: () => void;
  isUndoRedoLoading?: boolean; // 🔒 NEW: Loading state for undo/redo operations
}

export const FloatingActionGroup: React.FC<FloatingActionGroupProps> = ({
  onOpenCalculator,
  onOpenHistory,
  onUndo,
  onRedo,
  canUndo,
  canRedo,
  onSaveVersion,
  isUndoRedoLoading = false
}) => {
  const { toast } = useToast();

  const handleUndo = () => {
    // 🔒 PROTECTION: Don't allow undo if already loading
    if (isUndoRedoLoading) return;

    onUndo();
    // 🔒 UX: Only show toast for successful quick operations
    // Removed automatic toast - let the operation complete first
  };

  const handleRedo = () => {
    // 🔒 PROTECTION: Don't allow redo if already loading
    if (isUndoRedoLoading) return;

    onRedo();
    // 🔒 UX: Only show toast for successful quick operations
    // Removed automatic toast - let the operation complete first
  };

  return (
    <div className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 flex flex-col items-center gap-2 sm:gap-3 z-50">
      {/* Large Golden Calculator Button */}
      <Button
        onClick={onOpenCalculator}
        size="lg"
        className="h-14 w-14 sm:h-16 sm:w-16 rounded-full bg-gradient-to-r from-[#a08032] to-[#e6d280] hover:from-[#8a6b28] hover:to-[#d4c374] text-white shadow-lg hover:shadow-xl transition-all duration-200"
        title="Kalkulator kalorii"
      >
        <ChefHat className="h-6 w-6 sm:h-8 sm:w-8" />
      </Button>

      {/* Version History Button */}
      <Button
        onClick={onOpenHistory}
        variant="outline"
        size="icon"
        className="h-10 w-10 sm:h-12 sm:w-12 rounded-full bg-zinc-800 border-zinc-700 text-zinc-100 hover:bg-zinc-700 shadow-lg"
        title="Historia wersji"
      >
        <History className="h-4 w-4 sm:h-5 sm:w-5" />
      </Button>

      {/* Save Version Button */}
      {onSaveVersion && (
        <Button
          onClick={onSaveVersion}
          variant="outline"
          size="icon"
          className="h-9 w-9 sm:h-11 sm:w-11 rounded-full bg-green-800 border-green-700 text-green-100 hover:bg-green-700 shadow-lg"
          title="Zapisz wersję manualnie"
        >
          <Save className="h-3 w-3 sm:h-4 sm:w-4" />
        </Button>
      )}

      {/* Undo Button */}
      <Button
        onClick={handleUndo}
        disabled={!canUndo || isUndoRedoLoading}
        variant="outline"
        size="icon"
        className="h-8 w-8 sm:h-10 sm:w-10 rounded-full bg-zinc-800 border-zinc-700 text-zinc-100 hover:bg-zinc-700 disabled:opacity-50 shadow-lg"
        title={isUndoRedoLoading ? "Cofanie..." : "Cofnij"}
      >
        {isUndoRedoLoading ? (
          <Loader2 className="h-3 w-3 sm:h-4 sm:w-4 animate-spin" />
        ) : (
          <Undo2 className="h-3 w-3 sm:h-4 sm:w-4" />
        )}
      </Button>

      {/* Redo Button */}
      <Button
        onClick={handleRedo}
        disabled={!canRedo || isUndoRedoLoading}
        variant="outline"
        size="icon"
        className="h-8 w-8 sm:h-10 sm:w-10 rounded-full bg-zinc-800 border-zinc-700 text-zinc-100 hover:bg-zinc-700 disabled:opacity-50 shadow-lg"
        title={isUndoRedoLoading ? "Przywracanie..." : "Ponów"}
      >
        {isUndoRedoLoading ? (
          <Loader2 className="h-3 w-3 sm:h-4 sm:w-4 animate-spin" />
        ) : (
          <Redo2 className="h-3 w-3 sm:h-4 sm:w-4" />
        )}
      </Button>
    </div>
  );
};
