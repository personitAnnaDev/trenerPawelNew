import { Control } from "react-hook-form";
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import IngredientSelector, { SelectedIngredient } from "./IngredientSelector";
import { getCategories, getProducts } from "@/utils/supabasePotrawy";
import { useNutritionCalculator } from "@/hooks/useNutritionCalculator";
import { formatMacro } from "@/utils/numberFormat";

interface BasicFormFieldsProps {
  control: Control<any>;
  selectedIngredients: SelectedIngredient[];
  onIngredientsChange: (ingredients: SelectedIngredient[]) => void;
}

const BasicFormFields = ({ control, selectedIngredients, onIngredientsChange }: BasicFormFieldsProps) => {
  // Fetch categories dynamically from database
  const { data: categories } = useQuery({
    queryKey: ['categories'],
    queryFn: () => getCategories(),
  });

  // Fetch products for nutritional calculation
  const { data: products } = useQuery({
    queryKey: ['products'],
    queryFn: () => getProducts(),
  });

  // Filter out any categories with empty names or ids
  const validCategories = categories?.filter(category => 
    category && 
    category.id && 
    category.name && 
    category.id.trim() !== '' && 
    category.name.trim() !== ''
  ) || [];

  // Calculate nutritional values using custom hook
  const nutrition = useNutritionCalculator(selectedIngredients, products);

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <FormField
          control={control}
          name="nazwa"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-gray-100">Nazwa</FormLabel>
              <FormControl>
                <Input 
                  placeholder="Nazwa potrawy" 
                  {...field} 
                  className="input-dark" 
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={control}
          name="kategoria"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-gray-100">Kategoria</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger className="input-dark">
                    <SelectValue placeholder="Wybierz kategorię" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent className="bg-gray-700 border-gray-600">
                  {validCategories.map((category) => (
                    <SelectItem 
                      key={category.id} 
                      value={category.name} 
                      className="text-gray-100 hover:bg-gray-600 focus:bg-gray-600"
                    >
                      {category.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>

      <div className="w-full">
        <IngredientSelector 
          selectedIngredients={selectedIngredients}
          onIngredientsChange={onIngredientsChange}
        />
      </div>

      {/* Nutritional Summary */}
      <Card className="card-dark">
        <CardHeader>
          <CardTitle className="text-lg text-gray-100">Wartości odżywcze (obliczone automatycznie)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center">
            <div className="mb-2">
              <p className="text-sm font-semibold text-gray-300">Kcal</p>
              <p className="text-xl font-bold nutrition-kcal">{nutrition.kcal}</p>
            </div>
            <div className="grid grid-cols-4 md:grid-cols-4 gap-4 text-center w-full">
              <div>
                <p className="text-sm font-semibold text-gray-300">Białko (g)</p>
                <p className="text-xl font-bold nutrition-protein">{formatMacro(nutrition.białko)}</p>
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-300">Tłuszcz (g)</p>
                <p className="text-xl font-bold nutrition-fat">{formatMacro(nutrition.tłuszcz)}</p>
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-300">Węglowodany (g)</p>
                <p className="text-xl font-bold nutrition-carbs">{formatMacro(nutrition.węglowodany)}</p>
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-300">Błonnik (g)</p>
                <p className="text-xl font-bold nutrition-fiber">{formatMacro(nutrition.błonnik)}</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </>
  );
};

export default BasicFormFields;
