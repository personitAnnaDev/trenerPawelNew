import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";

interface TemplateFiltersProps {
  searchTerm: string;
  onSearchChange: (value: string) => void;
}

const TemplateFilters = ({ searchTerm, onSearchChange }: TemplateFiltersProps) => {
  return (
    <div className="flex items-center gap-2 w-full sm:w-auto">
      <div className="relative w-full sm:w-64">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-zinc-400 h-4 w-4" />
        <Input
          placeholder="Szukaj szablonów..."
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-10 w-full bg-zinc-800 border-zinc-700 text-zinc-100 placeholder-zinc-400"
        />
      </div>
    </div>
  );
};

export default TemplateFilters;
