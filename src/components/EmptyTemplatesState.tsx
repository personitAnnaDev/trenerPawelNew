import { FileText } from "lucide-react";

interface EmptyTemplatesStateProps {
  searchTerm: string;
}

const EmptyTemplatesState = ({ searchTerm }: EmptyTemplatesStateProps) => {
  return (
    <div className="text-center py-12">
      <FileText className="h-12 w-12 mx-auto text-zinc-400 mb-4" />
      <h3 className="text-lg font-medium text-zinc-100 mb-2">
        {searchTerm ? "Brak wyników wyszukiwania" : "Brak szablonów"}
      </h3>
      <p className="text-zinc-400">
        {searchTerm 
          ? `Nie znaleziono szablonów pasujących do "${searchTerm}"`
          : "Utwórz pierwszy szablon zapisując jadłospis w profilu klienta"
        }
      </p>
    </div>
  );
};

export default EmptyTemplatesState;
