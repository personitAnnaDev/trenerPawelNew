# Kontekst techniczny - TrenerPawel

## Stack technologiczny

### Frontend
- **React 18.3** z TypeScript 5.5 - komponenty funkcyjne z hooks
- **Vite 5.4** - bundler i dev server (HMR)
- **React Router v6** - routing z nested routes

### UI i stylowanie
- **shadcn/ui** (Radix primitives + Tailwind CSS) - komponenty UI
- **Tailwind CSS 3.4** (STABILNA - unikac v4.x)
- **Lucide React 0.462** - ikony
- **Recharts 2.12** - wykresy i wizualizacja danych
- **Framer Motion** - animacje (zainstalowany)
- **Sonner** - toast notifications

### State management
- **TanStack Query 5** - server state (cache, refetch, optimistic updates)
- **React Context API** - global state (auth)
- **React Hook Form 7** + **Zod 3** - formularze z walidacja

### Drag & Drop
- **@dnd-kit/core 6** + **@dnd-kit/sortable 10** - drag and drop posilkow

### PDF
- **@react-pdf/renderer 4** - generowanie PDF po stronie klienta

### Inne
- **date-fns 3** - formatowanie dat (polska lokalizacja)
- **Decimal.js 10** - precyzyjne obliczenia makroskładnikow
- **uuid 11** - generowanie unikalnych identyfikatorow
- **cmdk 1** - command palette (shadcn/ui)

### Backend
- **Supabase** (PostgreSQL + Auth + Realtime + Storage + Edge Functions)
- **@supabase/supabase-js 2.52** - klient JavaScript

### Deployment
- **Vercel** (frontend)
- **Supabase Cloud** (backend)

### Testy
- **Vitest 3.2** - unit i integration tests
- **@testing-library/react 16** - testowanie komponentow
- **@testing-library/user-event 14** - symulacja interakcji
- **@testing-library/jest-dom 6** - matchery DOM
- **Playwright 1.55** - testy E2E
- **@vitest/coverage-v8** - pokrycie kodu
- **@faker-js/faker 10** - generowanie danych testowych

---

## Srodowisko deweloperskie

### Wymagania
- Node.js 18+ (LTS)
- pnpm 10+ (preferowany) lub npm 9+
- Git
- Konto Supabase

### Komendy deweloperskie
```bash
npm run dev           # Start dev server (port 8080)
npm run build         # Produkcyjny build
npm run preview       # Podglad production build
npm run lint          # ESLint
npm run test          # Uruchom wszystkie testy
npm run test:unit     # Tylko unit testy
npm run test:integration  # Tylko integration testy
npm run test:watch    # Testy w watch mode
npm run test:coverage # Testy z pokryciem
npm run test:e2e      # Playwright E2E testy
npm run test:e2e:ui   # Playwright z UI
npm run stop:ports    # Zabij procesy na portach 8080, 8081, 5173, 3000
```

### Sekwencja sprawdzania bledow (PRZED buildem)
1. `npx tsc --noEmit` - TypeScript type checking (najszybsze)
2. `npx eslint src` - ESLint errors
3. `npm run build` - finalna weryfikacja

---

## Zmienne srodowiskowe

### .env.local (development)
```
VITE_SUPABASE_URL=your-supabase-url
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
```

### Supabase Dashboard (Edge Functions)
```
OPENAI_API_KEY=your-openai-key  # Settings > Edge Functions > Secrets
```

### Wazne
- Prefiks `VITE_` wymagany dla zmiennych dostepnych w przegladarce
- Dostep przez `import.meta.env.VITE_*`
- Nigdy nie commituj .env do repozytorium

---

## Konfiguracja Vite

- Port dev server: 8080
- Template: react-ts z SWC (plugin @vitejs/plugin-react-swc)
- Path aliases: `@/` → `src/`
- Build target: ES2020+
- Minifikacja: terser

---

## Konfiguracja Tailwind

- Tailwind CSS 3.4 (STABILNA wersja)
- Plugin: tailwindcss-animate
- Plugin: @tailwindcss/typography
- Konfiguracja: tailwind.config.ts
- PostCSS: postcss.config.js

---

## Konfiguracja TypeScript

- Strict mode: wlaczony
- Target: ES2020
- Module: ESNext
- Dwa pliki konfiguracyjne:
  - tsconfig.app.json - kod aplikacji (src/)
  - tsconfig.node.json - konfiguracja node (vite.config.ts)

---

## Supabase - wytyczne integracji

### Klient
- Inicjalizacja w `src/utils/supabase.ts`
- Singleton pattern (jeden klient na aplikacje)

### Row Level Security (RLS)
- Wszystkie tabele wymagaja RLS
- Polityki filtruja po auth.uid()
- Publiczny dostep przez dedykowane RPC functions

### RPC Functions (zoptymalizowane)
- `search_ingredients` - wyszukiwanie z pg_trgm (fuzzy search)
- `calculate_meal_nutrition` - obliczanie makr
- `check_ingredient_usage` - sprawdzanie uzycia skladnika
- `update_ingredient_cached_macros` - atomowa aktualizacja makr
- Wywolanie: `supabase.rpc('function_name', params)`

### Edge Functions
- `save-dish` - atomowy zapis potrawy
- Runtime: Deno
- JWT verification wymagane
- Deployment przez Supabase Dashboard lub CLI

### Realtime
- Subscriptions na Postgres changes
- Filtrowanie po tabelach i eventach (INSERT, UPDATE, DELETE)
- Granularne subskrypcje per strona

### Storage
- Bucket dla zdjec potraw
- Upload: drag-and-drop
- Publiczne URL

---

## Migracje bazy danych

### Lokalizacja
```
supabase/migrations/
├── 20260205_enable_pg_trgm_extension.sql
├── 20260205_add_ingredients_search_index.sql
├── 20260205_create_search_ingredients_function.sql
├── 20260205_create_check_ingredient_usage_function.sql
└── 20260205_create_update_ingredient_macros_function.sql
```

### Konwencja nazewnictwa
- Format: `YYYYMMDD_opis_migracji.sql`
- Migracje idempotentne (CREATE OR REPLACE)

---

## Metryki wydajnosci (po optymalizacji)

| Operacja | Przed | Po |
|----------|-------|-----|
| Wyszukiwanie skladnika | 30-50ms | <5ms |
| Obliczanie makr | 100-500ms | <10ms |
| RAM przegladarki | 5-10MB | 0MB |
| Zapis potrawy | 500ms+ | <100ms |
| Sprawdzenie uzycia skladnika | 500-2000ms | ~20ms |
| Aktualizacja skladnika | kilka sekund | ~50ms |
| Queries przy aktualizacji | N+M+2 | 1 |

---

## Wsparcie przegladarek
- Chrome, Firefox, Safari, Edge (2 ostatnie wersje)
- iOS Safari, Chrome Mobile
- ES2020+ features wymagane

---

## Zasady wersji stabilnych
- ZAWSZE uzywaj STABILNYCH wersji zaleznosci
- Tailwind CSS: v3.x (stabilna), unikaj v4.x (experimental)
- React: stabilne LTS
- Sprawdz sukces buildu przed uznaniem zadania za ukonczone

---

## React Router - dodawanie nowych stron
1. Sprawdz czy React Router jest zainstalowany
2. Stworz plik w `src/pages/NazwaStrony.tsx`
3. Dodaj route w App.tsx
4. Uzyj React Router v6 patterns z nested routes

---

## Zasady MVP
- Implementuj tylko zadana funkcjonalnosc
- Unikaj dodatkowych features i optymalizacji
- Proste rozwiazania > overengineering
- Unikaj nadmiernej komponentyzacji
- Wieksze komponenty single-file czesto sa bardziej utrzymywalne
