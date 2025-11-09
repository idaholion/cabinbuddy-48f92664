import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { format, eachDayOfInterval, addDays, parseISO } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { usePaymentSplits } from "@/hooks/usePaymentSplits";
import { usePaymentSplitDetails } from "@/hooks/usePaymentSplitDetails";
import { AlertCircle, Info } from "lucide-react";

interface EditSplitOccupancyDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  splitId: string | null;
}

export const EditSplitOccupancyDialog = ({
  open,
  onOpenChange,
  splitId,
}: EditSplitOccupancyDialogProps) => {
  const { toast } = useToast();
  const { updateSplitOccupancy } = usePaymentSplits();
  const { splitDetails, loading: detailsLoading } = usePaymentSplitDetails(splitId);
  
  const [sourceOccupancy, setSourceOccupancy] = useState<{ [date: string]: number }>({});
  const [recipientOccupancy, setRecipientOccupancy] = useState<{ [date: string]: number }>({});
  const [perDiem, setPerDiem] = useState<number>(0);
  const [saving, setSaving] = useState(false);
  const [dates, setDates] = useState<Date[]>([]);

  // Initialize data when split details load
  useEffect(() => {
    if (!splitDetails || !open) return;

    // Parse dates from daily_occupancy_split
    const dailySplit = splitDetails.daily_occupancy_split || [];
    
    if (dailySplit.length > 0) {
      // Extract dates
      const splitDates = dailySplit.map(day => parseISO(day.date));
      setDates(splitDates);

      // Initialize occupancy from existing split data
      const sourceOcc: { [date: string]: number } = {};
      const recipientOcc: { [date: string]: number } = {};
      
      dailySplit.forEach(day => {
        sourceOcc[day.date] = day.sourceGuests || 0;
        recipientOcc[day.date] = day.recipientGuests || 0;
      });

      setSourceOccupancy(sourceOcc);
      setRecipientOccupancy(recipientOcc);
      setPerDiem(dailySplit[0]?.perDiem || 0);
    }
  }, [splitDetails, open]);

  const handleSourceChange = (date: string, value: string) => {
    const count = parseInt(value) || 0;
    setSourceOccupancy(prev => ({ ...prev, [date]: count }));
  };

  const handleRecipientChange = (date: string, value: string) => {
    const count = parseInt(value) || 0;
    setRecipientOccupancy(prev => ({ ...prev, [date]: count }));
  };

  const calculateTotals = () => {
    const sourceTotal = Object.values(sourceOccupancy).reduce((sum, guests) => 
      sum + (guests * perDiem), 0);
    const recipientTotal = Object.values(recipientOccupancy).reduce((sum, guests) => 
      sum + (guests * perDiem), 0);
    return { sourceTotal, recipientTotal };
  };

  const handleSave = async () => {
    if (!splitId) return;

    // Validate at least one day has guests
    const hasGuests = Object.values(sourceOccupancy).some(g => g > 0) ||
                      Object.values(recipientOccupancy).some(g => g > 0);
    
    if (!hasGuests) {
      toast({
        title: "Invalid Split",
        description: "Please enter at least one guest count before saving.",
        variant: "destructive",
      });
      return;
    }

    setSaving(true);
    try {
      const success = await updateSplitOccupancy(
        splitId,
        sourceOccupancy,
        recipientOccupancy,
        perDiem
      );

      if (success) {
        onOpenChange(false);
      }
    } catch (error: any) {
      console.error('Error updating split:', error);
    } finally {
      setSaving(false);
    }
  };

  if (detailsLoading) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl">
          <div className="flex items-center justify-center p-8">
            <LoadingSpinner size="lg" />
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  if (!splitDetails) {
    return null;
  }

  const { sourceTotal, recipientTotal } = calculateTotals();
  const totalSourceGuests = Object.values(sourceOccupancy).reduce((sum, g) => sum + g, 0);
  const totalRecipientGuests = Object.values(recipientOccupancy).reduce((sum, g) => sum + g, 0);

  // Check if recipient has made any payments
  const recipientHasPaid = (splitDetails.split_payment?.amount_paid || 0) > 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>Edit Split Occupancy</DialogTitle>
          <p className="text-sm text-muted-foreground">
            {splitDetails.source_family_group} → {splitDetails.split_to_family_group}
          </p>
        </DialogHeader>

        {recipientHasPaid && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              The recipient has already made payments on this split. Editing occupancy is not allowed.
            </AlertDescription>
          </Alert>
        )}

        {!recipientHasPaid && (
          <>
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                Update guest counts for each day. Costs are calculated at ${perDiem.toFixed(2)} per guest per night.
              </AlertDescription>
            </Alert>

            <ScrollArea className="h-[400px] pr-4">
              <div className="border rounded-lg overflow-hidden">
                <table className="w-full">
                  <thead className="bg-muted">
                    <tr>
                      <th className="text-left p-3 sticky top-0 bg-muted z-10">Date</th>
                      <th className="text-right p-3 sticky top-0 bg-muted z-10">
                        {splitDetails.source_family_group}
                      </th>
                      <th className="text-right p-3 sticky top-0 bg-muted z-10">
                        {splitDetails.split_to_family_group}
                      </th>
                      <th className="text-right p-3 sticky top-0 bg-muted z-10 font-bold">
                        Total Guests
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {dates.map(date => {
                      const dateStr = format(date, 'yyyy-MM-dd');
                      const sourceGuests = sourceOccupancy[dateStr] || 0;
                      const recipientGuests = recipientOccupancy[dateStr] || 0;
                      const total = sourceGuests + recipientGuests;
                      
                      return (
                        <tr key={dateStr} className="border-t">
                          <td className="p-3">
                            <div className="font-medium">{format(date, 'MMM d, yyyy')}</div>
                            <div className="text-xs text-muted-foreground">{format(date, 'EEE')}</div>
                          </td>
                          <td className="p-3">
                            <Input
                              type="number"
                              min="0"
                              value={sourceGuests}
                              onChange={(e) => handleSourceChange(dateStr, e.target.value)}
                              className="w-20 ml-auto"
                            />
                          </td>
                          <td className="p-3">
                            <Input
                              type="number"
                              min="0"
                              value={recipientGuests}
                              onChange={(e) => handleRecipientChange(dateStr, e.target.value)}
                              className="w-20 ml-auto"
                            />
                          </td>
                          <td className="text-right p-3 font-semibold text-muted-foreground">
                            {total}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </ScrollArea>

            <div className="grid grid-cols-2 gap-4 p-4 bg-muted rounded-lg">
              <div>
                <div className="text-sm text-muted-foreground mb-1">
                  {splitDetails.source_family_group}
                </div>
                <div className="text-xl font-bold text-primary">
                  ${sourceTotal.toFixed(2)}
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  {totalSourceGuests} guest-nights
                </div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground mb-1">
                  {splitDetails.split_to_family_group}
                </div>
                <div className="text-xl font-bold text-green-600">
                  ${recipientTotal.toFixed(2)}
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  {totalRecipientGuests} guest-nights
                </div>
              </div>
            </div>
          </>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          {!recipientHasPaid && (
            <Button onClick={handleSave} disabled={saving}>
              {saving ? "Saving..." : "Save Changes"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
