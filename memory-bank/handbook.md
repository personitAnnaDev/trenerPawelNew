# Memory Bank - Poradnik

## Czym jest Memory Bank?

Memory Bank to system dokumentacji projektu, ktory Claude uzywa do zrozumienia kontekstu projektu pomiedzy sesjami. Poniewaz pamiec Claude resetuje sie po kazdej sesji, Memory Bank sluzy jako jedyne zrodlo prawdy.

## Jak uzywac Memory Bank

### Na poczatku KAZDEJ sesji:
1. Przeczytaj CLAUDE.md
2. Przeczytaj WSZYSTKIE pliki z memory-bank/
3. Zrozum aktualny kontekst i priorytety
4. Dopiero potem zacznij prace

### Po KAZDEJ istotnej zmianie:
1. Zaktualizuj odpowiednie pliki w memory-bank/
2. Szczegolnie activeContext.md i progress.md
3. Upewnij sie, ze dokumentacja odzwierciedla aktualny stan

## Struktura plikow Memory Bank

### Pliki bazowe (rzadko sie zmieniaja):
- **handbook.md** - Ten plik. Instrukcje uzytkowania Memory Bank
- **projectbrief.md** - Glowny brief projektu, wymagania, scope
- **productContext.md** - Wizja produktu, kontekst rynkowy, cele UX
- **techContext.md** - Stack technologiczny, konfiguracja, narzedzia
- **systemPatterns.md** - Wzorce architektoniczne, konwencje, standardy

### Pliki aktywne (czesto sie zmieniaja):
- **activeContext.md** - Biezacy focus pracy, aktualne zadania, decyzje
- **progress.md** - Postep prac, co dziala, co pozostalo, znane problemy

### Pliki dodatkowe:
- **CHANGELOG.md** - Historia zmian w projekcie
- **BACKEND_OPTIMIZATION_PLAN.md** - Plan optymalizacji backendu

## Zasady aktualizacji

1. **Nigdy nie usuwaj informacji** - tylko aktualizuj lub oznacz jako przestarzale
2. **Datuj wazne zmiany** - dodawaj daty przy istotnych aktualizacjach
3. **Badz zwiezly** - dokumentuj esencje, nie kazdy szczegol
4. **Linkuj do plikow** - zamiast kopiowac kod, linkuj do zrodel
5. **Priorytetyzuj** - najwazniejsze informacje na gorze plikow

## Workflow aktualizacji

```
Poczatek sesji
    |
    v
Przeczytaj CLAUDE.md + memory-bank/
    |
    v
Zrozum kontekst i priorytety
    |
    v
Wykonaj prace
    |
    v
Zaktualizuj activeContext.md + progress.md
    |
    v
Zaktualizuj inne pliki jesli potrzeba
```
