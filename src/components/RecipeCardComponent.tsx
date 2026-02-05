import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import CollapsibleInstructions from "@/components/CollapsibleInstructions";
import { ChevronDown, ChevronUp } from "lucide-react"; // Importuj ikony strzałek
import { formatMacro } from "@/utils/numberFormat";

interface RecipeCardComponentProps {
  potrawa: {
    id: string;
    nazwa: string;
    kategoria: string;
    skladniki: string;
    instrukcja: string[];
    kcal: number;
    macro: {
      białko: number;
      tłuszcz: number;
      węglowodany: number;
      błonnik?: number;
    };
  };
  onClick: (potrawa: any) => void;
}

const RecipeCardComponent: React.FC<RecipeCardComponentProps> = ({ potrawa, onClick }) => {
  const [isInstructionsOpen, setIsInstructionsOpen] = useState(false);

  const handleInstructionsToggle = () => {
    setIsInstructionsOpen(!isInstructionsOpen);
  };

  return (
    <Card
      key={potrawa.id}
      className="bg-zinc-900 border-zinc-800 hover:bg-zinc-800/50 transition-colors cursor-pointer"
      onClick={() => onClick(potrawa)}
    >
      <CardHeader>
        <div className="flex justify-between items-start gap-3">
          <CardTitle className="text-lg text-zinc-100 leading-tight">
            {potrawa.nazwa.replace(/\//g, "/\u200B")}
          </CardTitle>
          <Badge className="bg-primary/20 text-primary border-primary/30 border flex-shrink-0">
            {potrawa.kategoria}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <h4 className="font-semibold text-sm text-zinc-200 mb-1">
            Składniki:
          </h4>
          <p className="text-sm text-zinc-400">{potrawa.skladniki}</p>
        </div>

        {/* Collapsible Instructions */}
        <div>
          <CollapsibleInstructions
            instructions={potrawa.instrukcja}
            isOpen={isInstructionsOpen}
            onToggle={handleInstructionsToggle} // Dodaj onToggle
          />
        </div>

        <div className="grid grid-cols-2 gap-4 pt-4 border-t border-zinc-800">
          <div>
            <p className="text-sm font-semibold text-zinc-200">Kalorie</p>
            <p className="text-lg font-bold text-[#a08032]">
              {potrawa.kcal} kcal
            </p>
          </div>
          <div>
            <p className="text-sm font-semibold text-zinc-200">
              Makroskładniki
            </p>
            <div className="text-xs text-zinc-400">
              <div>B: {formatMacro(potrawa.macro.białko)}g</div>
              <div>T: {formatMacro(potrawa.macro.tłuszcz)}g</div>
              <div>W: {formatMacro(potrawa.macro.węglowodany)}g</div>
              <div>Bl: {formatMacro(potrawa.macro.błonnik ?? 0)}g</div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default RecipeCardComponent;
