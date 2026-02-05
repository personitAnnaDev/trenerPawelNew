import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { NumericInput } from "@/components/ui/numeric-input";

interface ClientPhysicalParamsProps {
  formData: {
    wagaPoczatkowa: number;
    wzrost: number;
    obecnyProces: string;
  };
  onFormDataChange: (field: string, value: number | string) => void;
  heightInputRef?: React.RefObject<HTMLDivElement>;
  highlightHeight?: boolean;
  onHeightFocus?: () => void;
}

const ClientPhysicalParams: React.FC<ClientPhysicalParamsProps> = ({
  formData,
  onFormDataChange,
  heightInputRef,
  highlightHeight = false,
  onHeightFocus
}) => {
  return (
    <Card className="bg-zinc-900 border-zinc-800">
      <CardHeader>
        <CardTitle className="text-lg md:text-xl text-zinc-100">Parametry Fizyczne</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label htmlFor="wagaPoczatkowa" className="text-sm font-medium text-zinc-200">Waga początkowa (kg)</Label>
            <NumericInput
              id="wagaPoczatkowa"
              type="decimal"
              value={formData.wagaPoczatkowa || 0}
              onChange={(value) => onFormDataChange("wagaPoczatkowa", value)}
              placeholder="np. 70,5"
              className="bg-zinc-800 border-zinc-700 text-zinc-100 focus:border-[#a08032]"
              showPlaceholderForZero={true}
            />
          </div>
          <div
            ref={heightInputRef}
            className={`space-y-2 transition-all duration-500 rounded-lg p-2 -m-2 ${
              highlightHeight
                ? 'bg-[#a08032]/20 ring-2 ring-[#a08032] animate-pulse'
                : ''
            }`}
          >
            <Label htmlFor="wzrost" className="text-sm font-medium text-zinc-200">Wzrost (cm)</Label>
            <NumericInput
              id="wzrost"
              type="decimal"
              value={formData.wzrost || 0}
              onChange={(value) => onFormDataChange("wzrost", value)}
              onFocus={onHeightFocus}
              placeholder="np. 175,5"
              className="bg-zinc-800 border-zinc-700 text-zinc-100 focus:border-[#a08032]"
              showPlaceholderForZero={true}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="obecnyProces" className="text-sm font-medium text-zinc-200">Obecny proces</Label>
            <Input
              id="obecnyProces"
              value={formData.obecnyProces || ''}
              onChange={(e) => onFormDataChange("obecnyProces", e.target.value)}
              placeholder="np. redukcja, masa, utrzymanie..."
              className="bg-zinc-800 border-zinc-700 text-zinc-100 focus:border-[#a08032]"
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default ClientPhysicalParams;
