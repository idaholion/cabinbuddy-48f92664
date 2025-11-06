import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { format, eachDayOfInterval, addDays } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Lock } from "lucide-react";
import { useDailyOccupancySync } from "@/hooks/useDailyOccupancySync";

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
    reservationId: string | null;
  };
  currentOccupancy: DailyOccupancy[];
  onSave: (occupancy: DailyOccupancy[]) => Promise<void>;
  organizationId: string;
  splitId?: string;
  splitPaymentId?: string;
}

export const EditOccupancyDialog = ({
  open,
  onOpenChange,
  stay,
  currentOccupancy,
  onSave,
  organizationId,
  splitId,
  splitPaymentId,
}: EditOccupancyDialogProps) => {
  const { toast } = useToast();
  const { updateOccupancy, updateSplitOccupancy, getBillingLockStatus, syncing } = useDailyOccupancySync(organizationId);
  const [billingLocked, setBillingLocked] = useState(false);
  const isSplit = !!splitId && !!splitPaymentId;
  
  // Only include nights spent (exclude checkout day)
  const days = eachDayOfInterval({ start: stay.startDate, end: addDays(stay.endDate, -1) });

  console.log('EditOccupancyDialog - Stay dates:', {
    startDate: stay.startDate,
    endDate: stay.endDate,
    calculatedEndDate: addDays(stay.endDate, -1),
    totalDays: days.length,
    days: days.map(d => format(d, 'yyyy-MM-dd'))
  });
  console.log('EditOccupancyDialog - Current occupancy:', currentOccupancy);
  
  // Filter currentOccupancy to only include dates in the displayed range
  const validDateStrings = days.map(d => format(d, 'yyyy-MM-dd'));
  const filteredOccupancy = currentOccupancy.filter(occ => validDateStrings.includes(occ.date));
  
  console.log('EditOccupancyDialog - Filtered occupancy (excluding checkout day):', filteredOccupancy);
  
  const [occupancy, setOccupancy] = useState<DailyOccupancy[]>(filteredOccupancy);
  const [fillValue, setFillValue] = useState<string>("0");

  useEffect(() => {
    if (open && stay.reservationId) {
      getBillingLockStatus(stay.reservationId).then(setBillingLocked);
    }
  }, [open, stay.reservationId, getBillingLockStatus]);

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
    try {
      console.log('EditOccupancyDialog - Saving occupancy:', occupancy);
      console.log('Total guests:', occupancy.reduce((sum, day) => sum + (day.guests || 0), 0));
      console.log('Is split?', isSplit, 'splitId:', splitId, 'splitPaymentId:', splitPaymentId);
      
      let result;
      if (isSplit) {
        // Update split occupancy
        result = await updateSplitOccupancy(splitId!, splitPaymentId!, occupancy);
      } else {
        // Update regular reservation occupancy
        result = await updateOccupancy(stay.reservationId!, occupancy);
      }
      
      if (result.success) {
        await onSave(occupancy); // Still call parent callback for any additional logic
        onOpenChange(false);
      }
    } catch (error) {
      console.error('Error saving occupancy:', error);
      toast({
        title: "Error",
        description: "Failed to save occupancy data. Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            Edit Daily Occupancy - {stay.family_group}
            {billingLocked && (
              <Badge variant="secondary" className="ml-2">
                <Lock className="h-3 w-3 mr-1" />
                Billing Locked
              </Badge>
            )}
          </DialogTitle>
          <p className="text-sm text-muted-foreground">
            {format(stay.startDate, 'MMM d')} - {format(stay.endDate, 'MMM d, yyyy')}
            {billingLocked && (
              <span className="block mt-1 text-amber-600 dark:text-amber-400">
                ⚠️ Guest counts will update but charges will not recalculate
              </span>
            )}
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
          <Button onClick={handleSave} disabled={syncing}>
            {syncing ? "Saving..." : "Save Changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
