import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";

interface AdjustBillingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  stay: {
    id: string;
    family_group: string;
    calculatedAmount: number;
    manualAdjustment?: number;
    adjustmentNotes?: string;
    billingLocked?: boolean;
  };
  onSave: (data: {
    manualAdjustment: number;
    adjustmentNotes: string;
    billingLocked: boolean;
  }) => Promise<void>;
}

export const AdjustBillingDialog = ({
  open,
  onOpenChange,
  stay,
  onSave,
}: AdjustBillingDialogProps) => {
  const { toast } = useToast();
  const [adjustment, setAdjustment] = useState(stay.manualAdjustment || 0);
  const [notes, setNotes] = useState(stay.adjustmentNotes || "");
  const [locked, setLocked] = useState(stay.billingLocked || false);
  const [saving, setSaving] = useState(false);

  const finalAmount = stay.calculatedAmount + adjustment;

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave({
        manualAdjustment: adjustment,
        adjustmentNotes: notes,
        billingLocked: locked,
      });
      toast({
        title: "Billing adjusted",
        description: "Payment amount has been updated successfully.",
      });
      onOpenChange(false);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to adjust billing. Please try again.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Adjust Billing - {stay.family_group}</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div>
            <Label>Calculated Amount</Label>
            <div className="text-2xl font-bold text-muted-foreground">
              ${stay.calculatedAmount.toFixed(2)}
            </div>
          </div>

          <div>
            <Label htmlFor="adjustment">Manual Adjustment</Label>
            <Input
              id="adjustment"
              type="number"
              step="0.01"
              value={adjustment}
              onChange={(e) => setAdjustment(parseFloat(e.target.value) || 0)}
              placeholder="0.00"
              className="mt-1"
            />
            <p className="text-sm text-muted-foreground mt-1">
              Use positive numbers to add charges, negative for discounts
            </p>
          </div>

          <div>
            <Label>Final Amount</Label>
            <div className="text-2xl font-bold text-primary">
              ${finalAmount.toFixed(2)}
            </div>
          </div>

          <div>
            <Label htmlFor="notes">Adjustment Reason/Notes</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g., Early checkout discount, extra cleaning fee, damage deposit"
              className="mt-1"
              rows={3}
            />
          </div>

          <div className="flex items-center justify-between border rounded-lg p-3">
            <div>
              <Label htmlFor="locked" className="cursor-pointer">
                Lock Billing
              </Label>
              <p className="text-sm text-muted-foreground">
                Prevent automatic recalculation
              </p>
            </div>
            <Switch
              id="locked"
              checked={locked}
              onCheckedChange={setLocked}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? "Saving..." : "Save Adjustment"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
