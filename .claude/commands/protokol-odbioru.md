# Protokół Odbioru Command

Automatyczne generowanie protokołów odbioru w formacie PDF poprzez screenshotowanie aplikacji.

**Supports arguments:** `--help`, `-h`, `help`, `--dry-run`, `--output <path>`

**Arguments:** `$ARGUMENTS`

---

## Help (--help | -h | help)

If `$ARGUMENTS` contains `--help`, `-h`, or `help`, display this and stop:

```
┌─────────────────────────────────────────────────────────────────────┐
│  📸 /protokol-odbioru - Protokół Odbioru Command                    │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  CO ROBI:                                                           │
│  Automatycznie generuje protokół odbioru w PDF:                     │
│  • Analizuje scope projektu z dokumentacji                          │
│  • Nawiguje po aplikacji używając Chrome                            │
│  • Wykonuje screenshoty każdej funkcjonalności                      │
│  • Generuje minimalistyczny PDF w języku polskim                    │
│                                                                     │
│  UŻYCIE:                                                            │
│  /protokol-odbioru              Pełne generowanie protokołu         │
│  /protokol-odbioru --dry-run    Podgląd bez tworzenia plików        │
│  /protokol-odbioru --output ./  Własna lokalizacja wyjściowa        │
│  /protokol-odbioru --help       Pokaż tę pomoc                      │
│                                                                     │
│  WYMAGANIA:                                                         │
│  • Uruchomiona aplikacja (npm run dev)                              │
│  • Chrome z rozszerzeniem Claude                                    │
│  • Dokumentacja scope (memory-bank/ lub .spec-workflow/)            │
│                                                                     │
│  GENERUJE:                                                          │
│  • protokol-odbioru-YYYYMMDD.pdf                                    │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

**STOP execution after displaying help.**

---

## Step 1: Analiza Scope

Przeszukaj dokumentację projektu w poszukiwaniu listy funkcjonalności:

### Lokalizacje do sprawdzenia:
1. `memory-bank/projectbrief.md` - sekcja Features/Funkcjonalności
2. `memory-bank/productContext.md` - sekcja User Flows
3. `.spec-workflow/specs/*/requirements.md` - wymagania
4. `README.md` - opis projektu

### Ekstrakcja danych:

Dla każdej funkcjonalności wyodrębnij:
- **Nazwa**: Krótka nazwa funkcjonalności
- **Opis**: Opis w języku polskim
- **Ścieżka**: URL/route do nawigacji (np. `/dashboard`, `/settings`)

```
ANALIZA SCOPE
══════════════════════════════════════════════════════════════════════

Znaleziono dokumentację w: [lokalizacja]

Funkcjonalności do udokumentowania:
┌────┬─────────────────────────┬────────────────────┐
│ #  │ Nazwa                   │ Ścieżka            │
├────┼─────────────────────────┼────────────────────┤
│ 1  │ [nazwa]                 │ [route]            │
│ 2  │ [nazwa]                 │ [route]            │
│ ...│ ...                     │ ...                │
└────┴─────────────────────────┴────────────────────┘

Razem: [X] funkcjonalności
```

### Jeśli nie znaleziono scope:

Zapytaj użytkownika o listę funkcjonalności:
- Nazwa każdej funkcjonalności
- Ścieżka URL do nawigacji

---

## Step 2: Wykrycie URL aplikacji

Sprawdź gdzie działa aplikacja:

1. Sprawdź `package.json` scripts - szukaj `dev` z portem
2. Domyślnie próbuj: `http://localhost:5173` (Vite) lub `http://localhost:3000`
3. Zapytaj użytkownika jeśli niestandardowy port

```
URL APLIKACJI
══════════════════════════════════════════════════════════════════════

Wykryto konfigurację: [Vite/CRA/Next.js]
Prawdopodobny URL: http://localhost:[port]

Czy to poprawny adres? [Tak / Podaj inny]
```

---

## Step 3: Przygotowanie Chrome

Użyj Claude Chrome MCP do przygotowania przeglądarki:

1. Pobierz kontekst tabów: `mcp__claude-in-chrome__tabs_context_mcp`
2. Utwórz nowy tab: `mcp__claude-in-chrome__tabs_create_mcp`
3. Nawiguj do URL bazowego: `mcp__claude-in-chrome__navigate`

```
PRZYGOTOWANIE PRZEGLĄDARKI
══════════════════════════════════════════════════════════════════════

[✓] Połączono z Chrome
[✓] Utworzono nowy tab
[✓] Nawigacja do: http://localhost:[port]
[✓] Strona załadowana

Rozpoczynam dokumentowanie funkcjonalności...
```

---

## Step 4: Screenshoty funkcjonalności

Dla każdej funkcjonalności ze scope:

### 4.1 Nawigacja
```
mcp__claude-in-chrome__navigate → [URL + route]
```

### 4.2 Oczekiwanie na załadowanie
```
mcp__claude-in-chrome__computer → action: wait, duration: 2
```

### 4.3 Screenshot
```
mcp__claude-in-chrome__computer → action: screenshot
```

### 4.4 Postęp
```
DOKUMENTOWANIE FUNKCJONALNOŚCI
══════════════════════════════════════════════════════════════════════

[1/X] Strona główna ........................ ✓
[2/X] Dashboard ............................ ✓
[3/X] Ustawienia ........................... ⏳
[4/X] Profil użytkownika ................... ○
```

### Obsługa błędów nawigacji:
- Jeśli strona nie istnieje → zaloguj ostrzeżenie, kontynuuj
- Jeśli timeout → próbuj ponownie raz, potem pomiń
- Jeśli wymaga logowania → poinformuj użytkownika

---

## Step 5: Generowanie PDF

Utwórz minimalistyczny PDF protokołu:

### Struktura dokumentu:

**Strona 1 - Tytuła:**
```
═══════════════════════════════════════════════════
              PROTOKÓŁ ODBIORU

              [Nazwa Projektu]

              Data: [YYYY-MM-DD]
═══════════════════════════════════════════════════
```

**Strony 2-N - Funkcjonalności:**
```
───────────────────────────────────────────────────
[Numer]. [Nazwa funkcjonalności]
───────────────────────────────────────────────────

[Screenshot]

Opis: [Opis funkcjonalności]
Ścieżka: [URL]
Status: Zaimplementowano ✓
───────────────────────────────────────────────────
```

### Generowanie:

Użyj dostępnych narzędzi do tworzenia PDF lub poinformuj użytkownika o potrzebie instalacji:

```bash
npm install jspdf
```

Alternatywnie, wygeneruj HTML który użytkownik może wydrukować do PDF.

---

## Step 6: Zapisz i podsumuj

```
PROTOKÓŁ ODBIORU - UKOŃCZONO
══════════════════════════════════════════════════════════════════════

📄 Plik: protokol-odbioru-[YYYYMMDD].pdf
📍 Lokalizacja: [ścieżka]
📊 Rozmiar: [X] KB

───────────────────────────────────────────────────────────────────────

PODSUMOWANIE
───────────────────────────────────────────────────────────────────────
Funkcjonalności udokumentowane: [X]
Screenshoty wykonane: [X]
Pominięte (błędy): [X]

───────────────────────────────────────────────────────────────────────

NASTĘPNE KROKI
───────────────────────────────────────────────────────────────────────
1. Przejrzyj wygenerowany PDF
2. Wyślij do klienta/odbiorcy
3. Uzyskaj podpis akceptacji

───────────────────────────────────────────────────────────────────────
```

---

## Dry Run Mode

Jeśli `$ARGUMENTS` zawiera `--dry-run`:

- Wykonaj analizę scope
- Wyświetl plan nawigacji
- NIE wykonuj screenshotów
- NIE generuj PDF

```
DRY RUN - PODGLĄD
══════════════════════════════════════════════════════════════════════

WYKONAŁBYM:
├── Nawigacja do http://localhost:5173
├── Screenshot: Strona główna (/)
├── Screenshot: Dashboard (/dashboard)
├── Screenshot: Ustawienia (/settings)
└── Generowanie: protokol-odbioru-20240126.pdf

Uruchom bez --dry-run aby wykonać.
```

---

## Uwagi

- Upewnij się że aplikacja działa przed uruchomieniem
- Dla aplikacji z autoryzacją, najpierw zaloguj się ręcznie
- Screenshoty są robione w aktualnym stanie aplikacji
- PDF jest w języku polskim
