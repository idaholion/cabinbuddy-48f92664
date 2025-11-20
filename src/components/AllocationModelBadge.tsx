import { Badge } from "@/components/ui/badge";
import { CalendarClock, Calendar, Users, Settings, Shuffle } from "lucide-react";
import { useOrganizationContext, AllocationModel } from "@/hooks/useOrganizationContext";

interface AllocationModelConfig {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  description: string;
  variant: "default" | "secondary" | "outline" | "destructive";
}

const ALLOCATION_MODELS: Record<AllocationModel, AllocationModelConfig> = {
  rotating_selection: {
    label: "Rotating Selection",
    icon: Shuffle,
    description: "Turn-based reservation system",
    variant: "default",
  },
  static_weeks: {
    label: "Static Weeks",
    icon: Calendar,
    description: "Fixed week assignments",
    variant: "secondary",
  },
  first_come_first_serve: {
    label: "First Come First Serve",
    icon: CalendarClock,
    description: "Open booking system",
    variant: "outline",
  },
  manual: {
    label: "Manual",
    icon: Settings,
    description: "Admin-managed reservations",
    variant: "outline",
  },
  lottery: {
    label: "Lottery",
    icon: Users,
    description: "Random selection system",
    variant: "secondary",
  },
};

interface AllocationModelBadgeProps {
  showIcon?: boolean;
  showDescription?: boolean;
  className?: string;
}

export function AllocationModelBadge({ 
  showIcon = true, 
  showDescription = false,
  className = "" 
}: AllocationModelBadgeProps) {
  const { getAllocationModel } = useOrganizationContext();
  
  const allocationModel = getAllocationModel();
  const config = ALLOCATION_MODELS[allocationModel];
  
  if (!config) {
    return null;
  }

  const Icon = config.icon;

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <Badge variant={config.variant} className="flex items-center gap-1.5 px-2.5 py-1">
        {showIcon && <Icon className="h-3.5 w-3.5" />}
        <span className="text-xs font-medium">{config.label}</span>
      </Badge>
      {showDescription && (
        <span className="text-xs text-muted-foreground">{config.description}</span>
      )}
    </div>
  );
}
