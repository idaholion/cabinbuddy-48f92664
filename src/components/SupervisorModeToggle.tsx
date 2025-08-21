import { Shield, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useRole } from "@/contexts/RoleContext";
import { cn } from "@/lib/utils";

interface SupervisorModeToggleProps {
  className?: string;
  showLabel?: boolean;
}

export const SupervisorModeToggle = ({ className, showLabel = true }: SupervisorModeToggleProps) => {
  const { activeRole, isSupervisor, canAccessSupervisorFeatures, toggleSupervisorMode } = useRole();

  // Only show to supervisors
  if (!isSupervisor) {
    return null;
  }

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <Button
        variant={canAccessSupervisorFeatures ? "default" : "outline"}
        size="sm"
        onClick={toggleSupervisorMode}
        className="flex items-center gap-2 justify-start w-full"
      >
        {canAccessSupervisorFeatures ? (
          <ShieldCheck className="h-4 w-4" />
        ) : (
          <Shield className="h-4 w-4" />
        )}
        {showLabel && (
          <span>{canAccessSupervisorFeatures ? "Exit Supervisor Mode" : "Enter Supervisor Mode"}</span>
        )}
      </Button>
      
      {showLabel && (
        <div className="text-xs text-muted-foreground px-2">
          <Badge 
            variant={canAccessSupervisorFeatures ? "default" : "secondary"} 
            className="text-xs"
          >
            {canAccessSupervisorFeatures ? "Supervisor Mode" : "Administrator Mode"}
          </Badge>
          <p className="mt-1">
            {canAccessSupervisorFeatures 
              ? "You have system-wide access to all organizations" 
              : "You have organization administrator access"
            }
          </p>
        </div>
      )}
    </div>
  );
};