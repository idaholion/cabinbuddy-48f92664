import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { Calendar, AlertTriangle, Clock, Users } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useReservationConflicts, ConflictingReservation } from '@/hooks/useReservationConflicts';

interface ReservationConflictDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  startDate: Date;
  endDate: Date;
  familyGroup: string;
  propertyName?: string;
  onSelectAlternativeDate?: (startDate: Date, endDate: Date) => void;
  onProceedAnyway?: () => void;
}

export function ReservationConflictDialog({
  open,
  onOpenChange,
  startDate,
  endDate,
  familyGroup,
  propertyName,
  onSelectAlternativeDate,
  onProceedAnyway
}: ReservationConflictDialogProps) {
  const { detectReservationConflicts, suggestAlternativeDates } = useReservationConflicts();
  const [conflicts, setConflicts] = useState<ConflictingReservation[]>([]);
  const [alternatives, setAlternatives] = useState<{ startDate: Date; endDate: Date }[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      checkConflicts();
      findAlternatives();
    }
  }, [open, startDate, endDate, propertyName]);

  const checkConflicts = async () => {
    setLoading(true);
    try {
      const result = await detectReservationConflicts(startDate, endDate, propertyName);
      setConflicts(result.conflicts);
    } catch (error) {
      console.error('Error checking conflicts:', error);
    } finally {
      setLoading(false);
    }
  };

  const findAlternatives = async () => {
    try {
      const alternativeDates = await suggestAlternativeDates(startDate, endDate, propertyName);
      setAlternatives(alternativeDates.slice(0, 3)); // Show top 3 alternatives
    } catch (error) {
      console.error('Error finding alternatives:', error);
    }
  };

  const calculateNights = (start: Date, end: Date) => {
    return Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
  };

  const originalNights = calculateNights(startDate, endDate);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-warning" />
            Reservation Conflicts Detected
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Requested Reservation Details */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Requested Reservation
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div>
                  <span className="font-medium">Family Group:</span> {familyGroup}
                </div>
                <div>
                  <span className="font-medium">Dates:</span> {format(startDate, "MMM d")} - {format(endDate, "MMM d")}
                </div>
                <div>
                  <span className="font-medium">Nights:</span> {originalNights}
                </div>
                {propertyName && (
                  <div className="col-span-3">
                    <span className="font-medium">Property:</span> {propertyName}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Conflicting Reservations */}
          {conflicts.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Conflicting Reservations ({conflicts.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {conflicts.map((conflict, index) => (
                  <div
                    key={conflict.id}
                    className="flex items-center justify-between p-3 bg-destructive/10 border border-destructive/20 rounded-lg"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium">{conflict.family_group}</span>
                        <Badge variant="destructive" className="text-xs">
                          {conflict.status || 'Confirmed'}
                        </Badge>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {format(new Date(conflict.start_date), "MMM d, yyyy")} - {format(new Date(conflict.end_date), "MMM d, yyyy")}
                        {conflict.property_name && (
                          <span className="ml-2">• {conflict.property_name}</span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Alternative Dates */}
          {alternatives.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  Suggested Alternative Dates
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {alternatives.map((alternative, index) => {
                  const altNights = calculateNights(alternative.startDate, alternative.endDate);
                  return (
                    <div
                      key={index}
                      className="flex items-center justify-between p-3 bg-primary/10 border border-primary/20 rounded-lg"
                    >
                      <div className="flex-1">
                        <div className="font-medium">
                          {format(alternative.startDate, "MMM d, yyyy")} - {format(alternative.endDate, "MMM d, yyyy")}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {altNights} nights • Available for {familyGroup}
                        </div>
                      </div>
                      <Button
                        size="sm"
                        onClick={() => {
                          onSelectAlternativeDate?.(alternative.startDate, alternative.endDate);
                          onOpenChange(false);
                        }}
                      >
                        Select These Dates
                      </Button>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          )}

          {/* Action Buttons */}
          <div className="flex justify-between gap-4">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel Booking
            </Button>
            
            <div className="flex gap-2">
              {alternatives.length === 0 && (
                <Button
                  variant="outline"
                  onClick={() => findAlternatives()}
                  disabled={loading}
                >
                  Find More Alternatives
                </Button>
              )}
              
              {onProceedAnyway && (
                <Button
                  variant="destructive"
                  onClick={() => {
                    onProceedAnyway();
                    onOpenChange(false);
                  }}
                >
                  Override Conflicts
                </Button>
              )}
            </div>
          </div>

          {/* Warning Notice */}
          <div className="p-4 bg-warning/10 border border-warning/20 rounded-lg">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-warning mt-0.5" />
              <div>
                <h4 className="font-medium text-warning">Important Notice</h4>
                <p className="text-sm text-muted-foreground mt-1">
                  The requested dates overlap with existing reservations. Please select alternative dates 
                  or contact the conflicting family groups to coordinate a solution.
                </p>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}