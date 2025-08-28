import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Shield, ArrowLeft } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";

const PrivacyPolicy = () => {
  const navigate = useNavigate();
  const location = useLocation();
  
  const handleGoBack = () => {
    // Check if there's a referrer in state, otherwise go to home
    const from = location.state?.from || '/home';
    navigate(from);
  };
  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <PageHeader 
        title="Privacy Policy"
        subtitle="Your privacy and data protection are important to us"
        icon={Shield}
      />
      
      <Card className="bg-card/95">
        <CardHeader>
          <CardTitle className="text-2xl text-center flex items-center justify-center gap-2">
            <Shield className="h-6 w-6" />
            SMS Privacy Policy
          </CardTitle>
          <CardDescription className="text-center">
            How we handle your personal information in our SMS messaging service
          </CardDescription>
        </CardHeader>
        <CardContent className="prose prose-slate max-w-none dark:prose-invert">
          <p className="mb-6">
            Cabinbuddy respects your privacy. By opting into our SMS messaging service, you agree to the following terms regarding how we handle your data:
          </p>
          
          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-semibold mb-2">1. Data Collection</h3>
              <p>
                We collect your name and mobile phone number when you sign up for SMS updates.
              </p>
            </div>
            
            <div>
              <h3 className="text-lg font-semibold mb-2">2. Data Usage</h3>
              <p>
                We use your data solely for sending updates, promotions, and reminders related to our products or services.
              </p>
            </div>
            
            <div>
              <h3 className="text-lg font-semibold mb-2">3. Data Security</h3>
              <p>
                We protect your data through encryption and secure storage measures to prevent unauthorized access.
              </p>
            </div>
            
            <div>
              <h3 className="text-lg font-semibold mb-2">4. Data Retention</h3>
              <p>
                We retain your information as long as you are subscribed to our SMS service. You may request deletion at any time.
              </p>
            </div>
            
            <div>
              <h3 className="text-lg font-semibold mb-2">5. Opt-Out</h3>
              <p>
                Reply STOP to any message to unsubscribe from our SMS list. After unsubscribing, we will remove your number from our list within 24 hours.
              </p>
            </div>
            
            <div>
              <h3 className="text-lg font-semibold mb-2">6. Non-Sharing Clause</h3>
              <p>
                We do not share your data with third parties for marketing purposes. Your information is only shared with our SMS service provider to enable messaging.
              </p>
            </div>
          </div>
          
          <div className="mt-8 p-4 bg-muted rounded-lg">
            <p className="text-sm text-muted-foreground">
              If you have any questions about this privacy policy or our data practices, please contact us through the appropriate channels in your cabin management system.
            </p>
          </div>
          
          <div className="mt-6 text-center">
            <Button onClick={handleGoBack} variant="outline" className="px-6">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Go Back
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default PrivacyPolicy;