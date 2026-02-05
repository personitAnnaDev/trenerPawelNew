import { useState, useEffect, useRef } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Badge } from "@/components/ui/badge";
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
import { ArrowLeft, ChevronDown, ChevronUp, ChevronRight, ChevronLeft, Edit, FileText, Download, X, Plus, Trash, GripVertical, ArrowRight } from "lucide-react";
import { getClientById, Client } from "@/utils/clientStorage";
import { StepCalorieCalculator } from "@/components/StepCalorieCalculator";
import { StepProgressIndicator } from "@/components/StepProgressIndicator";
import { useToast } from "@/hooks/use-toast";
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { SaveTemplateModal } from "@/components/SaveTemplateModal";
import { TemplateSelectionModal } from "@/components/TemplateSelectionModal";
import { UndoRedoNavigation } from "@/components/UndoRedoNavigation";
import { useUndoRedo } from "@/hooks/useUndoRedo";
import DishSelectionModal from "@/components/DishSelectionModal";
import { addTemplateWithRelations } from "@/utils/supabaseTemplates";
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

interface MacroPlanning {
  calories: string;
  proteinPercentage: string;
  proteinGrams: string;
  fatPercentage: string;
  fatGrams: string;
  carbsPercentage: string;
  carbsGrams: string;
  fiberGrams: string;
}

interface CalculatorResults {
  bmr: number;
  tdee: number;
}

// New comprehensive state interface for undo/redo
interface UndoableState {
  dayPlans: DayPlan[];
  dayCalories: { [dayId: string]: string };
  dayMacros: { [dayId: string]: MacroPlanning };
  calculatorResults: CalculatorResults | null;
  weight: string;
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

  return (
    <div ref={setNodeRef} style={style}>
      <Collapsible open={!isCollapsed} onOpenChange={(open) => setIsCollapsed(!open)}>
        <Card className="component-card relative w-full">
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
          <CardHeader className={`pb-3 ${isEditMode ? 'pl-10 pr-10' : ''}`}>
            <div className="flex justify-between items-start">
              <CollapsibleTrigger className="flex items-center gap-2 flex-1 cursor-pointer hover:bg-zinc-800/10 transition-colors rounded px-2 py-1 mr-2">
                {isCollapsed ? <ChevronRight className="h-4 w-4 transition-transform" /> : <ChevronDown className="h-4 w-4 transition-transform" />}
                <div className="flex-1 text-left">
                  <CardTitle className="text-lg brand-text-primary text-left">{meal.name}</CardTitle>
                  <p className="text-sm brand-text-gray font-medium text-left">{meal.dish}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant="secondary" className="bg-blue-600 text-blue-100 text-xs">
                      {meal.calories} kcal
                    </Badge>
                    {!meal.countTowardsDailyCalories && (
                      <Badge variant="outline" className="border-orange-500 text-orange-400 bg-orange-900/20 text-xs">
                        Nie liczy się do dziennych kalorii
                      </Badge>
                    )}
                  </div>
                </div>
              </CollapsibleTrigger>
              {isEditMode && (
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onEdit(meal)}
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
                      >
                        <Trash className="h-3 w-3 text-red-500" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent className="modal-background">
                      <AlertDialogHeader>
                        <AlertDialogTitle className="brand-text-secondary">Usuń posiłek</AlertDialogTitle>
                        <AlertDialogDescription className="text-zinc-300">
                          Czy na pewno chcesz usunąć posiłek "{meal.name}"? Ta akcja nie może być cofnięta.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel className="bg-zinc-700 text-zinc-100 border-zinc-600 hover:bg-zinc-600">Anuluj</AlertDialogCancel>
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
              {/* Nutritional values section - FIRST - Updated to horizontal grid layout */}
              <div className="space-y-2 brand-border border-t pt-4 mb-4">
                <h4 className="font-medium brand-text-secondary mb-3">Wartości odżywcze:</h4>
                <div className="grid grid-cols-5 gap-4 text-sm">
                  <div>
                    <span className="text-zinc-300">Kalorie</span>
                    <div className="font-bold brand-text-secondary">{meal.calories} kcal</div>
                  </div>
                  <div>
                    <span className="text-zinc-300">Białko</span>
                    <div className="font-bold brand-text-secondary">{meal.protein}g</div>
                  </div>
                  <div>
                    <span className="text-zinc-300">Tłuszcze</span>
                    <div className="font-bold brand-text-secondary">{meal.fat}g</div>
                  </div>
                  <div>
                    <span className="text-zinc-300">Węglowodany</span>
                    <div className="font-bold brand-text-secondary">{meal.carbs}g</div>
                  </div>
                  <div>
                    <span className="text-zinc-300">Błonnik</span>
                    <div className="font-bold brand-text-secondary">{meal.fiber}g</div>
                  </div>
                </div>
              </div>

              {/* Ingredients section - SECOND */}
              {meal.ingredients && meal.ingredients.length > 0 && (
                <div className="space-y-3 mb-4">
                  <h4 className="font-medium brand-text-secondary">Składniki:</h4>
                  {meal.ingredients.map((ingredient) => (
                    <div key={ingredient.id} className="flex items-center justify-between p-2 brand-bg-gray rounded">
                      <div className="flex-1">
                        <span className="font-medium text-sm brand-text-secondary">{ingredient.name}</span>
                        <div className="text-xs brand-text-gray mt-1">
                          {ingredient.calories} kcal | B: {ingredient.protein}g | W: {ingredient.carbs}g | T: {ingredient.fat}g | Bł: {ingredient.fiber}g
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium brand-text-secondary">
                          {formatIngredientQuantity(ingredient.quantity, ingredient.unit)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Instructions section - THIRD */}
              {meal.instructions && meal.instructions.length > 0 && (
                <div className="space-y-3">
                  <h4 className="font-medium brand-text-secondary">Instrukcje przygotowania:</h4>
                  <div className="space-y-3">
                    {meal.instructions.map((instruction, index) => (
                      <div key={index} className="brand-bg-gray p-3 rounded brand-border border">
                        <div className="flex items-start gap-2">
                          <span className="font-medium brand-text-primary text-sm min-w-[80px]">
                            Instrukcja {index + 1}:
                          </span>
                          <span className="text-sm brand-text-secondary leading-relaxed">
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
        </Card>
      </Collapsible>
    </div>
  );
};

const AktualnyJadlospis = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [client, setClient] = useState<Client | null>(null);
  const [currentStep, setCurrentStep] = useState(1);
  const [isClientInfoOpen, setIsClientInfoOpen] = useState(false);
  const [isImportantNotesOpen, setIsImportantNotesOpen] = useState(false);
  const [importantNotes, setImportantNotes] = useState("");
  const [isEditMode, setIsEditMode] = useState(false);
  const [newDayName, setNewDayName] = useState("");
  const [showAddDayInput, setShowAddDayInput] = useState(false);
  const [isMealModalOpen, setIsMealModalOpen] = useState(false);
  const [isDishModalOpen, setIsDishModalOpen] = useState(false);
  const [editingMeal, setEditingMeal] = useState<Meal | null>(null);
  const [currentDayId, setCurrentDayId] = useState<string>("");
  const [isSaveTemplateModalOpen, setIsSaveTemplateModalOpen] = useState(false);
  const [isTemplateSelectionModalOpen, setIsTemplateSelectionModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<string>('');

  // Scrollable tabs state
  const tabsScrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const steps = [
    { number: 1, title: "Kalkulator kalorii" },
    { number: 2, title: "Jadłospis" }
  ];

  // Initialize comprehensive state for undo/redo
  const initialState: UndoableState = {
    dayPlans: [
      {
        id: "trening-gora",
        name: "Dzień treningowy góra",
        meals: [
          {
            id: "meal-1",
            name: "Śniadanie",
            dish: "Owsianka z masłem orzechowym",
            instructions: [
              "Przygotuj wszystkie składniki. Odmierz 50g płatków owsianych, 200ml mleka, 20g masła orzechowego i 1 banana. Przygotuj garnek o średniej wielkości i drewnianą łyżkę do mieszania.",
              "Gotowanie owsianki. Wlej mleko do garnka i postaw na średnim ogniu. Gdy mleko zacznie się lekko podgrzewać, dodaj płatki owsiane i gotuj przez 5-7 minut, mieszając regularnie, aby uniknąć przypalenia.",
              "Dodawanie masła orzechowego. Gdy owsianka nabierze kremowej konsystencji, dodaj masło orzechowe i dokładnie wymieszaj. Gotuj jeszcze przez 1-2 minuty, aby wszystkie składniki się połączyły.",
              "Finalizowanie dania. Pokrój banana w równe plastry o grubości około 5mm. Przełóż owsiankę do miski, ułóż plastry banana na wierzchu i opcjonalnie posyp szczyptą cynamonu dla dodatkowego smaku i aromatu."
            ],
            ingredients: [
              { id: "1", name: "Płatki owsiane", quantity: 50, unit: "g", calories: 190, protein: 6.5, carbs: 34, fat: 3.5, fiber: 5 },
              { id: "2", name: "Masło orzechowe", quantity: 20, unit: "g", calories: 120, protein: 5, carbs: 4, fat: 10, fiber: 2 },
              { id: "3", name: "Mleko 2%", quantity: 200, unit: "ml", calories: 100, protein: 6.5, carbs: 9, fat: 3.5, fiber: 0 },
              { id: "4", name: "Banany", quantity: 100, unit: "g", calories: 89, protein: 1, carbs: 23, fat: 0.3, fiber: 2.6 }
            ],
            calories: 499,
            protein: 19,
            carbs: 70,
            fat: 17.3,
            fiber: 9.6,
            countTowardsDailyCalories: true
          }
        ]
      },
      {
        id: "trening-dol",
        name: "Dzień treningowy dół",
        meals: []
      },
      {
        id: "beztreningowy",
        name: "Dzień beztreningowy",
        meals: []
      }
    ],
    dayCalories: {},
    dayMacros: {},
    calculatorResults: null,
    weight: ""
  };

  const {
    state: comprehensiveState,
    set: setComprehensiveState,
    undo,
    redo,
    canUndo,
    canRedo,
  } = useUndoRedo<UndoableState>(initialState);

  // Extract individual state pieces from comprehensive state
  const dayPlans = comprehensiveState.dayPlans;
  const dayCalories = comprehensiveState.dayCalories;
  const dayMacros = comprehensiveState.dayMacros;
  const calculatorResults = comprehensiveState.calculatorResults;
  const clientWeight = comprehensiveState.weight;

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Funkcje do obsługi przewijania tabów
  const checkScrollability = () => {
    if (!tabsScrollRef.current) return;
    
    const element = tabsScrollRef.current;
    const canScrollLeftValue = element.scrollLeft > 0;
    const canScrollRightValue = element.scrollLeft < (element.scrollWidth - element.clientWidth);
    
    setCanScrollLeft(canScrollLeftValue);
    setCanScrollRight(canScrollRightValue);
  };

  const scrollLeft = () => {
    if (!tabsScrollRef.current) return;
    
    const element = tabsScrollRef.current;
    const scrollAmount = Math.min(200, element.clientWidth / 2);
    element.scrollBy({ left: -scrollAmount, behavior: 'smooth' });
  };

  const scrollRight = () => {
    if (!tabsScrollRef.current) return;
    
    const element = tabsScrollRef.current;
    const scrollAmount = Math.min(200, element.clientWidth / 2);
    element.scrollBy({ left: scrollAmount, behavior: 'smooth' });
  };

  // Set active tab when data loads
  useEffect(() => {
    if (dayPlans.length > 0 && !activeTab) {
      setActiveTab(dayPlans[0].id);
    }
  }, [dayPlans, activeTab]);

  // Effect do sprawdzania przewijalności przy zmianie dni lub rozmiarze okna
  useEffect(() => {
    const timer = setTimeout(() => {
      checkScrollability();
    }, 100);

    const handleResize = () => {
      checkScrollability();
    };

    window.addEventListener('resize', handleResize);

    return () => {
      clearTimeout(timer);
      window.removeEventListener('resize', handleResize);
    };
  }, [dayPlans.length]);

  useEffect(() => {
    const fetchClient = async () => {
      if (id) {
        const clientData = await getClientById(id);
        if (clientData) {
          setClient(clientData);
          // Initialize client weight from storage
          if (clientData.wagaPoczatkowa) {
            setComprehensiveState({
              ...comprehensiveState,
              weight: clientData.wagaPoczatkowa
            });
          }
        } else {
          navigate("/klienci");
        }
      }
    };
    fetchClient();
  }, [id, navigate]);

  // Auto-save effect for important notes
  useEffect(() => {
    // Auto-save logic could be implemented here
  }, [importantNotes]);

  const calculateAge = (birthDate: string): number => {
    const today = new Date();
    const birth = new Date(birthDate);
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    return age;
  };

  const handleStepChange = (step: number) => {
    setCurrentStep(step);
  };

  const handleWeightChange = (weight: string) => {
    setComprehensiveState({
      ...comprehensiveState,
      weight
    });
  };

  const handleResultsChange = (results: CalculatorResults | null) => {
    setComprehensiveState({
      ...comprehensiveState,
      calculatorResults: results
    });
  };

  // Updated color coding function - colors for actual values based on comparison with planned
  const getComparisonColor = (planned: number, actual: number) => {
    if (planned === 0) return "text-zinc-300"; // Default when no plan set
    if (planned < actual) return "text-red-400"; // RED when planned < actual (over target)
    if (planned === actual) return "text-green-400"; // GREEN when planned = actual (on target)
    if (planned > actual) return "text-orange-400"; // ORANGE when planned > actual (under target)
    return "text-zinc-300"; // Default
  };

  // Calculate missing calories from macros
  const calculateMissingCalories = (dayId: string): number => {
    const calories = parseFloat(dayCalories[dayId] || "0");
    const macros = dayMacros[dayId];
    
    if (!macros || calories === 0) return 0;
    
    const proteinCals = parseFloat(macros.proteinGrams || "0") * 4;
    const fatCals = parseFloat(macros.fatGrams || "0") * 9;
    const carbsCals = parseFloat(macros.carbsGrams || "0") * 4;
    const totalMacroCals = proteinCals + fatCals + carbsCals;
    
    return calories - totalMacroCals;
  };

  const handleDragEnd = (event: any, dayId: string) => {
    const { active, over } = event;

    if (active.id !== over.id) {
      const newDayPlans = dayPlans.map(day => {
        if (day.id === dayId) {
          const oldIndex = day.meals.findIndex(meal => meal.id === active.id);
          const newIndex = day.meals.findIndex(meal => meal.id === over.id);
          return {
            ...day,
            meals: arrayMove(day.meals, oldIndex, newIndex)
          };
        }
        return day;
      });
      
      setComprehensiveState({
        ...comprehensiveState,
        dayPlans: newDayPlans
      });
    }
  };

  const handleDeleteMeal = (dayId: string, mealId: string) => {
    const newDayPlans = dayPlans.map(day => {
      if (day.id === dayId) {
        return {
          ...day,
          meals: day.meals.filter(meal => meal.id !== mealId)
        };
      }
      return day;
    });
    
    setComprehensiveState({
      ...comprehensiveState,
      dayPlans: newDayPlans
    });
    
    toast({
      title: "Posiłek usunięty",
      description: "Posiłek został pomyślnie usunięty."
    });
  };

  const handleDeleteDay = (dayId: string) => {
    const newDayPlans = dayPlans.filter(day => day.id !== dayId);
    const newDayCalories = { ...dayCalories };
    const newDayMacros = { ...dayMacros };
    delete newDayCalories[dayId];
    delete newDayMacros[dayId];
    
    setComprehensiveState({
      ...comprehensiveState,
      dayPlans: newDayPlans,
      dayCalories: newDayCalories,
      dayMacros: newDayMacros
    });
    
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
      
      setComprehensiveState({
        ...comprehensiveState,
        dayPlans: [...dayPlans, newDay]
      });
      
      setNewDayName("");
      setShowAddDayInput(false);
      toast({
        title: "Dzień dodany",
        description: `Dodano nowy dzień: ${newDayName}`
      });
    }
  };

  const handleUpdateIngredient = (mealId: string, ingredientId: string, newQuantity: number) => {
    const newDayPlans = dayPlans.map(day => ({
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
    }));
    
    setComprehensiveState({
      ...comprehensiveState,
      dayPlans: newDayPlans
    });
  };

  const handleEditMeal = (meal: Meal) => {
    setEditingMeal(meal);
    setIsMealModalOpen(true);
  };

  const handleAddMeal = (dayId: string) => {
    setCurrentDayId(dayId);
    setEditingMeal(null);
    setIsDishModalOpen(true);
  };

  const handleSelectDish = (meal: Meal) => {
    const newDayPlans = dayPlans.map(day => {
      if (day.id === currentDayId) {
        return {
          ...day,
          meals: [...day.meals, meal]
        };
      }
      return day;
    });
    
    setComprehensiveState({
      ...comprehensiveState,
      dayPlans: newDayPlans
    });

    toast({
      title: "Posiłek dodany",
      description: `Posiłek "${meal.name}" został dodany.`
    });
  };

  const handleSaveMeal = (meal: Meal) => {
    const newDayPlans = dayPlans.map(day => {
      if (day.id === currentDayId || day.meals.some(m => m.id === meal.id)) {
        if (editingMeal) {
          return {
            ...day,
            meals: day.meals.map(m => m.id === meal.id ? meal : m)
          };
        } else {
          return {
            ...day,
            meals: [...day.meals, meal]
          };
        }
      }
      return day;
    });
    
    setComprehensiveState({
      ...comprehensiveState,
      dayPlans: newDayPlans
    });

    toast({
      title: editingMeal ? "Posiłek zaktualizowany" : "Posiłek dodany",
      description: editingMeal ? "Zmiany zostały zapisane." : "Nowy posiłek został dodany."
    });
  };

  const handleSaveChanges = () => {
    setIsEditMode(false);
    toast({
      title: "Zmiany zapisane",
      description: "Jadłospis został pomyślnie zaktualizowany."
    });
  };

  const handleCancelEdit = () => {
    setIsEditMode(false);
    toast({
      title: "Anulowano",
      description: "Zmiany zostały anulowane."
    });
  };

  const handleSaveAsTemplate = async (title: string) => {
    if (!client) return;
    try {
      // Konwersja dayPlans do formatu z day_number
      const formattedDayPlans = dayPlans.map((day, idx) => ({
        name: day.name,
        day_number: idx + 1,
        meals: day.meals.map(meal => ({
          name: meal.name,
          time: "", // Dodaj logikę czasu jeśli potrzebna
          dish: meal.dish,
          instructions: meal.instructions,
          calories: meal.calories,
          protein: meal.protein,
          carbs: meal.carbs,
          fat: meal.fat,
          fiber: meal.fiber,
          count_in_daily_total: meal.countTowardsDailyCalories,
          ingredients: meal.ingredients.map(ing => ({
            name: ing.name,
            quantity: ing.quantity,
            unit: ing.unit,
            calories: ing.calories,
            protein: ing.protein,
            carbs: ing.carbs,
            fat: ing.fat,
            fiber: ing.fiber
          }))
        }))
      }));

      await addTemplateWithRelations({
        title,
        dayPlans: formattedDayPlans,
        user_id: client.id
      });
      toast({
        title: "Szablon zapisany",
        description: `Szablon "${title}" został pomyślnie zapisany.`
      });
    } catch (error) {
      toast({
        title: "Błąd",
        description: "Nie udało się zapisać szablonu. Spróbuj ponownie.",
        variant: "destructive"
      });
    }
  };

  const handleApplyTemplate = (template: any) => {
    // Ensure all meals have the countTowardsDailyCalories field
    const updatedDayPlans = template.dayPlans.map((day: any) => ({
      id: `day-${day.day_number}`,
      name: day.name,
      meals: day.meals.map((meal: any) => ({
        ...meal,
        countTowardsDailyCalories: meal.count_in_daily_total ?? true
      }))
    }));

    setComprehensiveState({
      ...comprehensiveState,
      dayPlans: updatedDayPlans
    });
    
    toast({
      title: "Szablon zastosowany",
      description: `Szablon "${template.title}" został pomyślnie zastosowany.`
    });
  };

  const handleDayCalorieChange = (dayId: string, value: string) => {
    setComprehensiveState({
      ...comprehensiveState,
      dayCalories: {
        ...dayCalories,
        [dayId]: value
      }
    });
  };

  const handleMacroChange = (dayId: string, macros: MacroPlanning) => {
    setComprehensiveState({
      ...comprehensiveState,
      dayMacros: {
        ...dayMacros,
        [dayId]: macros
      }
    });
  };

  if (!client) {
    return (
      <div className="page-background p-4 md:p-6">
        <div className="flex items-center justify-center">
          <div className="text-lg brand-text-secondary">Ładowanie...</div>
        </div>
      </div>
    );
  }

  const clientAge = calculateAge(client.dataUrodzenia);
  const clientWeightNum = parseFloat(clientWeight || client.wagaPoczatkowa || "70");

  return (
    <div className="page-background p-4 md:p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 mb-6">
          <Link to={`/klienci/${id}`}>
            <Button variant="ghost" size="sm" className="p-2 sm:p-3 brand-text-secondary hover:bg-zinc-800">
              <ArrowLeft className="h-4 w-4 mr-0 sm:mr-2" />
              <span className="hidden sm:inline">Powrót</span>
            </Button>
          </Link>
          
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl md:text-3xl font-bold brand-text-secondary truncate">
              Aktualny jadłospis - {client.imie} {client.nazwisko}
            </h1>
            <p className="brand-text-gray mt-1 text-sm md:text-base">Dieta redukcyjna - Marzec 2024</p>
          </div>
        </div>

        {/* Progress Indicator */}
        <StepProgressIndicator
          currentStep={currentStep}
          onStepClick={handleStepChange}
          steps={steps}
        />

        {/* Step 1: Kalkulator kalorii */}
        {currentStep === 1 && (
          <div className="space-y-6">
            <StepCalorieCalculator
              clientAge={clientAge}
              clientGender={client.plec}
              clientHeight={client.wzrost}
              dayPlans={dayPlans}
              onDayCalorieChange={handleDayCalorieChange}
              onMacroChange={handleMacroChange}
              onWeightChange={handleWeightChange}
              onResultsChange={handleResultsChange}
              initialWeight={clientWeight}
            />
            
            <div className="flex justify-end">
              <Button onClick={() => setCurrentStep(2)} className="flex items-center gap-2">
                Dalej
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        {/* Step 2: Jadłospis */}
        {currentStep === 2 && (
          <div className="space-y-6">
            {/* Diet Header */}
            <Card className="component-card">
              <CardHeader>
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                  <CardTitle className="text-2xl md:text-3xl brand-text-primary">
                    Dieta dla {client.imie} {client.nazwisko}
                  </CardTitle>
                  <div className="flex flex-wrap gap-2">
                    {!isEditMode ? (
                      <>
                        <Button variant="outline" onClick={() => setIsEditMode(true)}>
                          <Edit className="h-4 w-4 mr-2" />
                          Edytuj
                        </Button>
                        <Button variant="outline" onClick={() => setIsTemplateSelectionModalOpen(true)}>
                          <FileText className="h-4 w-4 mr-2" />
                          Wybierz szablon
                        </Button>
                        <Button variant="outline" onClick={() => setIsSaveTemplateModalOpen(true)}>
                          <FileText className="h-4 w-4 mr-2" />
                          Zapisz jako szablon
                        </Button>
                        <Button variant="outline">
                          <Download className="h-4 w-4 mr-2" />
                          Pobierz PDF
                        </Button>
                      </>
                    ) : (
                      <>
                        <Button variant="outline" onClick={handleCancelEdit}>
                          <X className="h-4 w-4 mr-2" />
                          Anuluj
                        </Button>
                        <Button onClick={handleSaveChanges}>
                          Zapisz zmiany
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              </CardHeader>
            </Card>

            {/* Important Notes - Collapsible */}
            <Collapsible open={isImportantNotesOpen} onOpenChange={setIsImportantNotesOpen}>
              <Card className="component-card">
                <CollapsibleTrigger asChild>
                  <CardHeader className="cursor-pointer hover:bg-zinc-800/50 transition-colors">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg md:text-xl brand-text-secondary">Ważne informacje</CardTitle>
                      {isImportantNotesOpen ? (
                        <ChevronUp className="h-4 w-4 transition-transform" />
                      ) : (
                        <ChevronDown className="h-4 w-4 transition-transform" />
                      )}
                    </div>
                  </CardHeader>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <CardContent>
                    <Textarea
                      value={importantNotes}
                      onChange={(e) => setImportantNotes(e.target.value)}
                      placeholder="Dodaj ważne informacje dotyczące jadłospisu..."
                      className="min-h-[100px] input-dark"
                    />
                  </CardContent>
                </CollapsibleContent>
              </Card>
            </Collapsible>

            {/* Client Info - Collapsible */}
            <Collapsible open={isClientInfoOpen} onOpenChange={setIsClientInfoOpen}>
              <Card className="component-card">
                <CollapsibleTrigger asChild>
                  <CardHeader className="cursor-pointer hover:bg-zinc-800/50 transition-colors">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg md:text-xl brand-text-secondary">Informacje o kliencie</CardTitle>
                      {isClientInfoOpen ? (
                        <ChevronUp className="h-4 w-4 transition-transform" />
                      ) : (
                        <ChevronDown className="h-4 w-4 transition-transform" />
                      )}
                    </div>
                  </CardHeader>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <CardContent className="space-y-4">
                    <div>
                      <h4 className="font-medium brand-text-secondary mb-2">Lista produktów, których nie lubi jeść:</h4>
                      <p className="text-zinc-300 brand-bg-gray p-3 rounded-md brand-border border">
                        {client.produktyNielubiane || "Brak informacji"}
                      </p>
                    </div>
                    
                    <div>
                      <h4 className="font-medium brand-text-secondary mb-2">Obecny proces:</h4>
                      <p className="text-zinc-300 brand-bg-gray p-3 rounded-md brand-border border capitalize">
                        {client.obecnyProces || "Nie określono"}
                      </p>
                    </div>
                  </CardContent>
                </CollapsibleContent>
              </Card>
            </Collapsible>

            {/* Day Tabs - Diet Creation Interface */}
            <Card className="component-card">
              <CardContent className="p-0">
                <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                  <div className="brand-border border-b">
                    <div className="flex items-center py-4 px-2">
                      {/* Left Arrow */}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={scrollLeft}
                        disabled={!canScrollLeft}
                        className={`h-8 w-8 p-0 flex-shrink-0 mr-2 ${
                          canScrollLeft 
                            ? 'text-zinc-300 hover:text-white hover:bg-zinc-700' 
                            : 'text-zinc-600 cursor-not-allowed opacity-50'
                        }`}
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </Button>

                      {/* Scrollable Tabs Container */}
                      <div className="flex-1 overflow-hidden brand-bg-light brand-border border rounded-md">
                        <div
                          ref={tabsScrollRef}
                          className="overflow-x-auto scrollbar-hide"
                          onScroll={checkScrollability}
                        >
                          <div className="flex">
                            {dayPlans.map((day) => (
                              <div key={day.id} className="relative flex-shrink-0 border-r border-zinc-800 last:border-r-0">
                                <button
                                  onClick={() => setActiveTab(day.id)}
                                  className={`py-3 px-4 text-sm font-medium whitespace-nowrap flex-shrink-0 transition-colors relative ${
                                    activeTab === day.id
                                      ? 'bg-gradient-to-r from-[#a08032] to-[#e6d280] text-white shadow-sm'
                                      : 'brand-text-gray hover:brand-text-secondary hover:bg-zinc-700'
                                  }`}
                                >
                                  {day.name}
                                </button>
                                {isEditMode && dayPlans.length > 1 && (
                                  <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                      <Button
                                        variant="destructive"
                                        size="icon"
                                        className="absolute -top-2 -right-2 h-5 w-5 hover:bg-red-600 z-10"
                                        title="Usuń dzień"
                                      >
                                        <Trash className="h-3 w-3" />
                                      </Button>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent className="modal-background">
                                      <AlertDialogHeader>
                                        <AlertDialogTitle className="brand-text-secondary">Usuń dzień</AlertDialogTitle>
                                        <AlertDialogDescription className="text-zinc-300">
                                          Czy na pewno chcesz usunąć dzień "{day.name}"? Ta akcja nie może być cofnięta.
                                        </AlertDialogDescription>
                                      </AlertDialogHeader>
                                      <AlertDialogFooter>
                                        <AlertDialogCancel className="bg-zinc-700 text-zinc-100 border-zinc-600 hover:bg-zinc-600">Anuluj</AlertDialogCancel>
                                        <AlertDialogAction onClick={() => handleDeleteDay(day.id)}>Usuń</AlertDialogAction>
                                      </AlertDialogFooter>
                                    </AlertDialogContent>
                                  </AlertDialog>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>

                      {/* Right Arrow */}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={scrollRight}
                        disabled={!canScrollRight}
                        className={`h-8 w-8 p-0 flex-shrink-0 ml-2 ${
                          canScrollRight 
                            ? 'text-zinc-300 hover:text-white hover:bg-zinc-700' 
                            : 'text-zinc-600 cursor-not-allowed opacity-50'
                        }`}
                      >
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                      
                      {isEditMode && (
                        <div className="flex items-center gap-2">
                          {showAddDayInput ? (
                            <div className="flex items-center gap-2">
                              <Input
                                value={newDayName}
                                onChange={(e) => setNewDayName(e.target.value)}
                                placeholder="Nazwa nowego dnia"
                                className="w-48 input-dark"
                                onKeyPress={(e) => e.key === 'Enter' && handleAddDay()}
                              />
                              <Button size="sm" onClick={handleAddDay}>
                                Dodaj
                              </Button>
                              <Button size="sm" variant="outline" onClick={() => setShowAddDayInput(false)}>
                                Anuluj
                              </Button>
                            </div>
                          ) : (
                            <Button size="sm" onClick={() => setShowAddDayInput(true)}>
                              <Plus className="h-4 w-4 mr-2" />
                              Dodaj dzień
                            </Button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {dayPlans.map((day) => {
                    // Calculate actual totals considering the countTowardsDailyCalories flag
                    const actualTotals = {
                      calories: day.meals.reduce((sum, meal) => sum + (meal.countTowardsDailyCalories ? meal.calories : 0), 0),
                      protein: day.meals.reduce((sum, meal) => sum + (meal.countTowardsDailyCalories ? meal.protein : 0), 0),
                      fat: day.meals.reduce((sum, meal) => sum + (meal.countTowardsDailyCalories ? meal.fat : 0), 0),
                      carbs: day.meals.reduce((sum, meal) => sum + (meal.countTowardsDailyCalories ? meal.carbs : 0), 0),
                      fiber: day.meals.reduce((sum, meal) => sum + (meal.countTowardsDailyCalories ? meal.fiber : 0), 0)
                    };

                    const plannedCalories = parseFloat(dayCalories[day.id] || "0");
                    const plannedProtein = parseFloat(dayMacros[day.id]?.proteinGrams || "0");
                    const plannedFat = parseFloat(dayMacros[day.id]?.fatGrams || "0");
                    const plannedCarbs = parseFloat(dayMacros[day.id]?.carbsGrams || "0");
                    const plannedFiber = parseFloat(dayMacros[day.id]?.fiberGrams || "0");

                    return (
                      <TabsContent key={day.id} value={day.id} className="p-6">
                        {/* Day Summary - FIXED color coding logic */}
                        {(day.meals.length > 0 || plannedCalories > 0) && (
                          <div className="mb-6 p-4 brand-bg-gray rounded-lg brand-border border">
                            <h4 className="font-medium brand-text-primary mb-3">Podsumowanie dnia:</h4>
                            
                            {/* PPM/CPM Display */}
                            {calculatorResults && (
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4 pb-4 border-b border-zinc-700">
                                <div>
                                  <span className="text-zinc-300">PPM:</span>
                                  <div className="font-bold text-[#e6d280]">
                                    {calculatorResults.bmr} kcal/dzień
                                  </div>
                                </div>
                                <div>
                                  <span className="text-zinc-300">CPM:</span>
                                  <div className="font-bold text-[#e6d280]">
                                    {calculatorResults.tdee} kcal/dzień
                                  </div>
                                </div>
                              </div>
                            )}

                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 text-sm">
                              {/* Calories */}
                              <div className="space-y-2">
                                <div>
                                  <span className="text-zinc-300">Zaplanowane kalorie:</span>
                                  <div className="font-bold text-white">
                                    {plannedCalories > 0 ? `${plannedCalories} kcal` : "Nie ustawiono"}
                                  </div>
                                </div>
                                <div>
                                  <span className="text-zinc-300">Kalorie:</span>
                                  <div className={`font-bold ${getComparisonColor(plannedCalories, actualTotals.calories)}`}>
                                    {actualTotals.calories} kcal
                                  </div>
                                </div>
                              </div>
                              
                              {/* Protein */}
                              <div className="space-y-2">
                                <div>
                                  <span className="text-zinc-300">Zaplanowane białko:</span>
                                  <div className="font-bold text-white">
                                    {plannedProtein > 0 ? `${plannedProtein}g` : "Nie ustawiono"}
                                  </div>
                                </div>
                                <div>
                                  <span className="text-zinc-300">Białko:</span>
                                  <div className={`font-bold ${getComparisonColor(plannedProtein, actualTotals.protein)}`}>
                                    {actualTotals.protein}g
                                  </div>
                                </div>
                              </div>
                              
                              {/* Fats */}
                              <div className="space-y-2">
                                <div>
                                  <span className="text-zinc-300">Zaplanowane tłuszcze:</span>
                                  <div className="font-bold text-white">
                                    {plannedFat > 0 ? `${plannedFat}g` : "Nie ustawiono"}
                                  </div>
                                </div>
                                <div>
                                  <span className="text-zinc-300">Tłuszcze:</span>
                                  <div className={`font-bold ${getComparisonColor(plannedFat, actualTotals.fat)}`}>
                                    {actualTotals.fat}g
                                  </div>
                                </div>
                              </div>
                              
                              {/* Carbs */}
                              <div className="space-y-2">
                                <div>
                                  <span className="text-zinc-300">Zaplanowane węglowodany:</span>
                                  <div className="font-bold text-white">
                                    {plannedCarbs > 0 ? `${plannedCarbs}g` : "Nie ustawiono"}
                                  </div>
                                </div>
                                <div>
                                  <span className="text-zinc-300">Węglowodany:</span>
                                  <div className={`font-bold ${getComparisonColor(plannedCarbs, actualTotals.carbs)}`}>
                                    {actualTotals.carbs}g
                                  </div>
                                </div>
                              </div>

                              {/* Fiber */}
                              <div className="space-y-2">
                                <div>
                                  <span className="text-zinc-300">Zaplanowany błonnik:</span>
                                  <div className="font-bold text-white">
                                    {plannedFiber > 0 ? `${plannedFiber}g` : "Nie ustawiono"}
                                  </div>
                                </div>
                                <div>
                                  <span className="text-zinc-300">Błonnik:</span>
                                  <div className={`font-bold ${getComparisonColor(plannedFiber, actualTotals.fiber)}`}>
                                    {actualTotals.fiber}g
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        )}

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
                          <div className="text-center brand-text-gray py-8">
                            <p>Jadłospis dla dnia "{day.name}" - w przygotowaniu</p>
                          </div>
                        )}
                        
                        <div className="mt-4 flex justify-center">
                          <Button onClick={() => handleAddMeal(day.id)}>
                            <Plus className="h-4 w-4 mr-2" />
                            Dodaj posiłek
                          </Button>
                        </div>
                      </TabsContent>
                    );
                  })}
                </Tabs>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Floating Undo/Redo Navigation */}
        <UndoRedoNavigation
          canUndo={canUndo}
          canRedo={canRedo}
          onUndo={undo}
          onRedo={redo}
        />
      </div>

      {/* Modals */}
      {/* MealEditModal usunięty */}

      <DishSelectionModal
        isOpen={isDishModalOpen}
        onClose={() => setIsDishModalOpen(false)}
        onSelectDish={handleSelectDish}
        dayPlanId={currentDayId}
        context="clientDiet"
      />

      <TemplateSelectionModal
        isOpen={isTemplateSelectionModalOpen}
        onClose={() => setIsTemplateSelectionModalOpen(false)}
        onSelectTemplate={handleApplyTemplate}
        clientName={client ? `${client.imie} ${client.nazwisko}` : undefined}
      />

      <SaveTemplateModal
        isOpen={isSaveTemplateModalOpen}
        onClose={() => setIsSaveTemplateModalOpen(false)}
        onSave={handleSaveAsTemplate}
        clientName={client ? `${client.imie} ${client.nazwisko}` : undefined}
      />
    </div>
  );
};

export default AktualnyJadlospis;
