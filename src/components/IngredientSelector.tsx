import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NumericInput } from "@/components/ui/numeric-input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { X, Search, ChevronsUpDown } from "lucide-react";
import { getProducts, transformProductToFrontend } from '@/utils/supabasePotrawy';
import { formatPolishUnit } from '@/utils/polishUnits';
import { getDefaultQuantityForUnit } from '@/utils/formatIngredients';
import { logger } from '@/utils/logger';

export interface SelectedIngredient {
  id: string;
  productId: string;
  nazwa: string;
  quantity: number;
  unit: string;
  unit_weight: number;
  // Optional pre-calculated macros (from AI optimization or other sources)
  // If present, these should be used instead of recalculating from quantity/unit_weight
  calories?: number;
  protein?: number;
  fat?: number;
  carbs?: number;
  fiber?: number;
}

interface IngredientSelectorProps {
  selectedIngredients: SelectedIngredient[];
  onIngredientsChange: (ingredients: SelectedIngredient[]) => void;
}

const IngredientSelector = ({ selectedIngredients, onIngredientsChange }: IngredientSelectorProps) => {
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    loadProducts();
  }, []);

  const loadProducts = async () => {
    try {
      setLoading(true);
      const data = await getProducts();
      const transformedProducts = data.map(transformProductToFrontend);
      setProducts(transformedProducts);
    } catch (error) {
      logger.error('Error loading products:', error);
    } finally {
      setLoading(false);
    }
  };

  const addIngredient = (productId: string) => {
    const product = products.find(p => p.id === productId);
    if (!product) return;

    const newIngredient: SelectedIngredient = {
      id: `ingredient_${Date.now()}_${Math.random()}`,
      productId: product.id,
      nazwa: product.nazwa,
      quantity: getDefaultQuantityForUnit(product.unit),
      unit: product.unit,
      unit_weight: product.unit_weight
    };

    // Dodajemy defensywną kopię obiektu
    onIngredientsChange([...selectedIngredients.map(ing => ({ ...ing })), { ...newIngredient }]);
  };

  const removeIngredient = (ingredientId: string) => {
    onIngredientsChange(selectedIngredients.filter(ing => ing.id !== ingredientId));
  };

  const updateQuantity = (ingredientId: string, quantity: number) => {
    onIngredientsChange(
      selectedIngredients.map(ing =>
        ing.id === ingredientId ? { ...ing, quantity } : { ...ing }
      )
    );
  };

  const updateUnit = (ingredientId: string, unit: string) => {
    onIngredientsChange(
      selectedIngredients.map(ing => 
        ing.id === ingredientId
          ? {
              ...ing,
              unit,
              quantity: unit === "gramy" ? 100 : 1
            }
          : { ...ing }
      )
    );
  };

  const availableProducts = products.filter(
    product => !selectedIngredients.some(ing => ing.productId === product.id)
  );

  return (
    <div className="space-y-4">
      <Label className="text-gray-100">Składniki</Label>
      
      {/* Selected Ingredients List */}
      <div className="space-y-2">
        {selectedIngredients.map((ingredient) => {
          return (
            <Card key={ingredient.id} className="card-dark">
              <CardContent className="p-2">
                <div className="flex items-center gap-2">
                  <div className="flex-1">
                    <span className="font-medium text-gray-100">{ingredient.nazwa}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <NumericInput
                      type="decimal"
                      value={ingredient.quantity}
                      onChange={(value) => updateQuantity(ingredient.id, value)}
                      className="w-20 h-8 input-dark"
                      showPlaceholderForZero={false}
                    />
                    <span className="text-sm text-gray-100 ml-2">
                      {ingredient.unit}
                    </span>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeIngredient(ingredient.id)}
                    className="text-red-400 hover:text-red-300 hover:bg-red-900/20"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Add New Ingredient */}
      {availableProducts.length > 0 && (
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              role="combobox"
              aria-expanded={open}
              className="w-full justify-between input-dark"
            >
              <Search className="mr-2 h-4 w-4" />
              Dodaj składnik...
              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="p-0 w-full" align="start" style={{ width: 'var(--radix-popover-trigger-width)' }}>
            <Command className="bg-gray-700">
              <CommandInput placeholder="Szukaj składnika..." className="command-input m-1" />
              <CommandList>
                <CommandEmpty className="command-empty">Nie znaleziono składnika.</CommandEmpty>
                <CommandGroup>
                  {availableProducts.map((product) => (
                    <CommandItem
                      key={product.id}
                      onSelect={() => {
                        addIngredient(product.id);
                        setOpen(false);
                      }}
                      className="text-gray-100 hover:bg-gray-600 focus:bg-gray-600 cursor-pointer"
                    >
                      <div className="flex justify-between w-full">
                        <span>{product.nazwa}</span>
                        <span className="text-sm text-gray-400 ml-4">
                          ({product.unit}) {product.kcal} kcal/100g
                        </span>
                      </div>
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
      )}

      {availableProducts.length === 0 && selectedIngredients.length > 0 && (
        <p className="text-sm text-gray-400">Wszystkie dostępne produkty zostały dodane.</p>
      )}
    </div>
  );
};

/**
 * Zwraca ilość składnika w gramach na podstawie jednostki i gramatury.
 */
export function getIngredientWeightInGrams(ingredient: SelectedIngredient): number {
  if (ingredient.unit === "g") {
    return ingredient.quantity;
  }
  if (
    ingredient.unit === "ml" ||
    ingredient.unit === "mililitr" ||
    ingredient.unit === "mililitry"
  ) {
    // unit_weight odnosi się do 100 ml
    return (ingredient.quantity / 100) * ingredient.unit_weight;
  }
  return ingredient.quantity * ingredient.unit_weight;
}

/**
 * Przelicza makroskładniki i kalorie dla składnika w potrawie.
 * @param ingredient - składnik dodany do potrawy (SelectedIngredient)
 * @param product - produkt bazowy (zawiera wartości na 100g)
 * @returns { kcal, białko, tłuszcz, węglowodany, blonnik }
 */
export function calculateMacrosForIngredient(
  ingredient: SelectedIngredient,
  product: {
    kcal: number;
    macro: { białko: number; tłuszcz: number; węglowodany: number };
    blonnik: number;
  }
) {
  const grams = getIngredientWeightInGrams(ingredient);
  return {
    kcal: (product.kcal / 100) * grams,
    białko: (product.macro.białko / 100) * grams,
    tłuszcz: (product.macro.tłuszcz / 100) * grams,
    węglowodany: (product.macro.węglowodany / 100) * grams,
    blonnik: (product.blonnik / 100) * grams,
  };
}

export default IngredientSelector;
