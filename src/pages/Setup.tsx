import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users, DollarSign, Calendar, Settings, CheckCircle } from "lucide-react";
import { Link } from "react-router-dom";
import { useOrganization } from "@/hooks/useOrganization";
import { useFamilyGroups } from "@/hooks/useFamilyGroups";
import { useReservationSettings } from "@/hooks/useReservationSettings";
import { useRotationOrder } from "@/hooks/useRotationOrder";

const Setup = () => {
  const { organization } = useOrganization();
  const { familyGroups } = useFamilyGroups();
  const { reservationSettings } = useReservationSettings();
  const { rotationData } = useRotationOrder();

  // Check completion status for each step
  const isOrganizationComplete = Boolean(organization && 
    organization.name && 
    organization.admin_name && 
    organization.admin_email && 
    organization.treasurer_name && 
    organization.treasurer_email && 
    organization.calendar_keeper_name && 
    organization.calendar_keeper_email);
    
  const isFamilyGroupsComplete = Boolean(familyGroups && 
    familyGroups.length > 0 && 
    familyGroups.every(group => group.lead_name && group.lead_email));
    
  const isFinancialComplete = Boolean(reservationSettings && 
    reservationSettings.nightly_rate && 
    reservationSettings.cleaning_fee && 
    reservationSettings.damage_deposit);
    
  const isReservationComplete = Boolean(rotationData && 
    rotationData.rotation_order && 
    rotationData.rotation_order.length > 0 && 
    rotationData.max_time_slots && 
    rotationData.start_month);

  const CompletionBadge = ({ isComplete }: { isComplete: boolean }) => (
    isComplete ? (
      <Badge variant="secondary" className="ml-2 bg-green-100 text-green-800 border-green-200">
        <CheckCircle className="h-3 w-3 mr-1" />
        Complete
      </Badge>
    ) : (
      <Badge variant="outline" className="ml-2">
        Pending
      </Badge>
    )
  );

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
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center">
                  <Users className="h-6 w-6 mr-2" />
                  Step 1: Family Setup
                </div>
                <CompletionBadge isComplete={isOrganizationComplete} />
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
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center">
                  <Users className="h-6 w-6 mr-2" />
                  Step 2: Family Groups
                </div>
                <CompletionBadge isComplete={isFamilyGroupsComplete} />
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
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center">
                  <DollarSign className="h-6 w-6 mr-2" />
                  Step 3: Financial Setup
                </div>
                <CompletionBadge isComplete={isFinancialComplete} />
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
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center">
                  <Calendar className="h-6 w-6 mr-2" />
                  Step 4: Reservation Setup
                </div>
                <CompletionBadge isComplete={isReservationComplete} />
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