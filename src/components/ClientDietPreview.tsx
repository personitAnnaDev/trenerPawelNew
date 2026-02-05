import React, { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, ChevronLeft, ChevronRight } from "lucide-react";
import { getClientById } from "@/utils/clientStorage";
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

export const ClientDietPreview: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  
  const [client, setClient] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<string>('');
  
  // Scrollable tabs state
  const tabsScrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  
  // ✅ WSZYSTKIE HOOKI NA POCZĄTKU (rules-of-hooks fix)
  useEffect(() => {
    const loadClient = async () => {
      if (id) {
        const clientData = await getClientById(id);
        setClient(clientData);
        if (clientData?.dietPlanData?.dayPlans?.length > 0) {
          setActiveTab(clientData.dietPlanData.dayPlans[0].id);
        }
      }
    };
    loadClient();
  }, [id]);

  const dayPlans: DayPlan[] = client?.dietPlanData?.dayPlans || [];
  const dayCalories = client?.dietPlanData?.dayCalories || {};
  const dayMacros = client?.dietPlanData?.dayMacros || {};

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

  // ✅ Early return PO wszystkich hookach (rules-of-hooks fix)
  if (!client) {
    return (
      <div className="min-h-screen bg-background p-4 md:p-6">
        <div className="flex items-center justify-center">
          <div className="text-lg text-zinc-100">Ładowanie...</div>
        </div>
      </div>
    );
  }

  // Funkcje do obsługi przewijania tabów (nie są hookami, mogą być po return)
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

  return (
    <div className="min-h-screen bg-background p-4 md:p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 mb-6">
          <Link to={`/klienci/${id}`}>
            <Button variant="ghost" size="sm" className="p-2 sm:p-3 text-zinc-100 hover:bg-zinc-800">
              <ArrowLeft className="h-4 w-4 mr-0 sm:mr-2" />
              <span className="hidden sm:inline">Powrót</span>
            </Button>
          </Link>
          
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl md:text-3xl font-bold text-zinc-100 truncate">
              Jadłospis dla {client.imie} {client.nazwisko}
            </h1>
            <p className="text-zinc-400 mt-1 text-sm md:text-base">Podgląd jadłospisu</p>
          </div>
        </div>

        {/* Diet Plan Content */}
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
                    {/* Day Summary */}
                    {(day.meals.length > 0 || plannedCalories > 0) && (
                      <div className="mb-6 p-4 brand-bg-gray rounded-lg brand-border border">
                        <h4 className="font-medium brand-text-primary mb-3">Podsumowanie dnia:</h4>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 text-sm">
                          <div className="space-y-2">
                            <div>
                              <span className="text-zinc-300">Zaplanowane kalorie:</span>
                              <div className="font-bold text-white">
                                {plannedCalories > 0 ? `${plannedCalories} kcal` : "Nie ustawiono"}
                              </div>
                            </div>
                            <div>
                              <span className="text-zinc-300">Kalorie:</span>
                              <div className="font-bold text-zinc-100">{actualTotals.calories} kcal</div>
                            </div>
                          </div>
                          
                          <div className="space-y-2">
                            <div>
                              <span className="text-zinc-300">Zaplanowane białko:</span>
                              <div className="font-bold text-white">
                                {plannedProtein > 0 ? `${plannedProtein}g` : "Nie ustawiono"}
                              </div>
                            </div>
                            <div>
                              <span className="text-zinc-300">Białko:</span>
                              <div className="font-bold text-zinc-100">{actualTotals.protein}g</div>
                            </div>
                          </div>
                          
                          <div className="space-y-2">
                            <div>
                              <span className="text-zinc-300">Zaplanowane tłuszcze:</span>
                              <div className="font-bold text-white">
                                {plannedFat > 0 ? `${plannedFat}g` : "Nie ustawiono"}
                              </div>
                            </div>
                            <div>
                              <span className="text-zinc-300">Tłuszcze:</span>
                              <div className="font-bold text-zinc-100">{actualTotals.fat}g</div>
                            </div>
                          </div>
                          
                          <div className="space-y-2">
                            <div>
                              <span className="text-zinc-300">Zaplanowane węglowodany:</span>
                              <div className="font-bold text-white">
                                {plannedCarbs > 0 ? `${plannedCarbs}g` : "Nie ustawiono"}
                              </div>
                            </div>
                            <div>
                              <span className="text-zinc-300">Węglowodany:</span>
                              <div className="font-bold text-zinc-100">{actualTotals.carbs}g</div>
                            </div>
                          </div>

                          <div className="space-y-2">
                            <div>
                              <span className="text-zinc-300">Zaplanowany błonnik:</span>
                              <div className="font-bold text-white">
                                {plannedFiber > 0 ? `${plannedFiber}g` : "Nie ustawiono"}
                              </div>
                            </div>
                            <div>
                              <span className="text-zinc-300">Błonnik:</span>
                              <div className="font-bold text-zinc-100">{actualTotals.fiber}g</div>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Meals */}
                    {day.meals.length > 0 ? (
                      <div className="space-y-4">
                        {day.meals.map((meal) => (
                          <Card key={meal.id} className="component-card">
                            <CardHeader className="pb-3">
                              <div className="flex justify-between items-start">
                                <div className="flex-1">
                                  <CardTitle className="text-lg brand-text-primary">{meal.name}</CardTitle>
                                  <p className="text-sm brand-text-gray font-medium">{meal.dish}</p>
                                  <div className="flex items-center gap-2 mt-1">
                                    <Badge variant="secondary" className="bg-[#a08032] text-white text-xs">
                                      {meal.calories} kcal
                                    </Badge>
                                    {!meal.countTowardsDailyCalories && (
                                      <Badge variant="outline" className="border-orange-500 text-orange-400 bg-orange-900/20 text-xs">
                                        Nie liczy się do dziennych kalorii
                                      </Badge>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </CardHeader>
                            
                            <CardContent className="pt-0">
                              {/* Nutritional values */}
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

                              {/* Ingredients */}
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
                          </Card>
                        ))}
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
      </div>
    </div>
  );
};

export default ClientDietPreview;
