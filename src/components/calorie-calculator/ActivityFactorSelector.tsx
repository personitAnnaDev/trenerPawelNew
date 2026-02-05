import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";

const activityFactors = [
  { value: 1.2, label: "1,2 - 1,3", description: "Osoba chora, leżąca w łóżku lub praca siedząca, bez aktywności" },
  { value: 1.4, label: "1,4", description: "Niska aktywność fizyczna" },
  { value: 1.6, label: "1,6", description: "Umiarkowana aktywność fizyczna" },
  { value: 1.75, label: "1,75", description: "Aktywny tryb życia" },
  { value: 2.0, label: "2,0", description: "Bardzo aktywny tryb życia" },
  { value: 2.2, label: "2,2 - 2,4", description: "Wyczynowe uprawianie sportu" }
];

interface ActivityFactorSelectorProps {
  activityLevel: number[];
  onActivityLevelChange: (value: number[]) => void;
}

export const ActivityFactorSelector = ({ activityLevel, onActivityLevelChange }: ActivityFactorSelectorProps) => {
  return (
    <div className="space-y-4">
      <div>
        <Label className="text-zinc-100 text-lg font-medium mb-4 block">
          WSPÓŁCZYNNIK AKTYWNOŚCI FIZYCZNEJ
        </Label>
        
        <div className="mb-6 p-4 bg-zinc-800 rounded-lg border border-zinc-700">
          <div className="text-xl font-bold text-zinc-100 mb-2">
            {activityLevel[0].toFixed(1).replace('.', ',')}
          </div>
          <div className="text-zinc-300">
            Aktualnie wybrany współczynnik aktywności
          </div>
        </div>

        <div className="px-2">
          <Slider
            value={activityLevel}
            onValueChange={onActivityLevelChange}
            max={2.4}
            min={1.2}
            step={0.1}
            className="w-full"
          />
          
          <div className="relative mt-2 text-xs text-zinc-400">
            <span className="absolute left-0">1,2</span>
            <span className="absolute right-0">2,4</span>
          </div>
        </div>

        <div className="mt-6 space-y-2">
          <div className="text-sm text-zinc-300 mb-2">Odniesienie do współczynników aktywności:</div>
          {activityFactors.map((factor, index) => (
            <div 
              key={index}
              className="flex items-start gap-4 p-3 rounded-lg bg-zinc-800 border border-zinc-700"
            >
              <div className="font-bold text-sm min-w-[60px] text-zinc-300">
                {factor.label}
              </div>
              <div className="text-sm text-zinc-400">
                {factor.description}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
