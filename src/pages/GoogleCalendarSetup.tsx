import { GoogleCalendarSettings } from "@/components/GoogleCalendarSettings";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";

const GoogleCalendarSetup = () => {
  const navigate = useNavigate();

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Google Calendar Integration</h1>
          <p className="text-muted-foreground mt-1">
            Set up one-way sync from CabinBuddy to your Google Calendar
          </p>
        </div>
        <Button variant="outline" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
      </div>

      {/* Google Calendar Settings Component */}
      <GoogleCalendarSettings />
    </div>
  );
};

export default GoogleCalendarSetup;