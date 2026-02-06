# Kontekst produktu - TrenerPawel

## Dlaczego ten projekt istnieje

### Problem rynkowy
Trenerzy personalni i dietetycy w Polsce obsluguja od kilku do kilkudziesieciu klientow jednoczesnie. Kazdy klient wymaga indywidualnego jadlospisu dopasowanego do jego celow (redukcja, budowa masy, przygotowanie do zawodow), ograniczen (alergie, preferencje) i parametrow (waga, wzrost, poziom aktywnosci).

### Obecne rozwiazania i ich wady

#### Arkusze kalkulacyjne (Excel/Google Sheets)
- Brak automatycznego obliczania makroskładnikow przy zmianach skladnikow
- Trudne udostepnianie klientom w czytelnej formie
- Brak wersjonowania - latwo nadpisac wczesniejsze wersje
- Nie responsywne na urzadzeniach mobilnych

#### Ogolne aplikacje dietetyczne (MyFitnessPal, Fitatu)
- Zaprojektowane dla uzytkownikow koncowych, nie dla trenerow
- Brak zarzadzania wieloma klientami
- Brak systemu szablonow wielokrotnego uzytku
- Brak integracji z platnosciami i statusem wspolpracy

#### Notatki / dokumenty Word
- Brak automatyzacji obliczen
- Trudna aktualizacja i synchronizacja
- Brak real-time dostepnosci dla klienta

### Wartosc TrenerPawel
TrenerPawel eliminuje te problemy oferujac:
1. **Automatyczne obliczenia** - zmiana skladnika natychmiast przelicza makra we wszystkich potrawach i dietach
2. **Jeden klik udostepnianie** - klient otrzymuje link i widzi aktualny jadlospis
3. **System szablonow** - raz stworzona dieta moze byc bazowa dla wielu klientow
4. **Wersjonowanie** - pelna historia zmian z undo/redo
5. **Kalkulator kalorii** - zintegrowany kreator BMR/TDEE/makroskładnikow

---

## Kontekst rynkowy

### Segment docelowy
- Trenerzy personalni w Polsce (B2C SaaS)
- Dietetycy prowadzacy praktykę prywatna
- Studia fitness z dzialem dietetycznym

### Krajobraz konkurencyjny
- **Fitatu Pro** - popularna, ale ograniczona w funkcjach dla trenerow
- **Dietly** - platforma marketplace, nie narzedzie do zarzadzania
- **Arkusze Google** - "konkurent" nr 1 - darmowy, ale nieefektywny
- **Dedykowane systemy kliniczne** - za drogie i skomplikowane dla indywidualnych trenerow

### Przewaga konkurencyjna TrenerPawel
- Zaprojektowany specjalnie pod workflow trenera personalnego
- Polski interfejs dopasowany do lokalnego rynku
- Szybki, zoptymalizowany backend (RPC functions < 50ms)
- Prosty, intuicyjny interfejs bez zbednych funkcji
- Real-time synchronizacja miedzy trenerem a klientem

---

## Cele doswiadczenia uzytkownika (UX)

### Zasady projektowe
1. **Szybkosc ponad wszystko** - kazda akcja powinna byc natychmiastowa
2. **Minimalizm** - pokaz tylko to co potrzebne w danym momencie
3. **Odwracalnosc** - uzytkownik nie powinien sie bac eksperymentowac (undo/redo)
4. **Mobilnosc** - trener czesto pracuje na telefonie lub tablecie
5. **Polskosc** - caly interfejs po polsku, polskie jednostki, polskie formatowanie

### Kluczowe metryki UX
- Czas stworzenia jadlospisu od zera: < 15 minut
- Czas dodania posilku ze skladnikami: < 1 minuta
- Czas od otwarcia klienta do pracy z jego dieta: < 3 sekundy
- Wskaznik bledu (nieprzewidziane crashe): < 0.1%

### Zasady feedbacku
- Toast notifications dla kazdej CRUD operacji
- Loading spinnery przy operacjach asynchronicznych
- Skeleton loadery przy ladowaniu danych
- Modalne potwierdzenia przed destrukcyjnymi akcjami
- Ostrzezenia przy opuszczaniu strony z niezapisanymi zmianami

---

## Metryki sukcesu

### Techniczne
- Czas ladowania strony: < 2s na 4G
- Czas odpowiedzi API (RPC): < 50ms
- Dostepnosc: 99.9% uptime
- Brak bledow krytycznych w error_logs

### Biznesowe (do zmierzenia)
- Liczba aktywnych trenerow
- Liczba klientow per trener
- Czestotliwosc tworzenia jadlospisow
- Retencja uzytkownikow (miesieczna)
- Czas spedzony w aplikacji per sesja

### UX
- Brak skarg na powolnosc
- Niski wskaznik porzucenia formularzy
- Wysokie wykorzystanie funkcji szablonow
- Regularne korzystanie z kalkulatora kalorii

---

## Wizja produktu

### Krotkoterminowa (obecna faza)
- Stabilizacja i bugfixy
- Poprawa UX na podstawie feedbacku
- Optymalizacja wydajnosci (ukonczone FAZY 1-5 backend RPC)

### Srednioterminowa
- Zaawansowana analityka dla trenerow
- Lepsze raportowanie postepu klientow
- Rozszerzony system AI do optymalizacji posilkow
- Integracja z popularnymi platformami fitness

### Dlugoterminowa
- Aplikacja mobilna natywna
- System rezerwacji treningow
- Platnosci online i automatyczne fakturowanie
- Marketplace szablonow diet miedzy trenerami
- Wiele jezykow (angielski, niemiecki)

---

## Kluczowe decyzje produktowe

### Dlaczego Supabase?
- Szybki start (auth, storage, realtime out of the box)
- PostgreSQL = pelna moc SQL + RPC
- Row Level Security = bezpieczenstwo na poziomie bazy
- Darmowy tier wystarczajacy na start
- Edge Functions dla logiki serwerowej

### Dlaczego React + Vite?
- Popularnosc = latwiejsze znalezienie deweloperow
- Vite = szybki development experience
- shadcn/ui = gotowe, piekne komponenty
- TypeScript = mniej blebow, lepsza dokumentacja

### Dlaczego publiczny link zamiast logowania klientow?
- Prostota - klient nie musi pamietac hasla
- Szybki dostep - jeden klik
- Bezpieczenstwo - token UUID jest wystarczajacy
- Niski prog wejscia dla klientow o niskim komforcie technicznym
