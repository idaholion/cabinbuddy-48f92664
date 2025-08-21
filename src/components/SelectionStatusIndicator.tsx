import { Badge } from '@/components/ui/badge';
import { CheckCircle, Clock, Users, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';

export type SelectionStatus = 'waiting' | 'active' | 'completed' | 'skipped';
export type SelectionPhase = 'primary' | 'secondary';

interface SelectionStatusIndicatorProps {
  status: SelectionStatus;
  phase?: SelectionPhase;
  dayCountText?: string;
  daysRemaining?: number;
  className?: string;
  compact?: boolean;
}

export function SelectionStatusIndicator({
  status,
  phase = 'primary',
  dayCountText,
  daysRemaining,
  className,
  compact = false
}: SelectionStatusIndicatorProps) {
  const getStatusConfig = () => {
    switch (status) {
      case 'completed':
        return {
          icon: CheckCircle,
          text: compact ? '✅' : 'Completed',
          variant: 'default' as const,
          className: 'text-green-600 bg-green-50 border-green-200'
        };
      case 'active':
        return {
          icon: ArrowRight,
          text: dayCountText || (compact ? '🔄' : 'Current Turn'),
          variant: 'default' as const,
          className: 'text-primary bg-primary/10 border-primary/30 animate-pulse'
        };
      case 'waiting':
        return {
          icon: Clock,
          text: compact ? '⏳' : 'Waiting',
          variant: 'secondary' as const,
          className: 'text-muted-foreground bg-muted border-border'
        };
      case 'skipped':
        return {
          icon: Users,
          text: compact ? '⏭️' : 'Skipped',
          variant: 'outline' as const,
          className: 'text-muted-foreground bg-background border-border opacity-60'
        };
      default:
        return {
          icon: Clock,
          text: compact ? '⏳' : 'Unknown',
          variant: 'outline' as const,
          className: 'text-muted-foreground'
        };
    }
  };

  const config = getStatusConfig();
  const Icon = config.icon;

  if (compact) {
    return (
      <div 
        className={cn(
          "inline-flex items-center justify-center w-6 h-6 text-xs",
          config.className,
          className
        )}
        title={`${phase} selection: ${config.text}`}
      >
        {config.text}
      </div>
    );
  }

  return (
    <Badge
      variant={config.variant}
      className={cn(
        "flex items-center gap-1 px-2 py-1",
        config.className,
        className
      )}
    >
      <Icon className="h-3 w-3" />
      <span className="text-xs">{config.text}</span>
      {status === 'active' && daysRemaining !== undefined && daysRemaining >= 0 && (
        <span className="text-xs opacity-75">
          ({daysRemaining}d)
        </span>
      )}
    </Badge>
  );
}

interface UnifiedSelectionStatusProps {
  familyGroup: string;
  primaryStatus: SelectionStatus;
  secondaryStatus: SelectionStatus;
  primaryDayCount?: string;
  secondaryDayCount?: string;
  primaryDaysRemaining?: number;
  secondaryDaysRemaining?: number;
  className?: string;
  layout?: 'horizontal' | 'vertical' | 'compact';
}

export function UnifiedSelectionStatus({
  familyGroup,
  primaryStatus,
  secondaryStatus,
  primaryDayCount,
  secondaryDayCount,
  primaryDaysRemaining,
  secondaryDaysRemaining,
  className,
  layout = 'horizontal'
}: UnifiedSelectionStatusProps) {
  if (layout === 'compact') {
    return (
      <div className={cn("flex items-center gap-1", className)}>
        <SelectionStatusIndicator
          status={primaryStatus}
          phase="primary"
          dayCountText={primaryDayCount}
          daysRemaining={primaryDaysRemaining}
          compact
        />
        <SelectionStatusIndicator
          status={secondaryStatus}
          phase="secondary"
          dayCountText={secondaryDayCount}
          daysRemaining={secondaryDaysRemaining}
          compact
        />
      </div>
    );
  }

  if (layout === 'vertical') {
    return (
      <div className={cn("flex flex-col gap-1", className)}>
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-muted-foreground">Primary:</span>
          <SelectionStatusIndicator
            status={primaryStatus}
            phase="primary"
            dayCountText={primaryDayCount}
            daysRemaining={primaryDaysRemaining}
          />
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-muted-foreground">Secondary:</span>
          <SelectionStatusIndicator
            status={secondaryStatus}
            phase="secondary"
            dayCountText={secondaryDayCount}
            daysRemaining={secondaryDaysRemaining}
          />
        </div>
      </div>
    );
  }

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <SelectionStatusIndicator
        status={primaryStatus}
        phase="primary"
        dayCountText={primaryDayCount}
        daysRemaining={primaryDaysRemaining}
      />
      <SelectionStatusIndicator
        status={secondaryStatus}
        phase="secondary"
        dayCountText={secondaryDayCount}
        daysRemaining={secondaryDaysRemaining}
      />
    </div>
  );
}