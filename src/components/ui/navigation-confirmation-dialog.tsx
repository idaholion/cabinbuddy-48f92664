import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";

interface NavigationConfirmationDialogProps {
  open: boolean;
  onSaveAndContinue?: () => void;
  onDiscardAndContinue: () => void;
  onCancel: () => void;
  title?: string;
  description?: string;
  showSaveOption?: boolean;
}

export const NavigationConfirmationDialog = ({
  open,
  onSaveAndContinue,
  onDiscardAndContinue,
  onCancel,
  title = "You have unsaved changes",
  description = "You have unsaved changes that will be lost if you leave this page. What would you like to do?",
  showSaveOption = false
}: NavigationConfirmationDialogProps) => {
  return (
    <AlertDialog open={open}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>
            {description}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="flex-col-reverse gap-2 sm:flex-row sm:gap-4">
          <Button variant="outline" onClick={onCancel}>
            Stay on Page
          </Button>
          <Button variant="destructive" onClick={onDiscardAndContinue}>
            Discard Changes
          </Button>
          {showSaveOption && onSaveAndContinue && (
            <Button onClick={onSaveAndContinue}>
              Save and Continue
            </Button>
          )}
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};