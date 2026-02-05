import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NumericInput } from "@/components/ui/numeric-input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Calculator, ChevronDown, ChevronUp } from "lucide-react";
import { parseDecimal } from "@/utils/numberParser";

interface DayPlan {
  id: string;
  name: string;
  meals: any[];
}

interface MacroPlanning {
  calories: number;
  proteinPercentage: number;
  proteinPerKg: number;
  fatPercentage: number;
  fatPerKg: number;
  carbsPercentage: number;
  carbsPerKg: number;
  fiberPerKg: number;
}

interface CalorieCalculatorProps {
  clientAge: number;
  clientGender: string;
  clientHeight: string;
  dayPlans?: DayPlan[];
  onDayCalorieChange?: (dayId: string, value: number) => void;
  onMacroChange?: (dayId: string, macros: MacroPlanning) => void;
  initialDayCalories?: { [dayId: string]: number };
  initialDayMacros?: { [dayId: string]: MacroPlanning };
}

interface CalculatorResults {
  bmr: number;
  tdee: number;
}

const activityFactors = [
  { value: 1.2, label: "1,2 - 1,3", description: "Osoba chora, leżąca w łóżku lub praca siedząca, bez aktywności" },
  { value: 1.4, label: "1,4", description: "Niska aktywność fizyczna" },
  { value: 1.6, label: "1,6", description: "Umiarkowana aktywność fizyczna" },
  { value: 1.75, label: "1,75", description: "Aktywny tryb życia" },
  { value: 2.0, label: "2,0", description: "Bardzo aktywny tryb życia" },
  { value: 2.2, label: "2,2 - 2,4", description: "Wyczynowe uprawianie sportu" }
];

export const CalorieCalculator = ({
  clientAge,
  clientGender,
  clientHeight,
  dayPlans = [],
  onDayCalorieChange,
  onMacroChange,
  initialDayCalories = {},
  initialDayMacros = {}
}: CalorieCalculatorProps) => {
  const [weight, setWeight] = useState<number>(0);
  const [activityLevel, setActivityLevel] = useState([2]); // Default to index 2 (1.6)
  const [result, setResult] = useState<CalculatorResults | null>(null);
  const [isOpen, setIsOpen] = useState(true);
  const [dayCalories, setDayCalories] = useState<{ [dayId: string]: number }>(initialDayCalories);
  const [dayMacros, setDayMacros] = useState<{ [dayId: string]: MacroPlanning }>(initialDayMacros);

  // Sync state when initial values change
  useEffect(() => {
    setDayCalories(initialDayCalories);
  }, [initialDayCalories]);

  useEffect(() => {
    setDayMacros(initialDayMacros);
  }, [initialDayMacros]);

  const calculateBMR = () => {
    if (!weight || !clientHeight) return;

    const weightNum = weight;
    const heightNum = parseDecimal(clientHeight) || 0;
    const age = clientAge;

    let bmr: number;

    // Wzór Harrisa-Benedicta
    if (clientGender === "mężczyzna") {
      bmr = 88.362 + (13.397 * weightNum) + (4.799 * heightNum) - (5.677 * age);
    } else {
      bmr = 447.593 + (9.247 * weightNum) + (3.098 * heightNum) - (4.330 * age);
    }

    const selectedActivityFactor = activityFactors[activityLevel[0]].value;
    const totalCalories = bmr * selectedActivityFactor;

    setResult({
      bmr: Math.round(bmr),
      tdee: Math.round(totalCalories)
    });
  };

  const handleDayCalorieChange = (dayId: string, value: number) => {
    setDayCalories(prev => ({
      ...prev,
      [dayId]: value
    }));
    // Pass the change up to parent component
    if (onDayCalorieChange) {
      onDayCalorieChange(dayId, value);
    }
  };

  const handleMacroChange = (dayId: string, field: keyof MacroPlanning, value: number) => {
    const currentMacros = dayMacros[dayId] || {
      calories: 0,
      proteinPercentage: 0,
      proteinPerKg: 0,
      fatPercentage: 0,
      fatPerKg: 0,
      carbsPercentage: 0,
      carbsPerKg: 0,
      fiberPerKg: 0
    };

    const updatedMacros = {
      ...currentMacros,
      [field]: value
    };

    setDayMacros(prev => ({
      ...prev,
      [dayId]: updatedMacros
    }));

    if (onMacroChange) {
      onMacroChange(dayId, updatedMacros);
    }
  };

  const currentActivityFactor = activityFactors[activityLevel[0]];

  return (
    <Card className="bg-zinc-900 border-zinc-800">
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer hover:bg-zinc-800/50 transition-colors">
            <div className="flex items-center justify-between">
              <CardTitle className="text-zinc-100 text-sm sm:text-base">
                <span className="sm:hidden">Kalkulator Kalorii</span>
                <span className="hidden sm:inline">Kalkulator Kalorii (Wzór Harrisa-Benedicta)</span>
              </CardTitle>
              {isOpen ? (
                <ChevronUp className="h-4 w-4 transition-transform" />
              ) : (
                <ChevronDown className="h-4 w-4 transition-transform" />
              )}
            </div>
          </CardHeader>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="calc-age" className="text-zinc-100">Wiek</Label>
                <Input id="calc-age" value={`${clientAge} lat`} disabled className="bg-zinc-700 text-zinc-300 border-zinc-600" />
              </div>
              <div>
                <Label htmlFor="calc-gender" className="text-zinc-100">Płeć</Label>
                <Input id="calc-gender" value={clientGender} disabled className="bg-zinc-700 text-zinc-300 border-zinc-600" />
              </div>
              <div>
                <Label htmlFor="calc-height" className="text-zinc-100">Wzrost</Label>
                <Input id="calc-height" value={`${clientHeight} cm`} disabled className="bg-zinc-700 text-zinc-300 border-zinc-600" />
              </div>
              <div>
                <Label htmlFor="calc-weight" className="text-zinc-100">Aktualna/docelowa waga (kg)</Label>
                <NumericInput
                  id="calc-weight"
                  name="calc-weight"
                  type="decimal"
                  value={weight}
                  onChange={setWeight}
                  showPlaceholderForZero={true}
                  placeholder="np. 70,5"
                  className="bg-zinc-800 border-zinc-700 text-zinc-100 placeholder:text-zinc-400 focus:border-[#a08032] focus:bg-zinc-700"
                />
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <Label className="text-zinc-100 text-lg font-medium mb-4 block">
                  WSPÓŁCZYNNIK AKTYWNOŚCI FIZYCZNEJ
                </Label>
                
                <div className="mb-6 p-4 bg-zinc-800 rounded-lg border border-zinc-700">
                  <div className="text-xl font-bold text-zinc-100 mb-2">
                    {currentActivityFactor.label}
                  </div>
                  <div className="text-zinc-300">
                    {currentActivityFactor.description}
                  </div>
                </div>

                <div className="px-2">
                  <Slider
                    value={activityLevel}
                    onValueChange={setActivityLevel}
                    max={activityFactors.length - 1}
                    min={0}
                    step={1}
                    className="w-full"
                  />
                  
                  <div className="relative mt-2 text-xs text-zinc-400">
                    <span className="absolute left-0">1,2</span>
                    <span className="absolute text-zinc-100 font-medium" style={{ left: '83.33%', transform: 'translateX(-50%)' }}>2,2</span>
                    <span className="absolute right-0">2,4</span>
                  </div>
                </div>

                <div className="mt-6 space-y-2">
                  {activityFactors.map((factor, index) => (
                    <div 
                      key={index}
                      className={`flex items-start gap-4 p-3 rounded-lg transition-colors ${
                        activityLevel[0] === index 
                          ? 'bg-[#a08032] bg-opacity-20 border border-[#a08032]' 
                          : 'bg-zinc-800 border border-zinc-700'
                      }`}
                    >
                      <div className={`font-bold text-sm min-w-[60px] ${
                        activityLevel[0] === index ? 'text-[#e6d280]' : 'text-zinc-300'
                      }`}>
                        {factor.label}
                      </div>
                      <div className={`text-sm ${
                        activityLevel[0] === index ? 'text-zinc-100' : 'text-zinc-400'
                      }`}>
                        {factor.description}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <Button onClick={calculateBMR} className="w-full bg-gradient-to-r from-[#a08032] to-[#e6d280] hover:from-[#8a6b28] hover:to-[#d4c374] text-white font-medium" disabled={!weight}>
              Oblicz Zapotrzebowanie Kaloryczne
            </Button>

            {result && (
              <div className="mt-4 p-4 bg-zinc-800 rounded-lg space-y-3 border border-zinc-700">
                <h3 className="font-semibold text-lg text-zinc-100 mb-3">Wyniki Obliczeń:</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-zinc-900 p-4 rounded-lg border border-zinc-700">
                    <h4 className="font-medium text-zinc-100 text-sm mb-1">PPM</h4>
                    <p className="text-xs text-zinc-300 mb-2">Podstawowa Przemiana Materii</p>
                    <p className="text-2xl font-bold text-[#e6d280]">{result.bmr} kcal/dzień</p>
                  </div>
                  
                  <div className="bg-zinc-900 p-4 rounded-lg border border-zinc-700">
                    <h4 className="font-medium text-zinc-100 text-sm mb-1">CPM</h4>
                    <p className="text-xs text-zinc-300 mb-2">Całkowita Przemiana Materii</p>
                    <p className="text-2xl font-bold text-[#e6d280]">{result.tdee} kcal/dzień</p>
                  </div>
                </div>

                {dayPlans.length > 0 && (
                  <div className="mt-6 space-y-4">
                    <h4 className="font-medium text-zinc-100 text-lg">Planowanie Makroskładników:</h4>
                    
                    <div className="space-y-4">
                      {dayPlans.map((day) => (
                        <div key={day.id} className="bg-zinc-900 p-3 sm:p-4 rounded-lg border border-zinc-700">
                          <h5 className="font-medium text-[#e6d280] mb-3 sm:mb-4 text-base sm:text-lg">{day.name}</h5>

                          <div className="mb-3 sm:mb-4">
                            <Label htmlFor={`calories-${day.id}`} className="text-zinc-300 text-sm mb-2 block">Kalorie (kcal)</Label>
                            <NumericInput
                              id={`calories-${day.id}`}
                              name={`calories-${day.id}`}
                              type="integer"
                              value={dayCalories[day.id] || 0}
                              onChange={(newValue) => handleDayCalorieChange(day.id, newValue)}
                              showPlaceholderForZero={true}
                              placeholder="np. 1500"
                              className="bg-zinc-800 border-zinc-700 text-zinc-100 placeholder:text-zinc-400 focus:border-[#a08032] w-full sm:w-40 h-12 sm:h-10"
                            />
                          </div>

                          <div className="space-y-3 sm:space-y-4">
                            {/* Białko */}
                            <div className="space-y-2 sm:space-y-0 sm:flex sm:items-center sm:gap-4">
                              <div className="text-zinc-300 text-sm font-medium sm:w-24" id={`protein-label-${day.id}`}>Białko</div>
                              <div className="flex flex-col sm:flex-row gap-2 sm:gap-4">
                                <div className="flex items-center gap-2">
                                  <NumericInput
                                    id={`protein-pct-${day.id}`}
                                    name={`protein-pct-${day.id}`}
                                    type="decimal"
                                    value={dayMacros[day.id]?.proteinPercentage || 0}
                                    onChange={(newValue) => handleMacroChange(day.id, 'proteinPercentage', newValue)}
                                    showPlaceholderForZero={true}
                                    placeholder="64"
                                    className="bg-zinc-800 border-zinc-700 text-zinc-100 placeholder:text-zinc-400 focus:border-[#a08032] w-16 sm:w-20 h-12 sm:h-10 text-center"
                                  />
                                  <span className="text-zinc-400 text-sm">%</span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <NumericInput
                                    id={`protein-g-${day.id}`}
                                    name={`protein-g-${day.id}`}
                                    type="decimal"
                                    value={dayMacros[day.id]?.proteinPerKg || 0}
                                    onChange={(newValue) => handleMacroChange(day.id, 'proteinPerKg', newValue)}
                                    showPlaceholderForZero={true}
                                    placeholder="240"
                                    className="bg-zinc-800 border-zinc-700 text-zinc-100 placeholder:text-zinc-400 focus:border-[#a08032] w-20 sm:w-20 h-12 sm:h-10 text-center"
                                  />
                                  <span className="text-zinc-400 text-sm">gramów</span>
                                </div>
                              </div>
                            </div>

                            {/* Tłuszcze */}
                            <div className="space-y-2 sm:space-y-0 sm:flex sm:items-center sm:gap-4">
                              <div className="text-zinc-300 text-sm font-medium sm:w-24" id={`fat-label-${day.id}`}>Tłuszcze</div>
                              <div className="flex flex-col sm:flex-row gap-2 sm:gap-4">
                                <div className="flex items-center gap-2">
                                  <NumericInput
                                    id={`fat-pct-${day.id}`}
                                    name={`fat-pct-${day.id}`}
                                    type="decimal"
                                    value={dayMacros[day.id]?.fatPercentage || 0}
                                    onChange={(newValue) => handleMacroChange(day.id, 'fatPercentage', newValue)}
                                    showPlaceholderForZero={true}
                                    placeholder="18"
                                    className="bg-zinc-800 border-zinc-700 text-zinc-100 placeholder:text-zinc-400 focus:border-[#a08032] w-16 sm:w-20 h-12 sm:h-10 text-center"
                                  />
                                  <span className="text-zinc-400 text-sm">%</span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <NumericInput
                                    id={`fat-g-${day.id}`}
                                    name={`fat-g-${day.id}`}
                                    type="decimal"
                                    value={dayMacros[day.id]?.fatPerKg || 0}
                                    onChange={(newValue) => handleMacroChange(day.id, 'fatPerKg', newValue)}
                                    showPlaceholderForZero={true}
                                    placeholder="30"
                                    className="bg-zinc-800 border-zinc-700 text-zinc-100 placeholder:text-zinc-400 focus:border-[#a08032] w-20 sm:w-20 h-12 sm:h-10 text-center"
                                  />
                                  <span className="text-zinc-400 text-sm">gramów</span>
                                </div>
                              </div>
                            </div>

                            {/* Węglowodany */}
                            <div className="space-y-2 sm:space-y-0 sm:flex sm:items-center sm:gap-4">
                              <div className="text-zinc-300 text-sm font-medium sm:w-24" id={`carbs-label-${day.id}`}>Węglowodany</div>
                              <div className="flex flex-col sm:flex-row gap-2 sm:gap-4">
                                <div className="flex items-center gap-2">
                                  <NumericInput
                                    id={`carbs-pct-${day.id}`}
                                    name={`carbs-pct-${day.id}`}
                                    type="decimal"
                                    value={dayMacros[day.id]?.carbsPercentage || 0}
                                    onChange={(newValue) => handleMacroChange(day.id, 'carbsPercentage', newValue)}
                                    showPlaceholderForZero={true}
                                    placeholder="18"
                                    className="bg-zinc-800 border-zinc-700 text-zinc-100 placeholder:text-zinc-400 focus:border-[#a08032] w-16 sm:w-20 h-12 sm:h-10 text-center"
                                  />
                                  <span className="text-zinc-400 text-sm">%</span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <NumericInput
                                    id={`carbs-g-${day.id}`}
                                    name={`carbs-g-${day.id}`}
                                    type="decimal"
                                    value={dayMacros[day.id]?.carbsPerKg || 0}
                                    onChange={(newValue) => handleMacroChange(day.id, 'carbsPerKg', newValue)}
                                    showPlaceholderForZero={true}
                                    placeholder="68"
                                    className="bg-zinc-800 border-zinc-700 text-zinc-100 placeholder:text-zinc-400 focus:border-[#a08032] w-20 sm:w-20 h-12 sm:h-10 text-center"
                                  />
                                  <span className="text-zinc-400 text-sm">gramów</span>
                                </div>
                              </div>
                            </div>

                            {/* Błonnik */}
                            <div className="space-y-2 sm:space-y-0 sm:flex sm:items-center sm:gap-4">
                              <div className="text-zinc-300 text-sm font-medium sm:w-24" id={`fiber-label-${day.id}`}>Błonnik</div>
                              <div className="flex items-center gap-2">
                                <NumericInput
                                  id={`fiber-g-${day.id}`}
                                  name={`fiber-g-${day.id}`}
                                  type="decimal"
                                  value={dayMacros[day.id]?.fiberPerKg || 0}
                                  onChange={(newValue) => handleMacroChange(day.id, 'fiberPerKg', newValue)}
                                  showPlaceholderForZero={true}
                                  placeholder="0"
                                  className="bg-zinc-800 border-zinc-700 text-zinc-100 placeholder:text-zinc-400 focus:border-[#a08032] w-20 sm:w-20 h-12 sm:h-10 text-center"
                                />
                                <span className="text-zinc-400 text-sm">gramów</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                    
                    <p className="text-xs text-zinc-400 mt-2">
                      Ustaw docelowe wartości makroskładników dla każdego typu dnia w jadłospisie klienta
                    </p>
                  </div>
                )}
                
                <p className="text-sm text-zinc-300 mt-3 text-center">
                  Obliczenia wg wzoru Harrisa-Benedicta z uwzględnieniem poziomu aktywności
                </p>
              </div>
            )}
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
};
