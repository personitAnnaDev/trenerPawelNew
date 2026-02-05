import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Plus, Search, User, Calendar, Target } from "lucide-react";
import { Link } from "react-router-dom";
import { getClients, Client, updateClient } from "@/utils/clientStorage";
import { useToast } from "@/hooks/use-toast";
import { logger } from '@/utils/logger';

const Klienci = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [klienci, setKlienci] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    const loadClients = async () => {
      try {
        setLoading(true);
        const clients = await getClients();
        
        // Zabezpieczenie - upewniamy się że mamy tablicę
        const clientsArray = Array.isArray(clients) ? clients : [];
        setKlienci(clientsArray);
      } catch (error) {
        logger.error('Błąd ładowania klientów:', error);
        toast({
          title: "Błąd",
          description: "Nie udało się załadować listy klientów",
          variant: "destructive"
        });
        setKlienci([]);
      } finally {
        setLoading(false);
      }
    };

    loadClients();
  }, []);

  const calculateAge = (birthDate: string): number => {
    if (!birthDate) return 0;
    const today = new Date();
    const birth = new Date(birthDate);
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    return age;
  };

  const togglePaymentStatus = async (e: React.MouseEvent, clientId: string) => {
    e.preventDefault();
    e.stopPropagation();
    
    const client = klienci.find(k => k.id === clientId);
    if (!client) return;

    const newStatus = client.statusPlatnosci === "opłacone" ? "nieopłacone" : "opłacone";
    const updatedClient = await updateClient(clientId, { statusPlatnosci: newStatus });
    
    if (updatedClient) {
      setKlienci(prevKlienci => 
        prevKlienci.map(k => k.id === clientId ? updatedClient : k)
      );
      
      toast({
        title: "Status płatności zaktualizowany",
        description: `Status zmieniony na: ${newStatus}`,
      });
    } else {
      toast({
        title: "Błąd",
        description: "Nie udało się zaktualizować statusu płatności",
        variant: "destructive"
      });
    }
  };

  // Dodatkowe zabezpieczenie - upewniamy się że klienci jest tablicą
  const safeKlienci = Array.isArray(klienci) ? klienci : [];
  
  const filteredKlienci = safeKlienci.filter((klient) =>
    `${klient.imie} ${klient.nazwisko}`.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-background p-4 md:p-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex justify-between items-center mb-8">
            <div>
              <h1 className="text-3xl font-bold text-zinc-100">Klienci</h1>
              <p className="text-zinc-400 mt-2">Zarządzaj swoimi klientami</p>
            </div>
            <Link to="/klienci/nowy">
              <Button className="bg-gradient-to-r from-[#a08032] to-[#e6d280] hover:from-[#8a6c2b] hover:to-[#d4c06b]">
                <Plus className="h-4 w-4 mr-2" />
                Dodaj Klienta
              </Button>
            </Link>
          </div>
          <Card className="bg-zinc-900 border-zinc-800">
            <CardContent className="p-12 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#a08032] mx-auto mb-4"></div>
              <p className="text-zinc-400">Ładowanie klientów...</p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4 md:p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-zinc-100">Klienci</h1>
            <p className="text-zinc-400 mt-2">Zarządzaj swoimi klientami</p>
          </div>
          <Link to="/klienci/nowy">
            <Button className="bg-gradient-to-r from-[#a08032] to-[#e6d280] hover:from-[#8a6c2b] hover:to-[#d4c06b]">
              <Plus className="h-4 w-4 mr-2" />
              Dodaj Klienta
            </Button>
          </Link>
        </div>

        {/* Wyszukiwarka */}
        <Card className="mb-6 bg-zinc-900 border-zinc-800">
          <CardContent className="p-4">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-zinc-400" />
              <Input
                placeholder="Szukaj klientów..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 bg-zinc-800 border-zinc-700 text-zinc-100 placeholder-zinc-400"
              />
            </div>
          </CardContent>
        </Card>

        {/* Lista Klientów */}
        {filteredKlienci.length === 0 ? (
          <Card className="bg-zinc-900 border-zinc-800">
            <CardContent className="p-12 text-center">
              <User className="h-12 w-12 text-zinc-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-zinc-100 mb-2">
                {searchTerm ? "Brak wyników wyszukiwania" : "Brak klientów"}
              </h3>
              <p className="text-zinc-400 mb-6">
                {searchTerm 
                  ? "Spróbuj zmienić frazy wyszukiwania" 
                  : "Dodaj swojego pierwszego klienta, aby rozpocząć planowanie jadłospisów"
                }
              </p>
              {!searchTerm && (
                <Link to="/klienci/nowy">
                  <Button className="bg-gradient-to-r from-[#a08032] to-[#e6d280] hover:from-[#8a6c2b] hover:to-[#d4c06b]">
                    <Plus className="h-4 w-4 mr-2" />
                    Dodaj Pierwszego Klienta
                  </Button>
                </Link>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:p-6">
            {filteredKlienci.map((klient) => (
              <Card key={klient.id} className="bg-zinc-900 border-zinc-800 hover:shadow-lg transition-shadow cursor-pointer" data-testid="client-card">
                <Link
                  to={`/klienci/${klient.id}`}
                  style={{ textDecoration: "none" }}
                >
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <CardTitle className="flex items-center text-zinc-100">
                        <User className="h-5 w-5 mr-2" />
                        {klient.imie} {klient.nazwisko}
                      </CardTitle>
                      {klient.statusPlatnosci && klient.statusPlatnosci !== "brak" && (
                        <Badge
                          className={`cursor-pointer transition-colors ${
                            klient.statusPlatnosci === "opłacone"
                              ? "bg-green-600 hover:bg-green-700 text-white border-transparent"
                              : "bg-red-600 hover:bg-red-700 text-white border-transparent"
                          }`}
                          onClick={async (e) => await togglePaymentStatus(e, klient.id)}
                          title="Kliknij, aby zmienić status płatności"
                        >
                          {klient.statusPlatnosci}
                        </Badge>
                      )}
                    </div>
                    <div className="space-y-1 text-sm text-muted-foreground">
                      <div className="flex items-center text-zinc-400">
                        <Calendar className="h-4 w-4 mr-1" />
                        <span>{calculateAge(klient.dataUrodzenia)} lat</span>
                      </div>
                      {klient.obecnyProces && (
                        <div className="flex items-center text-zinc-400">
                          <Target className="h-4 w-4 mr-1" />
                          <span className="capitalize">{klient.obecnyProces}</span>
                        </div>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex justify-between text-sm text-zinc-400">
                      <span>
                        {klient.wagaPoczatkowa ? `Waga początkowa: ${klient.wagaPoczatkowa} kg` : "Brak danych o wadze"}
                      </span>
                      <span className="capitalize">Status: {klient.statusWspolpracy}</span>
                    </div>
                  </CardContent>
                </Link>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Klienci;
