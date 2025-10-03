import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "lucide-react";
import { format } from "date-fns";

interface ExtendSelectionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  familyGroup: string;
  currentEndDate: Date;
  onExtend: (newEndDate: string, reason?: string) => Promise<void>;
}

export const ExtendSelectionDialog = ({
  open,
  onOpenChange,
  familyGroup,
  currentEndDate,
  onExtend,
}: ExtendSelectionDialogProps) => {
  const [newEndDate, setNewEndDate] = useState(
    format(new Date(currentEndDate.getTime() + 7 * 24 * 60 * 60 * 1000), 'yyyy-MM-dd')
  );
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    setLoading(true);
    try {
      await onExtend(newEndDate, reason);
      onOpenChange(false);
    } finally {
      setLoading(false);
    }
  };

  const minDate = format(new Date(currentEndDate.getTime() + 24 * 60 * 60 * 1000), 'yyyy-MM-dd');

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Extend Selection Period
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label className="text-sm font-medium">Family Group</Label>
            <div className="text-sm text-muted-foreground">{familyGroup}</div>
          </div>

          <div className="space-y-2">
            <Label className="text-sm font-medium">Current End Date</Label>
            <div className="text-sm text-muted-foreground">
              {format(currentEndDate, 'MMMM d, yyyy')}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="new-end-date" className="text-sm font-medium">
              New End Date *
            </Label>
            <Input
              id="new-end-date"
              type="date"
              value={newEndDate}
              onChange={(e) => setNewEndDate(e.target.value)}
              min={minDate}
              required
            />
            <p className="text-xs text-muted-foreground">
              Must be after the current end date
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="reason" className="text-sm font-medium">
              Reason (Optional)
            </Label>
            <Textarea
              id="reason"
              placeholder="Enter reason for extension..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={loading || !newEndDate}
          >
            {loading ? "Extending..." : "Extend Period"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
