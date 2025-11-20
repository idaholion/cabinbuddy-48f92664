import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertTriangle } from "lucide-react";
import { useOrganizationContext } from "@/hooks/useOrganizationContext";

interface TestOrganizationWarningBannerProps {
  className?: string;
}

export function TestOrganizationWarningBanner({ className = "" }: TestOrganizationWarningBannerProps) {
  const { activeOrganization, isTestOrganization } = useOrganizationContext();
  
  // Don't render if no organization is loaded yet
  if (!activeOrganization) {
    return null;
  }

  // Don't render if not a test organization
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
