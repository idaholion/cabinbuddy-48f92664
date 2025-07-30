import { useState } from "react";
import { AlertTriangle, Shield, CheckCircle } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";

interface SupervisorBulkOperationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  operationType: string;
  affectedRecords: number;
  organizationName: string;
  onConfirm: () => void;
  loading?: boolean;
}

export const SupervisorBulkOperationDialog = ({
  open,
  onOpenChange,
  operationType,
  affectedRecords,
  organizationName,
  onConfirm,
  loading = false,
}: SupervisorBulkOperationDialogProps) => {
  const [confirmationText, setConfirmationText] = useState("");
  const [acknowledged, setAcknowledged] = useState(false);
  
  const requiredText = "CONFIRM BULK OPERATION";
  const isConfirmationValid = confirmationText === requiredText && acknowledged;

  const handleConfirm = () => {
    if (isConfirmationValid) {
      onConfirm();
    }
  };

  const handleClose = () => {
    setConfirmationText("");
    setAcknowledged(false);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-orange-100 rounded-full">
              <AlertTriangle className="h-6 w-6 text-orange-600" />
            </div>
            <div>
              <DialogTitle className="text-lg font-semibold">
                Supervisor Authorization Required
              </DialogTitle>
              <Badge variant="secondary" className="mt-1">
                <Shield className="h-3 w-3 mr-1" />
                Bulk Operation
              </Badge>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4">
          <Alert className="border-orange-200 bg-orange-50">
            <AlertTriangle className="h-4 w-4 text-orange-600" />
            <AlertDescription className="text-orange-800">
              <strong>Warning:</strong> This operation will affect multiple records simultaneously.
            </AlertDescription>
          </Alert>

          <div className="bg-gray-50 p-4 rounded-lg space-y-2">
            <div className="grid grid-cols-2 gap-2 text-sm">
              <span className="font-medium">Operation:</span>
              <span className="capitalize">{operationType}</span>
              
              <span className="font-medium">Organization:</span>
              <span>{organizationName}</span>
              
              <span className="font-medium">Records Affected:</span>
              <span className="text-orange-600 font-semibold">{affectedRecords}</span>
            </div>
          </div>

          <DialogDescription className="text-sm text-gray-600">
            This operation will modify multiple family groups at once. Only supervisors 
            can perform bulk operations to prevent accidental data loss.
          </DialogDescription>

          <div className="space-y-3">
            <div className="space-y-2">
              <Label htmlFor="confirmation" className="text-sm font-medium">
                Type <code className="px-1 py-0.5 bg-gray-100 rounded text-xs">{requiredText}</code> to confirm:
              </Label>
              <Input
                id="confirmation"
                value={confirmationText}
                onChange={(e) => setConfirmationText(e.target.value)}
                placeholder="Type confirmation text"
                className="font-mono text-sm"
              />
            </div>

            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="acknowledge"
                checked={acknowledged}
                onChange={(e) => setAcknowledged(e.target.checked)}
                className="h-4 w-4"
              />
              <Label htmlFor="acknowledge" className="text-sm">
                I understand this action affects multiple records and cannot be easily undone
              </Label>
            </div>
          </div>
        </div>

        <DialogFooter className="flex-col space-y-2">
          <div className="flex gap-2 w-full">
            <Button
              variant="outline"
              onClick={handleClose}
              disabled={loading}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              onClick={handleConfirm}
              disabled={!isConfirmationValid || loading}
              className="flex-1 bg-orange-600 hover:bg-orange-700"
            >
              {loading ? (
                "Processing..."
              ) : (
                <>
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Confirm Operation
                </>
              )}
            </Button>
          </div>
          
          {!isConfirmationValid && (confirmationText || acknowledged) && (
            <p className="text-xs text-gray-500 text-center">
              Both confirmation text and acknowledgment are required
            </p>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};