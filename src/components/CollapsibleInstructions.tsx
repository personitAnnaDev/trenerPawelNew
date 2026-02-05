import { ChevronDown, ChevronUp } from "lucide-react"; // Importuj obie ikony
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

interface CollapsibleInstructionsProps {
  instructions: string[];
  title?: string;
  isOpen: boolean;
  onToggle: () => void; // Przywróć onToggle
}

const CollapsibleInstructions = ({ 
  instructions, 
  title = "Instrukcje przygotowania:", 
  isOpen,
  onToggle // Przywróć onToggle
}: CollapsibleInstructionsProps) => {

  if (!instructions || instructions.length === 0) {
    return null;
  }

  return (
    <Collapsible open={isOpen} onOpenChange={onToggle}>
      <CollapsibleTrigger 
        className="flex items-center justify-between w-full text-left cursor-pointer"
        onClick={(e) => {
          e.stopPropagation(); // Zapobiegaj propagacji zdarzenia do rodzica (karty)
          onToggle();
        }}
      >
        <h5 className="text-sm font-medium text-zinc-300">{title}</h5>
        {isOpen ? (
          <ChevronUp className="h-4 w-4 text-zinc-400 transition-transform duration-200" />
        ) : (
          <ChevronDown className="h-4 w-4 text-zinc-400 transition-transform duration-200" />
        )}
      </CollapsibleTrigger>
      <CollapsibleContent className="data-[state=open]:animate-accordion-down data-[state=closed]:animate-accordion-up overflow-hidden">
        <div className="pt-2 space-y-1">
          {instructions.map((instruction, index) => (
            <div key={index} className="text-sm text-[#a08032]">
              <span className="font-medium">Instrukcja {index + 1}:</span> {instruction}
            </div>
          ))}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
};

export default CollapsibleInstructions;
