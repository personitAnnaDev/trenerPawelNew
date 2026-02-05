import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

interface ClientBasicInfoProps {
  formData: {
    imie: string;
    nazwisko: string;
    dataUrodzenia: string;
    plec: string;
    statusWspolpracy: string;
    rodzajWspolpracy: string;
    statusPlatnosci: string;
    paymentDate?: string | null;
    paymentExpiresAt?: string | null;
  };
  onFormDataChange: (field: string, value: string | null) => void;
  onImmediateSave: (updates: Record<string, string | null>) => Promise<void>;
}

const ClientBasicInfo: React.FC<ClientBasicInfoProps> = ({
  formData,
  onFormDataChange,
  onImmediateSave
}) => {
  const { toast } = useToast();

  // Stan do przechowywania daty w formacie DD.MM.YYYY (do wyświetlania)
  const [displayDate, setDisplayDate] = useState('');
  const [validationError, setValidationError] = useState('');

  // Stany dla pól dat płatności
  const [paymentDate, setPaymentDate] = useState('');
  const [paymentExpiresAt, setPaymentExpiresAt] = useState('');
  const [paymentDateErrors, setPaymentDateErrors] = useState<{paymentDate?: string, expiresAt?: string}>({});

  // Konwertuj datę z formatu ISO (YYYY-MM-DD) na DD.MM.YYYY przy załadowaniu danych
  useEffect(() => {
    if (formData.dataUrodzenia) {
      const isoDate = formData.dataUrodzenia;
      const dateRegex = /^(\d{4})-(\d{2})-(\d{2})$/;
      const match = isoDate.match(dateRegex);
      
      if (match) {
        const [, year, month, day] = match;
        setDisplayDate(`${day}.${month}.${year}`);
      } else {
        setDisplayDate(formData.dataUrodzenia);
      }
    } else {
      setDisplayDate('');
    }
  }, [formData.dataUrodzenia]);

  // Inicjalizacja pól dat płatności z istniejących danych
  useEffect(() => {
    // Enhanced null handling - sprawdzaj czy wartość istnieje i nie jest pustym stringiem
    if (formData.paymentDate && formData.paymentDate.trim() !== '') {
      const isoDate = formData.paymentDate;
      const dateRegex = /^(\d{4})-(\d{2})-(\d{2})$/;
      const match = isoDate.match(dateRegex);

      if (match) {
        const [, year, month, day] = match;
        setPaymentDate(`${day}.${month}.${year}`);
      } else {
        setPaymentDate(formData.paymentDate);
      }
    } else {
      setPaymentDate('');
    }
  }, [formData.paymentDate]);

  useEffect(() => {
    // Enhanced null handling - sprawdzaj czy wartość istnieje i nie jest pustym stringiem
    if (formData.paymentExpiresAt && formData.paymentExpiresAt.trim() !== '') {
      const isoDate = formData.paymentExpiresAt;
      const dateRegex = /^(\d{4})-(\d{2})-(\d{2})$/;
      const match = isoDate.match(dateRegex);

      if (match) {
        const [, year, month, day] = match;
        setPaymentExpiresAt(`${day}.${month}.${year}`);
      } else {
        setPaymentExpiresAt(formData.paymentExpiresAt);
      }
    } else {
      setPaymentExpiresAt('');
    }
  }, [formData.paymentExpiresAt]);

  // Funkcja walidacji daty
  const validateDate = useCallback((value: string) => {
    if (!value) {
      setValidationError('');
      return true;
    }

    // Sprawdź format DD.MM.YYYY
    const dateRegex = /^(\d{2})\.(\d{2})\.(\d{4})$/;
    const match = value.match(dateRegex);
    
    if (!match) {
      setValidationError('Nieprawidłowy format daty. Użyj DD.MM.YYYY');
      return false;
    }

    const [, day, month, year] = match;
    const dayNum = parseInt(day, 10);
    const monthNum = parseInt(month, 10);
    const yearNum = parseInt(year, 10);
    
    // Sprawdź podstawową poprawność daty
    if (dayNum < 1 || dayNum > 31 || monthNum < 1 || monthNum > 12) {
      setValidationError('Nieprawidłowa data');
      return false;
    }

    // Konwertuj do formatu ISO (YYYY-MM-DD) dla konstruktora Date
    const isoDate = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
    const birthDate = new Date(isoDate);
    
    // Sprawdź czy data jest rzeczywista (np. 31 lutego zostanie zamienione na inną datę)
    if (birthDate.getDate() !== dayNum || 
        birthDate.getMonth() + 1 !== monthNum || 
        birthDate.getFullYear() !== yearNum) {
      setValidationError('Nieprawidłowa data');
      return false;
    }

    const today = new Date();
    const age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    const actualAge = monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate()) ? age - 1 : age;
    
    if (actualAge < 13) {
      setValidationError('Klient musi mieć co najmniej 13 lat');
      return false;
    } else if (actualAge > 120) {
      setValidationError('Nieprawidłowy wiek (maksymalnie 120 lat)');
      return false;
    }

    setValidationError('');
    return true;
  }, []);

  // Walidacja dat płatności
  const validatePaymentDates = useCallback((paymentDateVal: string, expiresAtVal: string) => {
    const errors: {paymentDate?: string, expiresAt?: string} = {};
    const dateRegex = /^(\d{2})\.(\d{2})\.(\d{4})$/;
    
    // Walidacja formatu daty płatności
    if (paymentDateVal && !dateRegex.test(paymentDateVal)) {
      errors.paymentDate = "Format daty: DD.MM.YYYY";
    }
    
    // Walidacja formatu daty ważności
    if (expiresAtVal && !dateRegex.test(expiresAtVal)) {
      errors.expiresAt = "Format daty: DD.MM.YYYY";
    }
    
    if (paymentDateVal && expiresAtVal && dateRegex.test(paymentDateVal) && dateRegex.test(expiresAtVal)) {
      // Konwersja do obiektów Date dla porównania
      const paymentMatch = paymentDateVal.match(dateRegex);
      const expiresMatch = expiresAtVal.match(dateRegex);
      
      if (paymentMatch && expiresMatch) {
        // Tworzenie dat w lokalnej strefie czasowej (uniknięcie problemów UTC)
        const paymentDateObj = new Date(
          parseInt(paymentMatch[3]), 
          parseInt(paymentMatch[2]) - 1, 
          parseInt(paymentMatch[1])
        );
        const expiresAtObj = new Date(
          parseInt(expiresMatch[3]), 
          parseInt(expiresMatch[2]) - 1, 
          parseInt(expiresMatch[1])
        );
        // Data ważności musi być po dacie płatności
        if (expiresAtObj <= paymentDateObj) {
          errors.expiresAt = "Data ważności musi być późniejsza niż data płatności";
        }
      }
    }
    
    return errors;
  }, []);

  // Konwersja DD.MM.YYYY → YYYY-MM-DD (dla bazy danych)
  const convertDateToISO = useCallback((dateStr: string): string => {
    const match = dateStr.match(/^(\d{2})\.(\d{2})\.(\d{4})$/);
    if (!match) return '';
    const [, day, month, year] = match;
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  }, []);

  // Funkcja sprawdzająca datę ważności i zwracająca odpowiedni status płatności
  const checkAndUpdatePaymentStatus = useCallback((expiresAt: string | null | undefined): string | null => {
    if (!expiresAt || expiresAt.trim() === '') {
      return null; // Brak daty - nie zmieniaj statusu
    }

    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    return expiresAt < today ? 'nieopłacone' : 'opłacone';
  }, []);

  const handleInputChange = (field: string, value: string) => {
    onFormDataChange(field, value);
  };

  // Obsługa zmiany statusu płatności
  const handlePaymentStatusChange = (value: string) => {
    handleInputChange("statusPlatnosci", value);
    // Usunięto automatyczne kasowanie dat - daty są zachowywane niezależnie od statusu
  };

  // Obsługa zmiany statusu współpracy
  const handleCooperationStatusChange = async (value: string) => {
    if (value === "zakończona") {
      // Wyczyść wszystkie pola płatności natychmiastowo
      setPaymentDate("");
      setPaymentExpiresAt("");

      // Zapisz wszystkie zmiany naraz do bazy (natychmiastowy zapis bez debounce)
      await onImmediateSave({
        statusWspolpracy: value,
        statusPlatnosci: "brak",
        paymentDate: null,
        paymentExpiresAt: null
      });
    } else if (value === "w trakcie") {
      // Automatycznie ustaw status płatności na podstawie daty ważności
      const newPaymentStatus = checkAndUpdatePaymentStatus(formData.paymentExpiresAt);

      if (newPaymentStatus) {
        // Jeśli istnieje data ważności - zapisz od razu ze statusem
        await onImmediateSave({
          statusWspolpracy: value,
          statusPlatnosci: newPaymentStatus
        });

        toast({
          title: `Status: ${newPaymentStatus}`,
          description: `Status płatności ustawiony automatycznie na podstawie daty ważności`,
        });
      } else {
        // Brak daty ważności - tylko zmień status współpracy
        handleInputChange("statusWspolpracy", value);
      }
    } else {
      // "przerwa" - nie zmieniaj pól płatności
      handleInputChange("statusWspolpracy", value);
    }
  };

  // Obsługa zmian dat płatności
  const handlePaymentDateChange = (value: string) => {
    setPaymentDate(value);
    
    // Walidacja i zapis do formData
    const errors = validatePaymentDates(value, paymentExpiresAt);
    setPaymentDateErrors(errors);
    
    if (value && !errors.paymentDate) {
      onFormDataChange('paymentDate', convertDateToISO(value));
    } else if (!value) {
      onFormDataChange('paymentDate', null);
    }
  };

  const handlePaymentExpiresAtChange = async (value: string) => {
    setPaymentExpiresAt(value);

    // Walidacja
    const errors = validatePaymentDates(paymentDate, value);
    setPaymentDateErrors(errors);

    if (value && !errors.expiresAt) {
      const isoDate = convertDateToISO(value);
      const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD

      // 🎯 Określ nowy status płatności na podstawie daty ważności
      const newPaymentStatus = isoDate < today ? 'nieopłacone' : 'opłacone';

      // 🎯 Określ czy zmienić status współpracy na "w trakcie"
      const shouldChangeCooperationStatus =
        newPaymentStatus === 'opłacone' &&
        formData.statusWspolpracy !== 'w trakcie';

      // Przygotuj zmiany do natychmiastowego zapisu
      const updates: Record<string, string | null> = {
        paymentExpiresAt: isoDate,
        statusPlatnosci: newPaymentStatus
      };

      // Dodaj zmianę statusu współpracy jeśli potrzebna
      if (shouldChangeCooperationStatus) {
        updates.statusWspolpracy = 'w trakcie';
      }

      // Natychmiastowy zapis wszystkich zmian
      await onImmediateSave(updates);

      // Toast informujący o zmianach
      if (shouldChangeCooperationStatus) {
        toast({
          title: "Automatyczna aktualizacja",
          description: `Status płatności: ${newPaymentStatus}, Status współpracy: w trakcie`,
        });
      } else {
        toast({
          title: `Status: ${newPaymentStatus}`,
          description: `Status płatności ustawiony automatycznie na podstawie daty ważności`,
        });
      }
    } else if (!value) {
      onFormDataChange('paymentExpiresAt', null);
    }
  };

  const handleDateChange = (value: string) => {
    setDisplayDate(value);
    
    if (validateDate(value) && value) {
      // Konwertuj DD.MM.YYYY na YYYY-MM-DD dla bazy danych
      const dateRegex = /^(\d{2})\.(\d{2})\.(\d{4})$/;
      const match = value.match(dateRegex);
      if (match) {
        const [, day, month, year] = match;
        const isoDate = `${year}-${month}-${day}`;
        onFormDataChange('dataUrodzenia', isoDate);
      }
    } else if (!value) {
      onFormDataChange('dataUrodzenia', '');
    }
  };

  return (
    <Card className="bg-zinc-900 border-zinc-800">
      <CardHeader>
        <CardTitle className="text-lg md:text-xl text-zinc-100">Dane Podstawowe</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="imie" className="text-sm font-medium text-zinc-200">Imię</Label>
            <Input
              id="imie"
              value={formData.imie || ''}
              onChange={(e) => handleInputChange("imie", e.target.value)}
              placeholder="Wprowadź imię"
              className="bg-zinc-800 border-zinc-700 text-zinc-100 focus:border-[#a08032]"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="nazwisko" className="text-sm font-medium text-zinc-200">Nazwisko</Label>
            <Input
              id="nazwisko"
              value={formData.nazwisko || ''}
              onChange={(e) => handleInputChange("nazwisko", e.target.value)}
              placeholder="Wprowadź nazwisko"
              className="bg-zinc-800 border-zinc-700 text-zinc-100 focus:border-[#a08032]"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label htmlFor="dataUrodzenia" className="text-sm font-medium text-zinc-200">Data Urodzenia</Label>
            <Input
              id="dataUrodzenia"
              type="text"
              value={displayDate}
              onChange={(e) => handleDateChange(e.target.value)}
              placeholder="DD.MM.YYYY (np. 15.05.1990)"
              className={cn(
                "bg-zinc-800 border-zinc-700 text-zinc-100 hover:bg-zinc-700 hover:border-zinc-600",
                validationError ? "border-red-500 focus:border-red-500 focus:ring-red-500/20" : "focus:border-[#a08032] focus:ring-[#a08032]/20"
              )}
            />
            {validationError && (
              <p className="text-red-400 text-sm mt-1 flex items-center gap-1">{validationError}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="plec" className="text-sm font-medium text-zinc-200">Płeć</Label>
            <Select value={formData.plec || ''} onValueChange={(value) => handleInputChange("plec", value)}>
              <SelectTrigger id="plec" className="bg-zinc-800 border-zinc-700 text-zinc-100 hover:bg-zinc-700 hover:border-zinc-600 data-[placeholder]:text-zinc-400">
                <SelectValue placeholder="Wybierz płeć" />
              </SelectTrigger>
              <SelectContent className="bg-zinc-900 border-zinc-700">
                <SelectItem value="kobieta" className="text-zinc-100 hover:bg-zinc-800 focus:bg-zinc-800">Kobieta</SelectItem>
                <SelectItem value="mężczyzna" className="text-zinc-100 hover:bg-zinc-800 focus:bg-zinc-800">Mężczyzna</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="statusWspolpracy" className="text-sm font-medium text-zinc-200">Status Współpracy</Label>
            <Select value={formData.statusWspolpracy || ''} onValueChange={handleCooperationStatusChange}>
              <SelectTrigger id="statusWspolpracy" className="bg-zinc-800 border-zinc-700 text-zinc-100 hover:bg-zinc-700 hover:border-zinc-600 data-[placeholder]:text-zinc-400">
                <SelectValue placeholder="Wybierz status" />
              </SelectTrigger>
              <SelectContent className="bg-zinc-900 border-zinc-700">
                <SelectItem value="w trakcie" className="text-zinc-100 hover:bg-zinc-800 focus:bg-zinc-800">W trakcie</SelectItem>
                <SelectItem value="zakończona" className="text-zinc-100 hover:bg-zinc-800 focus:bg-zinc-800">Zakończona</SelectItem>
                <SelectItem value="przerwa" className="text-zinc-100 hover:bg-zinc-800 focus:bg-zinc-800">Przerwa</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="rodzajWspolpracy" className="text-sm font-medium text-zinc-200">Rodzaj współpracy</Label>
            <Input
              id="rodzajWspolpracy"
              value={formData.rodzajWspolpracy || ''}
              onChange={(e) => handleInputChange("rodzajWspolpracy", e.target.value)}
              placeholder="np. raport 2 tygodnie, raport 1 tydzień, konsultacja..."
              className="bg-zinc-800 border-zinc-700 text-zinc-100 focus:border-[#a08032]"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="statusPlatnosci" className="text-sm font-medium text-zinc-200">Status płatności</Label>
            <Select value={formData.statusPlatnosci || ''} onValueChange={handlePaymentStatusChange}>
              <SelectTrigger id="statusPlatnosci" className="bg-zinc-800 border-zinc-700 text-zinc-100 hover:bg-zinc-700 hover:border-zinc-600 data-[placeholder]:text-zinc-400">
                <SelectValue placeholder="Wybierz status płatności" />
              </SelectTrigger>
              <SelectContent className="bg-zinc-900 border-zinc-700">
                <SelectItem value="brak" className="text-zinc-100 hover:bg-zinc-800 focus:bg-zinc-800">Brak (nie dotyczy)</SelectItem>
                <SelectItem value="opłacone" className="text-zinc-100 hover:bg-zinc-800 focus:bg-zinc-800">Opłacone</SelectItem>
                <SelectItem value="nieopłacone" className="text-zinc-100 hover:bg-zinc-800 focus:bg-zinc-800">Nieopłacone</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Pola dat płatności - zawsze widoczne */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="paymentDate" className="text-sm font-medium text-zinc-200">
                Data płatności
              </Label>
              <Input
                type="text"
                id="paymentDate"
                value={paymentDate}
                onChange={(e) => handlePaymentDateChange(e.target.value)}
                placeholder="DD.MM.YYYY (np. 15.01.2025)"
                className={cn(
                  "bg-zinc-800 border-zinc-700 text-zinc-100 hover:bg-zinc-700 hover:border-zinc-600",
                  paymentDateErrors.paymentDate ? "border-red-500 focus:border-red-500 focus:ring-red-500/20" : "focus:border-[#a08032] focus:ring-[#a08032]/20"
                )}
              />
              {paymentDateErrors.paymentDate && (
                <p className="text-red-400 text-xs mt-1">{paymentDateErrors.paymentDate}</p>
              )}
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="paymentExpiresAt" className="text-sm font-medium text-zinc-200">
                Data ważności płatności
              </Label>
              <Input
                type="text"
                id="paymentExpiresAt"
                value={paymentExpiresAt}
                onChange={(e) => handlePaymentExpiresAtChange(e.target.value)}
                placeholder="DD.MM.YYYY (np. 15.01.2025)"
                className={cn(
                  "bg-zinc-800 border-zinc-700 text-zinc-100 hover:bg-zinc-700 hover:border-zinc-600",
                  paymentDateErrors.expiresAt ? "border-red-500 focus:border-red-500 focus:ring-red-500/20" : "focus:border-[#a08032] focus:ring-[#a08032]/20"
                )}
              />
              {paymentDateErrors.expiresAt && (
                <p className="text-red-400 text-xs mt-1">{paymentDateErrors.expiresAt}</p>
              )}
            </div>
          </div>
      </CardContent>
    </Card>
  );
};

export default ClientBasicInfo;
