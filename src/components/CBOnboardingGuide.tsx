import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { 
  Home, 
  Users, 
  DollarSign, 
  Calendar, 
  MessageSquare, 
  Sparkles,
  ChevronLeft,
  ChevronRight,
  CheckCircle
} from "lucide-react";
import { cn } from "@/lib/utils";

interface CBOnboardingGuideProps {
  onComplete: () => void;
  onSkip: () => void;
}

interface StepContent {
  icon: React.ElementType;
  iconColor: string;
  title: string;
  subtitle?: string;
  description: string;
  bullets?: string[];
}

const STEPS: StepContent[] = [
  {
    icon: Home,
    iconColor: "text-primary",
    title: "Hi! I'm CB, your CabinBuddy guide",
    subtitle: "Let's get your cabin organized!",
    description: "I'll walk you through setting up your cabin sharing organization. This takes about 10-15 minutes, and you can always come back to make changes later.",
  },
  {
    icon: Users,
    iconColor: "text-blue-600",
    title: "Step 1: Organization Details",
    description: "First, we'll set up the basics about your organization and the key people who will help manage it.",
    bullets: [
      "Organization & property name",
      "Administrator contact info",
      "Treasurer contact info",
      "Calendar Keeper contact info",
    ],
  },
  {
    icon: DollarSign,
    iconColor: "text-green-600",
    title: "Step 2: Use Fee Setup",
    description: "Next, we'll configure how much it costs to use the cabin and how families can pay.",
    bullets: [
      "Nightly use fee rate",
      "Preferred payment method",
      "Payment instructions",
      "Billing preferences",
    ],
  },
  {
    icon: Calendar,
    iconColor: "text-orange-600",
    title: "Step 3: Reservation Rules",
    description: "Then we'll set up how reservations work - who picks when, and the rules for booking.",
    bullets: [
      "Rotation order for families",
      "Maximum time slots per selection",
      "Season start and end dates",
      "Booking rules and restrictions",
    ],
  },
  {
    icon: MessageSquare,
    iconColor: "text-purple-600",
    title: "Step 4: Calendar Keeper Management",
    description: "Finally, we'll configure how to communicate with families about their reservations.",
    bullets: [
      "Messaging templates",
      "Reminder notifications",
      "Communication preferences",
    ],
  },
  {
    icon: Sparkles,
    iconColor: "text-primary",
    title: "You're all set to begin!",
    description: "That's the overview! Each step has helpful guidance along the way. Don't worry - you can always come back and make changes.",
    subtitle: "Ready to get started?",
  },
];

export const CBOnboardingGuide = ({ onComplete, onSkip }: CBOnboardingGuideProps) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);

  const totalSteps = STEPS.length;
  const step = STEPS[currentStep];
  const isFirstStep = currentStep === 0;
  const isLastStep = currentStep === totalSteps - 1;
  const progress = ((currentStep + 1) / totalSteps) * 100;

  const goToNext = () => {
    if (isLastStep) {
      onComplete();
      return;
    }
    setIsAnimating(true);
    setTimeout(() => {
      setCurrentStep((prev) => Math.min(prev + 1, totalSteps - 1));
      setIsAnimating(false);
    }, 150);
  };

  const goToPrevious = () => {
    setIsAnimating(true);
    setTimeout(() => {
      setCurrentStep((prev) => Math.max(prev - 1, 0));
      setIsAnimating(false);
    }, 150);
  };

  const StepIcon = step.icon;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <Card className="w-full max-w-lg bg-white dark:bg-slate-800 shadow-2xl animate-scale-in border-0">
        {/* Progress bar */}
        <div className="px-6 pt-6">
          <Progress value={progress} className="h-2" />
          <p className="text-xs text-slate-500 dark:text-slate-400 text-center mt-2">
            {currentStep + 1} of {totalSteps}
          </p>
        </div>

        <CardHeader className="text-center pb-2">
          {/* CB Avatar */}
          <div className="mx-auto mb-4 relative">
            <div className={cn(
              "w-20 h-20 rounded-full flex items-center justify-center transition-all duration-300",
              isFirstStep || isLastStep 
                ? "bg-gradient-to-br from-primary/20 to-primary/10 ring-4 ring-primary/20" 
                : "bg-muted"
            )}>
              <StepIcon className={cn("h-10 w-10 transition-all duration-300", step.iconColor)} />
            </div>
            {/* Speech bubble indicator */}
            {isFirstStep && (
              <div className="absolute -bottom-1 -right-1 bg-primary text-primary-foreground rounded-full p-1">
                <MessageSquare className="h-4 w-4" />
              </div>
            )}
          </div>

          <CardTitle className={cn(
            "text-2xl transition-all duration-300 text-slate-900 dark:text-white",
            isAnimating ? "opacity-0 translate-y-2" : "opacity-100 translate-y-0"
          )}>
            {step.title}
          </CardTitle>
          
          {step.subtitle && (
            <p className={cn(
              "text-lg text-emerald-700 dark:text-emerald-400 font-medium mt-1 transition-all duration-300",
              isAnimating ? "opacity-0" : "opacity-100"
            )}>
              {step.subtitle}
            </p>
          )}
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Description */}
          <CardDescription className={cn(
            "text-center text-base transition-all duration-300 text-slate-600 dark:text-slate-300",
            isAnimating ? "opacity-0 translate-y-2" : "opacity-100 translate-y-0"
          )}>
            {step.description}
          </CardDescription>

          {/* Bullet points for setup steps */}
          {step.bullets && (
            <div className={cn(
              "bg-slate-100 dark:bg-slate-700/50 rounded-lg p-4 space-y-2 transition-all duration-300",
              isAnimating ? "opacity-0 scale-95" : "opacity-100 scale-100"
            )}>
              <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-3">What you'll configure:</p>
              {step.bullets.map((bullet, index) => (
                <div key={index} className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
                  <span className="text-sm text-slate-700 dark:text-slate-200">{bullet}</span>
                </div>
              ))}
            </div>
          )}

          {/* Navigation dots */}
          <div className="flex justify-center gap-2">
            {STEPS.map((_, index) => (
              <button
                key={index}
                onClick={() => {
                  setIsAnimating(true);
                  setTimeout(() => {
                    setCurrentStep(index);
                    setIsAnimating(false);
                  }, 150);
                }}
                className={cn(
                  "w-2 h-2 rounded-full transition-all duration-300",
                  index === currentStep 
                    ? "bg-primary w-6" 
                    : index < currentStep 
                      ? "bg-primary/60" 
                      : "bg-muted-foreground/30"
                )}
                aria-label={`Go to step ${index + 1}`}
              />
            ))}
          </div>

          {/* Navigation buttons */}
          <div className="flex items-center justify-between gap-4">
            <Button
              variant="ghost"
              onClick={goToPrevious}
              disabled={isFirstStep}
              className={cn(isFirstStep && "invisible")}
            >
              <ChevronLeft className="h-4 w-4 mr-1" />
              Back
            </Button>

            <Button
              onClick={goToNext}
              className={cn(
                "flex-1 max-w-[200px]",
                isLastStep && "bg-primary hover:bg-primary/90"
              )}
            >
              {isFirstStep ? (
                "Let's Go!"
              ) : isLastStep ? (
                <>
                  <Sparkles className="h-4 w-4 mr-2" />
                  Get Started
                </>
              ) : (
                <>
                  Next
                  <ChevronRight className="h-4 w-4 ml-1" />
                </>
              )}
            </Button>
          </div>

          {/* Skip link */}
          <div className="text-center">
            <button
              onClick={onSkip}
              className="text-sm text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors underline-offset-4 hover:underline"
            >
              Skip tour
            </button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
