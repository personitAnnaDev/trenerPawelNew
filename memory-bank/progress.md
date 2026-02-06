# Postep prac - TrenerPawel

## Ostatnia aktualizacja: 2025-02-06

---

## Co dziala (produkcja)

### Autentykacja
- [x] Rejestracja email/haslo z potwierdzeniem email
- [x] Logowanie z sesja JWT
- [x] Reset hasla przez email
- [x] Cross-tab synchronizacja sesji
- [x] Auto-logout przy wygasnieciu sesji
- [x] Protected routes

### Zarzadzanie klientami
- [x] Lista klientow z wyszukiwarka
- [x] Dodawanie klientow z walidacja
- [x] Edycja klientow z auto-save (debounce 1.5s)
- [x] Dane osobowe, dietetyczne, platnosci
- [x] Status wspolpracy i platnosci

### Jadlospis (dieta)
- [x] Wielodniowe jadlospisy
- [x] Dodawanie/edycja/usuwanie posilkow
- [x] Dodawanie skladnikow z bazy produktow
- [x] Automatyczne obliczanie makroskładnikow
- [x] Drag & drop zmiana kolejnosci posilkow
- [x] Kopiowanie/wklejanie posilkow miedzy dniami
- [x] Kopiowanie calych dni
- [x] Cel vs aktualne makra
- [x] Undo/redo (Ctrl+Z / Ctrl+Y) z snapshotami w bazie
- [x] Zapisywanie wersji z nazwami

### Kalkulator kalorii
- [x] 4-krokowy kreator (waga, BMR/TDEE, kalorie, makra)
- [x] BMR - rownanie Mifflin-St Jeor
- [x] TDEE z mnoznikiem aktywnosci
- [x] Rozklad makroskładnikow (% lub g/kg)
- [x] Zapis do client_diet_settings

### Baza potraw
- [x] Siatka potraw z obrazkami
- [x] Filtrowanie po kategorii
- [x] Wyszukiwanie po nazwie
- [x] Dodawanie/edycja/usuwanie potraw
- [x] Skladniki z makrami
- [x] Instrukcje przygotowania
- [x] Zdjecia potraw (Supabase Storage)
- [x] Zarzadzanie kategoriami

### Baza skladnikow
- [x] Tabela skladnikow z wartosciami odzywczymi
- [x] CRUD skladnikow
- [x] Wykrywanie duplikatow
- [x] Ostrzezenie przy edycji uzywanego skladnika
- [x] Atomowa aktualizacja makroskładnikow (RPC)
- [x] Loading spinner przy aktualizacji

### Szablony
- [x] Lista szablonow
- [x] Tworzenie szablonu od zera
- [x] Edytor szablonu z drag & drop
- [x] Aplikowanie szablonu do klienta

### Widok publiczny
- [x] Publiczny link z tokenem UUID
- [x] Real-time sync (polling co 15s)
- [x] Eksport PDF z wyborem dni
- [x] Opcjonalne ukrycie makroskładnikow

### Backend optymalizacje
- [x] FAZA 1: search_ingredients RPC + pg_trgm
- [x] FAZA 2: calculate_meal_nutrition RPC
- [x] FAZA 3: Edge Function save-dish
- [x] FAZA 4: check_ingredient_usage RPC
- [x] FAZA 5: update_ingredient_cached_macros RPC
- [x] Indeksy GIN i B-tree

### AI Features
- [x] AI optymalizacja posilkow (Edge Function + OpenAI)
- [x] Scenariusze: sniadanie, obiad, kolacja
- [x] Edge cases

---

## Co pozostalo do zrobienia

### Bugfixy (priorytet)
- [ ] Identyfikacja bugow z feedbacku uzytkownikow
- [ ] Naprawa zidentyfikowanych problemow
- [ ] Testy regresji po naprawach

### UX improvements
- [ ] Optymalizacja na podstawie feedbacku
- [ ] Poprawa doswiadczenia mobilnego

### Przyszle features (nie w obecnym scope)
- [ ] Zaawansowana analityka
- [ ] Raporty postepu klientow
- [ ] Rozszerzony system AI
- [ ] Integracja z platformami fitness
- [ ] Aplikacja mobilna natywna
- [ ] Platnosci online
- [ ] Marketplace szablonow
- [ ] Multi-language support

---

## Znane problemy
- Powolnosc zglaszana przez klienta - backend optymalizacje wdrozone, moze wymagac planu Pro
- Vite build: chunk size warning (react-pdf >1500kB) - nie krytyczne
- Deploy ai-macro-optimization przez MCP nie dziala (plik ~70KB za duzy) - wymaga recznego deployu

---

## Log decyzji

| Data | Decyzja | Uzasadnienie |
|------|---------|-------------|
| 2025-02-05 | Backend RPC zamiast frontend obliczen | 10-100x poprawa wydajnosci |
| 2025-02-05 | Edge Function save-dish | Atomowy zapis z JWT verification |
| 2025-02-06 | RPC check_ingredient_usage | 50-100x szybciej niz N+1 queries |
| 2025-02-06 | RPC update_ingredient_cached_macros | 252 queries → 1 |
| 2025-02-06 | Memory Bank setup | Lepsza ciaglosc miedzy sesjami Claude |
| 2026-02-06 | Dynamiczny CORS na Edge Functions | Statyczny CORS/wildcard blokowal localhost, bezpieczenstwo |
| 2026-02-06 | Regex match zamiast split dla skladnikow | Nazwy skladnikow z przecinkami byly rozbijane na osobne pozycje |
| 2026-02-06 | Rekomendacja planu Pro Supabase | Free plan niewystarczajacy dla produkcji (pauzowanie, limity) |

---

## Metryki wydajnosci (po optymalizacji)

| Operacja | Czas |
|----------|------|
| Wyszukiwanie skladnika | <5ms |
| Obliczanie makr | <10ms |
| Zapis potrawy | <100ms |
| Sprawdzenie uzycia skladnika | ~20ms |
| Aktualizacja skladnika | ~50ms |
