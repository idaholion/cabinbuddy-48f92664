import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Clock, CheckCircle, AlertCircle } from 'lucide-react';
import { useSecondarySelection } from '@/hooks/useSecondarySelection';
import { useSequentialSelection } from '@/hooks/useSequentialSelection';
import { useTimePeriods } from '@/hooks/useTimePeriods';
import { useRotationOrder } from '@/hooks/useRotationOrder';
import { useFamilyGroups } from '@/hooks/useFamilyGroups';
import { SecondarySelectionBookingForm } from './SecondarySelectionBookingForm';

interface SecondarySelectionManagerProps {
  currentMonth: Date;
  userFamilyGroup?: string;
}

export function SecondarySelectionManager({ 
  currentMonth, 
  userFamilyGroup 
}: SecondarySelectionManagerProps) {
  // Use rotation year logic to get the correct year (same as calendar)
  const today = new Date();
  const currentYear = today.getFullYear();
  const startMonth = 9; // October (0-indexed)
  const rotationStartThisYear = new Date(currentYear, startMonth, 1);
  const hasPassedStartDate = today >= rotationStartThisYear;
  const rotationYear = hasPassedStartDate ? currentYear + 1 : currentYear;
  
  const { familyGroups } = useFamilyGroups();
  const { rotationData } = useRotationOrder();
  const { timePeriodUsage } = useTimePeriods(rotationYear);
  const {
    secondaryStatus,
    loading,
    isSecondaryRoundActive,
    isCurrentFamilyTurn,
    getRemainingSecondaryPeriods,
    getSecondarySelectionOrder,
    getCurrentSelectionDays,
    hasSelectionTimeExpired,
    startSecondarySelection,
    advanceSecondarySelection
  } = useSecondarySelection(rotationYear);

  const {
    currentPhase,
    familyStatuses,
    canCurrentUserSelect,
    advanceSelection
  } = useSequentialSelection(rotationYear);

  const [showBookingForm, setShowBookingForm] = useState(false);

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!rotationData?.enable_secondary_selection) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Secondary Selection
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Secondary selection is not enabled for this rotation year.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  // Check if primary round is complete by checking turn_completed flags
  const secondarySelectionOrder = getSecondarySelectionOrder();
  const isPrimaryRoundComplete = secondarySelectionOrder.every(familyGroup => {
    const usage = timePeriodUsage.find(u => u.family_group === familyGroup);
    return usage && usage.turn_completed === true;
  });

  const allSecondaryComplete = secondarySelectionOrder.every(familyGroup => {
    const remaining = getRemainingSecondaryPeriods(familyGroup);
    return remaining <= 0;
  });

  if (!isPrimaryRoundComplete) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Secondary Selection
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Secondary selection will begin automatically after all family groups complete their primary selections.
            </AlertDescription>
          </Alert>
          
          <div className="mt-4">
            <h4 className="font-medium mb-2">Primary Selection Progress</h4>
            <div className="space-y-2">
              {secondarySelectionOrder.map(familyGroup => {
                const usage = timePeriodUsage.find(u => u.family_group === familyGroup);
                const used = usage?.time_periods_used || 0;
                const allowed = rotationData.max_time_slots || 2;
                const complete = used >= allowed;
                
                return (
                  <div key={familyGroup} className="flex items-center justify-between">
                    <span className="text-sm">{familyGroup}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">
                        {used}/{allowed}
                      </span>
                      {complete ? (
                        <CheckCircle className="h-4 w-4 text-green-500" />
                      ) : (
                        <Clock className="h-4 w-4 text-yellow-500" />
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!isSecondaryRoundActive && !secondaryStatus) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Secondary Selection Ready
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Alert className="mb-4">
            <CheckCircle className="h-4 w-4" />
            <AlertDescription>
              All family groups have completed their primary selections. Secondary selection can now begin.
            </AlertDescription>
          </Alert>
          
          <div className="space-y-4">
            <div className="p-3 bg-muted rounded-lg">
              <h4 className="font-medium mb-2">Secondary Selection Rules:</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Selection order is <strong>reverse</strong> from primary round</li>
                <li>• Each family group can select up to {rotationData.secondary_max_periods || 1} additional period(s)</li>
                <li>• Selection continues until all families have used their allocations</li>
              </ul>
            </div>
            
            <Button onClick={startSecondarySelection} className="w-full">
              Start Secondary Selection
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (allSecondaryComplete) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-green-500" />
            Secondary Selection Complete
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Alert>
            <CheckCircle className="h-4 w-4" />
            <AlertDescription>
              All family groups have completed their secondary selections for {rotationYear}.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  // Show simple banner when it's the user's turn
  const isUserTurn = userFamilyGroup && isCurrentFamilyTurn(userFamilyGroup);
  const remaining = userFamilyGroup ? getRemainingSecondaryPeriods(userFamilyGroup) : 0;
  
  if (!isUserTurn) {
    return null; // Don't show anything if it's not the user's turn
  }

  return (
    <>
      <div className="p-4 bg-primary/10 border-2 border-primary rounded-lg">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-semibold text-primary flex items-center gap-2 mb-1">
              <CheckCircle className="h-5 w-5 flex-shrink-0" />
              It's Your Turn for Secondary Selection!
            </h3>
            <p className="text-sm text-muted-foreground">
              You can select {remaining} additional week{remaining !== 1 ? 's' : ''}.
              {getCurrentSelectionDays() && (
                <> You have {getCurrentSelectionDays()?.daysRemaining} day{getCurrentSelectionDays()?.daysRemaining !== 1 ? 's' : ''} remaining.</>
              )}
            </p>
          </div>
          <Button
            size="lg"
            onClick={() => setShowBookingForm(true)}
            className="bg-primary hover:bg-primary/90 shadow-lg whitespace-nowrap"
          >
            <CheckCircle className="h-5 w-5 mr-2" />
            Select Additional Week
          </Button>
        </div>
      </div>

      {/* Booking Form */}
      {userFamilyGroup && (
        <SecondarySelectionBookingForm
          open={showBookingForm}
          onOpenChange={setShowBookingForm}
          currentMonth={currentMonth}
          familyGroup={userFamilyGroup}
          onBookingComplete={() => {
            setShowBookingForm(false);
            // Refresh data will happen automatically via hooks
          }}
        />
      )}
    </>
  );
}