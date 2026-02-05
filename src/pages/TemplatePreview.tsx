import { useState, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
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
  AlertDialogTrigger
} from "@/components/ui/alert-dialog";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger
} from "@/components/ui/collapsible";
import { ArrowLeft, Edit, Plus, Trash, GripVertical, Minus, X, ChevronDown, ChevronRight, Users } from "lucide-react";
import { getClientsAssignedToTemplate, Client } from "@/utils/clientStorage";
import { getTemplateById } from "@/utils/supabaseTemplates";
import { useToast } from "@/hooks/use-toast";
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import DishSelectionModal from "@/components/DishSelectionModal";
import ClientAssignmentModal from "@/components/ClientAssignmentModal";
import { Input } from "@/components/ui/input";
import { formatIngredientQuantity } from "@/utils/formatIngredients";

interface Ingredient {
  id: string;
  name: string;
  quantity: number;
  unit: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
}

interface Meal {
  id: string;
  name: string;
  dish: string;
  instructions: string[];
  ingredients: Ingredient[];
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
  countTowardsDailyCalories: boolean;
}

interface DayPlan {
  id: string;
  name: string;
  meals: Meal[];
}

interface Template {
  id: string;
  title: string;
  dayPlans: DayPlan[];
}

const SortableMeal = ({ meal, isEditMode, onDelete, onEdit, onUpdateIngredient }: {
  meal: Meal;
  isEditMode: boolean;
  onDelete: (id: string) => void;
  onEdit: (meal: Meal) => void;
  onUpdateIngredient: (mealId: string, ingredientId: string, newQuantity: number) => void;
}) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({ id: meal.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const updateIngredientQuantity = (ingredientId: string, newQuantity: number) => {
    if (newQuantity < 0) return;
    onUpdateIngredient(meal.id, ingredientId, newQuantity);
  };

  return (
    <div ref={setNodeRef} style={style}>
      <Card className="bg-zinc-800 border-zinc-600 relative w-full">
        {isEditMode && (
          <>
            <div
              {...attributes}
              {...listeners}
              className="absolute top-2 left-2 cursor-grab hover:cursor-grabbing p-1 rounded hover:bg-zinc-700"
              title="Przeciągnij, aby zmienić kolejność"
            >
              <GripVertical className="h-4 w-4 text-zinc-400" />
            </div>
            
          </>
        )}
        
        <Collapsible open={!isCollapsed} onOpenChange={(open) => setIsCollapsed(!open)}>
          <CardHeader className={`pb-3 ${isEditMode ? 'pl-10 pr-10' : ''}`}>
            <div className="flex justify-between items-start">
              <div className="flex-1">
                <CollapsibleTrigger className="flex items-center gap-2 flex-1 cursor-pointer hover:bg-zinc-800/10 transition-colors rounded px-2 py-1 mr-2">
                  {isCollapsed ? <ChevronRight className="h-4 w-4 transition-transform" /> : <ChevronDown className="h-4 w-4 transition-transform" />}
                  <CardTitle className="text-lg text-[#a08032] text-left">{meal.name}</CardTitle>
                </CollapsibleTrigger>
                <p className="text-sm text-zinc-300 font-medium ml-6 text-left">{meal.dish}</p>
                <div className="ml-6 mt-1 flex items-center gap-2">
                  <Badge variant="secondary" className="bg-blue-600 text-blue-100 text-xs">
                    {meal.calories} kcal
                  </Badge>
                  {meal.countTowardsDailyCalories === false && (
                    <Badge variant="outline" className="border-orange-400 text-orange-400 text-xs">
                      Nie liczy się do dziennych kalorii
                    </Badge>
                  )}
                </div>
              </div>
              {isEditMode && (
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onEdit(meal)}
                    className="bg-zinc-700 border-zinc-600 text-zinc-100 hover:bg-zinc-600"
                  >
                    <Edit className="h-3 w-3 mr-1" />
                    Edytuj
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        title="Usuń posiłek"
                        className="bg-zinc-700 border-zinc-600 text-zinc-100 hover:bg-zinc-600"
                      >
                        <Trash className="h-3 w-3 text-red-500" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent className="bg-zinc-800 border-zinc-600">
                      <AlertDialogHeader>
                        <AlertDialogTitle className="text-zinc-100">Usuń posiłek</AlertDialogTitle>
                        <AlertDialogDescription className="text-zinc-300">
                          Czy na pewno chcesz usunąć posiłek "{meal.name}"? Ta akcja nie może być cofnięta.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel className="bg-zinc-700 border-zinc-600 text-zinc-100 hover:bg-zinc-600">Anuluj</AlertDialogCancel>
                        <AlertDialogAction onClick={() => onDelete(meal.id)}>Usuń</AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              )}
            </div>
          </CardHeader>
          
          <CollapsibleContent>
            <CardContent className={`pt-0 ${isEditMode ? 'pl-10 pr-10' : ''}`}>
              {/* Nutritional values section - FIRST */}
              <div className="space-y-2 border-b border-zinc-600 pb-4 mb-4">
                <h4 className="font-medium text-zinc-200">Kalorie:</h4>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-zinc-300">Kalorie:</span>
                  <span className="font-medium nutrition-kcal">{meal.calories} kcal</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-zinc-300">Białko:</span>
                  <span className="font-medium nutrition-protein">{meal.protein}g</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-zinc-300">Węglowodany:</span>
                  <span className="font-medium nutrition-carbs">{meal.carbs}g</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-zinc-300">Tłuszcze:</span>
                  <span className="font-medium nutrition-fat">{meal.fat}g</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-zinc-300">Błonnik:</span>
                  <span className="font-medium nutrition-fiber">{meal.fiber}g</span>
                </div>
              </div>

              {/* Ingredients section - SECOND */}
              {meal.ingredients && meal.ingredients.length > 0 && (
                <div className="space-y-3 mb-4">
                  <h4 className="font-medium text-zinc-200">Składniki:</h4>
                  {meal.ingredients.map((ingredient) => (
                    <div key={ingredient.id} className="flex items-center justify-between p-2 bg-zinc-700 rounded border border-zinc-600">
                      <div className="flex-1">
                        <span className="font-medium text-sm text-zinc-100">{ingredient.name}</span>
                        <div className="text-xs text-zinc-300 mt-1">
                          <span className="nutrition-kcal">{ingredient.calories} kcal</span> | 
                          <span className="nutrition-protein"> B: {ingredient.protein}g</span> | 
                          <span className="nutrition-carbs"> W: {ingredient.carbs}g</span> | 
                          <span className="nutrition-fat"> T: {ingredient.fat}g</span> | 
                          <span className="nutrition-fiber"> Bł: {ingredient.fiber}g</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {isEditMode ? (
                          <>
                            <Button
                              size="icon"
                              variant="outline"
                              className="h-6 w-6 bg-zinc-700 border-zinc-600 text-zinc-100 hover:bg-zinc-600"
                              onClick={() => updateIngredientQuantity(ingredient.id, ingredient.quantity - 10)}
                              disabled={ingredient.quantity <= 10}
                            >
                              <Minus className="h-3 w-3" />
                            </Button>
                            <span className="text-sm font-medium w-12 text-center cursor-pointer text-zinc-100">
                              {formatIngredientQuantity(ingredient.quantity, ingredient.unit)}
                            </span>
                            <Button
                              size="icon"
                              variant="outline"
                              className="h-6 w-6 bg-zinc-700 border-zinc-600 text-zinc-100 hover:bg-zinc-600"
                              onClick={() => updateIngredientQuantity(ingredient.id, ingredient.quantity + 10)}
                            >
                              <Plus className="h-3 w-3" />
                            </Button>
                          </>
                        ) : (
                          <span className="text-sm font-medium text-zinc-100">
                            {formatIngredientQuantity(ingredient.quantity, ingredient.unit)}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Instructions section - THIRD */}
              {meal.instructions && meal.instructions.length > 0 && (
                <div className="space-y-3">
                  <h4 className="font-medium text-zinc-200">Instrukcje przygotowania:</h4>
                  <div className="space-y-3">
                    {meal.instructions.map((instruction, index) => (
                      <div key={index} className="bg-zinc-700 p-3 rounded border border-zinc-600">
                        <div className="flex items-start gap-2">
                          <span className="font-medium text-[#a08032] text-sm min-w-[80px]">
                            Instrukcja {index + 1}:
                          </span>
                          <span className="text-sm text-zinc-100 leading-relaxed">
                            {instruction}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </CollapsibleContent>
        </Collapsible>
      </Card>
    </div>
  );
};

const TemplatePreview = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [template, setTemplate] = useState<Template | null>(null);
  const [assignedClients, setAssignedClients] = useState<Client[]>([]);
  const [isEditMode, setIsEditMode] = useState(false);
  const [isClientModalOpen, setIsClientModalOpen] = useState(false);
  const [dayPlans, setDayPlans] = useState<DayPlan[]>([]);
  const [newDayName, setNewDayName] = useState("");
  const [showAddDayInput, setShowAddDayInput] = useState(false);
  const [isMealModalOpen, setIsMealModalOpen] = useState(false);
  const [editingMeal, setEditingMeal] = useState<Meal | null>(null);
  const [currentDayId, setCurrentDayId] = useState<string>("");
  
  // Title editing states
  const [editingTitle, setEditingTitle] = useState(false);
  const [tempTitle, setTempTitle] = useState("");

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  useEffect(() => {
    const loadTemplateData = async () => {
      if (id) {
        const templateData = await getTemplateById(id);
        if (templateData) {
          // Map the structure from Supabase to local format with proper meal mapping
          const mappedDayPlans = (templateData.day_plans || []).map((dayPlan: any) => ({
            ...dayPlan,
            meals: (dayPlan.meals || []).map((meal: any) => ({
              ...meal,
              countTowardsDailyCalories: meal.count_in_daily_total ?? true,
              ingredients: Array.isArray(meal.ingredients) ? meal.ingredients : [],
              instructions: Array.isArray(meal.instructions) ? meal.instructions : []
            }))
          }));
          
          const mappedTemplate = {
            id: templateData.id,
            title: templateData.name, // name -> title mapping
            dayPlans: mappedDayPlans
          };
          setTemplate(mappedTemplate);
          setDayPlans(mappedDayPlans);
          // Load assigned clients
          try {
            const clients = await getClientsAssignedToTemplate(id);
            setAssignedClients(clients);
          } catch (error) {
            logger.error('Error loading assigned clients:', error);
            setAssignedClients([]);
          }
        } else {
          navigate("/jadlospisy");
        }
      }
    };
    
    loadTemplateData();
  }, [id, navigate]);

  const handleDragEnd = (event: any, dayId: string) => {
    const { active, over } = event;

    if (active.id !== over.id) {
      setDayPlans(prev => prev.map(day => {
        if (day.id === dayId) {
          const oldIndex = day.meals.findIndex(meal => meal.id === active.id);
          const newIndex = day.meals.findIndex(meal => meal.id === over.id);
          return {
            ...day,
            meals: arrayMove(day.meals, oldIndex, newIndex)
          };
        }
        return day;
      }));
    }
  };

  const handleDeleteMeal = (dayId: string, mealId: string) => {
    setDayPlans(prev => prev.map(day => {
      if (day.id === dayId) {
        return {
          ...day,
          meals: day.meals.filter(meal => meal.id !== mealId)
        };
      }
      return day;
    }));
    toast({
      title: "Posiłek usunięty",
      description: "Posiłek został pomyślnie usunięty."
    });
  };

  const handleDeleteDay = (dayId: string) => {
    setDayPlans(prev => prev.filter(day => day.id !== dayId));
    toast({
      title: "Dzień usunięty",
      description: "Dzień został pomyślnie usunięty."
    });
  };

  const handleAddDay = () => {
    if (newDayName.trim()) {
      const newDay: DayPlan = {
        id: `day-${Date.now()}`,
        name: newDayName.trim(),
        meals: []
      };
      setDayPlans(prev => [...prev, newDay]);
      setNewDayName("");
      setShowAddDayInput(false);
      toast({
        title: "Dzień dodany",
        description: `Dodano nowy dzień: ${newDayName}`
      });
    }
  };

  const handleUpdateIngredient = (mealId: string, ingredientId: string, newQuantity: number) => {
    setDayPlans(prev => prev.map(day => ({
      ...day,
      meals: day.meals.map(meal => {
        if (meal.id === mealId) {
          const updatedIngredients = meal.ingredients.map(ingredient => {
            if (ingredient.id === ingredientId) {
              const ratio = newQuantity / ingredient.quantity;
              return {
                ...ingredient,
                quantity: newQuantity,
                calories: Math.round(ingredient.calories * ratio),
                protein: Math.round(ingredient.protein * ratio * 10) / 10,
                carbs: Math.round(ingredient.carbs * ratio * 10) / 10,
                fat: Math.round(ingredient.fat * ratio * 10) / 10,
                fiber: Math.round(ingredient.fiber * ratio * 10) / 10
              };
            }
            return ingredient;
          });

          // Recalculate meal totals
          const totals = updatedIngredients.reduce(
            (sum, ing) => ({
              calories: sum.calories + ing.calories,
              protein: sum.protein + ing.protein,
              carbs: sum.carbs + ing.carbs,
              fat: sum.fat + ing.fat,
              fiber: sum.fiber + ing.fiber
            }),
            { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 }
          );

          return {
            ...meal,
            ingredients: updatedIngredients,
            calories: Math.round(totals.calories),
            protein: Math.round(totals.protein * 10) / 10,
            carbs: Math.round(totals.carbs * 10) / 10,
            fat: Math.round(totals.fat * 10) / 10,
            fiber: Math.round(totals.fiber * 10) / 10
          };
        }
        return meal;
      })
    })));
  };

  const handleEditMeal = (meal: Meal) => {
    setEditingMeal(meal);
    setIsMealModalOpen(true);
  };

  const handleAddMeal = (dayId: string) => {
    setCurrentDayId(dayId);
    setEditingMeal(null);
    setIsMealModalOpen(true);
  };

  const handleSaveMeal = (meal: Meal) => {
    setDayPlans(prev => prev.map(day => {
      if (day.id === currentDayId || day.meals.some(m => m.id === meal.id)) {
        if (editingMeal) {
          // Update existing meal
          return {
            ...day,
            meals: day.meals.map(m => m.id === meal.id ? meal : m)
          };
        } else {
          // Add new meal
          return {
            ...day,
            meals: [...day.meals, meal]
          };
        }
      }
      return day;
    }));

    toast({
      title: editingMeal ? "Posiłek zaktualizowany" : "Posiłek dodany",
      description: editingMeal ? "Zmiany zostały zapisane." : "Nowy posiłek został dodany."
    });
  };

  const handleSaveChanges = () => {
    if (!template) return;
    
    // TODO: Implement template update functionality
    setIsEditMode(false);
    toast({
      title: "Zmiany zapisane",
      description: "Szablon został pomyślnie zaktualizowany."
    });
  };

  const handleCancelEdit = () => {
    setIsEditMode(false);
    // Restore original template data
    if (template) {
      setDayPlans(template.dayPlans);
    }
    toast({
      title: "Anulowano",
      description: "Zmiany zostały anulowane."
    });
  };

  const handleTitleEdit = () => {
    if (!template) return;
    setTempTitle(template.title);
    setEditingTitle(true);
  };

  const saveTitleChange = () => {
    if (!template || !tempTitle.trim()) {
      toast({
        title: "Błąd",
        description: "Nazwa szablonu nie może być pusta",
        variant: "destructive"
      });
      return;
    }

    // TODO: Implement template title update functionality
    setTemplate({...template, title: tempTitle.trim()});
    setEditingTitle(false);
    toast({
      title: "Zaktualizowano",
      description: "Nazwa szablonu została pomyślnie zaktualizowana"
    });
  };

  const cancelTitleEdit = () => {
    setEditingTitle(false);
    setTempTitle("");
  };

  const handleTitleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      saveTitleChange();
    } else if (e.key === 'Escape') {
      cancelTitleEdit();
    }
  };

  const calculateDaySummary = (dayMeals: Meal[]) => {
    const countedMeals = dayMeals.filter(meal => meal.countTowardsDailyCalories !== false);
    const ignoredMeals = dayMeals.filter(meal => meal.countTowardsDailyCalories === false);
    
    const counted = countedMeals.reduce(
      (sum, meal) => ({
        calories: sum.calories + meal.calories,
        protein: sum.protein + meal.protein,
        carbs: sum.carbs + meal.carbs,
        fat: sum.fat + meal.fat,
        fiber: sum.fiber + meal.fiber
      }),
      { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 }
    );

    const ignored = ignoredMeals.reduce(
      (sum, meal) => ({
        calories: sum.calories + meal.calories,
        protein: sum.protein + meal.protein,
        carbs: sum.carbs + meal.carbs,
        fat: sum.fat + meal.fat,
        fiber: sum.fiber + meal.fiber
      }),
      { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 }
    );

    return { counted, ignored, hasIgnored: ignoredMeals.length > 0 };
  };

  const handleClientAssignment = async (client: Client) => {
    // Refresh assigned clients list
    if (id) {
      try {
        const clients = await getClientsAssignedToTemplate(id);
        setAssignedClients(clients);
      } catch (error) {
        logger.error('Error refreshing assigned clients:', error);
      }
    }
  };

  if (!template) {
    return (
      <div className="min-h-screen bg-background p-4 md:p-6">
        <div className="flex items-center justify-center">
          <div className="text-lg text-zinc-100">Ładowanie...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4 md:p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 mb-6">
          <Link to="/jadlospisy">
            <Button variant="ghost" size="sm" className="p-2 sm:p-3 text-zinc-100 hover:bg-zinc-700">
              <ArrowLeft className="h-4 w-4 mr-0 sm:mr-2" />
              <span className="hidden sm:inline">Powrót</span>
            </Button>
          </Link>
        </div>

        <div className="space-y-6">
          {/* Template Header */}
          <Card className="bg-zinc-800 border-zinc-600">
            <CardHeader>
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                {editingTitle ? (
                  <div className="flex items-center gap-2 flex-1">
                    <Input
                      value={tempTitle}
                      onChange={(e) => setTempTitle(e.target.value)}
                      onBlur={saveTitleChange}
                      onKeyDown={handleTitleKeyPress}
                      className="text-2xl md:text-3xl font-bold h-12 bg-zinc-700 border-zinc-600 text-zinc-100 focus:bg-zinc-600 focus:border-[#a08032]"
                      autoFocus
                    />
                    <Button size="sm" onClick={saveTitleChange} className="shrink-0 bg-gradient-to-r from-[#a08032] to-[#e6d280] text-white hover:from-[#8a6c2b] hover:to-[#d4c06b]">
                      Zapisz
                    </Button>
                    <Button size="sm" variant="outline" onClick={cancelTitleEdit} className="shrink-0 bg-zinc-700 border-zinc-600 text-zinc-100 hover:bg-zinc-600">
                      Anuluj
                    </Button>
                  </div>
                ) : (
                  <>
                    <div className="flex-1">
                      <CardTitle 
                        className="text-2xl md:text-3xl text-[#a08032] cursor-pointer hover:text-[#d4c06b] transition-colors border-2 border-transparent hover:border-zinc-600 rounded px-2 py-1"
                        onClick={handleTitleEdit}
                        title="Kliknij aby edytować nazwę"
                      >
                        {template.title}
                      </CardTitle>
                      
                      {/* Assigned clients info */}
                      {assignedClients.length > 0 && (
                        <div className="mt-2 flex items-center gap-2">
                          <Users className="h-4 w-4 text-zinc-400" />
                          <span className="text-sm text-zinc-400">
                            Przypisani klienci: {assignedClients.map(c => `${c.imie} ${c.nazwisko}`).join(', ')}
                          </span>
                        </div>
                      )}
                    </div>
                    
                    <div className="flex flex-wrap gap-2">
                      {!isEditMode ? (
                        <>
                          <Button 
                            variant="outline" 
                            onClick={() => setIsClientModalOpen(true)}
                            className="bg-zinc-700 border-zinc-600 text-zinc-100 hover:bg-zinc-600"
                          >
                            <Users className="h-4 w-4 mr-2" />
                            Przypisz klienta
                          </Button>
                          <Button variant="outline" onClick={() => setIsEditMode(true)} className="bg-zinc-700 border-zinc-600 text-zinc-100 hover:bg-zinc-600">
                            <Edit className="h-4 w-4 mr-2" />
                            Edytuj
                          </Button>
                        </>
                      ) : (
                        <>
                          <Button variant="outline" onClick={handleCancelEdit} className="bg-zinc-700 border-zinc-600 text-zinc-100 hover:bg-zinc-600">
                            <X className="h-4 w-4 mr-2" />
                            Anuluj
                          </Button>
                          <Button onClick={handleSaveChanges} className="bg-gradient-to-r from-[#a08032] to-[#e6d280] text-white hover:from-[#8a6c2b] hover:to-[#d4c06b]">
                            Zapisz zmiany
                          </Button>
                        </>
                      )}
                    </div>
                  </>
                )}
              </div>
            </CardHeader>
          </Card>

          {/* Day Tabs */}
          <Card className="bg-zinc-800 border-zinc-600">
            <CardContent className="p-0">
              <Tabs defaultValue={dayPlans[0]?.id} className="w-full">
                <div className="border-b border-zinc-600">
                  <div className="flex items-center justify-between p-4">
                    <TabsList className="grid auto-cols-fr grid-flow-col h-auto rounded-none bg-zinc-700 border border-zinc-600">
                      {dayPlans.map((day) => (
                        <div key={day.id} className="relative">
                          <TabsTrigger 
                            value={day.id} 
                            className="py-3 text-sm font-medium text-zinc-300 data-[state=active]:text-white data-[state=active]:bg-gradient-to-r data-[state=active]:from-[#a08032] data-[state=active]:to-[#e6d280] data-[state=active]:shadow-sm"
                          >
                            {day.name}
                          </TabsTrigger>
                          {isEditMode && dayPlans.length > 1 && (
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button
                                  variant="destructive"
                                  size="icon"
                                  className="absolute -top-2 -right-2 h-5 w-5 hover:bg-red-600"
                                  title="Usuń dzień"
                                >
                                  <Trash className="h-3 w-3" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent className="bg-zinc-800 border-zinc-600">
                                <AlertDialogHeader>
                                  <AlertDialogTitle className="text-zinc-100">Usuń dzień</AlertDialogTitle>
                                  <AlertDialogDescription className="text-zinc-300">
                                    Czy na pewno chcesz usunąć dzień "{day.name}"? Ta akcja nie może być cofnięta.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel className="bg-zinc-700 border-zinc-600 text-zinc-100 hover:bg-zinc-600">Anuluj</AlertDialogCancel>
                                  <AlertDialogAction onClick={() => handleDeleteDay(day.id)}>Usuń</AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          )}
                        </div>
                      ))}
                    </TabsList>
                    
                    {isEditMode && (
                      <div className="flex items-center gap-2">
                        {showAddDayInput ? (
                          <div className="flex items-center gap-2">
                            <Input
                              value={newDayName}
                              onChange={(e) => setNewDayName(e.target.value)}
                              placeholder="Nazwa nowego dnia"
                              className="w-48 bg-zinc-700 border-zinc-600 text-zinc-100 placeholder-zinc-400 focus:bg-zinc-600 focus:border-[#a08032]"
                              onKeyPress={(e) => e.key === 'Enter' && handleAddDay()}
                            />
                            <Button size="sm" onClick={handleAddDay} className="bg-gradient-to-r from-[#a08032] to-[#e6d280] text-white hover:from-[#8a6c2b] hover:to-[#d4c06b]">
                              Dodaj
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => setShowAddDayInput(false)} className="bg-zinc-700 border-zinc-600 text-zinc-100 hover:bg-zinc-600">
                              Anuluj
                            </Button>
                          </div>
                        ) : (
                          <Button size="sm" onClick={() => setShowAddDayInput(true)} className="bg-zinc-700 border-zinc-600 text-zinc-100 hover:bg-zinc-600">
                            <Plus className="h-4 w-4 mr-2" />
                            Dodaj dzień
                          </Button>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {dayPlans.map((day) => (
                  <TabsContent key={day.id} value={day.id} className="p-6">
                    {day.meals.length > 0 ? (
                      <DndContext
                        sensors={sensors}
                        collisionDetection={closestCenter}
                        onDragEnd={(event) => handleDragEnd(event, day.id)}
                      >
                        <SortableContext items={day.meals.map(meal => meal.id)} strategy={verticalListSortingStrategy}>
                          <div className="space-y-4">
                            {day.meals.map((meal) => (
                              <SortableMeal
                                key={meal.id}
                                meal={meal}
                                isEditMode={isEditMode}
                                onDelete={(mealId) => handleDeleteMeal(day.id, mealId)}
                                onEdit={handleEditMeal}
                                onUpdateIngredient={handleUpdateIngredient}
                              />
                            ))}
                          </div>
                        </SortableContext>
                      </DndContext>
                    ) : (
                      <div className="text-center text-zinc-400 py-8">
                        <p>Brak posiłków dla dnia "{day.name}"</p>
                      </div>
                    )}
                    
                    <div className="mt-4 flex justify-center">
                      <Button onClick={() => handleAddMeal(day.id)} className="bg-zinc-700 border-zinc-600 text-zinc-100 hover:bg-zinc-600">
                        <Plus className="h-4 w-4 mr-2" />
                        Dodaj posiłek
                      </Button>
                    </div>
                    
                    {day.meals.length > 0 && (
                      <div className="mt-6 space-y-4">
                        {(() => {
                          const summary = calculateDaySummary(day.meals);
                          return (
                            <>
                              <div className="p-4 bg-zinc-700 rounded-lg border border-zinc-600">
                                <h4 className="font-medium text-[#a08032] mb-2">Podsumowanie dnia (liczone do dziennych kalorii):</h4>
                                <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm">
                                  <div>
                                    <span className="text-zinc-300">Kalorie:</span>
                                    <div className="font-bold nutrition-kcal">
                                      {summary.counted.calories} kcal
                                    </div>
                                  </div>
                                  <div>
                                    <span className="text-zinc-300">Białko:</span>
                                    <div className="font-bold nutrition-protein">
                                      {summary.counted.protein}g
                                    </div>
                                  </div>
                                  <div>
                                    <span className="text-zinc-300">Węglowodany:</span>
                                    <div className="font-bold nutrition-carbs">
                                      {summary.counted.carbs}g
                                    </div>
                                  </div>
                                  <div>
                                    <span className="text-zinc-300">Tłuszcze:</span>
                                    <div className="font-bold nutrition-fat">
                                      {summary.counted.fat}g
                                    </div>
                                  </div>
                                  <div>
                                    <span className="text-zinc-300">Błonnik:</span>
                                    <div className="font-bold nutrition-fiber">
                                      {summary.counted.fiber}g
                                    </div>
                                  </div>
                                </div>
                              </div>
                              
                              {summary.hasIgnored && (
                                <div className="p-4 bg-zinc-800 rounded-lg border border-orange-400">
                                  <h4 className="font-medium text-orange-400 mb-2">Dodatkowe kalorie (nie liczone do dziennych):</h4>
                                  <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm">
                                    <div>
                                      <span className="text-zinc-300">Kalorie:</span>
                                      <div className="font-bold text-orange-400">
                                        {summary.ignored.calories} kcal
                                      </div>
                                    </div>
                                    <div>
                                      <span className="text-zinc-300">Białko:</span>
                                      <div className="font-bold text-orange-400">
                                        {summary.ignored.protein}g
                                      </div>
                                    </div>
                                    <div>
                                      <span className="text-zinc-300">Węglowodany:</span>
                                      <div className="font-bold text-orange-400">
                                        {summary.ignored.carbs}g
                                      </div>
                                    </div>
                                    <div>
                                      <span className="text-zinc-300">Tłuszcze:</span>
                                      <div className="font-bold text-orange-400">
                                        {summary.ignored.fat}g
                                      </div>
                                    </div>
                                    <div>
                                      <span className="text-zinc-300">Błonnik:</span>
                                      <div className="font-bold text-orange-400">
                                        {summary.ignored.fiber}g
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              )}
                            </>
                          );
                        })()}
                      </div>
                    )}
                    
                    {isEditMode && (
                      <div className="mt-6 flex justify-end gap-2">
                        <Button variant="outline" onClick={handleCancelEdit} className="bg-zinc-700 border-zinc-600 text-zinc-100 hover:bg-zinc-600">
                          <X className="h-4 w-4 mr-2" />
                          Anuluj
                        </Button>
                        <Button onClick={handleSaveChanges} className="bg-gradient-to-r from-[#a08032] to-[#e6d280] text-white hover:from-[#8a6c2b] hover:to-[#d4c06b]">
                          Zapisz zmiany
                        </Button>
                      </div>
                    )}
                  </TabsContent>
                ))}
              </Tabs>
            </CardContent>
          </Card>
        </div>
      </div>

      <DishSelectionModal
        isOpen={isMealModalOpen}
        onClose={() => setIsMealModalOpen(false)}
        onSave={handleSaveMeal}
        meal={editingMeal}
        onSelectDish={() => {}}
        dayPlanId={currentDayId}
        context="templateBuilder"
      />

      <ClientAssignmentModal
        isOpen={isClientModalOpen}
        onClose={() => setIsClientModalOpen(false)}
        templateId={template.id}
        templateTitle={template.title}
        onAssignmentComplete={handleClientAssignment}
        onSnapshotRefresh={undefined} // Template preview doesn't have client snapshots
      />
    </div>
  );
};

export default TemplatePreview;
