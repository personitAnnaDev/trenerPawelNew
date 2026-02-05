import { useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NumericInput } from "@/components/ui/numeric-input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { ArrowLeft, Save } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { saveClient } from "@/utils/clientStorage";
import { format } from "date-fns";
import { pl } from "date-fns/locale";
import { errorLogger } from "@/services/errorLoggingService";
import { cn } from "@/lib/utils";
import { logger } from '@/utils/logger';

const NowyKlient = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [formData, setFormData] = useState({
    imie: "",
    nazwisko: "",
    dataUrodzenia: "",
    plec: "",
    wagaPoczatkowa: 0,
    wzrost: 0,
    notatkiOgolne: "",
    wazneInformacje: `- Nie używasz cukru, ew. Słodzik
- Nie pijemy napojów, soków itp. z cukrem! Jak już to zero i w minimalnej ilości (napoje nie nawadniają!)
- Nie spożywamy żadnych odżywek białkowych poza tych w diecie.
- Solisz normalnie, solą himalajską
- Gramatura produktów podana jest przed obróbka termiczną
- Posiłki przygotowujesz w dowolny sposób bez dodatku tłuszczu(grillowanie, pieczenie, gotowanie, smażone) - NIE SMAŻYMY NA OLIWIE JEŚLI JEST W DIECIE, polewamy nią posiłek!
- Jeśli w przepisie występuje produkt którego nie ma w składnikach wypisanych w ,,posiłek", proszę nie stosować lub w niewielkiej ilości ;)
- Aby uzyskać np:mąkę owsianą, żytnią itp. wystarczy zblendować płatki.
Dodatkowe produkty które można urozmaicać w niewielkich ilościach (WSZYSTKO Z GŁOWĄ ;)), które możesz stosować w niewielkiej ilości (im, mniej tym lepiej) dla poprawy smaku i urozmaicenia:
- Sosy zero.
- Keczup bez cukru ,,Develey" lub ,,Roleski" (max 50g)
- Barszcz czerwony/biały, żurek, ,,Winiary" z torebki (max 200 g, nie przekraczać jednej torebki dziennie)
- Koncentrat (łyżka max) i przecier pomidorowy.
Tipy:
- Jeżeli bardzo doskwiera głód polecam zwiększyć sobie ilość warzyw w posiłku do 250g na posiłek (nawet w posiłkach gdzie ich nie ma)
- Gdy jest mega parcie na słodkie polecam dżemy 0 kcal. Bierzemy sobie małą łyżkę i takiego dżemu do 50g możemy sobie spożyć (wszystko w minimalnej ilości! Jedząc go 5x na dzień/tydzień w ten sposób dostarczymy już ponad dobre 300kcal)`,
    obecnyProces: "",
    statusWspolpracy: "w trakcie",
    produktyNielubiane: "",
    alergieZywieniowe: "",
    problemyZdrowotne: "",
    showMacrosInJadlospis: true,
    rodzajWspolpracy: "",
    statusPlatnosci: "",
    paymentDate: "",
    paymentExpiresAt: ""
  });

  // Stany dla pól dat płatności
  const [paymentDate, setPaymentDate] = useState('');
  const [paymentExpiresAt, setPaymentExpiresAt] = useState('');
  const [paymentDateErrors, setPaymentDateErrors] = useState<{paymentDate?: string, expiresAt?: string}>({});

  
  // Stany walidacji
  const [validationErrors, setValidationErrors] = useState({
    imie: "",
    nazwisko: "",
    dataUrodzenia: "",
    plec: ""
  });
  
  const [touchedFields, setTouchedFields] = useState({
    imie: false,
    nazwisko: false,
    dataUrodzenia: false,
    plec: false
  });
  
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Funkcja walidacji pojedynczego pola
  const validateField = useCallback((fieldName: string, value: string) => {
    let error = "";
    
    switch(fieldName) {
      case "imie":
        if (!value.trim()) {
          error = "Imię jest wymagane";
        } else if (value.trim().length < 2) {
          error = "Imię musi mieć co najmniej 2 znaki";
        } else if (value.trim().length > 50) {
          error = "Imię może mieć maksymalnie 50 znaków";
        }
        break;
      case "nazwisko":
        if (!value.trim()) {
          error = "Nazwisko jest wymagane";
        } else if (value.trim().length < 2) {
          error = "Nazwisko musi mieć co najmniej 2 znaki";
        } else if (value.trim().length > 50) {
          error = "Nazwisko może mieć maksymalnie 50 znaków";
        }
        break;
      case "dataUrodzenia":
        if (!value) {
          error = "Data urodzenia jest wymagana";
        } else {
          // Sprawdź format DD.MM.YYYY
          const dateRegex = /^(\d{2})\.(\d{2})\.(\d{4})$/;
          const match = value.match(dateRegex);
          
          if (!match) {
            error = "Nieprawidłowy format daty. Użyj DD.MM.YYYY";
          } else {
            const [, day, month, year] = match;
            const dayNum = parseInt(day, 10);
            const monthNum = parseInt(month, 10);
            const yearNum = parseInt(year, 10);
            
            // Sprawdź podstawową poprawność daty
            if (dayNum < 1 || dayNum > 31 || monthNum < 1 || monthNum > 12) {
              error = "Nieprawidłowa data";
            } else {
              // Konwertuj do formatu ISO (YYYY-MM-DD) dla konstruktora Date
              const isoDate = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
              const birthDate = new Date(isoDate);
              
              // Sprawdź czy data jest rzeczywista (np. 31 lutego zostanie zamienione na inną datę)
              if (birthDate.getDate() !== dayNum || 
                  birthDate.getMonth() + 1 !== monthNum || 
                  birthDate.getFullYear() !== yearNum) {
                error = "Nieprawidłowa data";
              } else {
                const today = new Date();
                const age = today.getFullYear() - birthDate.getFullYear();
                const monthDiff = today.getMonth() - birthDate.getMonth();
                const actualAge = monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate()) ? age - 1 : age;
                
                if (actualAge < 13) {
                  error = "Klient musi mieć co najmniej 13 lat";
                } else if (actualAge > 120) {
                  error = "Nieprawidłowy wiek (maksymalnie 120 lat)";
                }
              }
            }
          }
        }
        break;
      case "plec":
        if (!value) {
          error = "Płeć jest wymagana";
        }
        break;
    }
    
    setValidationErrors(prev => ({...prev, [fieldName]: error}));
    return error === "";
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

  // Funkcja pomocnicza do określenia stylu pola input
  const getInputClassName = (fieldName: string) => {
    const hasError = validationErrors[fieldName as keyof typeof validationErrors] && touchedFields[fieldName as keyof typeof touchedFields];
    return cn(
      "bg-zinc-800 border-zinc-700 text-zinc-100 hover:bg-zinc-700 hover:border-zinc-600",
      hasError ? "border-red-500 focus:border-red-500 focus:ring-red-500/20" : "focus:border-[#a08032] focus:ring-[#a08032]/20"
    );
  };

  // Funkcja pomocnicza do określenia stylu pola select
  const getSelectClassName = (fieldName: string) => {
    const hasError = validationErrors[fieldName as keyof typeof validationErrors] && touchedFields[fieldName as keyof typeof touchedFields];
    return cn(
      "bg-zinc-800 border-zinc-700 text-zinc-100 hover:bg-zinc-700 hover:border-zinc-600 data-[placeholder]:text-zinc-400",
      hasError ? "border-red-500" : ""
    );
  };

  // Komponent dla komunikatów błędów
  const FieldError = ({ error }: { error: string }) => {
    if (!error) return null;
    return <p className="text-red-400 text-sm mt-1 flex items-center gap-1">{error}</p>;
  };

  const handleInputChange = (field: string, value: string | number | boolean) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));

    // Waliduj tylko pola wymagane i tylko jeśli zostały już "dotknięte" lub mają wartość
    if (["imie", "nazwisko", "dataUrodzenia", "plec"].includes(field)) {
      const stringValue = typeof value === 'string' ? value : '';

      // Oznacz pole jako "touched" jeśli ma wartość lub było już edytowane
      if (stringValue !== "" || touchedFields[field as keyof typeof touchedFields]) {
        setTouchedFields(prev => ({...prev, [field]: true}));
        validateField(field, stringValue);
      }
    }
  };

  // Obsługa zmiany statusu płatności
  const handlePaymentStatusChange = (value: string) => {
    handleInputChange("statusPlatnosci", value);
    
    if (value === "nieopłacone") {
      setPaymentDate('');
      setPaymentExpiresAt('');
      handleInputChange('paymentDate', '');
      handleInputChange('paymentExpiresAt', '');
    }
  };

  // Obsługa zmian dat płatności
  const handlePaymentDateChange = (value: string) => {
    setPaymentDate(value);
    
    // Walidacja i zapis do formData
    const errors = validatePaymentDates(value, paymentExpiresAt);
    setPaymentDateErrors(errors);
    
    if (value && !errors.paymentDate) {
      handleInputChange('paymentDate', convertDateToISO(value));
    } else if (!value) {
      handleInputChange('paymentDate', '');
    }
  };

  const handlePaymentExpiresAtChange = (value: string) => {
    setPaymentExpiresAt(value);
    
    // Walidacja i zapis do formData
    const errors = validatePaymentDates(paymentDate, value);
    setPaymentDateErrors(errors);
    
    if (value && !errors.expiresAt) {
      handleInputChange('paymentExpiresAt', convertDateToISO(value));
    } else if (!value) {
      handleInputChange('paymentExpiresAt', '');
    }
  };


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    // Oznacz wszystkie wymagane pola jako "touched" PRZED walidacją
    setTouchedFields({
      imie: true,
      nazwisko: true,
      dataUrodzenia: true,
      plec: true
    });

    // 🔧 FIX: Synchronous validation - wywołaj validateField i zbierz błędy bezpośrednio
    const errors = {
      imie: "",
      nazwisko: "",
      dataUrodzenia: "",
      plec: ""
    };

    // Waliduj każde pole i zbierz błędy synchronicznie
    if (!formData.imie.trim()) {
      errors.imie = "Imię jest wymagane";
    } else if (formData.imie.trim().length < 2) {
      errors.imie = "Imię musi mieć co najmniej 2 znaki";
    } else if (formData.imie.trim().length > 50) {
      errors.imie = "Imię może mieć maksymalnie 50 znaków";
    }

    if (!formData.nazwisko.trim()) {
      errors.nazwisko = "Nazwisko jest wymagane";
    } else if (formData.nazwisko.trim().length < 2) {
      errors.nazwisko = "Nazwisko musi mieć co najmniej 2 znaki";
    } else if (formData.nazwisko.trim().length > 50) {
      errors.nazwisko = "Nazwisko może mieć maksymalnie 50 znaków";
    }

    if (!formData.dataUrodzenia) {
      errors.dataUrodzenia = "Data urodzenia jest wymagana";
    } else {
      const dateRegex = /^(\d{2})\.(\d{2})\.(\d{4})$/;
      const match = formData.dataUrodzenia.match(dateRegex);
      if (!match) {
        errors.dataUrodzenia = "Nieprawidłowy format daty. Użyj DD.MM.YYYY";
      } else {
        const [, day, month, year] = match;
        const dayNum = parseInt(day, 10);
        const monthNum = parseInt(month, 10);
        const yearNum = parseInt(year, 10);
        if (dayNum < 1 || dayNum > 31 || monthNum < 1 || monthNum > 12) {
          errors.dataUrodzenia = "Nieprawidłowa data";
        } else {
          const isoDate = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
          const birthDate = new Date(isoDate);
          if (birthDate.getDate() !== dayNum ||
              birthDate.getMonth() + 1 !== monthNum ||
              birthDate.getFullYear() !== yearNum) {
            errors.dataUrodzenia = "Nieprawidłowa data";
          } else {
            const today = new Date();
            const age = today.getFullYear() - birthDate.getFullYear();
            const monthDiff = today.getMonth() - birthDate.getMonth();
            const actualAge = monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate()) ? age - 1 : age;
            if (actualAge < 13) {
              errors.dataUrodzenia = "Klient musi mieć co najmniej 13 lat";
            } else if (actualAge > 120) {
              errors.dataUrodzenia = "Nieprawidłowy wiek (maksymalnie 120 lat)";
            }
          }
        }
      }
    }

    if (!formData.plec) {
      errors.plec = "Płeć jest wymagana";
    }

    // Zaktualizuj stan walidacji dla UI
    setValidationErrors(errors);

    // Sprawdź czy są błędy
    const hasErrors = Object.values(errors).some(error => error !== "");
    if (hasErrors) {
      const errorFields = Object.entries(errors)
        .filter(([_, error]) => error !== "")
        .map(([field, _]) => {
          switch(field) {
            case "imie": return "imię";
            case "nazwisko": return "nazwisko";
            case "dataUrodzenia": return "data urodzenia";
            case "plec": return "płeć";
            default: return field;
          }
        });

      toast({
        title: "Błąd walidacji",
        description: `Pole wymagane: ${errorFields.join(", ")}`,
        variant: "destructive"
      });
      setIsSubmitting(false);
      return;
    }

    // Walidacja dat płatności jeśli status to "opłacone"
    if (formData.statusPlatnosci === "opłacone") {
      const paymentErrors = validatePaymentDates(paymentDate, paymentExpiresAt);
      if (Object.keys(paymentErrors).length > 0) {
        setPaymentDateErrors(paymentErrors);
        toast({
          title: "Błąd walidacji dat płatności",
          description: "Proszę poprawić błędy w polach dat płatności",
          variant: "destructive"
        });
        setIsSubmitting(false);
        return;
      }
      
      // Data ważności jest opcjonalna - nie wymuszamy wypełnienia
    }

    try {
      // Konwertuj datę z formatu DD.MM.YYYY na YYYY-MM-DD dla Supabase
      const dataToSave = { ...formData };
      if (formData.dataUrodzenia) {
        const dateRegex = /^(\d{2})\.(\d{2})\.(\d{4})$/;
        const match = formData.dataUrodzenia.match(dateRegex);
        if (match) {
          const [, day, month, year] = match;
          dataToSave.dataUrodzenia = `${year}-${month}-${day}`;
        }
      }

      // Konwersja dat płatności
      if (formData.statusPlatnosci === "opłacone") {
        dataToSave.paymentDate = paymentDate ? convertDateToISO(paymentDate) : null;
        dataToSave.paymentExpiresAt = paymentExpiresAt ? convertDateToISO(paymentExpiresAt) : null;
      } else {
        dataToSave.paymentDate = null;
        dataToSave.paymentExpiresAt = null;
      }

      const savedClient = await saveClient(dataToSave as any);

      if (savedClient) {
        // Użyj funkcji z clientStorage.ts zamiast niedziałających fetch calls
        try {
          const { addDayPlanAndSettings, createDietSnapshot } = await import("@/utils/clientStorage");
          await addDayPlanAndSettings(savedClient.id, "Dzień 1");

          // 🎯 CREATE INITIAL SNAPSHOT: Create initial snapshot for the new client
          await createDietSnapshot(savedClient.id, {
            trigger_type: 'client_created',
            trigger_description: 'Snapshot początkowy - nowy klient z jednym dniem',
            version_name: `Wersja początkowa - ${new Date().toLocaleDateString('pl-PL')}`
          });
        } catch (err) {
          logger.error('Błąd podczas tworzenia domyślnego planu diety lub snapshotu:', err);
          // Nie przerywaj procesu - klient został zapisany pomyślnie
        }

        toast({
          title: "Sukces!",
          description: `Klient ${formData.imie} ${formData.nazwisko} został dodany pomyślnie`,
          variant: "default"
        });
        navigate("/klienci");
      } else {
        toast({
          title: "Błąd",
          description: "Nie udało się zapisać klienta w bazie danych",
          variant: "destructive"
        });
      }
    } catch (error) {
      logger.error('Błąd podczas zapisywania:', error);

      // Log error to database
      errorLogger.logDatabaseError({
        message: error instanceof Error ? error.message : 'Błąd zapisywania klienta',
        component: 'NowyKlient',
        error: error,
        severity: 'error'
      }).catch(err => logger.warn('Failed to log client save error:', err));

      toast({
        title: "Błąd",
        description: "Wystąpił błąd podczas zapisywania klienta. Spróbuj ponownie.",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background p-4 md:p-6">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center mb-6">
          <Link to="/klienci">
            <Button variant="ghost" className="mr-4">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Powrót
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-foreground">Nowy Klient</h1>
            <p className="text-muted-foreground mt-1">Dodaj nowego klienta do swojej bazy</p>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="space-y-6">
            {/* Dane Podstawowe */}
            <Card className="bg-card border-border">
              <CardHeader>
                <CardTitle className="text-card-foreground">Dane Podstawowe</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="imie">Imię *</Label>
                    <Input
                      id="imie"
                      value={formData.imie}
                      onChange={(e) => handleInputChange("imie", e.target.value)}
                      onBlur={() => {
                        if (!touchedFields.imie && formData.imie !== "") {
                          setTouchedFields(prev => ({...prev, imie: true}));
                          validateField("imie", formData.imie);
                        }
                      }}
                      placeholder="Wprowadź imię"
                      className={getInputClassName("imie")}
                      required
                    />
                    <FieldError error={touchedFields.imie ? validationErrors.imie : ""} />
                  </div>
                  <div>
                    <Label htmlFor="nazwisko">Nazwisko *</Label>
                    <Input
                      id="nazwisko"
                      value={formData.nazwisko}
                      onChange={(e) => handleInputChange("nazwisko", e.target.value)}
                      onBlur={() => {
                        if (!touchedFields.nazwisko && formData.nazwisko !== "") {
                          setTouchedFields(prev => ({...prev, nazwisko: true}));
                          validateField("nazwisko", formData.nazwisko);
                        }
                      }}
                      placeholder="Wprowadź nazwisko"
                      className={getInputClassName("nazwisko")}
                      required
                    />
                    <FieldError error={touchedFields.nazwisko ? validationErrors.nazwisko : ""} />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="dataUrodzenia">Data Urodzenia *</Label>
                    <Input
                      id="dataUrodzenia"
                      type="text"
                      value={formData.dataUrodzenia}
                      onChange={(e) => handleInputChange("dataUrodzenia", e.target.value)}
                      onBlur={() => {
                        if (!touchedFields.dataUrodzenia && formData.dataUrodzenia !== "") {
                          setTouchedFields(prev => ({...prev, dataUrodzenia: true}));
                          validateField("dataUrodzenia", formData.dataUrodzenia);
                        }
                      }}
                      placeholder="DD.MM.YYYY (np. 15.05.1990)"
                      className={getInputClassName("dataUrodzenia")}
                      required
                    />
                    <FieldError error={touchedFields.dataUrodzenia ? validationErrors.dataUrodzenia : ""} />
                  </div>
                  <div>
                    <Label htmlFor="plec">Płeć *</Label>
                    <Select value={formData.plec} onValueChange={(value) => handleInputChange("plec", value)}>
                      <SelectTrigger id="plec" className={getSelectClassName("plec")}>
                        <SelectValue placeholder="Wybierz płeć" />
                      </SelectTrigger>
                      <SelectContent className="bg-zinc-900 border-zinc-700">
                        <SelectItem value="kobieta" className="text-zinc-100 hover:bg-zinc-800 focus:bg-zinc-800">Kobieta</SelectItem>
                        <SelectItem value="mężczyzna" className="text-zinc-100 hover:bg-zinc-800 focus:bg-zinc-800">Mężczyzna</SelectItem>
                      </SelectContent>
                    </Select>
                    <FieldError error={touchedFields.plec ? validationErrors.plec : ""} />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="obecnyProces">Obecny Proces</Label>
                    <Input
                      id="obecnyProces"
                      value={formData.obecnyProces}
                      onChange={(e) => handleInputChange("obecnyProces", e.target.value)}
                      placeholder="np. redukcja, budowanie, prep, rekomposition..."
                      className="bg-zinc-800 border-zinc-700 text-zinc-100 hover:bg-zinc-700 hover:border-zinc-600 focus:border-[#a08032] focus:ring-[#a08032]/20"
                    />
                  </div>
                  <div>
                    <Label htmlFor="statusWspolpracy">Status Współpracy</Label>
                    <Select value={formData.statusWspolpracy} onValueChange={(value) => handleInputChange("statusWspolpracy", value)}>
                      <SelectTrigger id="statusWspolpracy" className="bg-zinc-800 border-zinc-700 text-zinc-100 hover:bg-zinc-700 hover:border-zinc-600 data-[placeholder]:text-zinc-400">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-zinc-900 border-zinc-700">
                        <SelectItem value="w trakcie" className="text-zinc-100 hover:bg-zinc-800 focus:bg-zinc-800">W trakcie</SelectItem>
                        <SelectItem value="zakończona" className="text-zinc-100 hover:bg-zinc-800 focus:bg-zinc-800">Zakończona</SelectItem>
                        <SelectItem value="przerwa" className="text-zinc-100 hover:bg-zinc-800 focus:bg-zinc-800">Przerwa</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="rodzajWspolpracy">Rodzaj współpracy</Label>
                    <Input
                      id="rodzajWspolpracy"
                      value={formData.rodzajWspolpracy}
                      onChange={(e) => handleInputChange("rodzajWspolpracy", e.target.value)}
                      placeholder="np. raport 2 tygodnie, raport 1 tydzień, konsultacja..."
                      className="bg-zinc-800 border-zinc-700 text-zinc-100 hover:bg-zinc-700 hover:border-zinc-600 focus:border-[#a08032] focus:ring-[#a08032]/20"
                    />
                  </div>
                  <div>
                    <Label htmlFor="statusPlatnosci">Status płatności</Label>
                    <Select value={formData.statusPlatnosci} onValueChange={handlePaymentStatusChange}>
                      <SelectTrigger id="statusPlatnosci" className="bg-zinc-800 border-zinc-700 text-zinc-100 hover:bg-zinc-700 hover:border-zinc-600 data-[placeholder]:text-zinc-400">
                        <SelectValue placeholder="Wybierz status płatności" />
                      </SelectTrigger>
                      <SelectContent className="bg-zinc-900 border-zinc-700">
                        <SelectItem value="opłacone" className="text-zinc-100 hover:bg-zinc-800 focus:bg-zinc-800">opłacone</SelectItem>
                        <SelectItem value="nieopłacone" className="text-zinc-100 hover:bg-zinc-800 focus:bg-zinc-800">nieopłacone</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Pola dat płatności - wyświetlane gdy status "opłacone" lub gdy istnieją daty */}
                {(formData.statusPlatnosci === "opłacone" || formData.paymentDate || formData.paymentExpiresAt) && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="paymentDate">Data płatności</Label>
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
                    
                    <div>
                      <Label htmlFor="paymentExpiresAt">Data ważności płatności</Label>
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
                )}
              </CardContent>
            </Card>

            {/* Parametry Fizyczne */}
            <Card className="bg-card border-border">
              <CardHeader>
                <CardTitle className="text-card-foreground">Parametry Fizyczne</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="wagaPoczatkowa">Waga Początkowa (kg)</Label>
                    <NumericInput
                      id="wagaPoczatkowa"
                      name="wagaPoczatkowa"
                      type="decimal"
                      value={formData.wagaPoczatkowa}
                      onChange={(value) => handleInputChange("wagaPoczatkowa", value)}
                      placeholder="np. 70,5"
                      className="bg-zinc-800 border-zinc-700 text-zinc-100 hover:bg-zinc-700 hover:border-zinc-600 focus:border-[#a08032] focus:ring-[#a08032]/20"
                      showPlaceholderForZero={true}
                    />
                  </div>
                  <div>
                    <Label htmlFor="wzrost">Wzrost (cm)</Label>
                    <NumericInput
                      id="wzrost"
                      name="wzrost"
                      type="decimal"
                      value={formData.wzrost}
                      onChange={(value) => handleInputChange("wzrost", value)}
                      placeholder="np. 175"
                      className="bg-zinc-800 border-zinc-700 text-zinc-100 hover:bg-zinc-700 hover:border-zinc-600 focus:border-[#a08032] focus:ring-[#a08032]/20"
                      showPlaceholderForZero={true}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-card border-border">
              <CardHeader>
                <CardTitle className="text-card-foreground">Ustawienia Jadłospisu</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="showMacrosInJadlospis" className="text-base">
                      Pokaż makroskładniki klientowi
                    </Label>
                    <div className="text-sm text-gray-500">
                      Gdy wyłączone, klient nie będzie widział kalorii i makroskładników w jadłospisie
                    </div>
                  </div>
                  <Switch
                    id="showMacrosInJadlospis"
                    checked={formData.showMacrosInJadlospis}
                    onCheckedChange={(checked) => handleInputChange("showMacrosInJadlospis", checked)}
                  />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-card border-border">
              <CardHeader>
                <CardTitle className="text-card-foreground">Informacje Dodatkowe</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="produktyNielubiane">Lista produktów których nie lubi jeść</Label>
                  <Textarea
                    id="produktyNielubiane"
                    value={formData.produktyNielubiane}
                    onChange={(e) => handleInputChange("produktyNielubiane", e.target.value)}
                    placeholder="np. brokuły, ryż brązowy, twaróg..."
                    rows={3}
                  />
                </div>

                <div>
                  <Label htmlFor="alergieZywieniowe">Alergie żywieniowe</Label>
                  <Textarea
                    id="alergieZywieniowe"
                    value={formData.alergieZywieniowe}
                    onChange={(e) => handleInputChange("alergieZywieniowe", e.target.value)}
                    placeholder="np. orzechy, gluten, laktoza..."
                    rows={3}
                  />
                </div>

                <div>
                  <Label htmlFor="problemyZdrowotne">Problemy ze zdrowiem (przebyte i obecne)</Label>
                  <Textarea
                    id="problemyZdrowotne"
                    value={formData.problemyZdrowotne}
                    onChange={(e) => handleInputChange("problemyZdrowotne", e.target.value)}
                    placeholder="np. insulinooporność, niedoczynność tarczycy, nadciśnienie..."
                    rows={3}
                  />
                </div>

                <div>
                  <Label htmlFor="notatkiOgolne">Notatki ogólne</Label>
                  <Textarea
                    id="notatkiOgolne"
                    value={formData.notatkiOgolne}
                    onChange={(e) => handleInputChange("notatkiOgolne", e.target.value)}
                    placeholder="Dodatkowe informacje o kliencie..."
                    rows={4}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Przyciski */}
            <div className="flex justify-end space-x-4">
              <Link to="/klienci">
                <Button variant="outline" disabled={isSubmitting}>Anuluj</Button>
              </Link>
              <Button 
                type="submit" 
                className="bg-primary hover:bg-primary/90 text-primary-foreground"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Zapisywanie...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Zapisz Klienta
                  </>
                )}
              </Button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default NowyKlient;
