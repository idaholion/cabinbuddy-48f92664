import React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import cabinHeroImage from "@/assets/cabin-hero.jpg";

const Optin1 = () => {
  const handleAccept = () => {
    // Navigate to optin2 page
    window.location.href = "/optin2";
  };

  const handleDecline = () => {
    // Handle decline action - could redirect or show message
    console.log("User declined consent");
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
              <CardTitle className="text-base">Phone Number Consent</CardTitle>
              <CardDescription className="text-base">
                Pressing ACCEPT shows you agree to have your phone receive text messages from Richard Andrew. 
                Message and data rates may apply. 
                Mobile information will not be shared with third parties for marketing/promotional purposes
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex flex-col gap-3">
                <Button 
                  onClick={handleDecline}
                  variant="outline"
                  className="w-full text-base"
                >
                  DECLINE
                </Button>
                <Button 
                  onClick={handleAccept}
                  className="w-full text-base"
                >
                  ACCEPT
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Optin1;