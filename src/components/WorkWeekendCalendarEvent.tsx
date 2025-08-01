import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Hammer, CheckCircle, Clock, AlertTriangle } from 'lucide-react';
import { format } from 'date-fns';

interface WorkWeekendCalendarEventProps {
  workWeekend: any;
  isCompact?: boolean;
}

export const WorkWeekendCalendarEvent = ({ workWeekend, isCompact = false }: WorkWeekendCalendarEventProps) => {
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'proposed':
        return <Clock className="h-3 w-3" />;
      case 'supervisor_approved':
        return <AlertTriangle className="h-3 w-3" />;
      case 'fully_approved':
        return <CheckCircle className="h-3 w-3" />;
      default:
        return <Hammer className="h-3 w-3" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'proposed':
        return 'bg-yellow-100 border-yellow-300 text-yellow-800';
      case 'supervisor_approved':
        return 'bg-orange-100 border-orange-300 text-orange-800';
      case 'fully_approved':
        return 'bg-green-100 border-green-300 text-green-800';
      case 'rejected':
        return 'bg-red-100 border-red-300 text-red-800';
      default:
        return 'bg-gray-100 border-gray-300 text-gray-800';
    }
  };

  if (isCompact) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className={`
              px-2 py-1 rounded text-xs border-2 border-dashed 
              ${getStatusColor(workWeekend.status)}
              cursor-help
            `}>
              <div className="flex items-center gap-1">
                <Hammer className="h-3 w-3" />
                Work Weekend
              </div>
            </div>
          </TooltipTrigger>
          <TooltipContent side="top" className="max-w-xs">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                {getStatusIcon(workWeekend.status)}
                <span className="font-medium">{workWeekend.title}</span>
              </div>
              <p className="text-xs">
                {format(new Date(workWeekend.start_date), 'MMM d')} - {format(new Date(workWeekend.end_date), 'MMM d, yyyy')}
              </p>
              {workWeekend.description && (
                <p className="text-xs opacity-90">{workWeekend.description}</p>
              )}
              <div className="flex items-center gap-1">
                <span className="text-xs">Proposed by:</span>
                <span className="text-xs font-medium">{workWeekend.proposer_name}</span>
              </div>
              {workWeekend.conflict_reservations?.length > 0 && (
                <div className="flex items-center gap-1">
                  <AlertTriangle className="h-3 w-3 text-amber-500" />
                  <span className="text-xs">{workWeekend.conflict_reservations.length} reservation conflict(s)</span>
                </div>
              )}
            </div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return (
    <div className={`
      p-3 rounded-lg border-2 border-dashed space-y-2
      ${getStatusColor(workWeekend.status)}
    `}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Hammer className="h-4 w-4" />
          <span className="font-medium text-sm">{workWeekend.title}</span>
        </div>
        {getStatusIcon(workWeekend.status)}
      </div>
      
      <div className="text-xs opacity-90">
        Proposed by: {workWeekend.proposer_name}
        {workWeekend.proposer_family_group && ` (${workWeekend.proposer_family_group})`}
      </div>

      {workWeekend.description && (
        <p className="text-xs opacity-90">{workWeekend.description}</p>
      )}

      {workWeekend.conflict_reservations?.length > 0 && (
        <div className="flex items-center gap-1">
          <AlertTriangle className="h-3 w-3" />
          <span className="text-xs">{workWeekend.conflict_reservations.length} reservation conflict(s)</span>
        </div>
      )}

      <Badge variant="outline" className="text-xs">
        {workWeekend.status.replace('_', ' ')}
      </Badge>
    </div>
  );
};