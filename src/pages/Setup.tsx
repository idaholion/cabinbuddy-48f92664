import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Users, DollarSign, Calendar, Settings, CheckCircle, Sparkles, Info, Menu, X, MessageSquare, Home } from "lucide-react";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useOrganization } from "@/hooks/useOrganization";
import { useFamilyGroups } from "@/hooks/useFamilyGroups";
import { useReservationSettings } from "@/hooks/useReservationSettings";
import { useRotationOrder } from "@/hooks/useRotationOrder";

const Setup = () => {
  const { organization } = useOrganization();
  const { familyGroups } = useFamilyGroups();
  const { reservationSettings } = useReservationSettings();
  const { rotationData } = useRotationOrder();
  
  // Animation state
  const [showCelebration, setShowCelebration] = useState(false);
  const [cardAnimations, setCardAnimations] = useState([false, false, false, false, false]);
  const [progressValue, setProgressValue] = useState(0);
  
  // State for sidebar info card dismissal
  const [showSidebarInfo, setShowSidebarInfo] = useState(() => {
    // Only show for first-time users (check if dismissal is stored)
    return !localStorage.getItem('sidebarInfoDismissed');
  });

  // Debug the actual values causing completion to be true
  const orgComplete = !!(
    organization?.name?.trim() &&
    organization?.admin_name?.trim() &&
    organization?.admin_email?.trim()?.includes('@') &&
    organization?.treasurer_name?.trim() &&
    organization?.treasurer_email?.trim()?.includes('@') &&
    organization?.calendar_keeper_name?.trim() &&
    organization?.calendar_keeper_email?.trim()?.includes('@')
  );

  const familyComplete = !!(
    familyGroups &&
    familyGroups.length > 0 &&
    familyGroups.every(group => 
      group?.name?.trim() &&
      group?.lead_name?.trim() && 
      group?.lead_email?.trim()?.includes('@')
    )
  );

  // Show what's causing completion if either is true
  useEffect(() => {
    if (orgComplete || familyComplete) {
      console.log('=== COMPLETION DEBUG ===');
      console.log('Organization complete:', orgComplete);
      console.log('Organization data:', {
        name: organization?.name,
        admin_name: organization?.admin_name,
        admin_email: organization?.admin_email,
        treasurer_name: organization?.treasurer_name,
        treasurer_email: organization?.treasurer_email,
        calendar_keeper_name: organization?.calendar_keeper_name,
        calendar_keeper_email: organization?.calendar_keeper_email
      });
      console.log('Family groups complete:', familyComplete);
      console.log('Family groups data:', familyGroups?.map(g => ({
        name: g.name,
        lead_name: g.lead_name,
        lead_email: g.lead_email
      })));
    }
  }, [orgComplete, familyComplete, organization, familyGroups]);

  // Use the computed values
  const isOrganizationComplete = orgComplete;
  const isFamilyGroupsComplete = familyComplete;
    
  const isFinancialComplete = !!(
    reservationSettings?.nightly_rate &&
    reservationSettings.nightly_rate > 0 &&
    reservationSettings?.preferred_payment_method &&
    reservationSettings.preferred_payment_method.trim()
  );
    
  const isReservationComplete = !!(
    rotationData?.rotation_order &&
    Array.isArray(rotationData.rotation_order) &&
    rotationData.rotation_order.length > 0 &&
    rotationData.rotation_order.every(item => typeof item === 'string' && item.trim()) &&
    rotationData?.max_time_slots &&
    rotationData.max_time_slots > 0 &&
    rotationData?.start_month?.trim()
  );

  // Calendar Keeper Management is considered complete when the organization has a calendar keeper
  const isCalendarKeeperComplete = !!(
    organization?.calendar_keeper_name?.trim() &&
    organization?.calendar_keeper_email?.trim()?.includes('@')
  );

  // Determine the next step to highlight
  const getNextStep = () => {
    if (!isOrganizationComplete) return 1;
    if (!isFamilyGroupsComplete) return 2;
    if (!isFinancialComplete) return 3;
    if (!isReservationComplete) return 4;
    if (!isCalendarKeeperComplete) return 5;
    return null; // All complete
  };

  const nextStep = getNextStep();

  const getButtonVariant = (stepNumber: number, isComplete: boolean) => {
    if (isComplete) return "outline"; // Blue outline for completed
    if (stepNumber === nextStep) return "default"; // Green for next step
    return "secondary"; // Grey for pending steps
  };

  // Calculate overall progress
  const completedSteps = [
    isOrganizationComplete,
    isFamilyGroupsComplete,
    isFinancialComplete,
    isReservationComplete,
    isCalendarKeeperComplete
  ].filter(Boolean).length;
  const totalSteps = 5;
  const progressPercentage = (completedSteps / totalSteps) * 100;

  // Animation effects
  useEffect(() => {
    // Staggered card reveals on page load
    const timers = cardAnimations.map((_, index) => 
      setTimeout(() => {
        setCardAnimations(prev => {
          const newState = [...prev];
          newState[index] = true;
          return newState;
        });
      }, 200 + index * 150)
    );

    return () => timers.forEach(clearTimeout);
  }, []);

  useEffect(() => {
    // Animate progress bar
    const timer = setTimeout(() => {
      setProgressValue(progressPercentage);
    }, 800);

    return () => clearTimeout(timer);
  }, [progressPercentage]);

  useEffect(() => {
    // Show celebration when all complete
    if (completedSteps === totalSteps && !showCelebration) {
      const timer = setTimeout(() => {
        setShowCelebration(true);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [completedSteps, totalSteps, showCelebration]);

  const CompletionBadge = ({ isComplete, delay = 0 }: { isComplete: boolean; delay?: number }) => (
    <div className={cn(
      "transition-all duration-500 ease-out",
      isComplete ? "animate-scale-in" : "",
    )} style={{ animationDelay: `${delay}ms` }}>
      {isComplete ? (
        <Badge variant="secondary" className="ml-2 bg-green-100 text-green-800 border-green-200 animate-fade-in">
          <CheckCircle className={cn("h-3 w-3 mr-1 transition-transform duration-300", 
            isComplete ? "animate-scale-in" : "")} 
          />
          Complete
        </Badge>
      ) : (
        <Badge variant="outline" className="ml-2 opacity-70">
          Pending
        </Badge>
      )}
    </div>
  );

  const StepCard = ({ 
    stepNumber, 
    title, 
    description, 
    icon: Icon, 
    isComplete, 
    linkTo,
    linkText 
  }: {
    stepNumber: number;
    title: string;
    description: string;
    icon: any;
    isComplete: boolean;
    linkTo: string;
    linkText: string;
  }) => {
    const isNextStep = stepNumber === nextStep;
    const isVisible = cardAnimations[stepNumber - 1];
    
    return (
      <Card className={cn(
        "bg-card/95 transition-all duration-700 ease-out transform",
        isVisible ? "translate-y-0 opacity-100" : "translate-y-8 opacity-0",
        isComplete && "ring-2 ring-green-200 shadow-lg",
        isNextStep && !isComplete && "ring-2 ring-primary/30 shadow-md hover:ring-primary/50",
        "hover:scale-[1.02] hover:shadow-xl"
      )}>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center">
              <Icon className={cn(
                "h-6 w-6 mr-2 transition-all duration-300",
                isComplete && "text-green-600 animate-scale-in",
                isNextStep && !isComplete && "text-primary"
              )} />
              {title}
            </div>
            <CompletionBadge isComplete={isComplete} delay={stepNumber * 100} />
          </CardTitle>
          <CardDescription className="transition-opacity duration-300">
            {description}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button 
            asChild 
            className={cn(
              "w-full transition-all duration-300 hover:scale-[1.02]",
              isNextStep && !isComplete && "shadow-md hover:shadow-lg",
              isComplete && "hover:bg-green-50"
            )} 
            variant={getButtonVariant(stepNumber, isComplete)}
          >
            <Link to={linkTo}>{linkText}</Link>
          </Button>
        </CardContent>
      </Card>
    );
  };

  // Handle sidebar info card dismissal
  const handleDismissSidebarInfo = () => {
    setShowSidebarInfo(false);
    localStorage.setItem('sidebarInfoDismissed', 'true');
  };

  return (
    <div className="min-h-screen bg-cover bg-center bg-no-repeat px-4 pt-1 pb-4" style={{backgroundImage: 'url(/lovable-uploads/45c3083f-46c5-4e30-a2f0-31a24ab454f4.png)'}}>
      <div className="max-w-4xl mx-auto relative">
        {/* Circular Progress Dial - Upper Right Corner */}
        <div className="absolute top-4 right-4 z-10">
          <div className="relative w-20 h-20">
            {/* Background Circle */}
            <svg className="w-20 h-20 transform -rotate-90" viewBox="0 0 80 80">
              <circle
                cx="40"
                cy="40"
                r="36"
                fill="none"
                stroke="rgba(255,255,255,0.2)"
                strokeWidth="6"
              />
              {/* Progress Circle */}
              <circle
                cx="40"
                cy="40"
                r="36"
                fill="none"
                stroke={completedSteps === totalSteps ? "#22c55e" : "#3b82f6"}
                strokeWidth="6"
                strokeLinecap="round"
                strokeDasharray={`${2 * Math.PI * 36}`}
                strokeDashoffset={`${2 * Math.PI * 36 * (1 - progressValue / 100)}`}
                className="transition-all duration-1000 ease-out"
              />
            </svg>
            {/* Center Content */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center">
                <div className={cn(
                  "text-lg font-bold transition-all duration-300",
                  completedSteps === totalSteps ? "text-green-600" : "text-primary"
                )}>
                  {completedSteps}
                </div>
                <div className="text-xs text-muted-foreground">
                  of {totalSteps}
                </div>
                {completedSteps === totalSteps && (
                  <Sparkles className="h-3 w-3 text-green-600 animate-spin mx-auto mt-1" />
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="mb-4">
          <Button variant="outline" asChild className="mb-2">
            <Link to="/home">
              <Home className="h-4 w-4 mr-2" />
              Home
            </Link>
          </Button>
          <h1 className="text-6xl mb-4 font-kaushan text-primary drop-shadow-lg text-center">Cabin Account Setup</h1>
          <p className="text-2xl text-primary text-center font-medium">Follow these steps to configure your cabin management system</p>
        </div>

        {/* Sidebar Info Card - First time users only */}
        {showSidebarInfo && (
          <Alert className="mb-6 bg-blue-50 border-blue-200 text-blue-900">
            <Info className="h-4 w-4" />
            <AlertDescription className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Menu className="h-4 w-4" />
                <span>
                  <strong>Tip:</strong> Use the sidebar menu button (☰) in the top-left to navigate between different sections of the app. 
                  Click it to expand or collapse the navigation menu at any time.
                </span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleDismissSidebarInfo}
                className="ml-4 hover:bg-blue-100"
              >
                <X className="h-4 w-4" />
              </Button>
            </AlertDescription>
          </Alert>
        )}

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          <StepCard
            stepNumber={1}
            title="Step 1: Family Setup"
            description="Configure your organization details, administrator, treasurer, and calendar keeper information."
            icon={Users}
            isComplete={isOrganizationComplete}
            linkTo="/family-setup?mode=create"
            linkText="Configure or Change Family Setup"
          />

          <StepCard
            stepNumber={2}
            title="Step 2: Family Groups"
            description="Set up individual family groups with lead members and host details."
            icon={Users}
            isComplete={isFamilyGroupsComplete}
            linkTo="/family-group-setup"
            linkText="Configure or Change Family Groups"
          />

          <StepCard
            stepNumber={3}
            title="Step 3: Use Fee Setup"
            description="Configure use fee rates, payment settings, and billing information for your cabin."
            icon={DollarSign}
            isComplete={isFinancialComplete}
            linkTo="/use-fee-setup"
            linkText="Configure or Change Use Fees"
          />

          <StepCard
            stepNumber={4}
            title="Step 4: Reservation Setup"
            description="Configure rotation schedules, time blocks, and seniority settings for reservations."
            icon={Calendar}
            isComplete={isReservationComplete}
            linkTo="/reservation-setup"
            linkText="Configure or Change Reservations"
          />

          <StepCard
            stepNumber={5}
            title="Step 5: Calendar Keeper Management"
            description="Configure messaging templates and reminder settings for communicating with cabin users about deadlines and updates."
            icon={MessageSquare}
            isComplete={isCalendarKeeperComplete}
            linkTo="/calendar-keeper-management"
            linkText="Configure Calendar Keeper Management"
          />
        </div>

        <div className="mt-8 text-center">
          <Card className={cn(
            "bg-card/95 transition-all duration-700 ease-out transform",
            showCelebration ? "animate-scale-in ring-4 ring-green-200 shadow-2xl" : "",
            completedSteps === totalSteps ? "bg-gradient-to-br from-green-50 to-emerald-50" : ""
          )}>
            <CardHeader>
              <CardTitle className={cn(
                "flex items-center justify-center transition-all duration-500",
                completedSteps === totalSteps ? "text-green-700" : ""
              )}>
                <Settings className={cn(
                  "h-6 w-6 mr-2 transition-all duration-300",
                  completedSteps === totalSteps ? "text-green-600 animate-spin" : ""
                )} />
                {completedSteps === totalSteps ? "🎉 Setup Complete! 🎉" : "Setup Complete"}
                {showCelebration && (
                  <div className="absolute inset-0 pointer-events-none">
                    <div className="absolute top-0 left-1/4 animate-bounce">✨</div>
                    <div className="absolute top-2 right-1/4 animate-bounce delay-100">🎊</div>
                    <div className="absolute bottom-4 left-1/3 animate-bounce delay-200">⭐</div>
                    <div className="absolute bottom-2 right-1/3 animate-bounce delay-300">🌟</div>
                  </div>
                )}
              </CardTitle>
              <CardDescription className={cn(
                "transition-all duration-300",
                completedSteps === totalSteps ? "text-green-600 font-medium" : ""
              )}>
                {completedSteps === totalSteps 
                  ? "Congratulations! Your cabin management system is fully configured and ready to use!"
                  : "Once you've completed all steps above, your cabin management system will be ready to use!"
                }
              </CardDescription>
            </CardHeader>
            {completedSteps === totalSteps && (
              <CardContent className="animate-fade-in">
                <Button asChild className="w-full max-w-md mx-auto bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 hover:scale-[1.02] transition-all duration-200">
                  <Link to="/home">🏠 Go to Dashboard</Link>
                </Button>
              </CardContent>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Setup;