import { useState, useEffect, useCallback } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Calendar, FileText, Clock } from "lucide-react";
import { fetchTemplatesFromSupabase, getTemplateById } from "@/utils/supabaseTemplates";
import { useModalConfirmation } from "@/hooks/useModalConfirmation";
import { logger } from '@/utils/logger';

interface Template {
  id: string;
  title: string;
  description?: string;
  createdAt: string;
  daysCount: number;
  avgCalories: number;
  avgProtein: number;
  avgCarbs: number;
  avgFat: number;
  avgFiber: number;
  dayPlans: Array<{
    id: string;
    name: string;
    meals: Array<{
      id: string;
      name: string;
      dish: string;
      calories: number;
      protein: number;
      carbs: number;
      fat: number;
      fiber: number;
    }>;
  }>;
  clientInfo?: {
    clientName: string;
  };
}

interface TemplateSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectTemplate: (templateId: string) => void;
  clientName?: string;
}

export const TemplateSelectionModal = ({ isOpen, onClose, onSelectTemplate, clientName }: TemplateSelectionModalProps) => {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);

  // Function to check if there are unsaved changes
  const hasUnsavedChanges = useCallback(() => {
    return true; // Always require confirmation
  }, []);

  // Confirmation modal hook
  const { handleClose: handleConfirmationClose, confirmationDialog } = useModalConfirmation({
    title: "Zamknąć wybór szablonu?",
    message: "Czy na pewno chcesz zamknąć okno wyboru szablonu?",
    hasUnsavedChanges,
    onDiscard: () => {
      // Reset state and close modal
      setSelectedTemplate(null);
      setShowPreview(false);
      setTemplates([]);
      setIsLoading(false);
      setIsLoadingPreview(false);
      onClose();
    }
  });

  useEffect(() => {
    const loadTemplates = async () => {
      if (isOpen) {
        setIsLoading(true);
        try {
          const fetchedTemplates = await fetchTemplatesFromSupabase();
          // Mapowanie danych z API na format Template
          const mappedTemplates: Template[] = fetchedTemplates.map(t => ({
            id: t.id,
            title: t.title,
            description: t.description,
            createdAt: t.created_at || new Date().toISOString(),
            daysCount: t.daysCount,
            avgCalories: t.avgCalories,
            avgProtein: t.avgProtein,
            avgCarbs: t.avgCarbs,
            avgFat: t.avgFat,
            avgFiber: t.avgFiber,
            dayPlans: [] // Będzie ładowane w podglądzie
          }));
          setTemplates(mappedTemplates);
        } catch (error) {
          logger.error('Błąd podczas ładowania szablonów:', error);
          setTemplates([]);
        } finally {
          setIsLoading(false);
        }
      }
    };

    loadTemplates();
  }, [isOpen]);

  const handleSelectTemplate = async (template: Template) => {
    setIsLoadingPreview(true);
    try {
      // Pobierz pełne dane szablonu z bazy
      const fullTemplate = await getTemplateById(template.id);
      if (fullTemplate) {
        // Mapuj dane na format Template
        const mappedTemplate: Template = {
          ...template,
          dayPlans: fullTemplate.day_plans.map((day: any) => ({
            id: day.id,
            name: day.name,
            meals: day.meals.map((meal: any) => ({
              id: meal.id,
              name: meal.name,
              dish: meal.dish,
              calories: meal.calories,
              protein: meal.protein,
              carbs: meal.carbs,
              fat: meal.fat,
              fiber: meal.fiber
            }))
          }))
        };
        setSelectedTemplate(mappedTemplate);
        setShowPreview(true);
      }
    } catch (error) {
      logger.error('Błąd podczas ładowania szczegółów szablonu:', error);
    } finally {
      setIsLoadingPreview(false);
    }
  };

  const handleApplyTemplate = () => {
    if (selectedTemplate) {
      onSelectTemplate(selectedTemplate.id);
      setSelectedTemplate(null);
      setShowPreview(false);
      handleConfirmationClose(true); // Force close after successful template selection
    }
  };

  const handleClosePreview = () => {
    setSelectedTemplate(null);
    setShowPreview(false);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pl-PL', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  const calculateTotalMeals = (template: Template) => {
    return template.dayPlans.reduce((total, day) => total + day.meals.length, 0);
  };

  const calculateAverageCalories = (template: Template) => {
    const totalCalories = template.dayPlans.reduce((total, day) => 
      total + day.meals.reduce((dayTotal, meal) => dayTotal + meal.calories, 0), 0
    );
    return template.dayPlans.length > 0 ? Math.round(totalCalories / template.dayPlans.length) : 0;
  };

  if (showPreview && selectedTemplate) {
    return (
      <>
        <Dialog open={isOpen} onOpenChange={handleConfirmationClose}>
        <DialogContent className="max-w-4xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>Podgląd szablonu: {selectedTemplate.title}</DialogTitle>
          </DialogHeader>
          
          <ScrollArea className="max-h-[60vh]">
            <div className="space-y-4">
              {selectedTemplate.dayPlans.map((day) => (
                <Card key={day.id}>
                  <CardHeader>
                    <CardTitle className="text-lg">{day.name}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {day.meals.length > 0 ? (
                      <div className="space-y-2">
                        {day.meals.map((meal) => (
                          <div key={meal.id} className="p-3 bg-zinc-800 border border-zinc-700 rounded">
                            <div className="flex justify-between items-start">
                              <div>
                                <h4 className="font-medium text-zinc-100">{meal.name}</h4>
                                <p className="text-sm text-zinc-400">{meal.dish}</p>
                              </div>
                              <div className="text-right text-sm">
                                <div className="text-zinc-100">{Math.round(meal.calories)} kcal</div>
                                <div className="text-zinc-400">
                                  B: {Math.round(meal.protein)}g | W: {Math.round(meal.carbs)}g | T: {Math.round(meal.fat)}g | Bł: {Math.round(meal.fiber)}g
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-zinc-500 text-center py-4">Brak posiłków w tym dniu</p>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </ScrollArea>
          
          <div className="flex justify-between items-center pt-4 border-t">
            <Button variant="outline" onClick={handleClosePreview}>
              Wróć do listy
            </Button>
            
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button>
                  Zastosuj szablon
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Zastosuj szablon</AlertDialogTitle>
                  <AlertDialogDescription>
                    Czy na pewno chcesz zastosować szablon "{selectedTemplate.title}" dla klienta {clientName}? 
                    Ta akcja zastąpi obecny jadłospis.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Anuluj</AlertDialogCancel>
                  <AlertDialogAction onClick={handleApplyTemplate}>
                    Zastosuj
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </DialogContent>
      </Dialog>
      {confirmationDialog}
      </>
    );
  }

  return (
    <>
      <Dialog open={isOpen} onOpenChange={handleConfirmationClose}>
      <DialogContent className="max-w-3xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>Wybierz szablon jadłospisu</DialogTitle>
          <DialogDescription>
            Wybierz szablon, który chcesz zastosować dla klienta {clientName}
          </DialogDescription>
        </DialogHeader>
        
        <ScrollArea className="max-h-[60vh]">
          {isLoading ? (
            <div className="text-center py-8">
              <div className="animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"></div>
              <p className="text-gray-500">Ładowanie szablonów...</p>
            </div>
          ) : templates.length > 0 ? (
            <div className="grid gap-4">
              {templates.map((template) => (
                <Card key={template.id} className="cursor-pointer hover:shadow-md transition-shadow">
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <CardTitle className="text-lg">{template.title}</CardTitle>
                      </div>
                      <Button 
                        size="sm" 
                        onClick={() => handleSelectTemplate(template)}
                        disabled={isLoadingPreview}
                      >
                        {isLoadingPreview ? "Ładowanie..." : "Podgląd"}
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-4 text-sm text-gray-500">
                      <div className="flex items-center gap-1">
                        <Calendar className="h-4 w-4" />
                        {formatDate(template.createdAt)}
                      </div>
                      <div className="flex items-center gap-1">
                        <FileText className="h-4 w-4" />
                        {template.daysCount} dni
                      </div>
                      <div className="flex items-center gap-1">
                        <Clock className="h-4 w-4" />
                        ~{Math.round(template.avgCalories)} kcal/dzień
                      </div>
                    </div>
                    
                    <div className="mt-3 p-3 bg-zinc-800 border border-zinc-700 rounded text-sm">
                      <div className="font-medium text-zinc-100">Średnie wartości dzienne:</div>
                      <div className="text-zinc-300">
                        {Math.round(template.avgCalories)} kcal | 
                        B: {Math.round(template.avgProtein)}g | 
                        W: {Math.round(template.avgCarbs)}g | 
                        T: {Math.round(template.avgFat)}g | 
                        Bł: {Math.round(template.avgFiber)}g
                      </div>
                    </div>
                    
                    {template.clientInfo && (
                      <div className="mt-2 text-xs text-gray-500">
                        Utworzony na podstawie: {template.clientInfo.clientName}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="text-center text-gray-500 py-8">
              <FileText className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <p>Brak dostępnych szablonów</p>
              <p className="text-sm mt-1">Utwórz szablon zapisując istniejący jadłospis</p>
            </div>
          )}
        </ScrollArea>
        
        <div className="flex justify-end pt-4 border-t">
          <Button variant="outline" onClick={handleConfirmationClose}>
            Anuluj
          </Button>
        </div>
      </DialogContent>
    </Dialog>
    {confirmationDialog}
    </>
  );
};
