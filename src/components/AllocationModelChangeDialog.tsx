import { useState } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { AlertTriangle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

export type AllocationModel = "rotating_selection" | "manual_booking" | "static_weeks";

interface AllocationModelChangeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentModel: AllocationModel;
  newModel: AllocationModel;
  isTestOrganization: boolean;
  onConfirm: (reason: string) => void;
}

const MODEL_LABELS: Record<AllocationModel, string> = {
  rotating_selection: "Rotating Selection",
  manual_booking: "Manual Booking",
  static_weeks: "Static Weeks Assignment",
};

export function AllocationModelChangeDialog({
  open,
  onOpenChange,
  currentModel,
  newModel,
  isTestOrganization,
  onConfirm,
}: AllocationModelChangeDialogProps) {
  const [reason, setReason] = useState("");
  const [confirmText, setConfirmText] = useState("");
  
  const requiresConfirmText = !isTestOrganization;
  const isConfirmTextValid = !requiresConfirmText || confirmText === "CHANGE MODEL";

  const handleConfirm = () => {
    if (!isConfirmTextValid) return;
    onConfirm(reason);
    setReason("");
    setConfirmText("");
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-2xl">
        <AlertDialogHeader>
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-warning" />
            <AlertDialogTitle>
              {isTestOrganization ? "Change Allocation Model?" : "⚠️ Critical: Change Allocation Model?"}
            </AlertDialogTitle>
          </div>
          <AlertDialogDescription className="space-y-4 text-left">
            {!isTestOrganization && (
              <Alert variant="destructive" className="my-4">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  <strong>Production Organization Warning:</strong> Changing the allocation model
                  in a production organization can have significant impacts on your members'
                  reservations and expectations.
                </AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <p className="text-sm font-medium">
                You are changing the allocation model from:
              </p>
              <div className="flex items-center gap-2 text-sm">
                <span className="font-semibold text-foreground">
                  {MODEL_LABELS[currentModel]}
                </span>
                <span>→</span>
                <span className="font-semibold text-primary">
                  {MODEL_LABELS[newModel]}
                </span>
              </div>
            </div>

            <div className="space-y-2 text-sm">
              <p className="font-medium">This change will affect:</p>
              <ul className="list-disc pl-5 space-y-1">
                <li>How members book and reserve time periods</li>
                <li>The rotation order and selection process</li>
                <li>Any automated reservation workflows</li>
                <li>Member expectations and communication</li>
              </ul>
            </div>

            <div className="space-y-2">
              <Label htmlFor="reason">
                Reason for Change {!isTestOrganization && <span className="text-destructive">*</span>}
              </Label>
              <Textarea
                id="reason"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Explain why you're changing the allocation model..."
                className="min-h-[100px]"
                required={!isTestOrganization}
              />
            </div>

            {requiresConfirmText && (
              <div className="space-y-2">
                <Label htmlFor="confirmText">
                  Type <code className="text-xs bg-muted px-1 py-0.5 rounded">CHANGE MODEL</code> to confirm
                  <span className="text-destructive ml-1">*</span>
                </Label>
                <Input
                  id="confirmText"
                  value={confirmText}
                  onChange={(e) => setConfirmText(e.target.value)}
                  placeholder="CHANGE MODEL"
                  className={confirmText && !isConfirmTextValid ? "border-destructive" : ""}
                />
              </div>
            )}

            {!isTestOrganization && (
              <p className="text-xs text-muted-foreground">
                This action will be logged in the audit trail.
              </p>
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={() => {
            setReason("");
            setConfirmText("");
          }}>
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirm}
            disabled={!isConfirmTextValid || (!isTestOrganization && !reason)}
            className="bg-primary hover:bg-primary/90"
          >
            Change Allocation Model
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
