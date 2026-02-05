import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";

interface ClientDietSettingsProps {
  formData: {
    showMacrosInJadlospis: boolean;
  };
  onFormDataChange: (field: string, value: boolean) => void;
}

const ClientDietSettings: React.FC<ClientDietSettingsProps> = ({
  formData,
  onFormDataChange
}) => {
  const { toast } = useToast();

  const handleSwitchChange = (checked: boolean) => {
    onFormDataChange("showMacrosInJadlospis", checked);
    toast({
      title: "Ustawienia zapisane",
      description: "Zmiany w ustawieniach jadłospisu zostały zapisane.",
      variant: "success",
    });
  };

  return (
    <Card className="bg-zinc-900 border-zinc-800">
      <CardHeader>
        <CardTitle className="text-lg md:text-xl text-zinc-100">Ustawienia Jadłospisu</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label htmlFor="showMacrosInJadlospis" className="text-base text-zinc-200">
              Pokaż makroskładniki klientowi
            </Label>
            <div className="text-sm text-zinc-400">
              Gdy wyłączone, klient nie będzie widział kalorii i makroskładników w jadłospisie
            </div>
          </div>
          <Switch
            id="showMacrosInJadlospis"
            checked={formData.showMacrosInJadlospis}
            onCheckedChange={handleSwitchChange}
            className="ml-2"
          />
        </div>
      </CardContent>
    </Card>
  );
};

export default ClientDietSettings;
