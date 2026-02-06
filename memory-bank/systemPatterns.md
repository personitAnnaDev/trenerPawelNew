# Wzorce systemowe - TrenerPawel

## Architektura ogolna

- **Frontend:** Single Page Application (SPA) z React 18
- **Backend:** Supabase (PostgreSQL + Auth + Realtime + Storage + Edge Functions)
- **State Management:** React Context (auth) + TanStack Query (server state)
- **Routing:** React Router v6 z nested routes
- **UI:** shadcn/ui (Radix primitives + Tailwind CSS 3.x)

---

## Struktura komponentow

```
src/
  pages/              # Komponenty stron (routes)
    Index.tsx          # Redirect do /klienci
    Klienci.tsx        # Lista klientow
    KlientSzczegoly.tsx # Profil klienta + jadlospis
    JadlospisPreview.tsx # Podglad jadlospisu klienta
    Potrawy.tsx        # Zarzadzanie potrawami
    Produkty.tsx       # Zarzadzanie skladnikami
    Jadlospisy.tsx     # Lista szablonow
    JadlospisEditor.tsx # Edytor szablonow
    PublicJadlospis.tsx # Publiczny widok klienta
    Login.tsx          # Logowanie
    Register.tsx       # Rejestracja
    NotFound.tsx       # 404

  components/          # Reusable UI components
    ui/               # shadcn/ui primitives (Button, Card, Dialog, etc.)
    calorie-calculator/ # Kreator kalkulatora kalorii (4 kroki)
    Login.tsx, Register.tsx # Formularze auth
    ClientCard.tsx    # Karta klienta na liscie
    DietManager.tsx   # Glowny komponent zarzadzania dieta
    MealCard.tsx      # Karta posilku
    NowaPotrawa.tsx   # Formularz nowej potrawy
    SearchableIngredientInput.tsx # Wyszukiwarka skladnikow
    DietPDFDocument.tsx # Szablon PDF
    ... (wiele innych)

  hooks/              # Custom hooks
    useSearchIngredients.ts  # Wyszukiwanie skladnikow (RPC + debounce)
    useMealNutrition.ts      # Obliczanie makr (RPC + debounce)
    useSnapshotUndoRedo.ts   # Undo/redo oparte na snapshotach
    useCopyPaste.ts          # Kopiowanie/wklejanie posilkow
    useCopyPasteDay.ts       # Kopiowanie/wklejanie dni
    useAIOptimization.ts     # AI optymalizacja posilkow
    use-toast.ts             # Toast notifications
    use-mobile.ts            # Wykrywanie urzadzen mobilnych

  contexts/           # React Context providers
    AuthContext.tsx   # Autentykacja i sesja uzytkownika

  services/           # Logika biznesowa
    aiOptimizationService.ts # Integracja z OpenAI
    errorLoggingService.ts   # Logowanie bledow do bazy
    saveDishService.ts       # Zapis potrawy przez Edge Function

  utils/              # Funkcje pomocnicze
    supabase.ts       # Klient Supabase
    clientStorage.ts  # CRUD operacje na klientach
    supabaseTemplates.ts # Operacje na szablonach
    supabasePotrawy.ts   # Operacje na potrawach
    debounce.ts       # Debounce utility
    logger.ts         # Logger

  types/              # TypeScript types
    meal.ts           # Typy dla posilkow, skladnikow
    macro-planning.ts # Typy dla planowania makroskładnikow

  lib/                # Konfiguracje bibliotek
    utils.ts          # shadcn helpers (cn function)
```

### Konwencja nazewnictwa plikow
- **Strony:** PascalCase (Klienci.tsx, Produkty.tsx)
- **Komponenty:** PascalCase (ClientCard.tsx, MealCard.tsx)
- **Hooks:** camelCase z prefixem `use` (useSearchIngredients.ts)
- **Serwisy:** camelCase z suffixem `Service` (saveDishService.ts)
- **Utility:** camelCase (debounce.ts, logger.ts)
- **Typy:** camelCase (meal.ts, macro-planning.ts)

---

## Wzorce React + TypeScript

### Komponenty funkcyjne z hooks
- Wylacznie komponenty funkcyjne (nigdy class components)
- Interfejsy TypeScript dla wszystkich propsow
- React.FC lub explicit return types
- React.memo dla optymalizacji wydajnosci gdzie potrzebne
- Custom hooks dla logiki wielokrotnego uzytku

### Formularze
- React Hook Form do zarzadzania stanem formularza
- Zod do walidacji (schema-first approach)
- @hookform/resolvers do integracji Zod z RHF
- Controlled components (value zamiast defaultValue)

### Zarzadzanie stanem
- **AuthContext** - stan autentykacji (user, session)
- **TanStack Query** - dane serwerowe (cache, auto-refetch, optimistic updates)
- **useState** - stan lokalny komponentu (formularze, modal visibility)
- **useRef** - wartosci non-reactive (guards, timery)
- **URL params** - aktywna zakladka (?tab=)

---

## Wzorce danych

### Optimistic UI updates
- Aktualizacja UI natychmiast, sync z baza z debounce
- Auto-save z debounce 1.5s na profilu klienta
- Toast notification po udanym zapisie

### Caching makroskładnikow
- Skladniki przechowuja wartosci per 100g
- meal_ingredients przechowuje cached makra dla konkretnych ilosci
- dishes.ingredients_json zawiera pełne dane składnikow
- Przy edycji składnika → atomowa aktualizacja przez RPC

### Snapshoty (undo/redo)
- Kazda istotna zmiana tworzy diet_snapshot
- Snapshot = pelna kopia danych diety (JSONB)
- Nawigacja po stosie snapshotow (useSnapshotUndoRedo)
- Keyboard shortcuts: Ctrl+Z (undo), Ctrl+Y (redo)
- Blokada realtime updates podczas undo/redo

### Polimorfizm day_plans
- day_plans moze nalezec do client_id LUB template_id
- Ten sam komponent edytora dla klientow i szablonow
- Rozny context (klient vs szablon) wplywa na dostepne akcje

---

## Wzorce UI/UX

### Design system
- shadcn/ui jako baza komponentow
- Tailwind CSS 3.x do stylowania
- Lucide React do ikon
- Recharts do wykresow i wizualizacji danych
- Framer Motion (zainstalowany, do animacji)
- Sonner do toast notifications

### Responsywnosc
- Mobile-first approach
- Breakpointy: sm (640px), md (768px), lg (1024px), xl (1280px)
- Dostosowany layout dla telefonu, tabletu, desktopa

### Loading states
- Skeleton loadery przy ladowaniu danych
- Spinnery przy operacjach asynchronicznych
- Disabled buttons podczas oczekiwania na odpowiedz

### Nawigacja
- React Router v6 z BrowserRouter
- ProtectedRoute wrapper dla stron wymagajacych auth
- Publiczne trasy: /login, /register, /jadlospis/:token
- Chronione trasy: /klienci, /potrawy, /produkty, /jadlospisy

---

## Bezpieczenstwo i walidacja

### Row Level Security (RLS)
- Wszystkie tabele filtrowane przez user_id
- Kazdy uzytkownik widzi tylko swoje dane
- Publiczny dostep do jadlospisu przez dedykowana funkcje RPC

### Autentykacja
- Supabase Auth z JWT
- Email/password flow
- Password reset przez email
- Cross-tab synchronization (storage event listener)
- Auto-logout przy wygasnieciu sesji

### Walidacja danych
- Zod schemas na frontendzie
- PostgreSQL constraints na backendzie
- Sanityzacja inputow
- Unikalnosc nazw skladnikow (nazwa + jednostka)

---

## Obsluga bledow

### Error boundaries
- Komponentowe error boundaries dla graceful degradation
- Fallback UI przy crashu komponentu

### Error logging
- Tabela error_logs w Supabase
- Automatyczne logowanie bledow z kontekstem
- Severity levels: low, medium, high, critical

### User-facing errors
- Toast notifications dla bledow uzytkownika
- Polskie komunikaty bledow
- Retry logic dla transient errors

---

## Strategia testowania

### TDD workflow
1. RED - napisz failing test
2. GREEN - napisz minimalny kod aby test przeszedl
3. REFACTOR - wyczysc kod zachowujac testy zielone

### Piramida testow
- **Unit tests** (Vitest) - funkcje utility, hooks, obliczenia
- **Integration tests** (Vitest + Testing Library) - interakcje komponentow
- **E2E tests** (Playwright) - krytyczne flow uzytkownika
- **AI E2E tests** (Vitest) - scenariusze optymalizacji AI

### Cel pokrycia
- 80% code coverage
- Priorytet: logika biznesowa > UI > infrastruktura

---

## Wzorce backendowe (Supabase)

### RPC Functions (PostgreSQL)
- Uzywane dla zlozonych operacji (batch update, obliczenia)
- Redukuja N+1 queries do jednego wywolania
- Zwracaja JSONB z wynikami

### Edge Functions (Deno)
- Logika serwerowa (save-dish, AI optimization)
- JWT verification
- Atomowe transakcje

### Realtime
- Postgres changes broadcast przez WebSocket
- Granularne subskrypcje per strona
- Optimistic updates z sync w tle

### Storage
- Zdjecia potraw w Supabase Storage
- Upload z drag-and-drop
- Publiczne URL dla obrazkow
