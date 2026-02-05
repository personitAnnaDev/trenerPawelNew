import { useEffect } from "react";
import { Control, useFieldArray } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Plus, Trash2, GripVertical } from "lucide-react";
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface InstructionManagerProps {
  control: Control<any>;
  name: string;
}

const SortableInstruction = ({ 
  control, 
  name, 
  index, 
  onRemove, 
  canRemove 
}: {
  control: Control<any>;
  name: string;
  index: number;
  onRemove: (index: number) => void;
  canRemove: boolean;
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({ id: `instruction-${index}` });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div ref={setNodeRef} style={style} className="mb-4">
      <FormField
        control={control}
        name={`${name}.${index}`}
        render={({ field }) => (
          <FormItem>
            <div className="flex items-center gap-2 mb-2">
              <div
                {...attributes}
                {...listeners}
                className="cursor-grab hover:cursor-grabbing p-1 rounded hover:bg-gray-700"
                title="Przeciągnij, aby zmienić kolejność"
              >
                <GripVertical className="h-4 w-4 text-gray-400" />
              </div>
              <FormLabel className="text-[#a08032] text-sm font-semibold">
                Instrukcja {index + 1}:
              </FormLabel>
              {canRemove && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => onRemove(index)}
                  className="ml-auto input-dark text-red-400 hover:text-red-300 hover:bg-red-900/20"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>
            <FormControl>
              <Textarea
                placeholder={`Wpisz instrukcję ${index + 1}...`}
                className="input-dark"
                rows={3}
                {...field}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    </div>
  );
};

const InstructionManager = ({ control, name }: InstructionManagerProps) => {
  const { fields, append, remove, move } = useFieldArray({
    control,
    name,
  });

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Ensure at least one instruction field exists
  useEffect(() => {
    if (fields.length === 0) {
      append("");
    }
  }, [fields.length, append]);

  const addInstruction = () => {
    append("");
  };

  const removeInstruction = (index: number) => {
    if (fields.length > 1) {
      remove(index);
    }
  };

  const handleDragEnd = (event: any) => {
    const { active, over } = event;

    if (active.id !== over.id) {
      const activeIndex = parseInt(active.id.split('-')[1]);
      const overIndex = parseInt(over.id.split('-')[1]);
      
      move(activeIndex, overIndex);
    }
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <label className="text-sm font-medium text-gray-200">Instrukcje przygotowania:</label>
        <Button 
          type="button" 
          variant="outline" 
          size="sm" 
          onClick={addInstruction}
          className="input-dark"
        >
          <Plus className="h-4 w-4 mr-1" />
          Dodaj Instrukcję
        </Button>
      </div>
      
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext 
          items={fields.map((_, index) => `instruction-${index}`)} 
          strategy={verticalListSortingStrategy}
        >
          <div className="space-y-2">
            {fields.map((field, index) => (
              <SortableInstruction
                key={field.id}
                control={control}
                name={name}
                index={index}
                onRemove={removeInstruction}
                canRemove={fields.length > 1}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>
    </div>
  );
};

export default InstructionManager;
