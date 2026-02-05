import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Edit } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { Ingredient } from "@/pages/Produkty";

interface IngredientsTableProps {
  ingredients: Ingredient[];
  searchTerm?: string;
  loading?: boolean;
  onEdit?: (ingredient: Ingredient) => void;
}

// Helper function to format numbers with Polish locale (comma as decimal separator)
const formatNumber = (value: number): string => {
  return value.toLocaleString('pl-PL', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2
  });
};

const IngredientsTable = ({
  ingredients,
  searchTerm,
  loading,
  onEdit,
}: IngredientsTableProps) => {
  return (
    <Card className="bg-zinc-900 border-zinc-800 shadow-sm">
      <CardHeader className="bg-zinc-800 border-b border-zinc-700">
        <CardTitle className="text-zinc-100 text-xl font-bold">
          Lista Składników
        </CardTitle>
        {searchTerm && (
          <p className="text-sm text-zinc-300">
            Znaleziono {ingredients.length} składnik(ów) dla "{searchTerm}"
          </p>
        )}
      </CardHeader>
      <CardContent className="p-0 h-full flex flex-col">
        <div className="flex-1 overflow-auto max-h-[calc(100vh-400px)]">
          <Table className="w-full table-auto">
            <TableHeader>
              <TableRow className="sticky top-0 z-20 bg-zinc-800 border-b border-zinc-700 hover:bg-zinc-700">
                <TableHead className="text-left text-base font-semibold text-zinc-100 py-4">
                  Nazwa
                </TableHead>
                <TableHead className="text-center text-base font-semibold text-zinc-100 py-4">
                  Kcal (na 100g)
                </TableHead>
                <TableHead className="text-center text-base font-semibold text-zinc-100 py-4">
                  Jednostka
                </TableHead>
                <TableHead className="text-center text-base font-semibold text-zinc-100 py-4">
                  Gramatura jednostki (g)
                </TableHead>
                <TableHead className="text-center text-base font-semibold text-zinc-100 py-4">
                  Białko (g)
                </TableHead>
                <TableHead className="text-center text-base font-semibold text-zinc-100 py-4">
                  Tłuszcz (g)
                </TableHead>
                <TableHead className="text-center text-base font-semibold text-zinc-100 py-4">
                  Węglowodany (g)
                </TableHead>
                <TableHead className="text-center text-base font-semibold text-zinc-100 py-4">
                  Błonnik (g)
                </TableHead>
                <TableHead className="text-center text-base font-semibold text-zinc-100 py-4">
                  Akcje
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading
                ? Array.from({ length: 5 }).map((_, index) => (
                    <TableRow key={index} className="border-b border-zinc-700">
                      <TableCell className="py-4">
                        <Skeleton className="h-6 w-32 bg-zinc-700" />
                      </TableCell>
                      <TableCell className="text-right py-4">
                        <Skeleton className="h-6 w-16 bg-zinc-700 ml-auto" />
                      </TableCell>
                      <TableCell className="text-right py-4">
                        <Skeleton className="h-6 w-12 bg-zinc-700 ml-auto" />
                      </TableCell>
                      <TableCell className="text-right py-4">
                        <Skeleton className="h-6 w-12 bg-zinc-700 ml-auto" />
                      </TableCell>
                      <TableCell className="text-right py-4">
                        <Skeleton className="h-6 w-12 bg-zinc-700 ml-auto" />
                      </TableCell>
                      <TableCell className="text-right py-4">
                        <Skeleton className="h-6 w-12 bg-zinc-700 ml-auto" />
                      </TableCell>
                      <TableCell className="text-left py-4">
                        <Skeleton className="h-6 w-16 bg-zinc-700" />
                      </TableCell>
                      <TableCell className="text-right py-4">
                        <Skeleton className="h-6 w-16 bg-zinc-700 ml-auto" />
                      </TableCell>
                      <TableCell className="text-right py-4">
                        <Skeleton className="h-6 w-12 bg-zinc-700 ml-auto" />
                      </TableCell>
                      <TableCell className="text-right py-4">
                        <Skeleton className="h-6 w-12 bg-zinc-700 ml-auto" />
                      </TableCell>
                      <TableCell className="text-right py-4">
                        <Skeleton className="h-6 w-12 bg-zinc-700 ml-auto" />
                      </TableCell>
                      <TableCell className="text-right py-4">
                        <Skeleton className="h-6 w-12 bg-zinc-700 ml-auto" />
                      </TableCell>
                    </TableRow>
                  ))
                : ingredients.map((ingredient, index) => (
                    <TableRow
                      key={ingredient.id}
                      className={`border-b border-zinc-700 hover:bg-zinc-800 transition-colors ${
                        index % 2 === 0 ? "bg-zinc-900" : "bg-zinc-850"
                      } cursor-pointer`}
                      onClick={() => onEdit && onEdit(ingredient)}
                    >
                      <TableCell className="font-medium text-zinc-100 py-4 text-base text-left">
                        {ingredient.nazwa}
                      </TableCell>
                      <TableCell className="nutrition-kcal font-semibold py-4 text-base text-center">
                        {formatNumber(ingredient.kcal)}
                      </TableCell>
                      <TableCell className="py-4 text-center">
                        {ingredient.unit}
                      </TableCell>
                      <TableCell className="py-4 text-center">
                        {formatNumber(ingredient.unit_weight)}
                      </TableCell>
                      <TableCell className="py-4 text-center">
                        {formatNumber(ingredient.macro.białko)}
                      </TableCell>
                      <TableCell className="py-4 text-center">
                        {formatNumber(ingredient.macro.tłuszcz)}
                      </TableCell>
                      <TableCell className="py-4 text-center">
                        {formatNumber(ingredient.macro.węglowodany)}
                      </TableCell>
                      <TableCell className="py-4 text-center">
                        {formatNumber(ingredient.blonnik)}
                      </TableCell>
                      <TableCell className="py-4 text-center">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            onEdit && onEdit(ingredient);
                          }}
                          className="h-8 w-8 p-0 hover:bg-zinc-700"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
            </TableBody>
          </Table>
        </div>

        {!loading && ingredients.length === 0 && searchTerm && (
          <div className="text-center py-12 text-zinc-300 bg-zinc-900">
            <div className="text-lg font-medium">
              Nie znaleziono składników pasujących do "{searchTerm}".
            </div>
            <div className="text-sm mt-2">
              Spróbuj użyć innych słów kluczowych
            </div>
          </div>
        )}

        {!loading && ingredients.length === 0 && !searchTerm && (
          <div className="text-center py-12 text-zinc-300 bg-zinc-900">
            <div className="text-lg text-zinc-100 font-semibold mb-2">
              Brak składników
            </div>
            <div className="text-sm">
              Dodaj pierwszy składnik używając przycisku powyżej.
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default IngredientsTable;
