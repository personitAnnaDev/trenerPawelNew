import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"; // Dodano import Dialog
import { deletePotrawa } from "@/utils/supabasePotrawy";
import { toast } from "@/components/ui/use-toast";
import NowaPotrawa from "./NowaPotrawa"; // Dodano import NowaPotrawa
import { useState, useCallback } from "react"; // Dodano import useState i useCallback
import { formatMacro } from "@/utils/numberFormat";
import { formatPolishNumber } from "@/utils/preciseCalculations";
import { useModalConfirmation } from "@/hooks/useModalConfirmation";
import { logger } from '@/utils/logger';

interface PotrawaDetailsProps {
  potrawa: {
    id: string; // Zmieniono na string
    nazwa: string;
    kategoria: string;
    skladniki: string;
    instrukcja: string[];
    macro: {
      białko: number;
      tłuszcz: number;
      węglowodany: number;
      błonnik?: number; // Dodano błonnik
    };
    kcal: number;
  };
  onClose?: () => void;
}

const PotrawaDetails = ({ potrawa, onClose }: PotrawaDetailsProps) => {
  // Split by ", " (comma + space) to avoid splitting on decimal comma (e.g., "60,5 g")
  const ingredientsList = potrawa.skladniki.split(", ").map((item) => item.trim()).filter((item) => item.length > 0);
  const navigate = useNavigate();
  const [isEditModalOpen, setIsEditModalOpen] = useState(false); // Nowy stan dla modala edycji
  const [hasEditFormChanges, setHasEditFormChanges] = useState(false);

  // Always show confirmation when closing
  const hasEditUnsavedChanges = useCallback(() => {
    return true; // Always require confirmation
  }, []);

  // Confirmation modal hook for dish editing
  const { handleClose: handleEditConfirmationClose, confirmationDialog: editConfirmationDialog } = useModalConfirmation({
    title: "Zamknąć edycję potrawy?",
    message: "Czy na pewno chcesz zamknąć okno edycji potrawy?",
    hasUnsavedChanges: hasEditUnsavedChanges,
    onDiscard: () => {
      setHasEditFormChanges(false);
      setIsEditModalOpen(false);
    }
  });

  // Handle dialog open/close with confirmation for edit modal
  const handleEditDialogOpenChange = (open: boolean) => {
    if (open) {
      setIsEditModalOpen(true);
    } else {
      handleEditConfirmationClose();
    }
  };

  const handleEdit = () => {
    setIsEditModalOpen(true);
  };

  const handleDelete = async () => {
    try {
      await deletePotrawa(potrawa.id as string);
      toast({
        title: "Sukces!",
        description: "Potrawa została pomyślnie usunięta.",
        variant: "default", // Zmieniono na 'default'
      });
      if (onClose) {
        onClose();
      }
      navigate("/potrawy");
    } catch (error) {
      logger.error("Błąd podczas usuwania potrawy:", error);
      toast({
        title: "Błąd",
        description: "Wystąpił błąd podczas usuwania potrawy.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-zinc-100 mb-2">{potrawa.nazwa}</h1>
          <Badge className="bg-gradient-to-r from-[#a08032] to-[#e6d280] text-zinc-900 font-medium">
            {potrawa.kategoria}
          </Badge>
        </div>
        <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
          <Button onClick={handleEdit} className="bg-[#a08032] hover:bg-[#8a6f2c] text-white w-full sm:w-auto">
            Edytuj potrawę
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" className="w-full sm:w-auto">Usuń potrawę</Button>
            </AlertDialogTrigger>
            <AlertDialogContent className="bg-zinc-900 border-zinc-800 text-zinc-100">
              <AlertDialogHeader>
                <AlertDialogTitle className="text-zinc-100">Czy na pewno?</AlertDialogTitle>
                <AlertDialogDescription className="text-zinc-400">
                  Ta akcja jest nieodwracalna. Spowoduje to trwałe usunięcie potrawy{" "}
                  <span className="font-bold text-[#a08032]">{potrawa.nazwa}</span> z bazy danych.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel className="bg-zinc-700 text-zinc-100 hover:bg-zinc-600">Anuluj</AlertDialogCancel>
                <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700 text-white">
                  Usuń
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      {/* Edit Dish Modal */}
      <Dialog open={isEditModalOpen} onOpenChange={handleEditDialogOpenChange}>
        <DialogContent className="max-w-[95vw] sm:max-w-4xl lg:max-w-6xl max-h-[90vh] overflow-y-auto border border-zinc-700 bg-zinc-900">
          <DialogHeader>
            <DialogTitle className="text-zinc-100 text-xl font-bold">Edytuj potrawę</DialogTitle>
            <DialogDescription className="text-zinc-400">
              Zmień składniki, instrukcje i wartości odżywcze potrawy
            </DialogDescription>
          </DialogHeader>
          <NowaPotrawa
            potrawaId={potrawa.id}
            onClose={() => {
              setHasEditFormChanges(false);
              setIsEditModalOpen(false);
              if (onClose) onClose(); // Close parent modal if it exists
            }}
            onFormChange={setHasEditFormChanges}
            onPotrawaCreated={() => {
              // This callback is triggered after save/update.
              // We need to refetch the potrawy list in Potrawy.tsx
              // For now, just close the modal.
              setIsEditModalOpen(false);
              if (onClose) onClose(); // Close parent modal if it exists
            }}
          />
        </DialogContent>
      </Dialog>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Ingredients */}
        <div className="lg:col-span-2">
          <Card className="bg-zinc-900 border-zinc-800">
            <CardHeader>
              <CardTitle className="text-zinc-100">Składniki</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="list-disc list-inside text-zinc-300 leading-relaxed space-y-1">
                {ingredientsList.map((ingredient, index) => (
                  <li key={index}>{ingredient}</li>
                ))}
              </ul>
            </CardContent>
          </Card>

          {/* Instructions */}
          <Card className="bg-zinc-900 border-zinc-800 mt-6">
            <CardHeader>
              <CardTitle className="text-zinc-100">Instrukcje przygotowania</CardTitle>
            </CardHeader>
<CardContent>
  <ol className="space-y-3">
    {potrawa.instrukcja.map((krok, index) => (
      <li key={index} className="text-zinc-300 leading-relaxed">
        <span className="font-medium text-[#a08032]">Instrukcja {index + 1}:</span> {krok}
      </li>
    ))}
  </ol>
</CardContent>
          </Card>
        </div>

        {/* Nutrition Panel */}
        <div className="lg:col-span-1">
          <Card className="bg-zinc-900 border-zinc-800 sticky top-6">
            <CardHeader>
              <CardTitle className="text-zinc-100">Wartości odżywcze</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Calories */}
              <div className="text-center">
                <div className="text-3xl font-bold text-[#a08032] mb-1">{formatPolishNumber(potrawa.kcal, 0)}</div>
                <div className="text-sm text-zinc-400">kcal na porcję</div>
              </div>

              <Separator className="bg-zinc-800" />

              {/* Macronutrients */}
              <div className="space-y-4">
                <h3 className="font-semibold text-zinc-200 mb-3">Makroskładniki</h3>
                
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-zinc-300">Białko</span>
                    <div className="text-right">
                      <div className="font-semibold text-zinc-100">{formatMacro(potrawa.macro.białko)}g</div>
                      <div className="text-xs text-zinc-400">
                        {Math.round((potrawa.macro.białko * 4 / potrawa.kcal) * 100)}%
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-between items-center">
                    <span className="text-zinc-300">Tłuszcze</span>
                    <div className="text-right">
                      <div className="font-semibold text-zinc-100">{formatMacro(potrawa.macro.tłuszcz)}g</div>
                      <div className="text-xs text-zinc-400">
                        {Math.round((potrawa.macro.tłuszcz * 9 / potrawa.kcal) * 100)}%
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-between items-center">
                    <span className="text-zinc-300">Węglowodany</span>
                    <div className="text-right">
                      <div className="font-semibold text-zinc-100">{formatMacro(potrawa.macro.węglowodany)}g</div>
                      <div className="text-xs text-zinc-400">
                        {Math.round(((potrawa.macro.węglowodany - (potrawa.macro.błonnik || 0)) * 4 / potrawa.kcal) * 100)}%
                      </div>
                    </div>
                  </div>

                  {potrawa.macro.błonnik !== undefined && (
                    <div className="flex justify-between items-center">
                      <span className="text-zinc-300">Błonnik</span>
                      <div className="text-right">
                        <div className="font-semibold text-zinc-100">{formatMacro(potrawa.macro.błonnik)}g</div>
                        <div className="text-xs text-zinc-400">
                          {/* Procent błonnika nie jest obliczany na podstawie kcal, więc pozostawiamy puste lub dodajemy inną logikę */}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
      {editConfirmationDialog}
    </div>
  );
};

export default PotrawaDetails;
