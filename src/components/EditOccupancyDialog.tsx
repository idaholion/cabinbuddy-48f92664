import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { format, eachDayOfInterval } from "date-fns";
import { useToast } from "@/hooks/use-toast";

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

  const days = eachDayOfInterval({ start: stay.startDate, end: stay.endDate });

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

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave(occupancy);
      toast({
        title: "Occupancy updated",
        description: "Daily occupancy data has been saved successfully.",
      });
      onOpenChange(false);
    } catch (error) {
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
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Daily Occupancy - {stay.family_group}</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          {days.map(day => {
            const dateStr = format(day, 'yyyy-MM-dd');
            const dayOccupancy = getOccupancyForDate(dateStr);
            
            return (
              <div key={dateStr} className="border rounded-lg p-4 space-y-3">
                <h4 className="font-medium">{format(day, 'EEEE, MMM d')}</h4>
                
                <div>
                  <Label htmlFor={`guests-${dateStr}`}>Number of Guests</Label>
                  <Input
                    id={`guests-${dateStr}`}
                    type="number"
                    min="0"
                    value={dayOccupancy?.guests || 0}
                    onChange={(e) => handleGuestCountChange(dateStr, parseInt(e.target.value) || 0)}
                    className="mt-1"
                  />
                </div>
              </div>
            );
          })}
        </div>

        <DialogFooter>
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
