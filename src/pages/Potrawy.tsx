import { useState, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Search, ArrowLeft, Settings } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import NowaPotrawa, { CreatedPotrawa } from "@/components/NowaPotrawa";
import PotrawaDetails from "@/components/PotrawaDetails";
import CategoryManagementModal from "@/components/CategoryManagementModal";
import RecipeCardComponent from "@/components/RecipeCardComponent"; // Importuj nowy komponent
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getCategories, getPotrawy, savePotrawa, transformDishToFrontend } from "@/utils/supabasePotrawy";
import { supabase } from "@/utils/supabase";
import { useModalConfirmation } from "@/hooks/useModalConfirmation";
import { logger } from '@/utils/logger';

const Potrawy = () => {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [selectedPotrawa, setSelectedPotrawa] = useState<CreatedPotrawa | null>(null);
  const [hasFormChanges, setHasFormChanges] = useState(false);

  // Always show confirmation when closing
  const hasUnsavedChanges = useCallback(() => {
    return true; // Always require confirmation
  }, []);

  // Confirmation modal hook for dish adding
  const { handleClose: handleConfirmationClose, confirmationDialog } = useModalConfirmation({
    title: "Zamknąć dodawanie potrawy?",
    message: "Czy na pewno chcesz zamknąć okno dodawania potrawy?",
    hasUnsavedChanges,
    onDiscard: () => {
      setHasFormChanges(false);
      setIsDialogOpen(false);
    }
  });

  // Handle dialog open/close with confirmation
  const handleDialogOpenChange = (open: boolean) => {
    if (open) {
      setIsDialogOpen(true);
    } else {
      handleConfirmationClose();
    }
  };

  // Query for categories
  const { data: categories, refetch: refetchCategories, isLoading: isCategoriesLoading } = useQuery({
    queryKey: ['categories'],
    queryFn: () => getCategories(),
  });

  // Query for dishes using unified storage
  const { data: potrawy, refetch: refetchPotrawy, isLoading: isPotrawyLoading } = useQuery({
    queryKey: ['potrawy'],
    queryFn: () => getPotrawy(),
  });

  // 🔄 REALTIME: Subscribe to potrawy table changes for multi-tab sync
  useEffect(() => {
    const channel = supabase
      .channel('public:potrawy')
      .on('postgres_changes', {
        event: '*',           // INSERT, UPDATE, DELETE
        schema: 'public',
        table: 'potrawy'
      }, (payload) => {
        logger.log('🔄 Potrawy changed:', payload);
        // Invalidate React Query cache - refreshes all components using potrawy
        queryClient.invalidateQueries({ queryKey: ['potrawy'] });
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  const handlePotrawaCreated = (newPotrawa: CreatedPotrawa) => {
    // Potrawa jest już zapisana w NowaPotrawa component
    // Potrzebujemy tylko odświeżyć listę i zamknąć modal
    refetchPotrawy();
    setIsDialogOpen(false);
  };

  const handleCategoriesChange = () => {
    refetchCategories();
  };

  const filteredPotrawy = potrawy?.map(dish => transformDishToFrontend(dish)).filter(potrawa => {
    const matchesSearch = potrawa.nazwa.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === "all" || potrawa.kategoria === selectedCategory;
    return matchesSearch && matchesCategory;
  }) || [];

  const handlePotrawaClick = (potrawa: CreatedPotrawa) => {
    setSelectedPotrawa(potrawa);
  };

  if (selectedPotrawa) {
    return (
      <div className="container mx-auto p-4 md:p-6 bg-background min-h-screen">
        <div className="mb-6">
          <Button 
            variant="ghost" 
            onClick={() => setSelectedPotrawa(null)}
            className="mb-4 text-zinc-100 hover:bg-zinc-800"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Powrót do listy
          </Button>
        </div>
        <PotrawaDetails 
          potrawa={selectedPotrawa} 
          onClose={() => {
            setSelectedPotrawa(null);
            refetchPotrawy(); // Odśwież listę potraw po zamknięciu modala edycji/usunięcia
          }}
        />
      </div>
    );
  }

  if (isCategoriesLoading || isPotrawyLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="text-zinc-400 text-lg">Ładowanie danych...</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 md:p-6 bg-background min-h-screen">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-4 mb-4 md:mb-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-zinc-100">Potrawy</h1>
          <p className="text-zinc-400 mt-1 md:mt-2 text-base md:text-lg">Zarządzaj potrawami i przepisami</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
          <Button
            variant="outline"
            onClick={() => setIsCategoryModalOpen(true)}
            className="bg-zinc-700 border-zinc-600 text-zinc-100 hover:bg-zinc-600 w-full sm:w-auto"
          >
            <Settings className="h-4 w-4 mr-2" />
            <span className="hidden sm:inline">Zarządzaj Kategoriami</span>
            <span className="sm:hidden">Kategorie</span>
          </Button>
          <Dialog open={isDialogOpen} onOpenChange={handleDialogOpenChange}>
            <DialogTrigger asChild>
              <Button className="bg-gradient-to-r from-[#a08032] to-[#e6d280] hover:from-[#8a6c2b] hover:to-[#d4c06b] text-white font-semibold px-6 py-3 text-base transition-colors w-full sm:w-auto">
                <Plus className="h-5 w-5 mr-2" />
                <span className="hidden sm:inline">Dodaj Potrawę</span>
                <span className="sm:hidden">Dodaj</span>
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-[95vw] sm:max-w-4xl lg:max-w-6xl max-h-[90vh] overflow-y-auto border border-zinc-700 bg-zinc-900">
              <DialogHeader>
                <DialogTitle className="text-zinc-100 text-xl font-bold">Dodaj nową potrawę</DialogTitle>
                <DialogDescription className="text-zinc-400">
                  Utwórz nową potrawę z przepisem i składnikami
                </DialogDescription>
              </DialogHeader>
              <NowaPotrawa
                onClose={() => {
                  setHasFormChanges(false);
                  setIsDialogOpen(false);
                }}
                onPotrawaCreated={handlePotrawaCreated}
                onFormChange={setHasFormChanges}
              />
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-zinc-400 h-5 w-5" />
          <Input
            placeholder="Szukaj potraw..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 border border-zinc-700 focus:ring-[#a08032] focus:border-[#a08032] bg-zinc-800 text-zinc-100 placeholder-zinc-400 text-base py-3 shadow-sm"
          />
        </div>
        <Select value={selectedCategory} onValueChange={setSelectedCategory}>
          <SelectTrigger className="w-full sm:w-64 bg-zinc-800 border-zinc-700 text-zinc-100">
            <SelectValue placeholder="Wszystkie kategorie" />
          </SelectTrigger>
          <SelectContent className="bg-zinc-900 border-zinc-700">
            <SelectItem value="all" className="text-zinc-100 focus:bg-zinc-800">Wszystkie kategorie</SelectItem>
            {categories?.map((category) => (
              <SelectItem key={category.id} value={category.name} className="text-zinc-100 focus:bg-zinc-800">
                {category.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Dishes Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredPotrawy.map((potrawa) => (
          <RecipeCardComponent 
            key={potrawa.id} 
            potrawa={potrawa} 
            onClick={handlePotrawaClick} 
          />
        ))}
      </div>

      {filteredPotrawy.length === 0 && (
        <div className="text-center py-12">
          <p className="text-zinc-400 text-lg">Nie znaleziono potraw spełniających kryteria wyszukiwania.</p>
        </div>
      )}

      <CategoryManagementModal
        isOpen={isCategoryModalOpen}
        onClose={() => setIsCategoryModalOpen(false)}
        onCategoriesChange={handleCategoriesChange}
      />
      {confirmationDialog}
    </div>
  );
};

export default Potrawy;
