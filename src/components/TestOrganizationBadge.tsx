import { Badge } from "@/components/ui/badge";
import { TestTube, Building2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface TestOrganizationBadgeProps {
  isTestOrganization: boolean;
  variant?: "default" | "outline" | "compact";
  showIcon?: boolean;
  className?: string;
}

export function TestOrganizationBadge({
  isTestOrganization,
  variant = "default",
  showIcon = true,
  className,
}: TestOrganizationBadgeProps) {
  if (variant === "compact") {
    return (
      <Badge
        variant={isTestOrganization ? "secondary" : "default"}
        className={cn(
          "text-xs font-medium",
          isTestOrganization
            ? "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"
            : "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
          className
        )}
      >
        {showIcon && (
          isTestOrganization ? (
            <TestTube className="h-3 w-3 mr-1" />
          ) : (
            <Building2 className="h-3 w-3 mr-1" />
          )
        )}
        {isTestOrganization ? "TEST" : "PROD"}
      </Badge>
    );
  }

  return (
    <Badge
      variant={variant}
      className={cn(
        "font-medium",
        isTestOrganization
          ? "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 border-blue-300"
          : "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 border-green-300",
        className
      )}
    >
      {showIcon && (
        isTestOrganization ? (
          <TestTube className="h-4 w-4 mr-1.5" />
        ) : (
          <Building2 className="h-4 w-4 mr-1.5" />
        )
      )}
      {isTestOrganization ? "Test Organization" : "Production Organization"}
    </Badge>
  );
}
