import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface StepNavigationProps {
  onPrevious?: () => void;
  onNext?: () => void;
  onSubmit?: () => void;
  canGoBack: boolean;
  canProceed: boolean;
  isLastStep: boolean;
  isLoading?: boolean;
  nextLabel?: string;
  previousLabel?: string;
  submitLabel?: string;
  className?: string;
}

export const StepNavigation = ({
  onPrevious,
  onNext,
  onSubmit,
  canGoBack,
  canProceed,
  isLastStep,
  isLoading = false,
  nextLabel = "Next",
  previousLabel = "Previous",
  submitLabel = "Complete Setup",
  className
}: StepNavigationProps) => {
  const handleNext = () => {
    if (isLastStep) {
      onSubmit?.();
    } else {
      onNext?.();
    }
  };

  return (
    <div className={cn("flex justify-between items-center pt-6", className)}>
      <Button
        variant="outline"
        onClick={onPrevious}
        disabled={!canGoBack || isLoading}
        className={cn(!canGoBack && "invisible")}
      >
        <ChevronLeft className="h-4 w-4 mr-1" />
        {previousLabel}
      </Button>

      <Button
        onClick={handleNext}
        disabled={!canProceed || isLoading}
        className="min-w-[140px]"
      >
        {isLoading ? (
          "Saving..."
        ) : isLastStep ? (
          submitLabel
        ) : (
          <>
            {nextLabel}
            <ChevronRight className="h-4 w-4 ml-1" />
          </>
        )}
      </Button>
    </div>
  );
};