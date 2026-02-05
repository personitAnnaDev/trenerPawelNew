import React, { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Button } from "@/components/ui/button";
import { Loader2, Eye, ChevronDown, ChevronRight, ChevronLeft, FileDown } from "lucide-react";
import { getClientByShareToken, Client } from "@/utils/clientStorage";
import { supabase } from "@/utils/supabase";
import { useToast } from "@/hooks/use-toast";
import { Toaster } from "@/components/ui/toaster";
import { debounce } from "@/utils/debounce";
import { useDietPDFGenerator } from '@/hooks/useDietPDFGenerator';
import { formatIngredientQuantity } from "@/utils/formatIngredients";
import { PDFDaySelectionModal } from "@/components/PDFDaySelectionModal";
import { errorLogger } from "@/services/errorLoggingService";
import { logger } from '@/utils/logger';

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

export const PublicDietView: React.FC = () => {
  const { token } = useParams<{ token: string }>();
  const [client, setClient] = useState<Client | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mealCollapsedState, setMealCollapsedState] = useState<{ [mealId: string]: boolean }>({});
  const [activeTab, setActiveTab] = useState<string>('');
  const [pdfModalOpen, setPdfModalOpen] = useState(false);
  const { toast } = useToast();
  const { downloadPDF, isLoading: isDownloadingPDF } = useDietPDFGenerator();
  const tabsScrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  // Helper: Consistent rounding to match badge calculations
  // First round to 1 decimal place, then to integer
  // This ensures 2.47 → 2.5 → 3 (not 2.47 → 2)
  const formatMacro = (value: number): number => {
    return Math.round(parseFloat(value.toFixed(1)));
  };

  // Always define all hooks before any conditional logic

  // Otwórz modal wyboru dni do PDF
  const handleDownloadPDF = async () => {
    if (!client || !client.dietPlanData) {
      toast({
        title: "Błąd",
        description: "Brak danych jadłospisu do pobrania",
        variant: "destructive",
      });
      return;
    }

    setPdfModalOpen(true);
  };

  // Generuj PDF dla wybranych dni
  const handleGeneratePDF = async (selectedDayIds: string[]) => {
    if (!client || !client.dietPlanData) {
      toast({
        title: "Błąd",
        description: "Brak danych jadłospisu do pobrania",
        variant: "destructive",
      });
      return;
    }


    try {
      const pdfProps = {
        client: client,
        dayPlans: client.dietPlanData.dayPlans || [],
        dayCalories: client.dietPlanData.dayCalories || {},
        dayMacros: client.dietPlanData.dayMacros || {},
        calculatorResults: client.dietPlanData.calculatorResults,
        importantNotes: client.dietPlanData.importantNotes || client.wazneInformacje,
        showMacros: client.showMacrosInJadlospis ?? true,
        selectedDayIds // Nowy parametr do filtrowania dni
      };

      const pdfResult = await downloadPDF(pdfProps);

      // Pokaż odpowiedni toast w zależności od wyniku (iOS vs desktop)
      if (pdfResult.result === 'shared' || pdfResult.result === 'copied') {
        toast({
          title: pdfResult.result === 'shared' ? "PDF udostępniony!" : "Sukces",
          description: pdfResult.message,
          variant: "default",
        });
      } else if (pdfResult.result === 'cancelled') {
        toast({
          title: "Anulowano",
          description: pdfResult.message,
          variant: "default",
        });
      } else {
        toast({
          title: "Błąd",
          description: pdfResult.message,
          variant: "destructive",
        });
      }
    } catch (error) {
      // Log error to database (public view - no user context)
      errorLogger.logError({
        type: 'UNKNOWN',
        message: error instanceof Error ? error.message : 'Błąd generowania PDF',
        component: 'PublicDietView',
        context: {
          token: token,
          clientName: client?.name,
          daysCount: client?.dayPlans?.length
        },
        severity: 'error'
      }).catch(err => {});

      toast({
        title: "Błąd",
        description: "Wystąpił błąd podczas generowania PDF. Spróbuj ponownie.",
        variant: "destructive",
      });
    } finally {
      setPdfModalOpen(false);
    }
  };

  const fetchClientData = async () => {
    if (!token) {
      setError('Brak tokenu dostępu');
      setLoading(false);
      return null;
    }

    try {
      const clientData = await getClientByShareToken(token);
      if (!clientData) {
        setError('Nie znaleziono jadłospisu dla podanego linku lub link jest nieprawidłowy');
        return null;
      } else {
        setClient(clientData);
        return clientData;
      }
    } catch (err) {
      logger.error('Błąd pobierania danych klienta:', err);
      setError('Wystąpił błąd podczas ładowania jadłospisu');
      return null;
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let pollingInterval: NodeJS.Timeout | null = null;
    let isMounted = true;
    let lastKnownClientTimestamp: string | null = null;
    let lastKnownMealsTimestamp: string | null = null;

    const fetchAndStartPolling = async () => {
      if (!token) return;
      const clientData = await fetchClientData();
      if (!clientData || !isMounted) return;

      // Get initial timestamps using RPC function (bypasses RLS)
      try {
        const { data: timestamps } = await supabase
          .rpc('get_public_diet_last_updated', { p_token: token });
        if (timestamps) {
          lastKnownClientTimestamp = timestamps.client_updated_at;
          lastKnownMealsTimestamp = timestamps.meals_updated_at;
        }
      } catch {}

      const checkForUpdates = async () => {
        if (!token) return;
        try {
          // Use RPC function to check for updates (bypasses RLS)
          const { data: timestamps, error: timestampError } = await supabase
            .rpc('get_public_diet_last_updated', { p_token: token });

          if (timestampError || !timestamps) return;

          let hasChanges = false;
          let changeDescription = '';

          if (timestamps.client_updated_at && timestamps.client_updated_at !== lastKnownClientTimestamp) {
            hasChanges = true;
            changeDescription = 'dane klienta';
            lastKnownClientTimestamp = timestamps.client_updated_at;
          }

          if (timestamps.meals_updated_at && timestamps.meals_updated_at !== lastKnownMealsTimestamp) {
            hasChanges = true;
            changeDescription = changeDescription ? 'dane klienta i posiłki' : 'posiłki';
            lastKnownMealsTimestamp = timestamps.meals_updated_at;
          }

          if (hasChanges) {
            let refreshSuccess = false;
            let retries = 0;
            const maxRetries = 3;
            while (!refreshSuccess && retries < maxRetries) {
              try {
                const updatedClient = await getClientByShareToken(token);
                if (updatedClient && isMounted) {
                  setClient(updatedClient);
                  refreshSuccess = true;
                  toast({
                    title: "Jadłospis zaktualizowany",
                    description: `Wykryto zmianę w: ${changeDescription}`,
                    variant: "default",
                  });
                } else {
                  throw new Error('Received null client data');
                }
              } catch {
                retries++;
                if (retries < maxRetries) {
                  await new Promise(resolve => setTimeout(resolve, 2000 * retries));
                }
              }
            }
            if (!refreshSuccess) {
              toast({
                title: "Problem z połączeniem",
                description: `Wykryto zmianę w: ${changeDescription}, ale nie udało się pobrać nowych danych. Spróbuj odświeżyć stronę.`,
                variant: "destructive",
              });
            }
          }
        } catch {}
      };

      pollingInterval = setInterval(checkForUpdates, 60000);
    };

    fetchAndStartPolling();

    return () => {
      isMounted = false;
      if (pollingInterval) clearInterval(pollingInterval);
    };
  }, [token, toast]);

  // Do not return early! Only use conditional rendering in JSX below

  // Check if macros should be shown based on client settings
  const shouldShowMacros = client?.showMacrosInJadlospis ?? true;

  const dayPlans: DayPlan[] = client?.dietPlanData?.dayPlans || [];
  const dayCalories = client?.dietPlanData?.dayCalories || {};
  const dayMacros = client?.dietPlanData?.dayMacros || {};

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

  // Set active tab when data loads AND check scrollability
  useEffect(() => {
    if (dayPlans.length > 0 && !activeTab) {
      setActiveTab(dayPlans[0].id);
    }

    // Check scrollability after tab is set
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
  }, [dayPlans, activeTab]);

  return (
    <div className="min-h-screen bg-background p-4 md:p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="flex items-center gap-2">
              <Eye className="h-5 w-5 text-zinc-400" />
              <span className="text-sm text-zinc-400">Podgląd publiczny</span>
            </div>
          </div>
          
          <div className="text-center">
            <h1 className="text-2xl md:text-3xl font-bold text-zinc-100 mb-2">
              {client ? `Jadłospis dla ${client.imie} ${client.nazwisko}` : "Jadłospis"}
            </h1>
            <p className="text-zinc-400 mb-4">Plan żywieniowy - podgląd tylko do odczytu</p>
            
            {/* Download PDF Button */}
            {client && client.dietPlanData?.dayPlans && client.dietPlanData.dayPlans.length > 0 && (
              <div className="mb-4">
                <Button
                  onClick={handleDownloadPDF}
                  disabled={isDownloadingPDF}
                  className="bg-gradient-to-r from-[#a08032] to-[#e6d280] hover:from-[#8a6b28] hover:to-[#d4b860] text-white font-medium px-6 py-2 rounded-lg transition-all duration-200 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isDownloadingPDF ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Generowanie PDF...
                    </>
                  ) : (
                    <>
                      <FileDown className="h-4 w-4 mr-2" />
                      Pobierz PDF
                    </>
                  )}
                </Button>
              </div>
            )}
            
            {/* Basic client info with important notes */}
            <div className="mt-4 space-y-3">
              {/* Important notes - horizontal layout */}
              {client?.wazneInformacje && (
                <div className="bg-amber-900/20 border border-amber-600/30 rounded-lg p-3">
                  <div className="flex items-start gap-3">
                    <h3 className="text-amber-300 font-medium text-sm whitespace-nowrap">Ważne informacje:</h3>
                    <p className="text-amber-100 text-xs leading-relaxed whitespace-pre-wrap flex-1 text-left">
                      {client.wazneInformacje}
                    </p>
                  </div>
                </div>
              )}
            </div>

          </div>
        </div>

        {/* Diet Plan Content */}
        {dayPlans.length > 0 ? (
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
                            <button
                              key={day.id}
                              onClick={() => setActiveTab(day.id)}
                              className={`py-3 px-4 text-sm font-medium whitespace-nowrap flex-shrink-0 transition-colors border-r border-zinc-800 last:border-r-0 ${
                                activeTab === day.id
                                  ? 'bg-gradient-to-r from-[#a08032] to-[#e6d280] text-white shadow-sm'
                                  : 'brand-text-gray hover:brand-text-secondary hover:bg-zinc-700'
                              }`}
                            >
                              {day.name}
                            </button>
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
                  </div>
                </div>

                {dayPlans.map((day) => {
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
                      {/* Day Summary - only show if macros should be displayed */}
                      {shouldShowMacros && (day.meals.length > 0 || plannedCalories > 0) && (
                        <div className="mb-6 p-4 brand-bg-gray rounded-lg brand-border border">
                          <h4 className="font-medium brand-text-primary mb-3">Podsumowanie dnia:</h4>
                          
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 text-sm">
                            <div className="space-y-2">
                              <div>
                                <span className="text-zinc-300">Zaplanowane kalorie:</span>
                                <div className="font-bold text-white">
                                  {plannedCalories > 0 ? `${Math.round(plannedCalories)} kcal` : "Nie ustawiono"}
                                </div>
                              </div>
                            </div>
                            
                            <div className="space-y-2">
                              <div>
                                <span className="text-zinc-300">Zaplanowane białko:</span>
                                <div className="font-bold text-white">
                                  {plannedProtein > 0 ? `${Math.round(plannedProtein)}g` : "Nie ustawiono"}
                                </div>
                              </div>
                            </div>
                            
                            <div className="space-y-2">
                              <div>
                                <span className="text-zinc-300">Zaplanowane tłuszcze:</span>
                                <div className="font-bold text-white">
                                  {plannedFat > 0 ? `${Math.round(plannedFat)}g` : "Nie ustawiono"}
                                </div>
                              </div>
                            </div>
                            
                            <div className="space-y-2">
                              <div>
                                <span className="text-zinc-300">Zaplanowane węglowodany:</span>
                                <div className="font-bold text-white">
                                  {plannedCarbs > 0 ? `${Math.round(plannedCarbs)}g` : "Nie ustawiono"}
                                </div>
                              </div>
                            </div>

                            <div className="space-y-2">
                              <div>
                                <span className="text-zinc-300">Zaplanowany błonnik:</span>
                                <div className="font-bold text-white">
                                  {plannedFiber > 0 ? `${Math.round(plannedFiber)}g` : "Nie ustawiono"}
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Meals */}
                      {day.meals.length > 0 ? (
                        <div className="space-y-4">
                          {day.meals.map((meal) => {
                            const isCollapsed = mealCollapsedState[meal.id] ?? true;
                            return (
                              <Collapsible key={meal.id} open={!isCollapsed} onOpenChange={() => {
                                setMealCollapsedState(prev => ({
                                  ...prev,
                                  [meal.id]: !prev[meal.id]
                                }));
                              }}>
                                <Card className="component-card">
                                  <CollapsibleTrigger asChild>
                                    <CardHeader className="pb-3 cursor-pointer hover:bg-zinc-800/20 transition-colors">
                                      <div className="flex items-center gap-2">
                                        {isCollapsed ? <ChevronRight className="h-4 w-4 transition-transform" /> : <ChevronDown className="h-4 w-4 transition-transform" />}
                                        <div className="flex-1 text-left">
                                          <CardTitle className="text-lg brand-text-primary text-left">{meal.name}</CardTitle>
                                          <p className="text-sm brand-text-gray font-medium text-left">{meal.dish}</p>
                                          {shouldShowMacros && (
                                            <div className="flex flex-wrap items-center gap-2 mt-3">
                                              <Badge variant="secondary" className="nutrition-kcal-badge text-xs">
                                                {Math.round(meal.calories)} kcal
                                              </Badge>
                                              <Badge variant="secondary" className="nutrition-protein-badge text-xs">
                                                B: {Math.round(meal.protein)}g
                                              </Badge>
                                              <Badge variant="secondary" className="nutrition-carbs-badge text-xs">
                                                W: {Math.round(meal.carbs)}g
                                              </Badge>
                                              <Badge variant="secondary" className="nutrition-fat-badge text-xs">
                                                T: {Math.round(meal.fat)}g
                                              </Badge>
                                              <Badge variant="secondary" className="nutrition-fiber-badge text-xs">
                                                Bł: {Math.round(meal.fiber)}g
                                              </Badge>
                                            </div>
                                          )}
                                          {!meal.countTowardsDailyCalories && (
                                            <div className="mt-3">
                                              <Badge variant="outline" className="border-orange-500 text-orange-400 bg-orange-900/20 text-xs">
                                                Nie liczy się do dziennych kalorii
                                              </Badge>
                                            </div>
                                          )}
                                        </div>
                                      </div>
                                    </CardHeader>
                                  </CollapsibleTrigger>
                                  
                                  <CollapsibleContent>
                                    <CardContent className="pt-0">
                                      {/* Ingredients */}
                                      {meal.ingredients && meal.ingredients.length > 0 && (
                                        <div className="space-y-3 mb-4">
                                          <h4 className="font-medium brand-text-secondary">Składniki:</h4>
                                          {meal.ingredients.map((ingredient) => (
                                            <div key={ingredient.id} className="flex items-center justify-between p-2 brand-bg-gray rounded">
                                              <div className="flex-1">
                                                <span className="font-medium text-sm brand-text-secondary">{ingredient.name}</span>
                                                {shouldShowMacros && (
                                                  <div className="text-xs brand-text-gray mt-1">
                                                    {formatMacro(ingredient.calories)} kcal | B: {formatMacro(ingredient.protein)}g | W: {formatMacro(ingredient.carbs)}g | T: {formatMacro(ingredient.fat)}g | Bł: {formatMacro(ingredient.fiber)}g
                                                  </div>
                                                )}
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

                                      {/* Instructions */}
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
                            );
                          })}
                        </div>
                      ) : (
                        <div className="text-center brand-text-gray py-8">
                          <p>Brak posiłków dla dnia "{day.name}"</p>
                        </div>
                      )}
                    </TabsContent>
                  );
                })}
              </Tabs>
            </CardContent>
          </Card>
        ) : (
          <div className="text-center">
            <div className="bg-zinc-800 border border-zinc-700 rounded-lg p-8">
              <div className="text-zinc-300 text-lg mb-2">Jadłospis jest pusty</div>
              <div className="text-zinc-500">Ten jadłospis nie zawiera jeszcze żadnych dni lub posiłków.</div>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="mt-8 text-center text-zinc-500 text-sm">
          <p>To jest podgląd jadłospisu tylko do odczytu</p>
        </div>
      </div>
      
      {/* PDF Day Selection Modal */}
      <PDFDaySelectionModal
        isOpen={pdfModalOpen}
        onClose={() => setPdfModalOpen(false)}
        dayPlans={dayPlans}
        onGenerate={handleGeneratePDF}
        clientName={client ? `${client.imie} ${client.nazwisko}` : 'Klient'}
        isGenerating={isDownloadingPDF}
        showMacros={shouldShowMacros} // Przekaż ustawienie showMacros do modalu
      />

      {/* Toast notifications */}
      <Toaster />
    </div>
  );
};

export default PublicDietView;
