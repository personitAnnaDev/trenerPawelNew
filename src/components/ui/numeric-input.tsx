import { useState, useEffect, useRef, forwardRef } from "react";
import { Input } from "@/components/ui/input";

interface NumericInputProps {
  id?: string;
  name?: string;
  value: number;
  onChange: (value: number) => void;
  onBlur?: () => void;
  placeholder?: string;
  type?: 'integer' | 'decimal';
  disabled?: boolean;
  className?: string;
  onFocus?: (e: React.FocusEvent<HTMLInputElement>) => void;
  showPlaceholderForZero?: boolean; // Dla nowych składników pokazuj placeholder zamiast 0
}

/**
 * NumericInput - Inteligentny komponent do wprowadzania liczb
 *
 * Rozwiązuje problemy:
 * - Bug #18: Backspace nie działa przy usuwaniu 0,1
 * - Bug #20: Nie można wpisać 0 (zmienia się na 0,1)
 *
 * Cechy:
 * - Lokalny stan tekstowy - widzisz dokładnie to co piszesz (nawet "0," czy "6,5")
 * - Polski przecinek pozostaje widoczny podczas wpisywania
 * - Zamiana przecinka na kropkę dopiero w onBlur (przed parsowaniem)
 * - Finalizacja wartości dopiero w onBlur
 * - Obsługa zarówno integer jak i decimal
 */
const NumericInput = forwardRef<HTMLInputElement, NumericInputProps>(
  (
    {
      id,
      name,
      value,
      onChange,
      onBlur,
      placeholder,
      type = 'decimal',
      disabled = false,
      className,
      onFocus,
      showPlaceholderForZero = false,
    },
    ref
  ) => {
    // Lokalny stan tekstowy - pozwala na swobodne wpisywanie
    const [localValue, setLocalValue] = useState<string>('');
    // Flaga czy input ma focus - nie aktualizuj wartości podczas edycji
    const hasFocus = useRef(false);

    // Synchronizacja z zewnętrzną wartością
    useEffect(() => {
      // NIE aktualizuj gdy użytkownik edytuje pole
      if (hasFocus.current) {
        return;
      }

      // Aktualizuj wyświetlaną wartość z polskim przecinkiem
      if (value === 0 && showPlaceholderForZero) {
        setLocalValue('');
      } else if (value !== undefined && value !== null) {
        setLocalValue(value.toString().replace('.', ','));
      }
    }, [value, showPlaceholderForZero]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const text = e.target.value;

      // NIE zamieniaj przecinka tutaj - niech użytkownik widzi to co wpisuje!
      // Zamiana nastąpi dopiero w handleBlur

      // Walidacja formatu w zależności od typu
      if (type === 'integer') {
        // Tylko cyfry
        if (text === '' || /^\d+$/.test(text)) {
          setLocalValue(text);
        }
      } else {
        // Cyfry z przecinkiem LUB kropką (decimal) - akceptuj oba!
        if (text === '' || /^\d*[,.]?\d*$/.test(text)) {
          setLocalValue(text);
        }
      }
    };

    const handleBlur = () => {
      // Oznacz że pole nie ma już focusa
      hasFocus.current = false;

      // Jeśli użytkownik wyczyścił pole, finalna wartość to 0.
      if (localValue.trim() === '') {
        onChange(0);

        // Zdecyduj, czy pokazać placeholder (dla nowych) czy '0' (dla edytowanych).
        if (showPlaceholderForZero) {
          setLocalValue(''); // Zostaw puste, by pokazać placeholder.
        } else {
          setLocalValue('0'); // Pokaż '0' w edytowanym polu.
        }

        onBlur?.();
        return; // Zakończ funkcję w tym miejscu.
      }

      // Poniższa logika jest dla pól, które NIE są puste.
      const textForParsing = localValue.replace(',', '.');
      let parsed: number;

      // Specjalna obsługa dla samego przecinka/kropki
      if (textForParsing === '.' || textForParsing === ',') {
        parsed = 0;
      } else {
        parsed = type === 'integer'
          ? parseInt(textForParsing)
          : parseFloat(textForParsing);
      }

      if (isNaN(parsed)) {
        parsed = 0;
      }

      // 🎯 FIX Issue #19: Zaokrąglij do 2 miejsc po przecinku, eliminując błędy floating point (150 → 149.9)
      const rounded = Math.round(parsed * 100) / 100;

      // Zaktualizuj formularz poprawną wartością liczbową.
      onChange(rounded);

      // Zaktualizuj wyświetlaną wartość, formatując ją z przecinkiem.
      setLocalValue(rounded.toString().replace('.', ','));

      onBlur?.();
    };

    const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
      // Oznacz że pole ma focus - nie aktualizuj wartości z zewnątrz
      hasFocus.current = true;
      e.target.select();
      onFocus?.(e);
    };

    return (
      <Input
        ref={ref}
        id={id}
        name={name}
        type="text"
        inputMode={type === 'integer' ? 'numeric' : 'decimal'}
        value={localValue}
        onChange={handleChange}
        onBlur={handleBlur}
        onFocus={handleFocus}
        onWheel={(e) => {
          // 🎯 FIX Issue #19: Zapobiegnij przypadkowej zmianie wartości podczas scrollowania myszką
          e.currentTarget.blur();
        }}
        onKeyDown={(e) => {
          // 🎯 FIX Issue #19: Zapobiegnij przypadkowej zmianie wartości strzałkami góra/dół
          if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
            e.preventDefault();
          }
        }}
        placeholder={placeholder}
        disabled={disabled}
        className={className}
      />
    );
  }
);

NumericInput.displayName = "NumericInput";

export { NumericInput };
