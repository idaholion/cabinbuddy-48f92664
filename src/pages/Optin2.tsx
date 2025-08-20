import React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import cabinHeroImage from "@/assets/cabin-hero.jpg";

const Optin2 = () => {
  const handleContinue = () => {
    // Handle continue action - could redirect to main site
    console.log("User confirmed consent");
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
              <CardTitle className="text-base">Opt-in Confirmation</CardTitle>
              <CardDescription className="text-base">
                You have successfully opted in to receive messages from Richard Andrew via our website. 
                Message and data rates may apply. Reply to administrator HELP for support or STOP to unsubscribe.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <Button 
                onClick={handleContinue}
                className="w-full text-base"
              >
                Continue
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Optin2;