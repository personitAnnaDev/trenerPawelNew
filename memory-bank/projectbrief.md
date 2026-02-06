# Project Brief: TrenerPawel - System Zarzadzania Dieta i Zywieniem

## Status projektu
- **Faza:** Produkcja (live)
- **Priorytet:** Bugfixy i stabilizacja
- **Typ:** Aplikacja webowa SaaS (single-tenant per trener)

## Stack technologiczny
- **Frontend:** React 18 + TypeScript + Vite
- **UI:** shadcn/ui (Radix + Tailwind CSS 3.x)
- **Backend:** Supabase (PostgreSQL + Auth + Realtime + Storage + Edge Functions)
- **State:** React Context (auth) + TanStack Query (server state)
- **Formularze:** React Hook Form + Zod
- **Drag & Drop:** @dnd-kit
- **PDF:** @react-pdf/renderer
- **Testy:** Vitest + Playwright + Testing Library
- **Deployment:** Vercel (frontend) + Supabase Cloud (backend)

---

## Przeglad projektu

TrenerPawel to kompleksowy system zarzadzania dieta i zywieniem przeznaczony dla trenerow fitness i dietetykow. Aplikacja umozliwia tworzenie spersonalizowanych jadlospisow dla klientow, zarzadzanie baza skladnikow i potraw, oraz udostepnianie diet klientom przez publiczne linki.

Aplikacja sklada sie z nastepujacych glownych podsystemow:
1. **Panel trenera** - zarzadzanie klientami, dietami, skladnikami, potrawami
2. **Widok publiczny klienta** - przegladanie jadlospisu przez link z tokenem
3. **System szablonow** - wielokrotne uzycie planow dietetycznych
4. **Kalkulator kalorii** - kreator obliczania BMR, TDEE i makroskładnikow
5. **System undo/redo** - wersjonowanie diet oparty na snapshotach w bazie
6. **Backend RPC** - zoptymalizowane operacje bazodanowe

---

## Problem

Trenerzy personalni i dietetycy potrzebuja narzedzia do:
- Tworzenia spersonalizowanych jadlospisow dla wielu klientow
- Szybkiego skladania posilkow ze skladnikow z automatycznym obliczaniem makroskładnikow
- Udostepniania diet klientom w czytelnej formie (web + PDF)
- Sledzenia platnosci i statusu wspolpracy z klientami
- Utrzymywania bazy produktow i potraw do ponownego uzycia

Istniejace rozwiazania (arkusze kalkulacyjne, notatki, ogolne aplikacje dietetyczne) nie sa wystarczajaco zoptymalizowane pod specifyczne potrzeby trenerow personalnych.

---

## Uzytkownicy

### 1. Trener / Dietetyk (glowny uzytkownik)
- **Demografia:** Trenerzy personalni, dietetycy, 25-50 lat
- **Zachowanie:** Obsluguje wielu klientow jednoczesnie, potrzebuje szybkiego workflow
- **Cel:** Efektywne tworzenie i zarzadzanie jadlospisami dla klientow
- **Komfort techniczny:** Sredni, oczekuje prostego interfejsu
- **Kluczowe akcje:**
  - Logowanie email/haslo
  - CRUD klientow z pelnym profilem
  - Tworzenie/edycja jadlospisow (wielodniowych)
  - Zarzadzanie baza skladnikow i potraw
  - Obliczanie zapotrzebowania kalorycznego (kalkulator)
  - Generowanie PDF z jadlospisem
  - Udostepnianie diety klientowi przez link

### 2. Klient (uzytkownik pasywny)
- **Demografia:** Osoby korzystajace z uslug trenera, rozne grupy wiekowe
- **Zachowanie:** Otwiera link, przegada jadlospis, pobiera PDF
- **Cel:** Zapoznanie sie ze swoim jadlospisem
- **Komfort techniczny:** Rozny, interfejs musi byc maksymalnie prosty
- **Kluczowe akcje:**
  - Otwieranie publicznego linku jadlospisu
  - Przegladanie posilkow na kazdy dzien
  - Pobieranie PDF
  - Brak logowania wymagane

---

## Flow uzytkownika - Trener

### 1. Rejestracja i logowanie
- Rejestracja email/haslo → email potwierdzajacy
- Logowanie → sesja JWT w localStorage
- Reset hasla przez email

### 2. Zarzadzanie klientami (/klienci)
- Lista klientow z wyszukiwarka
- Dodanie nowego klienta (formularz z walidacja)
- Edycja klienta (auto-save z debounce 1.5s)
- Dane: imie, nazwisko, data urodzenia, plec, waga, wzrost
- Ustawienia diety: pokaz/ukryj makra klientowi
- Platnosci: status, data platnosci, data wygasniecia

### 3. Tworzenie jadlospisu (/klienci/:id)
- Zakladka "Jadlospis" w profilu klienta
- Dodawanie dni (Dzien 1, Dzien 2, ...)
- Dodawanie posilkow do dnia (Sniadanie, Obiad, Kolacja, ...)
- Dodawanie skladnikow do posilkow z bazy produktow
- Drag & drop do zmiany kolejnosci posilkow
- Kopiowanie/wklejanie posilkow miedzy dniami
- Kopiowanie calych dni
- Widok makroskładnikow: cel vs aktualny
- Undo/Redo (Ctrl+Z / Ctrl+Y)
- Zapisywanie wersji (snapshoty w bazie danych)

### 4. Kalkulator kalorii
- Krok 1: Waga, poziom aktywnosci
- Krok 2: Obliczenie BMR (Mifflin-St Jeor) i TDEE
- Krok 3: Ustawienie kalorii na kazdy dzien
- Krok 4: Rozklad makroskładnikow (% lub g/kg)
- Zapisanie → aktualizacja client_diet_settings

### 5. Baza potraw (/potrawy)
- Siatka potraw z obrazkami
- Filtrowanie po kategorii, wyszukiwanie po nazwie
- Dodawanie nowej potrawy ze skladnikami i instrukcjami
- Zarzadzanie kategoriami (modal)
- Kazda potrawa: skladniki, makra, instrukcje, zdjecie

### 6. Baza skladnikow (/produkty)
- Tabela skladnikow z wartosciami odzywczymi
- Dodawanie/edycja skladnikow (kalorie, bialko, tluszcz, wegle, blonnik)
- Jednostki: gramy, ml, sztuki, itp.
- Wykrywanie duplikatow (nazwa + jednostka)
- Ostrzezenie przy edycji skladnika uzytego w potrawach/dietach
- Atomowa aktualizacja makroskładnikow (RPC)

### 7. Szablony jadlospisow (/jadlospisy)
- Lista szablonow wielokrotnego uzytku
- Tworzenie szablonu od zera
- Aplikowanie szablonu do klienta
- Edytor szablonu z pelnym drag & drop

### 8. Udostepnianie klientowi
- Generowanie unikalnego tokenu dla klienta
- Publiczny URL: /jadlospis/:token
- Real-time sync (polling co 15s)
- Eksport PDF z wyborem dni
- Opcjonalne ukrycie makroskładnikow

---

## Schemat bazy danych (Supabase/PostgreSQL)

### Glowne tabele:
- **clients** - profil klienta (dane osobowe, dietetyczne, platnosci)
- **day_plans** - dni w planie dietetycznym (polimorficzne: client_id LUB template_id)
- **meals** - posilki w dniu (nazwa, skladniki, makra, instrukcje)
- **meal_ingredients** - skladniki w posilku (cached makra)
- **ingredients** - baza produktow (wartosci odzywcze per 100g)
- **dishes** - potrawy/przepisy (ingredients_json JSONB)
- **dish_categories** - kategorie potraw
- **templates** - szablony jadlospisow
- **client_diet_settings** - docelowe makra na dzien
- **diet_snapshots** - wersjonowanie diet (undo/redo)
- **error_logs** - logowanie bledow

### Funkcje RPC (zoptymalizowane):
- **search_ingredients** - wyszukiwanie przez pg_trgm (fuzzy search)
- **calculate_meal_nutrition** - obliczanie makroskładnikow na backendzie
- **check_ingredient_usage** - sprawdzanie uzycia skladnika
- **update_ingredient_cached_macros** - atomowa aktualizacja makr

### Edge Functions:
- **save-dish** - atomowy zapis potrawy z JWT verification

---

## Wymagania techniczne

### Wydajnosc
- Ladowanie strony: < 3s na 3G
- Aktualizacja statusu stolu: < 500ms
- Obsluga 100 rownoczesnych uzytkownikow

### Kompatybilnosc
- Przegladarki: Chrome, Safari, Firefox, Edge (2 ostatnie wersje)
- Urzadzenia: iOS 14+, Android 10+, Desktop
- Responsywne breakpointy: 375px, 768px, 1024px, 1440px

### Bezpieczenstwo
- HTTPS everywhere
- Supabase Row Level Security (RLS) na wszystkich tabelach
- Walidacja inputow
- Rate limiting na endpointach API
- JWT authentication

### Dostepnosc
- WCAG 2.1 AA target
- Nawigacja klawiatura
- Wsparcie screen reader

---

## Ograniczenia i uwagi

### Obecny scope (produkcja):
- Pelny CRUD klientow z profilami
- Wielodniowe jadlospisy z drag & drop
- Baza skladnikow i potraw
- System szablonow
- Kalkulator kalorii (BMR/TDEE)
- Undo/redo z wersjonowaniem
- Publiczny widok jadlospisu z PDF
- Platnosci i status wspolpracy
- AI optymalizacja posilkow (Edge Function + OpenAI)

### Niezaimplementowane (przyszle wersje):
- System rezerwacji
- Platnosci online
- Powiadomienia push
- Wiele jezykow (obecnie tylko polski)
- Zaawansowana analityka
- Aplikacja mobilna natywna

### Priorytet obecny:
- **Bugfixy i stabilizacja** istniejacych funkcjonalnosci
- Poprawa UX na podstawie feedbacku uzytkownikow
- Optymalizacja wydajnosci (backend RPC - ukonczone FAZY 1-5)
