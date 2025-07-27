import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, DollarSign, Calendar, Settings } from "lucide-react";
import { Link } from "react-router-dom";

const Setup = () => {
  return (
    <div className="min-h-screen bg-cover bg-center bg-no-repeat p-4" style={{backgroundImage: 'url(/lovable-uploads/45c3083f-46c5-4e30-a2f0-31a24ab454f4.png)'}}>
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <Button variant="outline" asChild className="mb-4">
            <Link to="/home">← Back to Home</Link>
          </Button>
          <h1 className="text-4xl font-bold text-red-500 mb-2 text-center">Cabin Account Setup</h1>
          <p className="text-lg text-red-500 text-center">Follow these steps to configure your cabin management system</p>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <Card className="bg-card/95">
            <CardHeader>
              <CardTitle className="flex items-center">
                <Users className="h-6 w-6 mr-2" />
                Step 1: Family Setup
              </CardTitle>
              <CardDescription>
                Configure your organization details, administrator, treasurer, and calendar keeper information.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild className="w-full">
                <Link to="/family-setup?mode=create">Configure or Change Family Setup</Link>
              </Button>
            </CardContent>
          </Card>

          <Card className="bg-card/95">
            <CardHeader>
              <CardTitle className="flex items-center">
                <Users className="h-6 w-6 mr-2" />
                Step 2: Family Groups
              </CardTitle>
              <CardDescription>
                Set up individual family groups with lead members and host details.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild className="w-full" variant="secondary">
                <Link to="/family-group-setup">Configure or Change Family Groups</Link>
              </Button>
            </CardContent>
          </Card>

          <Card className="bg-card/95">
            <CardHeader>
              <CardTitle className="flex items-center">
                <DollarSign className="h-6 w-6 mr-2" />
                Step 3: Financial Setup
              </CardTitle>
              <CardDescription>
                Configure billing rates, payment settings, fees, and tax information for your cabin.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild className="w-full" variant="secondary">
                <Link to="/financial-setup">Configure or Change Finances</Link>
              </Button>
            </CardContent>
          </Card>

          <Card className="bg-card/95">
            <CardHeader>
              <CardTitle className="flex items-center">
                <Calendar className="h-6 w-6 mr-2" />
                Step 4: Reservation Setup
              </CardTitle>
              <CardDescription>
                Configure rotation schedules, time blocks, and seniority settings for reservations.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild className="w-full" variant="secondary">
                <Link to="/reservation-setup">Configure or Change Reservations</Link>
              </Button>
            </CardContent>
          </Card>
        </div>

        <div className="mt-8 text-center">
          <Card className="bg-card/95">
            <CardHeader>
              <CardTitle className="flex items-center justify-center">
                <Settings className="h-6 w-6 mr-2" />
                Setup Complete
              </CardTitle>
              <CardDescription>
                Once you've completed all steps above, your cabin management system will be ready to use!
              </CardDescription>
            </CardHeader>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Setup;