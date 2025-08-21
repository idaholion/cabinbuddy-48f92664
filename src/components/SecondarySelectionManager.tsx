import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { Clock, Users, ArrowRight, CheckCircle, AlertCircle } from 'lucide-react';
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
  const currentYear = currentMonth.getFullYear();
  const { familyGroups } = useFamilyGroups();
  const { rotationData } = useRotationOrder();
  const { timePeriodUsage } = useTimePeriods();
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
  } = useSecondarySelection(currentYear);

  const {
    currentPhase,
    familyStatuses,
    canCurrentUserSelect,
    advanceSelection
  } = useSequentialSelection(currentYear);

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

  // Check if primary round is complete
  const secondarySelectionOrder = getSecondarySelectionOrder();
  const isPrimaryRoundComplete = secondarySelectionOrder.every(familyGroup => {
    const usage = timePeriodUsage.find(u => u.family_group === familyGroup);
    return usage && usage.time_periods_used >= (rotationData.max_time_slots || 2);
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
              All family groups have completed their secondary selections for {currentYear}.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Secondary Selection Active
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Current Turn */}
          <div className="p-3 bg-muted rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <span className="font-medium">Current Turn:</span>
              <Badge variant="secondary">
                {secondaryStatus?.current_family_group || 'None'}
              </Badge>
            </div>
            {getCurrentSelectionDays() && (
              <div className="text-sm text-muted-foreground mb-2">
                {getCurrentSelectionDays()?.daysPassed} of {getCurrentSelectionDays()?.totalDays} days used
                {getCurrentSelectionDays()?.daysRemaining === 0 && (
                  <span className="text-destructive font-medium"> (Time Expired)</span>
                )}
              </div>
            )}
            <div className="text-sm text-muted-foreground">
              Selection follows reverse order from primary round
            </div>
          </div>

          {/* Progress Overview */}
          <div>
            <h4 className="font-medium mb-3">Secondary Selection Progress</h4>
            <div className="space-y-3">
              {getSecondarySelectionOrder().map((familyGroup, index) => {
                const remaining = getRemainingSecondaryPeriods(familyGroup);
                const used = (rotationData.secondary_max_periods || 1) - remaining;
                const isCurrentTurn = isCurrentFamilyTurn(familyGroup);
                const isComplete = remaining <= 0;
                
                // Determine status indicators
                let statusIndicator = <Clock className="h-4 w-4 text-muted-foreground" />;
                let statusText = "⏳ Waiting";
                
                if (isComplete) {
                  statusIndicator = <CheckCircle className="h-4 w-4 text-green-500" />;
                  statusText = "✅ Completed";
                } else if (isCurrentTurn) {
                  statusIndicator = <ArrowRight className="h-4 w-4 text-primary" />;
                  const selectionDays = getCurrentSelectionDays();
                  statusText = selectionDays ? 
                    `🔄 Day ${selectionDays.daysPassed} of ${selectionDays.totalDays}` : 
                    "🔄 Current Turn";
                } else {
                  // Check if this family is next
                  const currentIndex = getSecondarySelectionOrder().findIndex(f => isCurrentFamilyTurn(f));
                  const nextIndex = (currentIndex + 1) % getSecondarySelectionOrder().length;
                  if (index === nextIndex && !isComplete) {
                    statusText = "Next";
                  }
                }
                
                return (
                  <div 
                    key={familyGroup} 
                    className={`p-3 rounded-lg border ${
                      isCurrentTurn ? 'border-primary bg-primary/5' : 'border-border'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{index + 1}. {familyGroup}</span>
                        <span className="text-sm text-muted-foreground">{statusText}</span>
                        {isCurrentTurn && (
                          <Badge variant="default" className="text-xs">Current Turn</Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="text-sm text-muted-foreground">
                          {used}/{rotationData.secondary_max_periods || 1} used
                        </div>
                        {statusIndicator}
                      </div>
                    </div>
                    
                    <Progress 
                      value={(used / (rotationData.secondary_max_periods || 1)) * 100} 
                      className="h-2"
                    />
                  </div>
                );
              })}
            </div>
          </div>

          {/* User Action */}
          {userFamilyGroup && isCurrentFamilyTurn(userFamilyGroup) && (
            <div className="pt-4 border-t space-y-4">
              <Alert className="mb-4">
                <Users className="h-4 w-4" />
                <AlertDescription>
                  It's your turn for secondary selection! You can book up to {getRemainingSecondaryPeriods(userFamilyGroup)} additional period(s).
                  {getCurrentSelectionDays() && (
                    <div className="mt-2 font-medium">
                      Day {getCurrentSelectionDays()?.daysPassed} of {getCurrentSelectionDays()?.totalDays} 
                      ({getCurrentSelectionDays()?.daysRemaining} days remaining)
                    </div>
                  )}
                </AlertDescription>
              </Alert>
              
              <div className="flex gap-2">
                <Button 
                  onClick={() => setShowBookingForm(true)}
                  className="flex-1"
                >
                  Make Secondary Selection
                </Button>
                
                <Button 
                  variant="outline"
                  onClick={async () => {
                    await advanceSecondarySelection();
                  }}
                  className="flex-1"
                >
                  I'm Done Selecting
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

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