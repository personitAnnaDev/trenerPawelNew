import { TableCell, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

interface TemplateTableRowProps {
  template: {
    id: string;
    title: string;
    description?: string;
    created_at?: string;
    daysCount: number;
    avgCalories: number;
    avgProtein: number;
    avgCarbs: number;
    avgFat: number;
    avgFiber: number;
  };
  onClick: (templateId: string) => void;
  formatDate: (dateString: string) => string;
}

const TemplateTableRow = ({ template, onClick, formatDate }: TemplateTableRowProps) => {
  return (
    <TableRow 
      className="hover:bg-zinc-800 cursor-pointer border-zinc-800"
      onClick={() => onClick(template.id)}
    >
      <TableCell>
        <div className="font-medium text-zinc-100">{template.title}</div>
      </TableCell>
      <TableCell>
        <Badge variant="secondary" className="bg-[#a08032] text-white">
          {Math.round(template.avgCalories)} kcal
        </Badge>
      </TableCell>
      <TableCell>
        <div className="flex flex-wrap gap-1">
          <Badge variant="outline" className="text-xs border-zinc-700 text-zinc-300">
            B: {template.avgProtein.toFixed(1)}g
          </Badge>
          <Badge variant="outline" className="text-xs border-zinc-700 text-zinc-300">
            W: {template.avgCarbs.toFixed(1)}g
          </Badge>
          <Badge variant="outline" className="text-xs border-zinc-700 text-zinc-300">
            T: {template.avgFat.toFixed(1)}g
          </Badge>
          <Badge variant="outline" className="text-xs border-zinc-700 text-zinc-300">
            Bł: {template.avgFiber.toFixed(1)}g
          </Badge>
        </div>
      </TableCell>
      <TableCell>
        <Badge variant="outline" className="border-zinc-700 text-zinc-300">
          {template.daysCount} dni
        </Badge>
      </TableCell>
      <TableCell className="text-sm text-zinc-400">
        {template.created_at ? formatDate(template.created_at) : "-"}
      </TableCell>
    </TableRow>
  );
};

export default TemplateTableRow;
