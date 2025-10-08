import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { format, eachDayOfInterval, addDays } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { ScrollArea } from "@/components/ui/scroll-area";

interface DailyOccupancy {
  date: string;
  guests: number;
  names?: string[];
}

interface EditOccupancyDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  stay: {
    startDate: Date;
    endDate: Date;
    family_group: string;
  };
  currentOccupancy: DailyOccupancy[];
  onSave: (occupancy: DailyOccupancy[]) => Promise<void>;
}

export const EditOccupancyDialog = ({
  open,
  onOpenChange,
  stay,
  currentOccupancy,
  onSave,
}: EditOccupancyDialogProps) => {
  const { toast } = useToast();
  const [occupancy, setOccupancy] = useState<DailyOccupancy[]>(currentOccupancy);
  const [saving, setSaving] = useState(false);
  const [fillValue, setFillValue] = useState<string>("0");

  // Only include nights spent (exclude checkout day)
  const days = eachDayOfInterval({ start: stay.startDate, end: addDays(stay.endDate, -1) });

  const handleGuestCountChange = (dateStr: string, count: number) => {
    setOccupancy(prev => {
      const existing = prev.find(o => o.date === dateStr);
      if (existing) {
        return prev.map(o => o.date === dateStr ? { ...o, guests: count } : o);
      }
      return [...prev, { date: dateStr, guests: count }];
    });
  };

  const getOccupancyForDate = (dateStr: string) => {
    return occupancy.find(o => o.date === dateStr);
  };

  const handleFillAll = () => {
    const value = parseInt(fillValue) || 0;
    const newOccupancy = days.map(day => ({
      date: format(day, 'yyyy-MM-dd'),
      guests: value,
    }));
    setOccupancy(newOccupancy);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave(occupancy);
      toast({
        title: "Occupancy updated",
        description: "Daily occupancy data has been saved successfully.",
      });
      // Close dialog and clear state
      onOpenChange(false);
    } catch (error) {
      console.error('Error saving occupancy:', error);
      toast({
        title: "Error",
        description: "Failed to save occupancy data. Please try again.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>Edit Daily Occupancy - {stay.family_group}</DialogTitle>
          <p className="text-sm text-muted-foreground">
            {format(stay.startDate, 'MMM d')} - {format(stay.endDate, 'MMM d, yyyy')}
          </p>
        </DialogHeader>
        
        {/* Fill All Helper */}
        <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg">
          <span className="text-sm font-medium">Quick Fill:</span>
          <Input
            type="number"
            min="0"
            value={fillValue}
            onChange={(e) => setFillValue(e.target.value)}
            className="w-20"
            placeholder="0"
          />
          <Button variant="outline" size="sm" onClick={handleFillAll}>
            Fill All Days
          </Button>
        </div>

        <ScrollArea className="h-[400px] pr-4">
          <div className="grid grid-cols-[auto_1fr_auto] gap-x-4 gap-y-1 items-center text-sm">
            {/* Header */}
            <div className="font-medium text-muted-foreground pb-2">Date</div>
            <div className="font-medium text-muted-foreground pb-2">Day</div>
            <div className="font-medium text-muted-foreground text-right pb-2">Guests</div>
            
            {days.map(day => {
              const dateStr = format(day, 'yyyy-MM-dd');
              const dayOccupancy = getOccupancyForDate(dateStr);
              
              return (
                <div key={dateStr} className="contents">
                  <div className="text-foreground">{format(day, 'M/d')}</div>
                  <div className="text-muted-foreground text-xs">{format(day, 'EEE')}</div>
                  <Input
                    type="number"
                    min="0"
                    value={dayOccupancy?.guests || 0}
                    onChange={(e) => handleGuestCountChange(dateStr, parseInt(e.target.value) || 0)}
                    className="w-16 h-8 text-right text-sm"
                  />
                </div>
              );
            })}
          </div>
        </ScrollArea>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? "Saving..." : "Save Changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
