import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Clock, CheckCircle, AlertCircle, RefreshCw, Loader2 } from 'lucide-react';
import { useSecondarySelection } from '@/hooks/useSecondarySelection';
import { useSequentialSelection } from '@/hooks/useSequentialSelection';
import { useTimePeriods } from '@/hooks/useTimePeriods';
import { useRotationOrder } from '@/hooks/useRotationOrder';
import { useFamilyGroups } from '@/hooks/useFamilyGroups';
import { ConfirmationDialog } from '@/components/ui/confirmation-dialog';
import { useToast } from '@/hooks/use-toast';

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
  const { timePeriodUsage, fetchTimePeriodUsage } = useTimePeriods(rotationYear);
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
    advanceSecondarySelection,
    refetchSecondaryStatus
  } = useSecondarySelection(rotationYear);

  const {
    currentPhase,
    familyStatuses,
    canCurrentUserSelect,
    advanceSelection
  } = useSequentialSelection(rotationYear);

  const { toast } = useToast();
  const [isRefreshing, setIsRefreshing] = useState(false);

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
  
  // Calculate used periods for display
  const totalAllowed = rotationData?.secondary_max_periods || 1;
  const usage = userFamilyGroup ? timePeriodUsage.find(u => u.family_group === userFamilyGroup) : undefined;
  const used = usage?.secondary_periods_used || 0;
  const remaining = Math.max(0, totalAllowed - used);
  
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
              You've selected {used} of {totalAllowed} periods ({remaining} remaining)
              {getCurrentSelectionDays() && (
                <> • {getCurrentSelectionDays()?.daysRemaining} day{getCurrentSelectionDays()?.daysRemaining !== 1 ? 's' : ''} remaining</>
              )}
            </p>
          </div>
          <div className="flex gap-2">
            <Button 
              size="lg" 
              variant="ghost"
              onClick={async () => {
                setIsRefreshing(true);
                try {
                  await Promise.all([
                    fetchTimePeriodUsage(rotationYear),
                    refetchSecondaryStatus()
                  ]);
                  toast({
                    title: "Info Updated",
                    description: "Selection information has been refreshed.",
                  });
                } catch (error) {
                  console.error('Error refreshing:', error);
                  toast({
                    title: "Error",
                    description: "Failed to refresh. Please try again.",
                    variant: "destructive",
                  });
                } finally {
                  setIsRefreshing(false);
                }
              }}
              disabled={isRefreshing}
              className="whitespace-nowrap"
            >
              {isRefreshing ? (
                <>
                  <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                  Updating...
                </>
              ) : (
                <>
                  <RefreshCw className="h-5 w-5 mr-2" />
                  Refresh Info
                </>
              )}
            </Button>
            <ConfirmationDialog
              title={remaining > 0 ? "Finish Early?" : "Confirm Selection Complete"}
              description={
                remaining > 0
                  ? `You have selected ${used} of ${totalAllowed} periods. You still have ${remaining} remaining. Are you sure you want to finish early and pass the selection to the next family group?`
                  : `Great! You've selected all ${totalAllowed} of your available periods. Click confirm to complete your secondary selection.`
              }
              confirmText={remaining > 0 ? "Yes, Finish Early" : "Complete Selection"}
              onConfirm={async () => {
                try {
                  await advanceSecondarySelection();
                  
                  // Force refresh all data immediately after advancing
                  await Promise.all([
                    fetchTimePeriodUsage(rotationYear),
                    refetchSecondaryStatus()
                  ]);
                  
                  toast({
                    title: "Selection Complete",
                    description: "Your secondary selection period has been marked complete. The next family group has been notified.",
                  });
                } catch (error) {
                  console.error('Error advancing secondary selection:', error);
                  toast({
                    title: "Error",
                    description: "Failed to complete selection. Please try again.",
                    variant: "destructive",
                  });
                }
              }}
            >
              <Button size="lg" variant="outline" className="shadow-lg whitespace-nowrap">
                <CheckCircle className="h-5 w-5 mr-2" />
                I'm Done Selecting
              </Button>
            </ConfirmationDialog>
          </div>
        </div>
      </div>
    </>
  );
}