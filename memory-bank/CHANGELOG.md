# Changelog

Wszystkie istotne zmiany w projekcie są dokumentowane w tym pliku.

## [2025-02-06] - Optymalizacja aktualizacji składników

### Dodane
- **RPC `update_ingredient_cached_macros`** - atomowa aktualizacja wszystkich potraw i jadłospisów przy edycji składnika
- **RPC `check_ingredient_usage`** - szybkie sprawdzenie czy składnik jest używany
- **Loading spinner** na przycisku "Zaktualizuj wszystko" w Produkty.tsx
- **Indeksy GIN i B-tree** dla szybszych zapytań na dishes i meal_ingredients

### Zmienione
- `Produkty.tsx` - zastąpiono N+1 queries jednym wywołaniem RPC
- Bundle size zmniejszony o ~0.9KB

### Naprawione
- Sumaryczne makra potrawy (calories, protein, fat, carbs, fiber) teraz też się aktualizują przy edycji składnika

### Wydajność
- Sprawdzenie użycia składnika: 500-2000ms → ~20ms
- Aktualizacja składnika: kilka sekund → ~50ms
- Liczba zapytań przy aktualizacji: N+M+2 → 1

---

## [2025-02-05] - Edge Function save-dish + Backend Search

### Dodane
- **Edge Function `save-dish`** - atomowy zapis potrawy z JWT verification
- **RPC `search_ingredients`** - wyszukiwanie składników przez PostgreSQL
- **RPC `calculate_meal_nutrition`** - obliczanie makr na backendzie
- **Service `saveDishService.ts`** - frontend wrapper dla save-dish
- **pg_trgm extension** - fuzzy search dla składników
- **Indeksy GIN** dla szybkiego wyszukiwania w ingredients

### Zmienione
- `NowaPotrawa.tsx` - używa Edge Function dla nowych potraw
- `NowaPotrawa.tsx` - category Select: `value` zamiast `defaultValue` (controlled component fix)
- `SearchableIngredientInput.tsx` - zintegrowany z useSearchIngredients hook

### Naprawione
- Kategoria teraz poprawnie się podstawia przy edycji potrawy

### Wydajność
- Wyszukiwanie składników: 30-50ms → 1-5ms
- Obliczanie makr: 100-500ms → 2-5ms
- RAM przeglądarki: -5-10MB (nie trzeba trzymać wszystkich produktów)

---

## Migracje bazy danych

| Plik | Opis |
|------|------|
| `20260205_enable_pg_trgm_extension.sql` | Włączenie pg_trgm |
| `20260205_add_ingredients_search_index.sql` | Indeksy dla wyszukiwania |
| `20260205_create_search_ingredients_function.sql` | RPC search_ingredients |
| `20260205_create_check_ingredient_usage_function.sql` | RPC check_ingredient_usage |
| `20260205_create_update_ingredient_macros_function.sql` | RPC update_ingredient_cached_macros |

## Edge Functions

| Funkcja | Opis | JWT |
|---------|------|-----|
| `save-dish` | Atomowy zapis potrawy | ✅ Required |
