import React from "react";
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

interface PhoneConsentDialogProps {
  open: boolean;
  onAccept: () => void;
  onDecline: () => void;
}

export const PhoneConsentDialog = ({
  open,
  onAccept,
  onDecline,
}: PhoneConsentDialogProps) => {
  return (
    <AlertDialog open={open}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="text-base">Phone Number Consent</AlertDialogTitle>
          <AlertDialogDescription className="text-base">
            Pressing ACCEPT shows you agree to have your phone receive text messages from other users or Cabinbuddy managers. 
            If you do not wish to have your phone receive messages, press DECLINE. 
            Mobile information will not be shared with third parties for marketing/promotional purposes.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={onDecline} className="text-base">
            DECLINE
          </AlertDialogCancel>
          <AlertDialogAction onClick={onAccept} className="text-base">
            ACCEPT
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};