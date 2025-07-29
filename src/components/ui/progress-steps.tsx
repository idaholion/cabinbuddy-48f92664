import { cn } from "@/lib/utils";
import { Check } from "lucide-react";

interface ProgressStepsProps {
  steps: string[];
  currentStep: number;
  completedSteps: number[];
  className?: string;
}

export const ProgressSteps = ({ 
  steps, 
  currentStep, 
  completedSteps, 
  className 
}: ProgressStepsProps) => {
  return (
    <div className={cn("w-full", className)}>
      <div className="flex items-center justify-between mb-4">
        {steps.map((step, index) => {
          const stepNumber = index + 1;
          const isCompleted = completedSteps.includes(stepNumber);
          const isCurrent = stepNumber === currentStep;
          const isPast = stepNumber < currentStep;

          return (
            <div key={stepNumber} className="flex flex-col items-center flex-1">
              <div className="flex items-center w-full">
                <div
                  className={cn(
                    "flex items-center justify-center w-8 h-8 rounded-full border-2 text-sm font-medium transition-colors",
                    {
                      "bg-primary text-primary-foreground border-primary": isCurrent || isCompleted,
                      "bg-muted text-muted-foreground border-muted-foreground": !isCurrent && !isCompleted && !isPast,
                      "bg-muted-foreground/20 text-muted-foreground border-muted-foreground": isPast && !isCompleted
                    }
                  )}
                >
                  {isCompleted ? (
                    <Check className="h-4 w-4" />
                  ) : (
                    stepNumber
                  )}
                </div>
                {index < steps.length - 1 && (
                  <div
                    className={cn(
                      "flex-1 h-0.5 mx-2 transition-colors",
                      {
                        "bg-primary": isPast || isCompleted,
                        "bg-muted": !isPast && !isCompleted
                      }
                    )}
                  />
                )}
              </div>
              <span
                className={cn(
                  "mt-2 text-xs text-center font-medium transition-colors",
                  {
                    "text-primary": isCurrent,
                    "text-foreground": isCompleted || isPast,
                    "text-muted-foreground": !isCurrent && !isCompleted && !isPast
                  }
                )}
              >
                {step}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};