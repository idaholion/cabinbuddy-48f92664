import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Users, DollarSign, Calendar, Settings, CheckCircle, Play } from "lucide-react";
import { Link } from "react-router-dom";
import { useOrganization } from "@/hooks/useOrganization";
import { useFamilyGroups } from "@/hooks/useFamilyGroups";
import { useReservationSettings } from "@/hooks/useReservationSettings";
import { useRotationOrder } from "@/hooks/useRotationOrder";
import { TourProvider, useTour } from "@reactour/tour";

const SetupWithTourContent = () => {
  const { organization } = useOrganization();
  const { familyGroups, loading: familyGroupsLoading } = useFamilyGroups();
  const { reservationSettings, loading: reservationLoading } = useReservationSettings();
  const { rotationData } = useRotationOrder();

  // Organization completion check
  const isOrganizationComplete = !!(
    organization?.name &&
    organization?.address &&
    organization?.contact_email
  );

  // Family groups completion check
  const isFamilyGroupsComplete = !familyGroupsLoading && familyGroups && familyGroups.length > 0;

  // Financial completion check
  const isFinancialComplete = !!(
    organization?.yearly_cost &&
    organization?.deposit_amount &&
    organization?.late_fee_amount
  );

  // Reservation completion check
  const isReservationComplete = !reservationLoading && !!(
    reservationSettings?.max_reservations_per_family &&
    reservationSettings?.advance_booking_days &&
    rotationData && Object.keys(rotationData).length > 0
  );

  console.log("Setup completion status:", {
    isOrganizationComplete,
    isFamilyGroupsComplete,
    isFinancialComplete,
    isReservationComplete,
    organization,
    familyGroups,
    reservationSettings,
    rotationData
  });

  const getNextStep = () => {
    if (!isOrganizationComplete) return 'organization';
    if (!isFamilyGroupsComplete) return 'family-groups';
    if (!isFinancialComplete) return 'financial';
    if (!isReservationComplete) return 'reservation';
    return null;
  };

  const getButtonVariant = (stepCompleted: boolean, stepType: string) => {
    if (stepCompleted) return "secondary";
    const nextStep = getNextStep();
    if (nextStep === stepType) return "default";
    return "secondary";
  };

  // Calculate overall progress
  const completedSteps = [
    isOrganizationComplete,
    isFamilyGroupsComplete,
    isFinancialComplete,
    isReservationComplete
  ].filter(Boolean).length;
  const totalSteps = 4;
  const progressPercentage = (completedSteps / totalSteps) * 100;

  const CompletionBadge = ({ isComplete }: { isComplete: boolean }) => (
    isComplete ? (
      <Badge variant="secondary" className="ml-2 bg-green-100 text-green-800 border-green-200">
        <CheckCircle className="w-3 h-3 mr-1" />
        Complete
      </Badge>
    ) : (
      <Badge variant="outline" className="ml-2">Pending</Badge>
    )
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-accent/20">
      <div 
        className="relative min-h-screen bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: "url('/src/assets/cabin-hero.jpg')" }}
      >
        <div className="absolute inset-0 bg-background/80"></div>
        
        <div className="relative z-10 container mx-auto px-4 py-12">
          <Button variant="outline" asChild className="mb-6" data-tour="back-button">
            <Link to="/">← Back to Home</Link>
          </Button>
          <h1 className="text-6xl mb-4 font-kaushan text-primary drop-shadow-lg text-center" data-tour="title">
            Cabin Account Setup
          </h1>
          <p className="text-2xl text-primary text-center font-medium">
            Follow these steps to configure your cabin management system
          </p>
          
          {/* Progress Indicator */}
          <div className="bg-card/95 p-6 rounded-lg mt-6" data-tour="progress">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-medium text-muted-foreground">Setup Progress</span>
              <span className="text-sm font-medium text-muted-foreground">{completedSteps} of {totalSteps} completed</span>
            </div>
            <Progress value={progressPercentage} className="h-3" />
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-2 relative z-10 container mx-auto px-4">
          {/* Organization Details Setup */}
          <Card className="bg-card/95 backdrop-blur-sm border-border/50" data-tour="organization-step">
            <CardHeader>
              <CardTitle className="flex items-center">
                <Settings className="h-6 w-6 mr-2 text-primary" />
                Organization Details
                <CompletionBadge isComplete={isOrganizationComplete} />
              </CardTitle>
              <CardDescription>
                Set up basic information about your cabin organization including name, address, and contact details.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button 
                asChild 
                variant={getButtonVariant(isOrganizationComplete, 'organization')}
                className="w-full"
              >
                <Link to="/organization-detail">
                  {isOrganizationComplete ? 'Review Details' : 'Start Setup'}
                </Link>
              </Button>
            </CardContent>
          </Card>

          {/* Family Groups Setup */}
          <Card className="bg-card/95 backdrop-blur-sm border-border/50" data-tour="family-groups-step">
            <CardHeader>
              <CardTitle className="flex items-center">
                <Users className="h-6 w-6 mr-2 text-primary" />
                Family Groups
                <CompletionBadge isComplete={isFamilyGroupsComplete} />
              </CardTitle>
              <CardDescription>
                Create and manage family groups that will share the cabin. Each group represents a household or unit.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button 
                asChild 
                variant={getButtonVariant(isFamilyGroupsComplete, 'family-groups')}
                className="w-full"
              >
                <Link to="/family-group-setup">
                  {isFamilyGroupsComplete ? 'Manage Groups' : 'Create Groups'}
                </Link>
              </Button>
            </CardContent>
          </Card>

          {/* Financial Setup */}
          <Card className="bg-card/95 backdrop-blur-sm border-border/50" data-tour="financial-step">
            <CardHeader>
              <CardTitle className="flex items-center">
                <DollarSign className="h-6 w-6 mr-2 text-primary" />
                Financial Settings
                <CompletionBadge isComplete={isFinancialComplete} />
              </CardTitle>
              <CardDescription>
                Configure yearly costs, deposits, and fee structures for cabin usage and maintenance.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button 
                asChild 
                variant={getButtonVariant(isFinancialComplete, 'financial')}
                className="w-full"
              >
                <Link to="/financial-setup">
                  {isFinancialComplete ? 'Review Settings' : 'Setup Finances'}
                </Link>
              </Button>
            </CardContent>
          </Card>

          {/* Reservation System Setup */}
          <Card className="bg-card/95 backdrop-blur-sm border-border/50" data-tour="reservation-step">
            <CardHeader>
              <CardTitle className="flex items-center">
                <Calendar className="h-6 w-6 mr-2 text-primary" />
                Reservation System
                <CompletionBadge isComplete={isReservationComplete} />
              </CardTitle>
              <CardDescription>
                Set up booking rules, rotation order, and reservation policies for fair cabin access.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button 
                asChild 
                variant={getButtonVariant(isReservationComplete, 'reservation')}
                className="w-full"
              >
                <Link to="/reservation-setup">
                  {isReservationComplete ? 'Review System' : 'Setup Reservations'}
                </Link>
              </Button>
            </CardContent>
          </Card>

          {/* Setup Complete Card */}
          <Card className="md:col-span-2 bg-card/95 backdrop-blur-sm border-border/50" data-tour="completion">
            <CardHeader>
              <CardTitle className="flex items-center justify-center text-center">
                <CheckCircle className="h-6 w-6 mr-2 text-green-600" />
                Setup Complete!
              </CardTitle>
              <CardDescription className="text-center">
                {progressPercentage === 100 
                  ? "Congratulations! Your cabin management system is fully configured and ready to use."
                  : `Complete the remaining ${totalSteps - completedSteps} step${totalSteps - completedSteps !== 1 ? 's' : ''} above to finish setup.`
                }
              </CardDescription>
            </CardHeader>
            <CardContent className="text-center">
              <Button 
                asChild 
                variant={progressPercentage === 100 ? "default" : "secondary"}
                className="w-full md:w-auto"
                disabled={progressPercentage !== 100}
              >
                <Link to="/">
                  {progressPercentage === 100 ? 'Go to Dashboard' : 'Complete Setup First'}
                </Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

const TourButton = () => {
  const { setIsOpen } = useTour();
  
  return (
    <Button 
      onClick={() => setIsOpen(true)}
      className="fixed bottom-6 right-6 z-50 shadow-lg"
      size="lg"
    >
      <Play className="h-4 w-4 mr-2" />
      Start Tour
    </Button>
  );
};

const SetupWithTour = () => {
  const steps = [
    {
      selector: '[data-tour="progress"]',
      content: (
        <div className="space-y-3">
          <h3 className="font-semibold text-lg">Welcome to Setup! 🎉</h3>
          <p>This progress bar shows your setup completion. Let's walk through each step to get your cabin management system ready!</p>
        </div>
      ),
    },
    {
      selector: '[data-tour="organization-step"]',
      content: (
        <div className="space-y-3">
          <h3 className="font-semibold text-lg">Organization Details</h3>
          <p>Start by setting up your basic organization information. This includes your cabin's name, address, and contact details.</p>
          <p className="text-sm text-muted-foreground">💡 This information will appear on documents and communications.</p>
        </div>
      ),
    },
    {
      selector: '[data-tour="family-groups-step"]',
      content: (
        <div className="space-y-3">
          <h3 className="font-semibold text-lg">Family Groups</h3>
          <p>Create family groups that will share the cabin. Each group represents a household or family unit that will make reservations.</p>
          <p className="text-sm text-muted-foreground">👥 You can add members to each group and assign roles.</p>
        </div>
      ),
    },
    {
      selector: '[data-tour="financial-step"]',
      content: (
        <div className="space-y-3">
          <h3 className="font-semibold text-lg">Financial Settings</h3>
          <p>Configure the financial aspects like yearly costs, deposits, and late fees. This ensures fair cost sharing among all families.</p>
          <p className="text-sm text-muted-foreground">💰 Set up transparent pricing that works for everyone.</p>
        </div>
      ),
    },
    {
      selector: '[data-tour="reservation-step"]',
      content: (
        <div className="space-y-3">
          <h3 className="font-semibold text-lg">Reservation System</h3>
          <p>Set up the booking rules and rotation order. This determines how families can reserve the cabin and ensures fair access.</p>
          <p className="text-sm text-muted-foreground">📅 Configure advance booking periods and reservation limits.</p>
        </div>
      ),
    },
    {
      selector: '[data-tour="completion"]',
      content: (
        <div className="space-y-3">
          <h3 className="font-semibold text-lg">You're Almost Done! ✨</h3>
          <p>Once all steps are complete, you'll have a fully functional cabin management system ready for your families to use.</p>
          <p className="text-sm text-muted-foreground">🏡 Your cabin community is just a few clicks away!</p>
        </div>
      ),
    },
  ];

  return (
    <TourProvider 
      steps={steps}
      styles={{
        popover: (base) => ({
          ...base,
          '--reactour-accent': 'hsl(var(--primary))',
          borderRadius: '12px',
          boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
        }),
        maskArea: (base) => ({
          ...base,
          rx: 8,
        }),
        badge: (base) => ({
          ...base,
          backgroundColor: 'hsl(var(--primary))',
        }),
      }}
      padding={{ mask: 10, popover: [10, 20] }}
      showBadge={true}
      showCloseButton={true}
      showNavigation={true}
      showDots={true}
      disableKeyboardNavigation={false}
    >
      <SetupWithTourContent />
      <TourButton />
    </TourProvider>
  );
};

export default SetupWithTour;