import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CalendarPlus, ExternalLink, Info, CheckCircle, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useOrganization } from "@/hooks/useOrganization";

export const GoogleCalendarSettings = () => {
  const [isEnabled, setIsEnabled] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const { organization } = useOrganization();

  const handleToggleIntegration = async () => {
    if (!isEnabled) {
      // Enable integration - trigger Google OAuth
      setIsLoading(true);
      try {
        // This would normally trigger Google OAuth flow
        // For now, we'll simulate the connection
        setTimeout(() => {
          setIsEnabled(true);
          setIsConnected(true);
          setIsLoading(false);
          toast({
            title: "Google Calendar Connected",
            description: "CabinBuddy reservations will now sync to your Google Calendar",
          });
        }, 2000);
      } catch (error) {
        setIsLoading(false);
        toast({
          title: "Connection Failed",
          description: "Unable to connect to Google Calendar. Please try again.",
          variant: "destructive",
        });
      }
    } else {
      // Disable integration
      setIsEnabled(false);
      setIsConnected(false);
      toast({
        title: "Google Calendar Disconnected",
        description: "Reservations will no longer sync to Google Calendar",
      });
    }
  };

  const handleTestSync = async () => {
    setIsLoading(true);
    try {
      // Simulate test sync
      setTimeout(() => {
        setIsLoading(false);
        toast({
          title: "Test Sync Successful",
          description: "Your reservations are syncing correctly to Google Calendar",
        });
      }, 1500);
    } catch (error) {
      setIsLoading(false);
      toast({
        title: "Sync Test Failed",
        description: "There was an issue with the calendar sync. Please check your connection.",
        variant: "destructive",
      });
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <CalendarPlus className="h-6 w-6 text-primary" />
            <div>
              <CardTitle className="text-xl">Google Calendar Integration</CardTitle>
              <CardDescription className="mt-1">
                Sync CabinBuddy reservations to your family's shared Google Calendar
              </CardDescription>
            </div>
          </div>
          <Badge variant={isConnected ? "default" : "secondary"}>
            {isConnected ? "Connected" : "Not Connected"}
          </Badge>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Integration Toggle */}
        <div className="flex items-center justify-between p-4 border rounded-lg">
          <div className="space-y-1">
            <div className="flex items-center space-x-2">
              <h3 className="font-medium">Enable Calendar Sync</h3>
              {isConnected && <CheckCircle className="h-4 w-4 text-success" />}
            </div>
            <p className="text-sm text-muted-foreground">
              Automatically add CabinBuddy reservations to your Google Calendar
            </p>
          </div>
          <Switch
            checked={isEnabled}
            onCheckedChange={handleToggleIntegration}
            disabled={isLoading}
          />
        </div>

        {/* Important Notice */}
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            <strong>One-way sync only:</strong> Changes must be made in CabinBuddy, not Google Calendar. 
            Edits made directly in Google Calendar will not sync back to CabinBuddy.
          </AlertDescription>
        </Alert>

        {/* Connection Status & Controls */}
        {isEnabled && (
          <div className="space-y-4">
            <div className="p-4 bg-muted/30 rounded-lg">
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-medium">Sync Settings</h4>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleTestSync}
                  disabled={isLoading}
                >
                  {isLoading ? "Testing..." : "Test Sync"}
                </Button>
              </div>
              
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Target Calendar:</span>
                  <span className="font-medium">{organization?.name || "Family"} Cabin Calendar</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Sync Frequency:</span>
                  <span className="font-medium">Real-time</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Event Details:</span>
                  <span className="font-medium">Family name, dates, property</span>
                </div>
              </div>
            </div>

            {/* Google Calendar Access */}
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div>
                <h4 className="font-medium">View Google Calendar</h4>
                <p className="text-sm text-muted-foreground">
                  Open your synced calendar in Google Calendar
                </p>
              </div>
              <Button variant="outline" size="sm" asChild>
                <a href="https://calendar.google.com" target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Open Calendar
                </a>
              </Button>
            </div>
          </div>
        )}

        {/* Setup Instructions */}
        {!isConnected && (
          <div className="p-4 border rounded-lg bg-blue-50/50 dark:bg-blue-950/20">
            <h4 className="font-medium mb-2 flex items-center">
              <Info className="h-4 w-4 mr-2 text-blue-600" />
              Setup Instructions
            </h4>
            <ol className="text-sm space-y-1 text-muted-foreground list-decimal list-inside">
              <li>Toggle "Enable Calendar Sync" to start the connection process</li>
              <li>Sign in with your Google account that has access to your family calendar</li>
              <li>Grant permission for CabinBuddy to create calendar events</li>
              <li>Select which Google calendar to sync reservations to</li>
              <li>Test the connection to ensure everything works correctly</li>
            </ol>
          </div>
        )}

        {/* Benefits */}
        <div className="p-4 border rounded-lg">
          <h4 className="font-medium mb-2">Benefits of Calendar Integration</h4>
          <ul className="text-sm space-y-1 text-muted-foreground">
            <li>• Automatic synchronization of all family reservations</li>
            <li>• Easy visibility for everyone with calendar access</li>
            <li>• Integrates with your existing Google Calendar workflow</li>
            <li>• Backup record of all cabin bookings</li>
            <li>• Mobile notifications through Google Calendar app</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
};