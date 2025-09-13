import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { WorkWeekendCommentsSection } from './WorkWeekendCommentsSection';
import { Hammer, CheckCircle, Clock, AlertTriangle, User, Calendar, MapPin } from 'lucide-react';
import { format } from 'date-fns';

interface WorkWeekendDetailDialogProps {
  workWeekend: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const WorkWeekendDetailDialog = ({ workWeekend, open, onOpenChange }: WorkWeekendDetailDialogProps) => {
  if (!workWeekend) return null;

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'proposed':
        return <Clock className="h-4 w-4" />;
      case 'fully_approved':
        return <CheckCircle className="h-4 w-4" />;
      default:
        return <Hammer className="h-4 w-4" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'proposed':
        return 'bg-yellow-100 border-yellow-300 text-yellow-800';
      case 'fully_approved':
        return 'bg-green-100 border-green-300 text-green-800';
      case 'rejected':
        return 'bg-red-100 border-red-300 text-red-800';
      default:
        return 'bg-gray-100 border-gray-300 text-gray-800';
    }
  };

  const getStatusLabel = (status: string) => {
    return status.replace('_', ' ').toUpperCase();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Hammer className="h-5 w-5" />
            {workWeekend.title}
          </DialogTitle>
          <DialogDescription>
            Work Weekend Details and Discussion
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-6">
          {/* Status and Basic Info */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Event Information
                </span>
                <Badge className={`${getStatusColor(workWeekend.status)} flex items-center gap-1`}>
                  {getStatusIcon(workWeekend.status)}
                  {getStatusLabel(workWeekend.status)}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Dates */}
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">
                  {format(new Date(workWeekend.start_date), 'EEEE, MMMM d, yyyy')} - {format(new Date(workWeekend.end_date), 'EEEE, MMMM d, yyyy')}
                </span>
              </div>

              {/* Proposer */}
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-muted-foreground" />
                <span>
                  Proposed by <span className="font-medium">{workWeekend.proposer_name}</span>
                  {workWeekend.proposer_family_group && (
                    <span className="text-muted-foreground ml-1">({workWeekend.proposer_family_group})</span>
                  )}
                </span>
              </div>

              {/* Description */}
              {workWeekend.description && (
                <div className="space-y-2">
                  <div className="font-medium">Description:</div>
                  <p className="text-muted-foreground whitespace-pre-wrap bg-muted/50 p-3 rounded-lg">
                    {workWeekend.description}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Conflicts Warning */}
          {workWeekend.conflict_reservations?.length > 0 && (
            <Card className="border-amber-200 bg-amber-50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-amber-800">
                  <AlertTriangle className="h-4 w-4" />
                  Reservation Conflicts ({workWeekend.conflict_reservations.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-sm text-amber-700">
                  This work weekend overlaps with existing reservations. Approval from affected family groups may be required.
                </div>
                <div className="mt-2 space-y-1">
                  {workWeekend.conflict_reservations.map((conflict: any, index: number) => (
                    <div key={index} className="flex items-center gap-2 text-sm">
                      <MapPin className="h-3 w-3" />
                      <span>{conflict.family_group} - {format(new Date(conflict.start_date), 'MMM d')} to {format(new Date(conflict.end_date), 'MMM d')}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Comments Section */}
          <WorkWeekendCommentsSection workWeekendId={workWeekend.id} />
        </div>
      </DialogContent>
    </Dialog>
  );
};