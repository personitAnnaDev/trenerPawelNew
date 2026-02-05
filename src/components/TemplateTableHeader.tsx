import { Button } from "@/components/ui/button";
import { TableHead, TableHeader, TableRow } from "@/components/ui/table";

interface TemplateTableHeaderProps {
  sortBy: "title" | "calories" | "protein" | "carbs" | "fat";
  sortOrder: "asc" | "desc";
  onSort: (column: "title" | "calories" | "protein" | "carbs" | "fat") => void;
}

const TemplateTableHeader = ({ sortBy, sortOrder, onSort }: TemplateTableHeaderProps) => {
  return (
    <TableHeader>
      <TableRow className="border-zinc-800 hover:bg-zinc-800">
        <TableHead>
          <Button
            variant="ghost"
            onClick={() => onSort("title")}
            className="h-auto p-0 font-medium hover:bg-transparent text-zinc-200"
          >
            Nazwa
            {sortBy === "title" && (
              <span className="ml-1">{sortOrder === "asc" ? "↑" : "↓"}</span>
            )}
          </Button>
        </TableHead>
        <TableHead>
          <Button
            variant="ghost"
            onClick={() => onSort("calories")}
            className="h-auto p-0 font-medium hover:bg-transparent text-zinc-200"
          >
            Kcal (śr./dzień)
            {sortBy === "calories" && (
              <span className="ml-1">{sortOrder === "asc" ? "↑" : "↓"}</span>
            )}
          </Button>
        </TableHead>
        <TableHead className="text-zinc-200">Makroskładniki (śr./dzień)</TableHead>
        <TableHead className="text-zinc-200">Dni</TableHead>
        <TableHead className="text-zinc-200">Data utworzenia</TableHead>
      </TableRow>
    </TableHeader>
  );
};

export default TemplateTableHeader;
