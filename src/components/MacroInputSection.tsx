import { Control } from "react-hook-form";
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

interface MacroData {
  białko: number;
  tłuszcz: number;
  węglowodany: number;
}

interface MacroInputSectionProps {
  control: Control<any>;
}

const MacroInputSection = ({ control }: MacroInputSectionProps) => {
  // Enhanced numeric input validation
  const validateNumericInput = (value: string, allowDecimals: boolean = true): string => {
    if (value === "") return value;
    
    // Remove any non-numeric characters except decimal point
    let cleanValue = value.replace(/[^0-9.]/g, '');
    
    // Handle decimal places
    if (!allowDecimals) {
      cleanValue = cleanValue.replace(/\./g, '');
    } else {
      // Allow only one decimal point
      const parts = cleanValue.split('.');
      if (parts.length > 2) {
        cleanValue = parts[0] + '.' + parts.slice(1).join('');
      }
    }
    
    // Prevent negative values
    const numValue = parseFloat(cleanValue);
    if (numValue < 0) return "0";
    
    return cleanValue;
  };

  const handleNumericChange = (field: any, value: string, isInteger: boolean = false) => {
    const validatedValue = validateNumericInput(value, !isInteger);
    const numericValue = isInteger ? parseInt(validatedValue) || 0 : parseFloat(validatedValue) || 0;
    field.onChange(numericValue);
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Kalorie</CardTitle>
        </CardHeader>
        <CardContent>
          <FormField
            control={control}
            name="kcal"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Kcal</FormLabel>
                <FormControl>
                  <Input 
                    type="text"
                    min="0"
                    placeholder="np. 250"
                    value={field.value || ""}
                    onChange={(e) => handleNumericChange(field, e.target.value, true)}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Makroskładniki</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <FormField
            control={control}
            name="macro.białko"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Białko (g)</FormLabel>
                <FormControl>
                  <Input
                    type="text"
                    min="0"
                    step="0.1"
                    placeholder="np. 15"
                    value={field.value || ""}
                    onChange={(e) => handleNumericChange(field, e.target.value, false)}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={control}
            name="macro.tłuszcz"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Tłuszcz (g)</FormLabel>
                <FormControl>
                  <Input
                    type="text"
                    min="0"
                    step="0.1"
                    placeholder="np. 8"
                    value={field.value || ""}
                    onChange={(e) => handleNumericChange(field, e.target.value, false)}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={control}
            name="macro.węglowodany"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Węglowodany (g)</FormLabel>
                <FormControl>
                  <Input
                    type="text"
                    min="0"
                    step="0.1"
                    placeholder="np. 30"
                    value={field.value || ""}
                    onChange={(e) => handleNumericChange(field, e.target.value, false)}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </CardContent>
      </Card>
    </div>
  );
};

export default MacroInputSection;
