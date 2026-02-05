import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { NumericInput } from "@/components/ui/numeric-input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { HelpCircle } from "lucide-react";
import { Ingredient } from "@/pages/Produkty";

const ingredientSchema = z.object({
  nazwa: z.string().min(1, "Pole wymagane"),
  kcal: z.number().min(0, "Wartość nie może być ujemna"),
  macro: z.object({
    białko: z.number().min(0, "Wartość nie może być ujemna"),
    tłuszcz: z.number().min(0, "Wartość nie może być ujemna"),
    węglowodany: z.number().min(0, "Wartość nie może być ujemna")
  }),
  blonnik: z.number().min(0, "Wartość nie może być ujemna"),
  unit: z.string().min(1, "Pole wymagane"),
  unit_weight: z.number().min(0.01, "Pole wymagane")
});

type IngredientFormData = z.infer<typeof ingredientSchema>;

interface AddIngredientFormProps {
  onSubmit: (ingredient: Omit<Ingredient, "id">) => void;
  onCancel: () => void;
  defaultValues?: Partial<Omit<Ingredient, "id">>;
  onDelete?: () => void;
  onFormChange?: (hasChanges: boolean) => void;
}

const AddIngredientForm = ({ onSubmit, onCancel, defaultValues, onDelete, onFormChange }: AddIngredientFormProps) => {
  const [showZeroValuesDialog, setShowZeroValuesDialog] = useState(false);
  const [pendingData, setPendingData] = useState<IngredientFormData | null>(null);

const form = useForm<IngredientFormData>({
  resolver: zodResolver(ingredientSchema),
  defaultValues: {
    nazwa: defaultValues?.nazwa ?? "",
    kcal: defaultValues?.kcal ?? 0,
    macro: {
      białko: defaultValues?.macro?.białko ?? 0,
      tłuszcz: defaultValues?.macro?.tłuszcz ?? 0,
      węglowodany: defaultValues?.macro?.węglowodany ?? 0
    },
    blonnik: defaultValues?.blonnik ?? 0,
unit:
  defaultValues?.unit
    ? ["g", "gramy"].includes(defaultValues.unit) ? "gramy" : defaultValues.unit
    : "gramy",
unit_weight:
  defaultValues?.unit_weight !== undefined
    ? defaultValues.unit_weight
    : 100
  }
});

  // Watch unit value for optimized re-rendering
  const unit = useWatch({
    control: form.control,
    name: "unit"
  });

  // Synchronizacja wartości unit_weight przy zmianie jednostki na gramy
  useEffect(() => {
    if (unit === "gramy") {
      form.setValue("unit_weight", 100);
    }
  }, [unit, form]);

  // Monitor form changes for confirmation dialog
  useEffect(() => {
    const subscription = form.watch(() => {
      const isDirty = form.formState.isDirty;
      onFormChange?.(isDirty);
    });
    return () => subscription.unsubscribe();
  }, [form, onFormChange]);

  const handleSubmit = (data: IngredientFormData) => {
    // Sprawdź czy wszystkie wartości makro są równe 0
    const hasZeroMacros = data.kcal === 0 &&
                         data.macro.białko === 0 &&
                         data.macro.tłuszcz === 0 &&
                         data.macro.węglowodany === 0 &&
                         data.blonnik === 0;

    // Sprawdź czy przynajmniej większość makro to zera (może być problematyczne)
    const zeroCount = [data.kcal, data.macro.białko, data.macro.tłuszcz, data.macro.węglowodany, data.blonnik]
                      .filter(value => value === 0).length;
    const hasMostlyZeros = zeroCount >= 3;

    if (hasZeroMacros || hasMostlyZeros) {
      setPendingData(data);
      setShowZeroValuesDialog(true);
      return;
    }

    onSubmit(data as Omit<Ingredient, "id">);
  };

  const handleConfirmSave = () => {
    if (pendingData) {
      onSubmit(pendingData as Omit<Ingredient, "id">);
      setPendingData(null);
    }
    setShowZeroValuesDialog(false);
  };

  const handleCancelSave = () => {
    setPendingData(null);
    setShowZeroValuesDialog(false);
  };

  return (
    <>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4 sm:space-y-6">
        <FormField
          control={form.control}
          name="nazwa"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-zinc-100">Nazwa Składnika</FormLabel>
              <FormControl>
                <Input 
                  placeholder="np. Kurczak (pierś)" 
                  {...field} 
                  className="bg-zinc-800 border-zinc-700 text-zinc-100 placeholder-zinc-400 focus:bg-zinc-700 focus:border-[#a08032]"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
          <div className="flex flex-col gap-4 md:gap-6">
            <Card className="bg-zinc-900 border-zinc-800">
              <CardHeader className="pb-3">
                <CardTitle className="text-base md:text-lg text-zinc-100">Kalorie</CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <FormField
                  control={form.control}
                  name="kcal"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-zinc-100">Kcal (na 100g)</FormLabel>
                      <FormControl>
                        <NumericInput
                          type="integer"
                          placeholder="np. 250"
                          value={field.value}
                          onChange={field.onChange}
                          showPlaceholderForZero={!defaultValues}
                          className="bg-zinc-800 border-zinc-700 text-zinc-100 placeholder-zinc-400 focus:bg-zinc-700 focus:border-[#a08032]"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

<Card className="bg-zinc-900 border-zinc-800">
  <CardContent className="space-y-3 sm:space-y-4 pt-3 sm:pt-4">
<FormField
  control={form.control}
  name="unit"
  render={({ field }) => (
    <FormItem>
      <FormLabel className="text-zinc-100 mb-2">Jednostka</FormLabel>
      <FormControl>
        <div className="flex flex-col">
          <select
            {...field}
            id="ingredient-unit"
            name="ingredient-unit"
            className="bg-zinc-800 border-zinc-700 text-zinc-100 rounded px-3 py-2 focus:bg-zinc-700 focus:border-[#a08032]"
            onChange={field.onChange}
          >
            <option value="gramy">gramy</option>
            <option value="mililitry">mililitry</option>
            <option value="sztuka">sztuka</option>
            <option value="łyżeczka">łyżeczka</option>
            <option value="łyżka">łyżka</option>
            <option value="szklanka">szklanka</option>
          </select>
        </div>
      </FormControl>
      <FormMessage />
    </FormItem>
  )}
/>

<FormField
  control={form.control}
  name="unit_weight"
  render={({ field }) => {
    let infoText = "";
    let inputDisabled = false;
    let inputPlaceholder = "np. 5";
if (unit === "gramy") {
  infoText = 'Gramatura dla jednostki "gramy" jest zawsze 100 g i nie można jej zmienić.';
  inputDisabled = true;
  inputPlaceholder = "100";
} else if (unit === "mililitry") {
      infoText = "Podaj wagę 100 ml produktu w gramach (g). Przykład: 100 ml soku – 104 g; 100 ml mleka – 103 g; 100 ml wody – 100 g.";
    } else if (unit === "sztuka") {
      infoText = "Podaj wagę 1 sztuki produktu w gramach (g). Przykład: 1 jajko – 60 g; 1 bułka – 70 g; 1 banan – 120 g; 1 jogurt – 200 g. Zakres: 20-1000g.";
    } else if (unit === "łyżeczka") {
      infoText = "Podaj wagę 1 łyżeczki produktu w gramach (g). Przykład: 1 łyżeczka masła – 5 g; 1 łyżeczka cukru – 5 g.";
    } else if (unit === "łyżka") {
      infoText = "Podaj wagę 1 łyżki produktu w gramach (g). Przykład: 1 łyżka oliwy – 10 g; 1 łyżka miodu – 12 g.";
    } else if (unit === "szklanka") {
      infoText = "Podaj wagę 1 szklanki produktu w gramach (g). Przykład: 1 szklanka wody – 250 g; 1 szklanka mąki – 140 g.";
    }
    return (
      <FormItem>
        <div className="flex items-center gap-2">
          <FormLabel className="text-zinc-100">Gramatura jednostki (g)</FormLabel>
          {unit === "mililitry" && (
            <div className="relative group">
              <HelpCircle className="h-4 w-4 text-zinc-400 hover:text-zinc-300 transition-colors cursor-help" />
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 text-xs text-white bg-zinc-800 border border-zinc-700 rounded-md opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none w-80 z-50">
                <div className="space-y-2">
                  <div className="font-semibold text-zinc-200">Skąd wziąć gramaturę dla 100ml?</div>
                  <div className="text-zinc-300 text-xs">
                    Na etykiecie szukaj: <span className="text-[#a08032]">"330ml (347g)"</span> lub podobnej informacji.<br/>
                    Przelicz na 100ml wzorem:<br/>
                    <span className="font-mono text-[#a08032]">(gramatura ÷ ml_opakowania) × 100</span>
                  </div>
                  <div className="border-t border-zinc-700 pt-2">
                    <div className="font-semibold text-zinc-200">Przykład - Skyr naturalny:</div>
                    <div className="text-zinc-300 space-y-1 mt-1 text-xs">
                      <div>1️⃣ Etykieta: <span className="text-[#a08032]">330ml (347g)</span></div>
                      <div>2️⃣ Oblicz: 347g ÷ 330ml × 100 = <span className="text-[#a08032] font-semibold">105g</span></div>
                      <div>3️⃣ Wartości odżywcze (100g z etykiety):<br/>
                      <span className="text-zinc-400 ml-3">66 kcal, 11g białka, 0,2g tłuszczu, 4g węgl.</span>
                      </div>
                      <div className="text-zinc-400 text-xs mt-1 pt-1 border-t border-zinc-700">
                        ✅ Wpisz do formularza:<br/>
                        <span className="ml-3">• Wartości z etykiety (100g) bez zmian</span><br/>
                        <span className="ml-3">• Gramatura jednostki: <span className="text-[#a08032]">105g</span></span><br/>
                        <span className="ml-3">• System sam przeliczy na 100ml</span>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-zinc-800"></div>
              </div>
            </div>
          )}
        </div>
        {infoText && (
          <div className="text-xs text-zinc-400 whitespace-pre-line mb-1 sm:mb-2 leading-tight">{infoText}</div>
        )}
        <FormControl>
          <NumericInput
            type="decimal"
            placeholder={inputPlaceholder}
            value={field.value}
            onChange={field.onChange}
            disabled={inputDisabled}
            showPlaceholderForZero={!defaultValues}
            className={`bg-zinc-800 border-zinc-700 text-zinc-100 placeholder-zinc-400 focus:bg-zinc-700 focus:border-[#a08032] ${inputDisabled ? "opacity-60 cursor-not-allowed" : ""}`}
          />
        </FormControl>
        <FormMessage />
      </FormItem>
    );
  }}
/>
              </CardContent>
            </Card>
          </div>

          <Card className="bg-zinc-900 border-zinc-800">
            <CardHeader className="pb-3">
              <CardTitle className="text-base md:text-lg text-zinc-100">Makroskładniki (na 100g)</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 sm:space-y-4 pt-0">
              <FormField
                control={form.control}
                name="macro.białko"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-zinc-100">Białko (g)</FormLabel>
                    <FormControl>
                      <NumericInput
                        type="decimal"
                        placeholder="np. 15"
                        value={field.value}
                        onChange={field.onChange}
                        showPlaceholderForZero={!defaultValues}
                        className="bg-zinc-800 border-zinc-700 text-zinc-100 placeholder-zinc-400 focus:bg-zinc-700 focus:border-[#a08032]"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="macro.tłuszcz"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-zinc-100">Tłuszcz (g)</FormLabel>
                    <FormControl>
                      <NumericInput
                        type="decimal"
                        placeholder="np. 8"
                        value={field.value}
                        onChange={field.onChange}
                        showPlaceholderForZero={!defaultValues}
                        className="bg-zinc-800 border-zinc-700 text-zinc-100 placeholder-zinc-400 focus:bg-zinc-700 focus:border-[#a08032]"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="macro.węglowodany"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-zinc-100">Węglowodany (g)</FormLabel>
                    <FormControl>
                      <NumericInput
                        type="decimal"
                        placeholder="np. 30"
                        value={field.value}
                        onChange={field.onChange}
                        showPlaceholderForZero={!defaultValues}
                        className="bg-zinc-800 border-zinc-700 text-zinc-100 placeholder-zinc-400 focus:bg-zinc-700 focus:border-[#a08032]"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="blonnik"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-zinc-100">Błonnik (g)</FormLabel>
                    <FormControl>
                      <NumericInput
                        type="decimal"
                        placeholder="np. 5"
                        value={field.value}
                        onChange={field.onChange}
                        showPlaceholderForZero={!defaultValues}
                        className="bg-zinc-800 border-zinc-700 text-zinc-100 placeholder-zinc-400 focus:bg-zinc-700 focus:border-[#a08032]"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>
        </div>

        <div className="flex flex-col sm:flex-row justify-end gap-3 pt-3 sm:pt-4">
          {defaultValues && (
            <Button
              type="button"
              variant="destructive"
              onClick={onDelete}
              className="bg-red-700 border-zinc-700 text-white hover:bg-red-800 mr-auto"
            >
              Usuń składnik
            </Button>
          )}
          <Button type="button" variant="outline" onClick={onCancel} className="bg-zinc-800 border-zinc-700 text-zinc-100 hover:bg-zinc-700">
            Anuluj
          </Button>
          <Button type="submit" className="bg-gradient-to-r from-[#a08032] to-[#e6d280] hover:from-[#8a6c2b] hover:to-[#d4c06b] text-white">
            {defaultValues ? "Zapisz zmiany" : "Dodaj Składnik"}
          </Button>
        </div>
        </form>
      </Form>

      {/* Dialog ostrzegawczy dla zerowych wartości makro */}
      <AlertDialog open={showZeroValuesDialog} onOpenChange={setShowZeroValuesDialog}>
        <AlertDialogContent className="bg-zinc-900 border-zinc-800">
        <AlertDialogHeader>
          <AlertDialogTitle className="text-zinc-100">Ostrzeżenie - Wartości makroskładników</AlertDialogTitle>
          <AlertDialogDescription className="text-zinc-300">
            Większość lub wszystkie wartości makroskładników (kalorie, białko, tłuszcz, węglowodany, błonnik) są równe 0.
            <br /><br />
            Może to oznaczać, że:
            <br />• Wprowadzono nieprawidłowe wartości (tekst zamiast liczb)
            <br />• Składnik rzeczywiście nie zawiera żadnych makroskładników
            <br /><br />
            Czy na pewno chcesz zapisać składnik z tymi wartościami?
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel
            onClick={handleCancelSave}
            className="bg-zinc-700 text-zinc-100 hover:bg-zinc-600"
          >
            Anuluj - sprawdzę wartości
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirmSave}
            className="bg-[#a08032] text-white hover:bg-[#8a6c2b]"
          >
            Zapisz z zerami
          </AlertDialogAction>
        </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default AddIngredientForm;
