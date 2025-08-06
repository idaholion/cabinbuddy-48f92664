import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface LoadingSpinnerProps {
  size?: "sm" | "md" | "lg";
  className?: string;
}

export const LoadingSpinner = ({ size = "md", className }: LoadingSpinnerProps) => {
  const sizeClasses = {
    sm: "h-4 w-4",
    md: "h-6 w-6", 
    lg: "h-8 w-8"
  };

  return (
    <Loader2 
      className={cn(
        "animate-spin text-muted-foreground",
        sizeClasses[size],
        className
      )} 
    />
  );
};

interface LoadingStateProps {
  message?: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}

export const LoadingState = ({ 
  message = "Loading...", 
  size = "md", 
  className 
}: LoadingStateProps) => {
  return (
    <div className={cn("flex items-center justify-center gap-3 p-6", className)}>
      <LoadingSpinner size={size} />
      <span className="text-muted-foreground text-base">{message}</span>
    </div>
  );
};

export const FullPageLoader = ({ message = "Loading..." }: { message?: string }) => {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center space-y-4">
        <LoadingSpinner size="lg" />
        <p className="text-lg text-muted-foreground">{message}</p>
      </div>
    </div>
  );
};