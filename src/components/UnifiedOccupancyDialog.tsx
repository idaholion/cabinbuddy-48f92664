import { useState, useEffect, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { format, eachDayOfInterval, addDays } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Lock, Users, AlertCircle } from "lucide-react";
import { useDailyOccupancySync } from "@/hooks/useDailyOccupancySync";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { supabase } from "@/integrations/supabase/client";
import { BillingCalculator } from "@/lib/billing-calculator";
import { parseDateOnly } from "@/lib/date-utils";
import { logger } from "@/lib/logger";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface DailyOccupancy {
  date: string;
  guests: number;
  names?: string[];
}

interface UnifiedOccupancyDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  stay: {
    startDate: Date;
    endDate: Date;
    family_group: string;
    reservationId: string | null;
  };
  currentOccupancy: DailyOccupancy[];
  onSave: (occupancy: DailyOccupancy[]) => Promise<void>;
  organizationId: string;
  splitId?: string;
  splitPaymentId?: string;
  // Props for split functionality
  sourceUserId?: string;
  dailyBreakdown?: Array<{ date: string; guests: number; cost: number }>;
  totalAmount?: number;
  onSplitCreated?: () => void;
}

interface OrgUser {
  user_id: string;
  email: string;
  display_name: string;
  first_name: string;
  last_name: string;
  actual_family_group?: string | null;
}

interface UserSplit {
  userId: string;
  familyGroup: string;
  displayName: string;
  dailyGuests: Record<string, number>;
  totalAmount: number;
}

export const UnifiedOccupancyDialog = ({
  open,
  onOpenChange,
  stay,
  currentOccupancy,
  onSave,
  organizationId,
  splitId,
  splitPaymentId,
  sourceUserId,
  dailyBreakdown,
  totalAmount = 0,
  onSplitCreated,
}: UnifiedOccupancyDialogProps) => {
  const { toast } = useToast();
  const { updateOccupancy, updateSplitOccupancy, getBillingLockStatus, syncing } = useDailyOccupancySync(organizationId);
  const [billingLocked, setBillingLocked] = useState(false);
  const isSplit = !!splitId && !!splitPaymentId;
  const [mode, setMode] = useState<"simple" | "split">("simple");
  
  // Simple mode state
  const days = eachDayOfInterval({ start: stay.startDate, end: addDays(stay.endDate, -1) });
  const validDateStrings = days.map(d => format(d, 'yyyy-MM-dd'));
  const filteredOccupancy = currentOccupancy.filter(occ => validDateStrings.includes(occ.date));
  const [occupancy, setOccupancy] = useState<DailyOccupancy[]>(filteredOccupancy);
  const [fillValue, setFillValue] = useState<string>("0");

  // Split mode state
  const [loading, setLoading] = useState(false);
  const [users, setUsers] = useState<OrgUser[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<UserSplit[]>([]);
  const [sourceDailyGuests, setSourceDailyGuests] = useState<Record<string, number>>({});

  useEffect(() => {
    if (open && stay.reservationId) {
      getBillingLockStatus(stay.reservationId).then(setBillingLocked);
    }
  }, [open, stay.reservationId, getBillingLockStatus]);

  useEffect(() => {
    if (open && mode === "split") {
      fetchUsers();
      initializeSourceGuests();
    }
  }, [open, mode]);

  const fetchUsers = async () => {
    if (!sourceUserId) return;

    const { data, error } = await supabase
      .rpc('get_organization_user_emails', { org_id: organizationId });

    if (error) {
      logger.error('Failed to fetch organization users', { 
        component: 'UnifiedOccupancyDialog', 
        action: 'fetchUsers',
        organizationId,
        error: error.message 
      });
      toast({
        title: 'Error',
        description: 'Failed to load organization users',
        variant: 'destructive',
      });
      return;
    }

    const { data: familyGroups, error: fgError } = await supabase
      .from('family_groups')
      .select('name, lead_email, host_members')
      .eq('organization_id', organizationId);

    if (fgError) {
      logger.error('Failed to fetch family groups', {
        component: 'UnifiedOccupancyDialog',
        action: 'fetchUsers',
        organizationId,
        error: fgError.message
      });
    }

    const filteredUsers = (data?.filter((u: OrgUser) => u.user_id !== sourceUserId) || []).map((u: OrgUser) => {
      const userFamilyGroup = familyGroups?.find(fg => {
        if (fg.lead_email?.toLowerCase().trim() === u.email.toLowerCase().trim()) {
          return true;
        }
        
        if (fg.host_members) {
          const members = Array.isArray(fg.host_members) ? fg.host_members : [];
          return members.some((m: any) => 
            m.email?.toLowerCase().trim() === u.email.toLowerCase().trim()
          );
        }
        
        return false;
      });
      
      return {
        ...u,
        actual_family_group: userFamilyGroup?.name || null
      };
    });

    setUsers(filteredUsers);
  };

  const initializeSourceGuests = () => {
    const initial: Record<string, number> = {};
    occupancy.forEach(occ => {
      initial[occ.date] = occ.guests;
    });
    setSourceDailyGuests(initial);
  };

  // Simple mode handlers
  const handleGuestCountChange = (dateStr: string, count: number) => {
    setOccupancy(prev => {
      const existing = prev.find(o => o.date === dateStr);
      if (existing) {
        return prev.map(o => o.date === dateStr ? { ...o, guests: count } : o);
      }
      return [...prev, { date: dateStr, guests: count }];
    });
  };

  const getOccupancyForDate = (dateStr: string) => {
    return occupancy.find(o => o.date === dateStr);
  };

  const handleFillAll = () => {
    const value = parseInt(fillValue) || 0;
    const newOccupancy = days.map(day => ({
      date: format(day, 'yyyy-MM-dd'),
      guests: value,
    }));
    setOccupancy(newOccupancy);
  };

  // Split mode handlers
  const handleUserToggle = (user: OrgUser, checked: boolean) => {
    if (checked) {
      const initialGuests: Record<string, number> = {};
      occupancy.forEach(occ => {
        initialGuests[occ.date] = 0;
      });
      
      setSelectedUsers(prev => [...prev, {
        userId: user.user_id,
        familyGroup: user.actual_family_group || 'Unknown',
        displayName: user.display_name || `${user.first_name} ${user.last_name}`,
        dailyGuests: initialGuests,
        totalAmount: 0
      }]);
    } else {
      setSelectedUsers(prev => prev.filter(u => u.userId !== user.user_id));
    }
  };

  const handleSplitGuestCountChange = (date: string, userIdOrSource: string, value: string) => {
    const count = parseInt(value) || 0;
    
    if (userIdOrSource === 'source') {
      setSourceDailyGuests(prev => ({ ...prev, [date]: count }));
    } else {
      setSelectedUsers(prev => prev.map(user => 
        user.userId === userIdOrSource
          ? { ...user, dailyGuests: { ...user.dailyGuests, [date]: count } }
          : user
      ));
    }
  };

  const validateSplit = () => {
    if (selectedUsers.length === 0) {
      toast({
        title: 'No Users Selected',
        description: 'Please select at least one person to split costs with',
        variant: 'destructive',
      });
      return false;
    }

    const hasInvalidUser = calculatedUsers.some(user => user.totalAmount <= 0);
    
    if (hasInvalidUser) {
      toast({
        title: 'Invalid Split',
        description: 'Each selected person must have at least some guest count assigned',
        variant: 'destructive',
      });
      return false;
    }

    for (const day of occupancy) {
      const sourceGuests = sourceDailyGuests[day.date] || 0;
      const otherGuests = selectedUsers.reduce((sum, u) => sum + (u.dailyGuests[day.date] || 0), 0);
      const total = sourceGuests + otherGuests;
      
      if (Math.abs(total - day.guests) > 0.01) {
        toast({
          title: 'Guest Count Mismatch',
          description: `On ${parseDateOnly(day.date).toLocaleDateString()}, total guests don't match (${total} vs ${day.guests})`,
          variant: 'destructive',
        });
        return false;
      }
    }

    return true;
  };

  const handleSplitCosts = async () => {
    if (!validateSplit() || !sourceUserId || !stay.reservationId) return;

    setLoading(true);
    try {
      const { data: { session }, error: sessionError } = await supabase.auth.refreshSession();
      
      if (sessionError || !session) {
        throw new Error('Authentication session expired. Please log in again.');
      }
      
      const user = session.user;

      const { data: userOrgData, error: userOrgError } = await supabase
        .from('user_organizations')
        .select('organization_id, role')
        .eq('user_id', user.id)
        .eq('organization_id', organizationId)
        .maybeSingle();
      
      if (!userOrgData) {
        throw new Error('You do not have permission to split costs in this organization');
      }

      const splitPayload = {
        organizationId,
        reservationId: stay.reservationId,
        sourceUserId,
        sourceFamilyGroup: stay.family_group,
        sourceAmount: sourceTotal,
        sourceDailyGuests: Object.entries(sourceDailyGuests).map(([date, guests]) => ({ date, guests })),
        splits: calculatedUsers.map(u => ({
          userId: u.userId,
          familyGroup: u.familyGroup,
          amount: u.totalAmount,
          dailyGuests: Object.entries(u.dailyGuests).map(([date, guests]) => ({ date, guests }))
        }))
      };

      const { data: response, error: edgeFunctionError } = await supabase.functions.invoke('create-split-payments', {
        body: splitPayload
      });

      if (edgeFunctionError) {
        throw edgeFunctionError;
      }

      const totalSplit = calculatedUsers.reduce((sum, u) => sum + u.totalAmount, 0);
      
      toast({
        title: 'Cost Split Created',
        description: `Successfully split ${BillingCalculator.formatCurrency(totalSplit)} with ${calculatedUsers.length} ${calculatedUsers.length === 1 ? 'person' : 'people'}. They will be notified.`,
      });

      onSplitCreated?.();
      onOpenChange(false);

    } catch (error: any) {
      logger.error('Failed to create cost split', {
        component: 'UnifiedOccupancyDialog',
        action: 'handleSplitCosts',
        organizationId,
        error: error.message
      });
      toast({
        title: 'Error',
        description: error.message || 'Failed to create cost split',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSaveSimple = async () => {
    try {
      let result;
      if (isSplit) {
        result = await updateSplitOccupancy(splitId!, splitPaymentId!, occupancy);
      } else {
        result = await updateOccupancy(stay.reservationId!, occupancy);
      }
      
      if (result.success) {
        await onSave(occupancy);
        onOpenChange(false);
      }
    } catch (error) {
      console.error('Error saving occupancy:', error);
      toast({
        title: "Error",
        description: "Failed to save occupancy data. Please try again.",
        variant: "destructive",
      });
    }
  };

  // Calculate costs for split mode
  const { sourceTotal, users: calculatedUsers, perDiem } = useMemo(() => {
    if (mode !== "split" || !dailyBreakdown || totalAmount === 0) {
      return { sourceTotal: 0, users: [], perDiem: 0 };
    }

    const totalGuestNights = dailyBreakdown.reduce((sum, d) => sum + d.guests, 0);
    const perDiem = totalGuestNights > 0 ? totalAmount / totalGuestNights : 0;

    const sourceTotal = occupancy.reduce((sum, day) => {
      return sum + (sourceDailyGuests[day.date] || 0) * perDiem;
    }, 0);

    const updatedUsers = selectedUsers.map(user => {
      const userTotal = occupancy.reduce((sum, day) => {
        return sum + (user.dailyGuests[day.date] || 0) * perDiem;
      }, 0);
      return { ...user, totalAmount: userTotal };
    });

    return { sourceTotal, users: updatedUsers, perDiem };
  }, [mode, dailyBreakdown, totalAmount, sourceDailyGuests, selectedUsers, occupancy]);

  const canSplit = sourceUserId && dailyBreakdown && totalAmount > 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            Edit Occupancy - {stay.family_group}
            {billingLocked && (
              <Badge variant="secondary" className="ml-2">
                <Lock className="h-3 w-3 mr-1" />
                Billing Locked
              </Badge>
            )}
          </DialogTitle>
          <p className="text-sm text-muted-foreground">
            {format(stay.startDate, 'MMM d')} - {format(stay.endDate, 'MMM d, yyyy')}
            {billingLocked && (
              <span className="block mt-1 text-amber-600 dark:text-amber-400">
                ⚠️ Guest counts will update but charges will not recalculate
              </span>
            )}
          </p>
        </DialogHeader>

        <Tabs value={mode} onValueChange={(v) => setMode(v as "simple" | "split")}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="simple">Simple Entry</TabsTrigger>
            <TabsTrigger value="split" disabled={!canSplit}>
              Split Costs
              {!canSplit && <span className="ml-1 text-xs opacity-50">(N/A)</span>}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="simple" className="space-y-4">
            <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg">
              <span className="text-sm font-medium">Quick Fill:</span>
              <Input
                type="number"
                min="0"
                value={fillValue}
                onChange={(e) => setFillValue(e.target.value)}
                className="w-20"
                placeholder="0"
              />
              <Button variant="outline" size="sm" onClick={handleFillAll}>
                Fill All Days
              </Button>
            </div>

            <ScrollArea className="h-[400px] pr-4">
              <div className="grid grid-cols-[auto_1fr_auto] gap-x-4 gap-y-1 items-center text-sm">
                <div className="font-medium text-muted-foreground pb-2">Date</div>
                <div className="font-medium text-muted-foreground pb-2">Day</div>
                <div className="font-medium text-muted-foreground text-right pb-2">Guests</div>
                
                {days.map(day => {
                  const dateStr = format(day, 'yyyy-MM-dd');
                  const dayOccupancy = getOccupancyForDate(dateStr);
                  
                  return (
                    <div key={dateStr} className="contents">
                      <div className="text-foreground">{format(day, 'M/d')}</div>
                      <div className="text-muted-foreground text-xs">{format(day, 'EEE')}</div>
                      <Input
                        type="number"
                        min="0"
                        value={dayOccupancy?.guests || 0}
                        onChange={(e) => handleGuestCountChange(dateStr, parseInt(e.target.value) || 0)}
                        className="w-16 h-8 text-right text-sm"
                      />
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="split" className="space-y-4">
            <div>
              <Label>Select people to split costs with:</Label>
              <div className="mt-3 space-y-2 max-h-48 overflow-y-auto border rounded-lg p-3">
                {users.map(user => (
                  <div key={user.user_id} className="flex items-center gap-3 py-2">
                    <Checkbox
                      checked={selectedUsers.some(u => u.userId === user.user_id)}
                      onCheckedChange={(checked) => handleUserToggle(user, !!checked)}
                      disabled={!user.actual_family_group}
                    />
                    <Label className={`flex-1 ${user.actual_family_group ? 'cursor-pointer' : 'cursor-not-allowed opacity-50'}`}>
                      {user.display_name || `${user.first_name} ${user.last_name}`}
                      <span className="text-sm text-muted-foreground ml-2">
                        ({user.email})
                        {!user.actual_family_group && <span className="text-destructive ml-1">- No family group</span>}
                        {user.actual_family_group && <span className="ml-1">- {user.actual_family_group}</span>}
                      </span>
                    </Label>
                  </div>
                ))}
              </div>
            </div>

            {selectedUsers.length > 0 && (
              <>
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    Assign guest counts for each person each day. Total must match the occupancy for each day.
                  </AlertDescription>
                </Alert>

                <ScrollArea className="h-[300px]">
                  <div className="border rounded-lg overflow-x-auto">
                    <table className="w-full min-w-max">
                      <thead className="bg-muted">
                        <tr>
                          <th className="text-left p-3 sticky left-0 bg-muted z-10">Date</th>
                          <th className="text-right p-3">You</th>
                          {selectedUsers.map(user => (
                            <th key={user.userId} className="text-right p-3 min-w-[120px]">
                              <div className="flex items-center justify-end gap-1">
                                <span className="truncate max-w-[100px]" title={user.displayName}>
                                  {user.displayName}
                                </span>
                              </div>
                            </th>
                          ))}
                          <th className="text-right p-3 font-bold">Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        {occupancy.map(day => {
                          const sourceGuests = sourceDailyGuests[day.date] || 0;
                          const otherGuests = selectedUsers.reduce((sum, u) => 
                            sum + (u.dailyGuests[day.date] || 0), 0);
                          const dayTotal = sourceGuests + otherGuests;
                          const isValid = Math.abs(dayTotal - day.guests) < 0.01;
                          
                          return (
                            <tr key={day.date} className="border-t">
                              <td className="p-3 sticky left-0 bg-background z-10">
                                {parseDateOnly(day.date).toLocaleDateString()}
                              </td>
                              <td className="p-3">
                                <Input
                                  type="number"
                                  min="0"
                                  max={day.guests}
                                  value={sourceGuests}
                                  onChange={(e) => handleSplitGuestCountChange(day.date, 'source', e.target.value)}
                                  className="w-20 ml-auto"
                                />
                              </td>
                              {selectedUsers.map(user => (
                                <td key={user.userId} className="p-3">
                                  <Input
                                    type="number"
                                    min="0"
                                    max={day.guests}
                                    value={user.dailyGuests[day.date] || 0}
                                    onChange={(e) => handleSplitGuestCountChange(day.date, user.userId, e.target.value)}
                                    className="w-20 ml-auto"
                                  />
                                </td>
                              ))}
                              <td className={`text-right p-3 font-semibold ${isValid ? 'text-muted-foreground' : 'text-destructive'}`}>
                                {dayTotal} / {day.guests}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </ScrollArea>

                <div className={`grid gap-4 p-4 bg-muted rounded-lg`} style={{ 
                  gridTemplateColumns: `repeat(${selectedUsers.length + 1}, minmax(0, 1fr))` 
                }}>
                  <div>
                    <div className="text-sm text-muted-foreground mb-1">Your Portion</div>
                    <div className="text-xl font-bold text-primary">
                      {BillingCalculator.formatCurrency(sourceTotal)}
                    </div>
                  </div>
                  {calculatedUsers.map(user => (
                    <div key={user.userId}>
                      <div className="text-sm text-muted-foreground mb-1 truncate" title={user.displayName}>
                        {user.displayName}
                      </div>
                      <div className="text-xl font-bold text-green-600">
                        {BillingCalculator.formatCurrency(user.totalAmount)}
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </TabsContent>
        </Tabs>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          {mode === "simple" ? (
            <Button onClick={handleSaveSimple} disabled={syncing}>
              {syncing ? "Saving..." : "Save Changes"}
            </Button>
          ) : (
            <Button onClick={handleSplitCosts} disabled={loading || selectedUsers.length === 0}>
              {loading ? 'Creating Split...' : `Create Split for ${selectedUsers.length} ${selectedUsers.length === 1 ? 'Person' : 'People'}`}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
