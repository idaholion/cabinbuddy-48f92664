import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertTriangle } from "lucide-react";
import { useOrganizationContext } from "@/hooks/useOrganizationContext";

interface TestOrganizationWarningBannerProps {
  className?: string;
}

export function TestOrganizationWarningBanner({ className = "" }: TestOrganizationWarningBannerProps) {
  const { isTestOrganization } = useOrganizationContext();
  
  if (!isTestOrganization()) {
    return null;
  }

  return (
    <Alert 
      variant="default" 
      className={`border-warning bg-warning/10 ${className}`}
    >
      <AlertTriangle className="h-4 w-4 text-warning" />
      <AlertDescription className="text-sm font-medium text-warning-foreground">
        <span className="font-semibold">Test Organization Mode:</span> You are viewing a test organization. Data here is for testing purposes only and will not affect production records.
      </AlertDescription>
    </Alert>
  );
}
