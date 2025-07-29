import React from "react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface ColorPickerProps {
  value?: string;
  onChange: (color: string) => void;
  availableColors: string[];
  disabled?: boolean;
}

export const ColorPicker: React.FC<ColorPickerProps> = ({
  value,
  onChange,
  availableColors,
  disabled = false,
}) => {
  const colorNames: { [key: string]: string } = {
    '#ef4444': 'Red',
    '#f97316': 'Orange',
    '#eab308': 'Yellow',
    '#22c55e': 'Green',
    '#06b6d4': 'Cyan',
    '#3b82f6': 'Blue',
    '#8b5cf6': 'Violet',
    '#ec4899': 'Pink',
    '#f59e0b': 'Amber',
    '#10b981': 'Emerald',
    '#6366f1': 'Indigo',
    '#84cc16': 'Lime',
    '#f43f5e': 'Rose',
    '#14b8a6': 'Teal',
    '#a855f7': 'Purple',
    '#64748b': 'Slate',
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            "w-[140px] justify-start text-left font-normal",
            !value && "text-muted-foreground"
          )}
          disabled={disabled}
        >
          <div className="flex items-center gap-2">
            {value && (
              <div
                className="h-4 w-4 rounded-full border border-border"
                style={{ backgroundColor: value }}
              />
            )}
            <span>
              {value ? colorNames[value] || value : "Select color"}
            </span>
          </div>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-3">
        <div className="grid grid-cols-4 gap-2">
          {availableColors.map((color) => (
            <button
              key={color}
              className={cn(
                "relative h-8 w-8 rounded-full border-2 border-border hover:scale-110 transition-transform",
                value === color && "ring-2 ring-ring ring-offset-2"
              )}
              style={{ backgroundColor: color }}
              onClick={() => onChange(color)}
              title={colorNames[color] || color}
            >
              {value === color && (
                <Check className="h-4 w-4 text-white absolute inset-0 m-auto drop-shadow-lg" />
              )}
            </button>
          ))}
        </div>
        {availableColors.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-4">
            No colors available
          </p>
        )}
      </PopoverContent>
    </Popover>
  );
};