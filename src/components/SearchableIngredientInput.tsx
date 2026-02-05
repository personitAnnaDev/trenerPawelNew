import { useState, useEffect, useRef } from "react";
import { Input } from "@/components/ui/input";
import { Search, Loader2 } from "lucide-react";
import { shortenUnit } from "@/utils/formatIngredients";
import { useSearchIngredients } from "@/hooks/useSearchIngredients";

interface SearchableIngredientInputProps {
  onIngredientSelect: (ingredient: any) => void;
  /** @deprecated Opcjonalny - jeśli nie podany, używa wyszukiwania przez PostgreSQL RPC (zalecane) */
  products?: any[];
  placeholder?: string;
}

/**
 * Komponent wyszukiwania składników z autocomplete.
 *
 * TRYB 1 (zalecany): Bez prop `products` - wyszukiwanie przez PostgreSQL RPC
 * - Debounce 300ms
 * - Indeks GIN (<5ms)
 * - 0 produktów w pamięci przeglądarki
 *
 * TRYB 2 (legacy): Z prop `products` - filtrowanie lokalne
 * - Wymaga pobrania wszystkich produktów do pamięci
 * - Filtrowanie na każdy keystroke
 */
const SearchableIngredientInput = ({
  onIngredientSelect,
  products,
  placeholder = "Szukaj składnika..."
}: SearchableIngredientInputProps) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [localSuggestions, setLocalSuggestions] = useState<any[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);

  // Tryb RPC: używaj hooka gdy brak products
  const useRpcMode = !products || products.length === 0;
  const { results: rpcResults, isLoading: rpcLoading } = useSearchIngredients(
    useRpcMode ? searchTerm : "", // Tylko gdy RPC mode
    { debounceMs: 300, limit: 8 }
  );

  // Wybierz źródło sugestii
  const suggestions = useRpcMode ? rpcResults : localSuggestions;
  const isLoading = useRpcMode ? rpcLoading : false;

  // TRYB LEGACY: Lokalne filtrowanie gdy products przekazane
  useEffect(() => {
    if (!useRpcMode && searchTerm.length > 0) {
      const filtered = products!
        .filter(product =>
          ((product.nazwa || product.name || "")?.toLowerCase().includes(searchTerm.toLowerCase()))
        )
        .sort((a, b) => {
          const aName = (a.nazwa || a.name || "").toLowerCase();
          const bName = (b.nazwa || b.name || "").toLowerCase();
          const aIndex = aName.indexOf(searchTerm.toLowerCase());
          const bIndex = bName.indexOf(searchTerm.toLowerCase());
          return aIndex - bIndex;
        })
        .slice(0, 8);

      setLocalSuggestions(filtered);
      setShowSuggestions(true);
      setSelectedIndex(-1);
    } else if (!useRpcMode) {
      setLocalSuggestions([]);
      setShowSuggestions(false);
    }
  }, [searchTerm, products, useRpcMode]);

  // TRYB RPC: Pokaż sugestie gdy są wyniki
  useEffect(() => {
    if (useRpcMode) {
      if (searchTerm.length > 0) {
        setShowSuggestions(true);
        setSelectedIndex(-1);
      } else {
        setShowSuggestions(false);
      }
    }
  }, [searchTerm, rpcResults, useRpcMode]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
  };

  const handleSuggestionClick = (ingredient: any) => {
    onIngredientSelect(ingredient);
    setSearchTerm("");
    setShowSuggestions(false);
    setSelectedIndex(-1);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showSuggestions || suggestions.length === 0) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev =>
          prev < suggestions.length - 1 ? prev + 1 : 0
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev =>
          prev > 0 ? prev - 1 : suggestions.length - 1
        );
        break;
      case 'Enter':
        e.preventDefault();
        if (selectedIndex >= 0 && selectedIndex < suggestions.length) {
          handleSuggestionClick(suggestions[selectedIndex]);
        }
        break;
      case 'Escape':
        setShowSuggestions(false);
        setSelectedIndex(-1);
        inputRef.current?.blur();
        break;
    }
  };

  const handleBlur = () => {
    // Delay hiding suggestions to allow clicking on them
    setTimeout(() => {
      if (!suggestionsRef.current?.contains(document.activeElement)) {
        setShowSuggestions(false);
        setSelectedIndex(-1);
      }
    }, 150);
  };

  return (
    <div className="relative">
      <div className="relative">
        {isLoading ? (
          <Loader2 className="absolute left-3 top-1/2 transform -translate-y-1/2 text-zinc-400 h-4 w-4 z-10 animate-spin" />
        ) : (
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-zinc-400 h-4 w-4 z-10" />
        )}
        <Input
          ref={inputRef}
          value={searchTerm}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onBlur={handleBlur}
          placeholder={placeholder}
          className="pl-10 bg-zinc-800 border-zinc-700 text-zinc-100 focus:ring-[#a08032] focus:border-[#a08032]"
        />
      </div>

      {showSuggestions && suggestions.length > 0 && (
        <div
          ref={suggestionsRef}
          className="absolute top-full left-0 right-0 z-[9999] mt-1 max-h-64 overflow-y-auto overscroll-behavior-contain touch-action-pan-y bg-zinc-800 border border-zinc-700 rounded-md shadow-lg"
          style={{ WebkitOverflowScrolling: 'touch' }}
        >
          {suggestions.map((ingredient, index) => (
            <div
              key={ingredient.id}
              className={`px-3 py-2 cursor-pointer border-b border-zinc-700 last:border-b-0 hover:bg-zinc-700 transition-colors ${
                index === selectedIndex ? 'bg-zinc-700' : ''
              }`}
              onMouseDown={e => e.preventDefault()}
              onClick={() => handleSuggestionClick(ingredient)}
            >
              <div className="flex justify-between items-center">
                <span className="text-zinc-100 font-medium">
                  {ingredient.nazwa || ingredient.name || ""}
                  <span className="ml-2 text-zinc-400 text-xs">
                    [{shortenUnit(ingredient.unit)}]
                  </span>
                </span>
                <span className="text-zinc-400 text-sm">{ingredient.calories ?? ingredient.kcal ?? 0} kcal/100g</span>
              </div>
              <div className="text-xs text-zinc-500 mt-1">
                B: {(ingredient.protein ?? 0).toLocaleString("pl-PL", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}g
                | W: {(ingredient.carbs ?? 0).toLocaleString("pl-PL", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}g
                | T: {(ingredient.fat ?? 0).toLocaleString("pl-PL", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}g
                | Bł: {(ingredient.fiber ?? 0).toLocaleString("pl-PL", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}g
                | Kcal: {(ingredient.calories ?? ingredient.kcal ?? 0).toLocaleString("pl-PL", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}
              </div>
            </div>
          ))}
        </div>
      )}

      {showSuggestions && suggestions.length === 0 && searchTerm.length > 0 && !isLoading && (
        <div className="absolute top-full left-0 right-0 z-50 mt-1 bg-zinc-800 border border-zinc-700 rounded-md shadow-lg">
          <div className="px-3 py-4 text-center text-zinc-400">
            Nie znaleziono składnika "{searchTerm}"
          </div>
        </div>
      )}
    </div>
  );
};

export default SearchableIngredientInput;
