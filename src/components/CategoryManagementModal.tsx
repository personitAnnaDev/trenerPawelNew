import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
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
import { Badge } from "@/components/ui/badge";
import { Plus, Edit, Trash } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { getCategories, saveCategory, updateCategory, deleteCategory, Category } from "@/utils/supabasePotrawy";
import { useModalConfirmation } from "@/hooks/useModalConfirmation";
import { logger } from '@/utils/logger';

interface CategoryManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCategoriesChange?: () => void;
}

const CategoryManagementModal = ({ isOpen, onClose, onCategoriesChange }: CategoryManagementModalProps) => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [editName, setEditName] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  // Function to check if there are unsaved changes
  const hasUnsavedChanges = useCallback(() => {
    return true; // Always require confirmation
  }, []);

  // Confirmation modal hook
  const { handleClose: handleConfirmationClose, confirmationDialog } = useModalConfirmation({
    title: "Zamknąć zarządzanie kategoriami?",
    message: "Czy na pewno chcesz zamknąć okno zarządzania kategoriami?",
    hasUnsavedChanges,
    onDiscard: () => {
      // Reset state and close modal
      setCategories([]);
      setNewCategoryName("");
      setEditingCategory(null);
      setEditName("");
      setIsLoading(false);
      onClose();
    }
  });

  useEffect(() => {
    if (isOpen) {
      loadCategories();
    }
  }, [isOpen]);

  const loadCategories = async () => {
    try {
      setIsLoading(true);
      const cats = await getCategories();
      setCategories(cats);
    } catch (error) {
      logger.error('Error loading categories:', error);
      toast({
        title: "Błąd",
        description: "Nie udało się załadować kategorii.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddCategory = async () => {
    if (!newCategoryName.trim()) {
      toast({
        title: "Błąd",
        description: "Nazwa kategorii nie może być pusta.",
        variant: "destructive"
      });
      return;
    }

    // Check if category name already exists
    const existingCategory = categories.find(c => c.name.toLowerCase() === newCategoryName.trim().toLowerCase());
    if (existingCategory) {
      toast({
        title: "Błąd",
        description: "Kategoria o tej nazwie już istnieje.",
        variant: "destructive"
      });
      return;
    }

    try {
      const newCategory = await saveCategory({
        name: newCategoryName.trim()
      });

      setCategories(prev => [...prev, newCategory]);
      setNewCategoryName("");
      
      toast({
        title: "Sukces",
        description: "Kategoria została dodana."
      });

      if (onCategoriesChange) {
        onCategoriesChange();
      }
    } catch (error) {
      logger.error('Error adding category:', error);
      toast({
        title: "Błąd",
        description: "Nie udało się dodać kategorii.",
        variant: "destructive"
      });
    }
  };

  const handleEditCategory = (category: Category) => {
    setEditingCategory(category);
    setEditName(category.name);
  };

  const handleSaveEdit = async () => {
    if (!editingCategory || !editName.trim()) return;

    // Check if new name conflicts with existing category
    const existingCategory = categories.find(c => 
      c.id !== editingCategory.id && 
      c.name.toLowerCase() === editName.trim().toLowerCase()
    );
    
    if (existingCategory) {
      toast({
        title: "Błąd",
        description: "Kategoria o tej nazwie już istnieje.",
        variant: "destructive"
      });
      return;
    }

    try {
      const updatedCategory = await updateCategory(editingCategory.id, {
        name: editName.trim()
      });

      setCategories(prev => prev.map(c => c.id === editingCategory.id ? updatedCategory : c));
      setEditingCategory(null);
      setEditName("");
      
      toast({
        title: "Sukces",
        description: "Kategoria została zaktualizowana."
      });

      if (onCategoriesChange) {
        onCategoriesChange();
      }
    } catch (error) {
      logger.error('Error updating category:', error);
      toast({
        title: "Błąd",
        description: "Nie udało się zaktualizować kategorii.",
        variant: "destructive"
      });
    }
  };

  const handleDeleteCategory = async (categoryId: string) => {
    try {
      await deleteCategory(categoryId);
      setCategories(prev => prev.filter(c => c.id !== categoryId));
      toast({
        title: "Sukces",
        description: "Kategoria została usunięta."
      });

      if (onCategoriesChange) {
        onCategoriesChange();
      }
    } catch (error) {
      logger.error('Error deleting category:', error);
      toast({
        title: "Błąd",
        description: "Nie udało się usunąć kategorii.",
        variant: "destructive"
      });
    }
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={handleConfirmationClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto border border-zinc-700 bg-zinc-900">
        <DialogHeader>
          <DialogTitle className="text-zinc-100 text-xl font-bold">Zarządzaj kategoriami</DialogTitle>
          <DialogDescription className="text-zinc-300">
            Dodawaj, edytuj i usuwaj kategorie potraw. Kategorie pomagają w organizacji Twoich przepisów.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Add new category */}
          <Card className="bg-zinc-800 border-zinc-700">
            <CardHeader>
              <CardTitle className="text-zinc-100">Dodaj nową kategorię</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex gap-3 items-end">
                <div className="flex-1">
                  <label className="text-sm font-medium text-zinc-200 mb-2 block">Nazwa kategorii</label>
                  <Input
                    value={newCategoryName}
                    onChange={(e) => setNewCategoryName(e.target.value)}
                    placeholder="Nazwa nowej kategorii"
                    className="bg-zinc-700 border-zinc-600 text-zinc-100 placeholder-zinc-400"
                  />
                </div>
                <Button onClick={handleAddCategory} className="bg-gradient-to-r from-[#a08032] to-[#e6d280] text-white hover:from-[#8a6c2b] hover:to-[#d4c06b]">
                  <Plus className="h-4 w-4 mr-2" />
                  Dodaj
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Categories list */}
          <Card className="bg-zinc-800 border-zinc-700">
            <CardHeader>
              <CardTitle className="text-zinc-100">Istniejące kategorie</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="text-center py-8 text-zinc-400">
                  Ładowanie kategorii...
                </div>
              ) : (
                <div className="space-y-3">
                  {categories.map((category) => (
                    <div key={category.id} className="flex items-center justify-between p-3 bg-zinc-700 rounded border border-zinc-600">
                      {editingCategory?.id === category.id ? (
                        <div className="flex items-center gap-3 flex-1">
                          <Input
                            value={editName}
                            onChange={(e) => setEditName(e.target.value)}
                            className="bg-zinc-600 border-zinc-500 text-zinc-100"
                          />
                          <Button size="sm" onClick={handleSaveEdit} className="bg-green-600 hover:bg-green-700">
                            Zapisz
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => setEditingCategory(null)} className="bg-zinc-600 border-zinc-500 text-zinc-100 hover:bg-zinc-500">
                            Anuluj
                          </Button>
                        </div>
                      ) : (
                        <>
                          <div className="flex items-center gap-3">
                            <Badge className="bg-primary/20 text-primary border-primary/30 border">
                              {category.name}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleEditCategory(category)}
                              className="bg-zinc-600 border-zinc-500 text-zinc-100 hover:bg-zinc-500"
                            >
                              <Edit className="h-3 w-3" />
                            </Button>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button
                                  size="sm"
                                  variant="destructive"
                                  className="hover:bg-red-600"
                                >
                                  <Trash className="h-3 w-3" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent className="bg-zinc-800 border-zinc-600">
                                <AlertDialogHeader>
                                  <AlertDialogTitle className="text-zinc-100">Usuń kategorię</AlertDialogTitle>
                                  <AlertDialogDescription className="text-zinc-300">
                                    Czy na pewno chcesz usunąć kategorię "{category.name}"? Ta akcja nie może być cofnięta.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel className="bg-zinc-700 border-zinc-600 text-zinc-100 hover:bg-zinc-600">Anuluj</AlertDialogCancel>
                                  <AlertDialogAction onClick={() => handleDeleteCategory(category.id)}>Usuń</AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </>
                      )}
                    </div>
                  ))}
                  {categories.length === 0 && (
                    <div className="text-center py-8 text-zinc-400">
                      Brak kategorii. Dodaj pierwszą kategorię powyżej.
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="flex justify-end pt-4">
          <Button variant="outline" onClick={handleConfirmationClose} className="bg-zinc-700 border-zinc-600 text-zinc-100 hover:bg-zinc-600">
            Zamknij
          </Button>
        </div>
      </DialogContent>
    </Dialog>
    {confirmationDialog}
    </>
  );
};

export default CategoryManagementModal;
