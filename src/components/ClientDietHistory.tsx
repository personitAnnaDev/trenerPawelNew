import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { History, Calendar, RotateCcw } from "lucide-react";

interface ClientDietHistoryProps {
  clientId: string;
}

interface DietVersion {
  id: string;
  timestamp: string;
  date: string;
  proces: string;
  kcal: number;
  macro: string;
  isCurrent: boolean;
}

const ClientDietHistory: React.FC<ClientDietHistoryProps> = ({ clientId }) => {
  // Mock data - in real app this would come from props or API
  const dietVersions: DietVersion[] = [
    {
      id: "version-2",
      timestamp: "10.01.2024 09:15",
      date: "10 stycznia 2024",
      proces: "Budowanie",
      kcal: 2800,
      macro: "P: 180g, T: 85g, W: 350g",
      isCurrent: false
    },
    {
      id: "version-1",
      timestamp: "01.10.2023 16:45",
      date: "1 października 2023",
      proces: "Prep",
      kcal: 1800,
      macro: "P: 150g, T: 40g, W: 200g",
      isCurrent: false
    }
  ];

  const handleRestoreVersion = (versionId: string) => {
    // Implementation for restoring a diet version
  };

  return (
    <div className="space-y-6">
      {/* Version History - Now the main content */}
      <Card className="bg-zinc-900 border-zinc-800">
        <CardHeader>
          <CardTitle className="text-lg md:text-xl flex items-center text-zinc-100">
            <History className="h-5 w-5 mr-2" />
            Historia wersji jadłospisów
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {dietVersions.map((version) => (
              <div
                key={version.id}
                className="flex items-center justify-between p-4 border border-zinc-700 rounded-lg hover:bg-zinc-800 transition-colors"
              >
                <div className="flex items-center gap-4">
                  <div className="flex items-center text-zinc-400">
                    <Calendar className="h-4 w-4 mr-2" />
                    <span className="text-sm">{version.timestamp}</span>
                  </div>
                  <div className="flex items-center gap-4 text-sm">
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                      version.proces === 'Redukcja' ? 'bg-red-800 text-red-200' :
                      version.proces === 'Budowanie' ? 'bg-blue-800 text-blue-200' :
                      'bg-purple-800 text-purple-200'
                    }`}>
                      {version.proces}
                    </span>
                    <span className="text-zinc-300">{version.kcal} kcal</span>
                    <span className="text-zinc-300 hidden md:inline">{version.macro}</span>
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleRestoreVersion(version.id)}
                  className="flex items-center gap-2 bg-zinc-800 border-zinc-700 text-zinc-100 hover:bg-zinc-700"
                >
                  <RotateCcw className="h-4 w-4" />
                  Przywróć
                </Button>
              </div>
            ))}
            {dietVersions.length === 0 && (
              <div className="text-center py-8 text-zinc-400">
                <History className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>Brak wcześniejszych wersji jadłospisu</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ClientDietHistory;
