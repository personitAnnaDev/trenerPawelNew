import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

interface ClientAdditionalInfoProps {
  formData: {
    produktyNielubiane: string;
    alergieZywieniowe: string;
    problemyZdrowotne: string;
    notatkiOgolne: string;
  };
  onFormDataChange: (field: string, value: string) => void;
}

const ClientAdditionalInfo: React.FC<ClientAdditionalInfoProps> = ({
  formData,
  onFormDataChange
}) => {
  return (
    <Card className="bg-zinc-900 border-zinc-800">
      <CardHeader>
        <CardTitle className="text-lg md:text-xl text-zinc-100">Informacje Dodatkowe</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="produktyNielubiane" className="text-sm font-medium text-zinc-200">
            Produkty nielubiane
          </Label>
          <Textarea
            id="produktyNielubiane"
            value={formData.produktyNielubiane}
            onChange={e => onFormDataChange('produktyNielubiane', e.target.value)}
            placeholder="Wymień produkty, których klient nie lubi..."
            rows={3}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="alergieZywieniowe" className="text-sm font-medium text-zinc-200">
            Alergie żywieniowe
          </Label>
          <Textarea
            id="alergieZywieniowe"
            value={formData.alergieZywieniowe}
            onChange={e => onFormDataChange('alergieZywieniowe', e.target.value)}
            placeholder="Opisz alergie i nietolerancje żywieniowe..."
            rows={3}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="problemyZdrowotne" className="text-sm font-medium text-zinc-200">
            Problemy zdrowotne
          </Label>
          <Textarea
            id="problemyZdrowotne"
            value={formData.problemyZdrowotne}
            onChange={e => onFormDataChange('problemyZdrowotne', e.target.value)}
            placeholder="Opisz problemy zdrowotne wpływające na dietę..."
            rows={3}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="notatkiOgolne" className="text-sm font-medium text-zinc-200">
            Notatki ogólne
          </Label>
          <Textarea
            id="notatkiOgolne"
            value={formData.notatkiOgolne}
            onChange={e => onFormDataChange('notatkiOgolne', e.target.value)}
            placeholder="Dodatkowe notatki o kliencie..."
            rows={3}
          />
        </div>
      </CardContent>
    </Card>
  );
};

export default ClientAdditionalInfo;
