import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, ChefHat, Calendar, Database } from "lucide-react";
import { Link } from "react-router-dom";
import { getClients } from "@/utils/clientStorage";

const Dashboard = () => {
  const [clientCount, setClientCount] = useState(0);

  useEffect(() => {
    const updateClientCount = () => {
      const clients = getClients();
      setClientCount(clients.length);
    };

    updateClientCount();
    const interval = setInterval(updateClientCount, 1000);
    return () => clearInterval(interval);
  }, []);

  const stats = [
    { title: "Aktywni Klienci", value: clientCount.toString(), icon: Users, color: "brand-text-primary" },
    { title: "Potrawy", value: "0", icon: ChefHat, color: "brand-text-primary" },
    { title: "Jadłospisy", value: "0", icon: Calendar, color: "brand-text-primary" },
    { title: "Produkty", value: "0", icon: Database, color: "brand-text-primary" },
  ];

  const quickActions = [
    { title: "Dodaj Nowego Klienta", description: "Utwórz profil dla nowego klienta", href: "/klienci/nowy", color: "bg-zinc-900 hover:bg-zinc-800 border-2 border-zinc-800" },
    { title: "Utwórz Jadłospis", description: "Zaprojektuj nowy jadłospis", href: "/jadlospisy/nowy", color: "bg-zinc-900 hover:bg-zinc-800 border-2 border-zinc-800" },
    { title: "Dodaj Potrawę", description: "Rozszerz bazę potraw", href: "/potrawy/nowa", color: "bg-zinc-900 hover:bg-zinc-800 border-2 border-zinc-800" },
    { title: "Zarządzaj Produktami", description: "Aktualizuj bazę składników", href: "/produkty", color: "bg-zinc-900 hover:bg-zinc-800 border-2 border-zinc-800" },
  ];

  return (
    <div className="min-h-screen bg-background p-4 md:p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-zinc-100">Panel Główny</h1>
          <p className="text-zinc-400 mt-2">Zarządzaj jadłospisami swoich klientów</p>
        </div>

        {/* Statystyki */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {stats.map((stat, index) => (
            <Card key={index} className="bg-zinc-900 border-zinc-800">
              <CardContent className="p-4 md:p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-zinc-400">{stat.title}</p>
                    <p className="text-3xl font-bold text-zinc-100">{stat.value}</p>
                  </div>
                  <stat.icon className={`h-8 w-8 ${stat.color}`} />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Szybkie Akcje */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-zinc-100 mb-4">Szybkie Akcje</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {quickActions.map((action, index) => (
              <Link key={index} to={action.href}>
                <Card className={`${action.color} transition-colors cursor-pointer`}>
                  <CardHeader>
                    <CardTitle className="text-lg text-zinc-100">{action.title}</CardTitle>
                    <CardDescription className="text-zinc-400">{action.description}</CardDescription>
                  </CardHeader>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
