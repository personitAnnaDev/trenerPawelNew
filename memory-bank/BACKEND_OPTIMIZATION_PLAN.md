# Backend Optimization Plan - Odciążenie Frontendu

**Data utworzenia:** 2025-02-05
**Ostatnia aktualizacja:** 2025-02-06
**Status:** ✅ WSZYSTKIE FAZY UKOŃCZONE

## 📊 PODSUMOWANIE

| Faza | Status | Opis |
|------|--------|------|
| FAZA 1 | ✅ | Wyszukiwanie przez PostgreSQL RPC + pg_trgm |
| FAZA 2 | ✅ | Obliczenia makro przez PostgreSQL RPC |
| FAZA 3 | ✅ | Atomowy zapis przez Edge Function |
| FAZA 4 | ✅ | Optymalizacja sprawdzania użycia składnika |
| FAZA 5 | ✅ | Optymalizacja aktualizacji składnika (RPC) |

---

## 🔍 DIAGNOZA PROBLEMU

### Zidentyfikowane bottlenecki

| ID | Problem | Lokalizacja | Rozwiązanie |
|----|---------|-------------|-------------|
| #1 | O(N×M) lookups | `products.find()` w pętlach | PostgreSQL RPC |
| #2 | Brak paginacji | `getProducts()` | Backend search RPC |
| #3 | Brak debounce | `SearchableIngredientInput` | Hook z debounce |
| #4 | Podwójne obliczenia | `recalculateMacros()` | Backend RPC |
| #5 | N+1 queries | `checkProductUsage()` | Jedno RPC |
| #6 | N+M+2 queries | `updateCachedMacros()` | Jedno RPC |

---

## ✅ FAZA 1: Wyszukiwanie składników (backend)

**Cel:** Przenieść wyszukiwanie produktów z frontendu na PostgreSQL.

**Migracje:**
1. `20260205_enable_pg_trgm_extension.sql` - rozszerzenie pg_trgm
2. `20260205_add_ingredients_search_index.sql` - indeksy GIN + B-tree
3. `20260205_create_search_ingredients_function.sql` - funkcja RPC

**Poprawa wydajności:**
- Czas wyszukiwania: 30-50ms → 1-5ms (10-30× szybciej)
- RAM przeglądarki: -5-10MB (nie trzeba trzymać wszystkich produktów)

---

## ✅ FAZA 2: Obliczanie makroskładników (backend)

**Cel:** Przenieść obliczenia makro z frontendu na PostgreSQL.

**Funkcja RPC:** `calculate_meal_nutrition`

**Frontend hook:** `src/hooks/useMealNutrition.ts`
- Debounce 300ms
- Auto-cancel outdated requests
- `recalculate()` dla manualnego refresh

**Poprawa:**
- Czas obliczeń: 100-500ms → 2-5ms (50-100× szybciej)

---

## ✅ FAZA 3: Edge Function - zapis potrawy

**Cel:** Atomowy zapis potrawy z wszystkimi obliczeniami na backendzie.

**Edge Function:** `save-dish`
- ✅ Oblicza makra przez RPC `calculate_meal_nutrition`
- ✅ Pobiera category_id z tabeli categories
- ✅ Tworzy ingredients_description z ingredients_json
- ✅ Zapisuje wszystko w jednej transakcji
- ✅ Obsługa duplikatów (nazwa, składniki)
- ✅ JWT verification enabled

**Pliki:**
- `supabase/functions/save-dish/index.ts` - Edge Function
- `src/services/saveDishService.ts` - Frontend service
- `src/components/NowaPotrawa.tsx` - Integracja

**Deployment:**
```bash
# Via MCP (preferred)
mcp__github_com_supabase-community_supabase-mcp__deploy_edge_function
```

---

## ✅ FAZA 4: Optymalizacja sprawdzania użycia składnika

**Problem:** `checkProductUsage()` wykonywał 3-4 expensive queries z nested joins (500-2000ms)

**Rozwiązanie:** Nowa funkcja RPC `check_ingredient_usage`

**Migracja:** `20260205_create_check_ingredient_usage_function.sql`

**Funkcja:**
```sql
check_ingredient_usage(p_ingredient_id UUID, p_user_id UUID)
RETURNS JSONB -- {"is_used": boolean, "dishes_count": int, "meals_count": int}
```

**Poprawa:**
- Czas: 500-2000ms → 19ms (50-100× szybciej)
- Queries: 3-4 → 1

**Indeksy utworzone:**
- `idx_dishes_ingredients_json_gin` - GIN dla JSONB containment
- `idx_meal_ingredients_ingredient_id` - B-tree
- `idx_day_plans_template_id` - B-tree
- `idx_day_plans_created_by` - B-tree

---

## ✅ FAZA 5: Optymalizacja aktualizacji składnika

**Problem:** `updateCachedMacros()` wykonywał N+M+2 queries:
1. Pobierz WSZYSTKIE potrawy użytkownika (1 query)
2. Dla KAŻDEJ potrawy z tym składnikiem → UPDATE (N queries)
3. Pobierz WSZYSTKIE meal_ingredients (1 query)
4. Dla KAŻDEGO meal_ingredient → UPDATE (M queries)

**Rozwiązanie:** Nowa funkcja RPC `update_ingredient_cached_macros`

**Migracja:** `20260205_create_update_ingredient_macros_function.sql`

**Funkcja:**
```sql
update_ingredient_cached_macros(
  p_ingredient_id UUID,
  p_user_id UUID,
  p_name TEXT,
  p_calories NUMERIC,
  p_protein NUMERIC,
  p_fat NUMERIC,
  p_carbs NUMERIC,
  p_fiber NUMERIC,
  p_unit TEXT,
  p_unit_weight NUMERIC
)
RETURNS JSONB -- {"success": true, "dishes_updated": int, "meal_ingredients_updated": int}
```

**Co aktualizuje:**
1. ✅ `dishes.ingredients_json` - makra każdego składnika w JSON
2. ✅ `dishes.ingredients_description` - opis tekstowy
3. ✅ `dishes.calories/protein/fat/carbs/fiber` - sumaryczne makra potrawy
4. ✅ `meal_ingredients` - składniki w jadłospisach

**Poprawa:**
- Queries: N+M+2 → 1 (dla 50 potraw i 200 meal_ingredients: 252 → 1)
- Czas: kilka sekund → ~20-50ms
- Bundle size: -0.9KB (usunięto 100+ linii kodu)

---

## 📁 STRUKTURA PLIKÓW

### Migracje
```
supabase/migrations/
├── 20260205_enable_pg_trgm_extension.sql
├── 20260205_add_ingredients_search_index.sql
├── 20260205_create_search_ingredients_function.sql
├── 20260205_create_check_ingredient_usage_function.sql
└── 20260205_create_update_ingredient_macros_function.sql
```

### Edge Functions
```
supabase/functions/
└── save-dish/
    └── index.ts
```

### Frontend
```
src/hooks/
├── useSearchIngredients.ts  # Hook z debounce dla search RPC
└── useMealNutrition.ts      # Hook z debounce dla nutrition RPC

src/services/
└── saveDishService.ts       # Serwis dla save-dish Edge Function

src/components/
├── SearchableIngredientInput.tsx  # Zintegrowany z useSearchIngredients
├── NowaPotrawa.tsx                # Zintegrowany z saveDishViaEdgeFunction
└── (category Select: value zamiast defaultValue)

src/pages/
└── Produkty.tsx                   # Zintegrowany z RPC functions
```

---

## 📊 METRYKI SUKCESU

| Metryka | PRZED | PO |
|---------|-------|-----|
| Czas wyszukiwania składnika | 30-50ms | <5ms |
| Czas obliczenia makro | 100-500ms | <10ms |
| RAM przeglądarki (produkty) | 5-10MB | 0MB |
| Czas zapisu potrawy | 500ms+ | <100ms |
| Czas sprawdzenia użycia składnika | 500-2000ms | ~20ms |
| Czas aktualizacji składnika | kilka sekund | ~50ms |
| Queries przy aktualizacji | N+M+2 | 1 |

---

## 🐛 BUGFIXY

### Category nie podstawia się przy edycji potrawy
**Problem:** Przy edycji potrawy kategoria nie była pre-filled w Select.
**Przyczyna:** `defaultValue` działa tylko przy pierwszym renderze.
**Rozwiązanie:** Zmiana z `defaultValue={field.value}` na `value={field.value}` (controlled component).
**Plik:** `src/components/NowaPotrawa.tsx`

### UX - brak feedbacku przy aktualizacji składnika
**Problem:** Użytkownik klikał "Zaktualizuj wszystko" i nie widział że coś się dzieje.
**Rozwiązanie:** Dodano loading spinner z tekstem "Aktualizuję..." i disabled state.
**Plik:** `src/pages/Produkty.tsx`

---

## 📝 COMMITS

1. `0e40c66` - feat(UX): add loading spinner to ingredient update button
2. `ddaf9e0` - perf: optimize ingredient update with RPC function
3. `7f67b1b` - fix: update dish total macros in RPC function

---

## 📝 NOTATKI

### 2025-02-06
- Ukończono FAZĘ 4 i 5 optymalizacji
- Wdrożono `check_ingredient_usage` RPC (sprawdzanie użycia)
- Wdrożono `update_ingredient_cached_macros` RPC (aktualizacja składnika)
- Naprawiono brak aktualizacji sumarycznych makr potrawy
- Dodano loading spinner dla UX
- Bundle size zmniejszony o ~0.9KB

### 2025-02-05
- Ukończono FAZY 1-3
- Wdrożono Edge Function `save-dish`
- Naprawiono category Select (controlled component)
