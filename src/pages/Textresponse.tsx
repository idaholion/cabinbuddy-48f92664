import React, { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PhoneInput } from "@/components/ui/phone-input";
import { PhoneConsentDialog } from "@/components/ui/phone-consent-dialog";
import { Link } from "react-router-dom";
import { Shield } from "lucide-react";
import cabinHeroImage from "@/assets/cabin-hero.jpg";

const Textresponse = () => {
  const [phoneNumber, setPhoneNumber] = useState("");
  const [showConsentDialog, setShowConsentDialog] = useState(false);

  const handleTestConsent = () => {
    if (phoneNumber.trim()) {
      setShowConsentDialog(true);
    }
  };

  const handleConsentAccept = () => {
    setShowConsentDialog(false);
    // Reset form for demonstration purposes
    setPhoneNumber("");
  };

  const handleConsentDecline = () => {
    setShowConsentDialog(false);
    // Reset form for demonstration purposes
    setPhoneNumber("");
  };

  return (
    <div 
      className="min-h-screen bg-cover bg-center bg-no-repeat"
      style={{ backgroundImage: `url(${cabinHeroImage})` }}
    >
      <div className="min-h-screen bg-black/50 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <Card className="border-0 shadow-2xl bg-background/95 backdrop-blur">
            <CardHeader className="text-center">
              <CardTitle className="text-2xl">Phone Number Consent Demonstration</CardTitle>
              <CardDescription className="text-base">
                This page demonstrates the phone number consent flow for text messaging compliance.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <label htmlFor="phone" className="text-sm font-medium">
                  Phone Number
                </label>
                <PhoneInput
                  value={phoneNumber}
                  onChange={setPhoneNumber}
                  autoFormat={true}
                />
              </div>
              
              <Button 
                onClick={handleTestConsent}
                className="w-full"
                disabled={!phoneNumber.trim()}
              >
                Test Consent Flow
              </Button>

              <div className="text-sm text-muted-foreground text-center">
                <p>Phone Number Consent. Pressing ACCEPT shows you agree to have your phone receive SMS Messages from Richard Andrew. Message and data rates may apply. Mobile information will not be shared with third parties for marketing/promotional purposes. Message Frequency Varies.</p>
              </div>
              
              <div className="text-center pt-4">
                <Button variant="link" asChild className="text-xs text-muted-foreground hover:text-foreground">
                  <Link to="/privacy-policy" state={{ from: '/textresponse' }}>
                    <Shield className="h-3 w-3 mr-1" />
                    Privacy Policy
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <PhoneConsentDialog
        open={showConsentDialog}
        onAccept={handleConsentAccept}
        onDecline={handleConsentDecline}
      />
    </div>
  );
};

export default Textresponse;