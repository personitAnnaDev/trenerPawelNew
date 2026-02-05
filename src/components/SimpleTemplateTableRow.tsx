import { TableCell, TableRow } from "@/components/ui/table";

interface SimpleTemplate {
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
}

interface SimpleTemplateTableRowProps {
  template: SimpleTemplate;
  onClick: (templateId: string) => void;
}

const SimpleTemplateTableRow = ({ template, onClick }: SimpleTemplateTableRowProps) => {
  return (
    <TableRow 
      className="hover:bg-zinc-800 cursor-pointer border-zinc-800"
      onClick={() => onClick(template.id)}
    >
      <TableCell>
        <div>
          <div className="font-medium text-zinc-100">{template.title}</div>
          {template.description && (
            <div className="text-xs text-zinc-400 mt-1">
              {template.description}
            </div>
          )}
        </div>
      </TableCell>
      <TableCell>{template.avgCalories ?? "-"}</TableCell>
      <TableCell>{template.avgProtein ?? "-"}</TableCell>
      <TableCell>{template.avgCarbs ?? "-"}</TableCell>
      <TableCell>{template.avgFat ?? "-"}</TableCell>
      <TableCell>{template.avgFiber ?? "-"}</TableCell>
      <TableCell>{template.daysCount ?? "-"}</TableCell>
      <TableCell>
        {template.created_at
          ? new Date(template.created_at).toLocaleDateString("pl-PL")
          : "-"}
      </TableCell>
    </TableRow>
  );
};

export default SimpleTemplateTableRow;
