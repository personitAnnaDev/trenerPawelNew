# Aktywny kontekst - TrenerPawel

## Ostatnia aktualizacja: 2026-02-06

## Biezacy focus
- **Bugfixy i stabilizacja** - priorytet na naprawianie bledow i stabilizowanie istniejacych funkcjonalnosci
- Aplikacja jest na produkcji (live), uzytkownicy aktywnie korzystaja
- **CORS fix na wszystkich Edge Functions** - ukonczone
- **Klient zglosil powolnosc** - mail wyslany z propozycja planu Pro Supabase

## Ostatnio ukonczone prace
- Backend optimization FAZY 1-5 (wszystkie ukonczone)
  - FAZA 1: Wyszukiwanie skladnikow przez PostgreSQL RPC + pg_trgm
  - FAZA 2: Obliczenia makro przez PostgreSQL RPC
  - FAZA 3: Atomowy zapis przez Edge Function save-dish
  - FAZA 4: Optymalizacja sprawdzania uzycia skladnika (RPC)
  - FAZA 5: Optymalizacja aktualizacji skladnika (RPC)
- Bugfix: Category Select (value zamiast defaultValue)
- UX: Loading spinner na przycisku aktualizacji skladnika
- **CORS fix: ai-macro-optimization** - usuniety statyczny CORS obiekt, dynamiczny getCorsHeaders, trailing slash localhost (v1.7.0, deployed recznie)
- **CORS fix: log-error** - trailing slash localhost (v8, deployed MCP)
- **CORS fix: save-dish** - wildcard "*" zamieniony na dynamiczny getCorsHeaders z ALLOWED_ORIGINS (v2, deployed MCP)
- **Bugfix: PotrawaDetails skladniki** - nazwy skladnikow z przecinkami (np. "basmati, brazowy, dziki") nie sa juz rozbijane na osobne bullet pointy (regex match zamiast split)

## Aktywne decyzje do podjecia
- Czy klient zaakceptuje plan Pro Supabase ($25/mies.) - konieczny dla stabilnosci produkcyjnej

## Znane problemy do zbadania
- Powolnosc zglaszana przez klienta - czesc rozwiazana przez backend optymalizacje, reszta wymaga planu Pro
- Vite build warning: chunk size >1500kB (react-pdf) - nie krytyczne

## Nastepne kroki
1. Oczekiwanie na odpowiedz klienta ws. planu Pro Supabase
2. Identyfikacja i naprawa kolejnych bugow z feedbacku
3. Dalsza optymalizacja UX
4. Ewentualne dalsze optymalizacje backendowe po upgrade planu

## Kontekst sesji
- Wszystkie 3 Edge Functions maja poprawny dynamiczny CORS
- Deploy ai-macro-optimization przez MCP nie dziala (plik za duzy ~70KB) - deploy recznie
- Deploy log-error i save-dish przez MCP dziala
- Supabase project ref: tngmeglwipljqyffkkog
