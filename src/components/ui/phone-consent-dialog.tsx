import React, { useState } from "react";
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
import { Button } from "@/components/ui/button";
import { Shield } from "lucide-react";

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
  const [showConfirmation, setShowConfirmation] = useState(false);

  const handleAccept = () => {
    setShowConfirmation(true);
  };

  const handleConfirmationContinue = () => {
    setShowConfirmation(false);
    onAccept();
  };

  const handleDecline = () => {
    setShowConfirmation(false);
    onDecline();
  };

  if (showConfirmation) {
    return (
      <AlertDialog open={true}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-base">Opt-in Confirmation</AlertDialogTitle>
            <AlertDialogDescription className="text-base">
              You have successfully opted in to receive messages from Richard Andrew via our website. 
              Message and data rates may apply. Reply to administrator HELP for support or STOP to unsubscribe.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction onClick={handleConfirmationContinue} className="text-base">
              Continue
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    );
  }

  return (
    <AlertDialog open={open}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="text-base">Phone Number Consent</AlertDialogTitle>
          <AlertDialogDescription className="text-base">
            Pressing ACCEPT shows you agree to have your phone receive SMS Messages from Richard Andrew. 
            Message and data rates may apply. 
            Mobile information will not be shared with third parties for marketing/promotional purposes. 
            Message Frequency Varies.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={handleDecline} className="text-base">
            DECLINE
          </AlertDialogCancel>
          <AlertDialogAction onClick={handleAccept} className="text-base">
            ACCEPT
          </AlertDialogAction>
        </AlertDialogFooter>
        
        <div className="px-6 pb-6">
          <div className="text-center">
            <Button variant="link" asChild className="text-xs text-muted-foreground hover:text-foreground">
              <a href="/privacy-policy" target="_blank" rel="noopener noreferrer">
                <Shield className="h-3 w-3 mr-1" />
                Privacy Policy
              </a>
            </Button>
          </div>
        </div>
      </AlertDialogContent>
    </AlertDialog>
  );
};