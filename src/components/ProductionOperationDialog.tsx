import { ReactNode } from "react";
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
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertTriangle } from "lucide-react";

interface ProductionOperationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  title: string;
  description: string | ReactNode;
  actionLabel?: string;
  isTestOrganization: boolean;
}

/**
 * Dialog for confirming critical operations in production organizations.
 * Shows a warning banner for production orgs, simple confirmation for test orgs.
 */
export function ProductionOperationDialog({
  open,
  onOpenChange,
  onConfirm,
  title,
  description,
  actionLabel = "Confirm",
  isTestOrganization,
}: ProductionOperationDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <div className="flex items-center gap-2">
            <AlertTriangle className={isTestOrganization ? "h-5 w-5 text-warning" : "h-5 w-5 text-destructive"} />
            <AlertDialogTitle>{title}</AlertDialogTitle>
          </div>
          <AlertDialogDescription className="space-y-4 text-left">
            {!isTestOrganization && (
              <Alert variant="destructive" className="my-4">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  <strong>Production Organization Warning:</strong> This action will affect your
                  live production data. Please ensure you want to proceed.
                </AlertDescription>
              </Alert>
            )}
            {typeof description === 'string' ? <p>{description}</p> : description}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm} className={isTestOrganization ? "" : "bg-destructive hover:bg-destructive/90"}>
            {actionLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
