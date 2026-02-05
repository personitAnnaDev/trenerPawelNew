import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Trash2 } from "lucide-react";

interface DayTabManagerProps {
  dayPlans: DayPlan[];
  activeDay: string;
  onActiveDayChange: (dayId: string) => void;
  onAddDay: () => void;
  onRemoveDay: (dayId: string) => void;
  onUpdateDayName: (dayId: string, newName: string) => void;
}

const DayTabManager = ({
  dayPlans,
  activeDay,
  onActiveDayChange,
  onAddDay,
  onRemoveDay,
  onUpdateDayName
}: DayTabManagerProps) => {
  return (
    <Tabs value={activeDay} onValueChange={onActiveDayChange}>
      <div className="border-b border-zinc-700/50 bg-zinc-900/50">
        <TabsList className="w-full justify-start bg-transparent h-auto p-0">
          {dayPlans.map((day) => (
            <TabsTrigger
              key={day.id}
              value={day.id}
              className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-[#a08032] data-[state=active]:to-[#e6d280] data-[state=active]:text-white bg-transparent text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/50 px-6 py-3 rounded-t-lg border-b-2 border-transparent data-[state=active]:border-[#a08032] transition-all duration-200"
            >
              <input
                type="text"
                value={day.name}
                onChange={(e) => onUpdateDayName(day.id, e.target.value)}
                className="bg-transparent border-none outline-none text-center min-w-[120px] font-medium"
                onClick={(e) => e.stopPropagation()}
              />
              {dayPlans.length > 1 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    onRemoveDay(day.id);
                  }}
                  className="ml-2 h-4 w-4 p-0 text-zinc-400 hover:text-red-400 transition-colors"
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              )}
            </TabsTrigger>
          ))}
          <Button
            onClick={onAddDay}
            variant="ghost"
            size="sm"
            className="ml-2 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/50 transition-colors rounded-lg"
          >
            <Plus className="h-4 w-4" />
          </Button>
        </TabsList>
      </div>
    </Tabs>
  );
};

export default DayTabManager;
