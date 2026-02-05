import { Button } from "@/components/ui/button";
import { Undo, Redo } from "lucide-react";
import { cn } from "@/lib/utils";

interface UndoRedoNavigationProps {
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
}

export function UndoRedoNavigation({
  canUndo,
  canRedo,
  onUndo,
  onRedo,
}: UndoRedoNavigationProps) {
  return (
    <div className="fixed right-4 top-1/2 transform -translate-y-1/2 z-40 flex flex-col gap-2 pointer-events-none">
      <div className="pointer-events-auto">
        <Button
          variant="outline"
          size="icon"
          onClick={onUndo}
          disabled={!canUndo}
          className={cn(
            "h-10 w-10 bg-zinc-800 border-zinc-600 text-zinc-100 hover:bg-zinc-700 shadow-lg",
            "transition-all duration-200",
            !canUndo && "opacity-50 cursor-not-allowed"
          )}
          title="Cofnij ostatnią zmianę"
        >
          <Undo className="h-4 w-4" />
        </Button>
      </div>
      
      <div className="pointer-events-auto">
        <Button
          variant="outline"
          size="icon"
          onClick={onRedo}
          disabled={!canRedo}
          className={cn(
            "h-10 w-10 bg-zinc-800 border-zinc-600 text-zinc-100 hover:bg-zinc-700 shadow-lg",
            "transition-all duration-200",
            !canRedo && "opacity-50 cursor-not-allowed"
          )}
          title="Przywróć cofniętą zmianę"
        >
          <Redo className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
