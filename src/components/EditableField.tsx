import React, { useState } from 'react';
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Check, X, Edit2 } from "lucide-react";
import { updateClient, Client } from "@/utils/clientStorage";
import { useToast } from "@/hooks/use-toast";
import { logger } from '@/utils/logger';

interface EditableInputProps {
  fieldName: keyof Client;
  currentValue: string;
  type?: string;
  placeholder?: string;
  clientId: string;
  onUpdate: (updatedClient: Client) => void;
  multiline?: boolean;
}

interface EditableSelectProps {
  fieldName: keyof Client;
  currentValue: string;
  options: { value: string; label: string }[];
  clientId: string;
  onUpdate: (updatedClient: Client) => void;
}

export const EditableInput: React.FC<EditableInputProps> = ({
  fieldName,
  currentValue,
  type = "text",
  placeholder,
  clientId,
  onUpdate,
  multiline = false
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [value, setValue] = useState(currentValue);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleSave = async () => {
    if (value === currentValue) {
      setIsEditing(false);
      return;
    }

    setIsLoading(true);
    try {
      const updatedClient = await updateClient(clientId, { [fieldName]: value });
      if (updatedClient) {
        onUpdate(updatedClient);
        setIsEditing(false);
        toast({
          title: "Zaktualizowano",
          description: "Dane klienta zostały pomyślnie zaktualizowane.",
        });
      } else {
        throw new Error("Nie udało się zaktualizować danych");
      }
    } catch (error) {
      logger.error('Błąd aktualizacji:', error);
      toast({
        title: "Błąd",
        description: "Nie udało się zaktualizować danych klienta.",
        variant: "destructive",
      });
      setValue(currentValue); // Reset to original value
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    setValue(currentValue);
    setIsEditing(false);
  };

  if (!isEditing) {
    return (
      <div className="group relative">
        <div className="flex items-center justify-between p-3 bg-zinc-800 border border-zinc-700 rounded-md min-h-[42px]">
          <span className="text-zinc-100 flex-1">
            {currentValue || <span className="text-zinc-500 italic">Nie podano</span>}
          </span>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsEditing(true)}
            className="opacity-0 group-hover:opacity-100 transition-opacity p-1 h-auto text-zinc-400 hover:text-zinc-100"
          >
            <Edit2 className="h-3 w-3" />
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      {multiline ? (
        <Textarea
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder={placeholder}
          className="flex-1 bg-zinc-800 border-zinc-700 text-zinc-100 focus:border-[#a08032]"
          rows={3}
        />
      ) : (
        <Input
          type={type}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder={placeholder}
          className="flex-1 bg-zinc-800 border-zinc-700 text-zinc-100 focus:border-[#a08032]"
        />
      )}
      <div className="flex gap-1">
        <Button
          variant="ghost"
          size="sm"
          onClick={handleSave}
          disabled={isLoading}
          className="p-1 h-auto text-green-400 hover:text-green-300 hover:bg-green-400/10"
        >
          <Check className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleCancel}
          disabled={isLoading}
          className="p-1 h-auto text-red-400 hover:text-red-300 hover:bg-red-400/10"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
};

export const EditableSelect: React.FC<EditableSelectProps> = ({
  fieldName,
  currentValue,
  options,
  clientId,
  onUpdate
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [value, setValue] = useState(currentValue);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleSave = async () => {
    if (value === currentValue) {
      setIsEditing(false);
      return;
    }

    setIsLoading(true);
    try {
      const updatedClient = await updateClient(clientId, { [fieldName]: value });
      if (updatedClient) {
        onUpdate(updatedClient);
        setIsEditing(false);
        toast({
          title: "Zaktualizowano",
          description: "Dane klienta zostały pomyślnie zaktualizowane.",
        });
      } else {
        throw new Error("Nie udało się zaktualizować danych");
      }
    } catch (error) {
      logger.error('Błąd aktualizacji:', error);
      toast({
        title: "Błąd",
        description: "Nie udało się zaktualizować danych klienta.",
        variant: "destructive",
      });
      setValue(currentValue); // Reset to original value
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    setValue(currentValue);
    setIsEditing(false);
  };

  const getCurrentLabel = () => {
    const option = options.find(opt => opt.value === currentValue);
    return option ? option.label : (currentValue || "Nie wybrano");
  };

  if (!isEditing) {
    return (
      <div className="group relative">
        <div className="flex items-center justify-between p-3 bg-zinc-800 border border-zinc-700 rounded-md min-h-[42px]">
          <span className="text-zinc-100 flex-1">
            {getCurrentLabel()}
          </span>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsEditing(true)}
            className="opacity-0 group-hover:opacity-100 transition-opacity p-1 h-auto text-zinc-400 hover:text-zinc-100"
          >
            <Edit2 className="h-3 w-3" />
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <Select value={value} onValueChange={setValue}>
        <SelectTrigger className="flex-1 bg-zinc-800 border-zinc-700 text-zinc-100 focus:border-[#a08032]">
          <SelectValue />
        </SelectTrigger>
        <SelectContent className="bg-zinc-800 border-zinc-700">
          {options.map((option) => (
            <SelectItem 
              key={option.value} 
              value={option.value}
              className="text-zinc-100 focus:bg-zinc-700 focus:text-zinc-100"
            >
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <div className="flex gap-1">
        <Button
          variant="ghost"
          size="sm"
          onClick={handleSave}
          disabled={isLoading}
          className="p-1 h-auto text-green-400 hover:text-green-300 hover:bg-green-400/10"
        >
          <Check className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleCancel}
          disabled={isLoading}
          className="p-1 h-auto text-red-400 hover:text-red-300 hover:bg-red-400/10"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
};
