import { useState, useEffect, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { BillingCalculator } from '@/lib/billing-calculator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, Users, X } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { parseDateOnly } from '@/lib/date-utils';
import { logger } from '@/lib/logger';

interface DailyBreakdown {
  date: string;
  guests: number;
  cost: number;
}

interface GuestCostSplitDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  organizationId: string;
  reservationId?: string | null;
  dailyBreakdown: DailyBreakdown[];
  totalAmount: number;
  sourceUserId: string;
  sourceFamilyGroup: string;
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

export const GuestCostSplitDialog = ({
  open,
  onOpenChange,
  organizationId,
  reservationId,
  dailyBreakdown,
  totalAmount,
  sourceUserId,
  sourceFamilyGroup,
  onSplitCreated
}: GuestCostSplitDialogProps) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [users, setUsers] = useState<OrgUser[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<UserSplit[]>([]);
  const [sourceDailyGuests, setSourceDailyGuests] = useState<Record<string, number>>({});

  useEffect(() => {
    if (open) {
      fetchUsers();
      initializeSourceGuests();
    }
  }, [open]); // Only reinitialize when dialog opens, not when dailyBreakdown changes

  const fetchUsers = async () => {
    const { data, error } = await supabase
      .rpc('get_organization_user_emails', { org_id: organizationId });

    if (error) {
      logger.error('Failed to fetch organization users', { 
        component: 'GuestCostSplitDialog', 
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

    // Get family groups to match users to their groups
    const { data: familyGroups, error: fgError } = await supabase
      .from('family_groups')
      .select('name, lead_email, host_members')
      .eq('organization_id', organizationId);

    if (fgError) {
      logger.error('Failed to fetch family groups', {
        component: 'GuestCostSplitDialog',
        action: 'fetchUsers',
        organizationId,
        error: fgError.message
      });
    }

    console.log('🔍 [SPLIT] Family Groups:', familyGroups);
    console.log('🔍 [SPLIT] All Users:', data);

    // Filter out current user and enrich with family group info
    const filteredUsers = (data?.filter((u: OrgUser) => u.user_id !== sourceUserId) || []).map((u: OrgUser) => {
      console.log(`🔍 [SPLIT] Matching user: ${u.email} (${u.display_name})`);
      
      // Find the family group this user belongs to
      const userFamilyGroup = familyGroups?.find(fg => {
        console.log(`  Checking family group: ${fg.name}`);
        console.log(`    Lead email: ${fg.lead_email}`);
        console.log(`    Host members:`, fg.host_members);
        
        // Check if user is the lead
        if (fg.lead_email?.toLowerCase().trim() === u.email.toLowerCase().trim()) {
          console.log(`    ✅ User is LEAD of ${fg.name}`);
          return true;
        }
        
        // Check if user is in host_members
        if (fg.host_members) {
          const members = Array.isArray(fg.host_members) ? fg.host_members : [];
          console.log(`    Checking ${members.length} host members`);
          
          const isHostMember = members.some((m: any) => {
            const memberEmail = m.email?.toLowerCase().trim();
            const userEmail = u.email.toLowerCase().trim();
            console.log(`      Comparing: "${memberEmail}" === "${userEmail}"`);
            return memberEmail === userEmail;
          });
          
          if (isHostMember) {
            console.log(`    ✅ User is HOST MEMBER of ${fg.name}`);
            return true;
          }
        }
        
        return false;
      });
      
      console.log(`  Result: ${userFamilyGroup ? `Found in ${userFamilyGroup.name}` : 'NOT FOUND IN ANY GROUP'}`);
      
      return {
        ...u,
        actual_family_group: userFamilyGroup?.name || null
      };
    });

    console.log('🔍 [SPLIT] Final matched users:', filteredUsers);
    setUsers(filteredUsers);
  };

  const initializeSourceGuests = () => {
    const sourceGuests: Record<string, number> = {};
    dailyBreakdown.forEach(day => {
      sourceGuests[day.date] = day.guests;
    });
    setSourceDailyGuests(sourceGuests);
  };

  const handleUserToggle = (user: OrgUser, checked: boolean) => {
    if (checked) {
      if (!user.actual_family_group) {
        toast({
          title: 'User Not in Family Group',
          description: `${user.display_name} is not associated with any family group. They cannot receive split payments.`,
          variant: 'destructive',
        });
        return;
      }

      const newUser: UserSplit = {
        userId: user.user_id,
        familyGroup: user.actual_family_group,
        displayName: user.display_name || `${user.first_name} ${user.last_name}`,
        dailyGuests: {},
        totalAmount: 0
      };
      dailyBreakdown.forEach(day => {
        newUser.dailyGuests[day.date] = 0;
      });
      setSelectedUsers(prev => [...prev, newUser]);
    } else {
      setSelectedUsers(prev => prev.filter(u => u.userId !== user.user_id));
      // Redistribute the removed user's guests back to source
      setSourceDailyGuests(prev => {
        const updated = { ...prev };
        const removedUser = selectedUsers.find(u => u.userId === user.user_id);
        if (removedUser) {
          Object.keys(removedUser.dailyGuests).forEach(date => {
            updated[date] = (updated[date] || 0) + removedUser.dailyGuests[date];
          });
        }
        return updated;
      });
    }
  };

  const handleGuestCountChange = (date: string, userId: string, value: string) => {
    const numValue = Math.max(0, parseInt(value) || 0);
    const originalGuests = dailyBreakdown.find(d => d.date === date)?.guests || 0;
    
    if (userId === 'source') {
      // Calculate total guests assigned to other users
      const otherUsersTotal = selectedUsers.reduce((sum, user) => 
        sum + (user.dailyGuests[date] || 0), 0);
      
      // Source can't be more than original minus others
      const maxSource = originalGuests - otherUsersTotal;
      const adjustedValue = Math.min(numValue, maxSource);
      
      setSourceDailyGuests(prev => ({ ...prev, [date]: adjustedValue }));
    } else {
      // Update specific user's guest count
      setSelectedUsers(prev => prev.map(user => {
        if (user.userId === userId) {
          // Calculate max this user can have
          const otherUsersTotal = prev
            .filter(u => u.userId !== userId)
            .reduce((sum, u) => sum + (u.dailyGuests[date] || 0), 0);
          const currentSourceGuests = sourceDailyGuests[date] || 0;
          const maxForUser = Math.max(0, originalGuests - currentSourceGuests - otherUsersTotal);
          const adjustedValue = Math.min(numValue, Math.max(0, maxForUser));
          
          return {
            ...user,
            dailyGuests: { ...user.dailyGuests, [date]: adjustedValue }
          };
        }
        return user;
      }));
    }
  };

  const validateSplit = (): boolean => {
    if (selectedUsers.length === 0) {
      toast({
        title: 'Select Guests',
        description: 'Please select at least one person to split costs with',
        variant: 'destructive',
      });
      return false;
    }

    // Use the memoized calculatedUsers which already has totalAmount computed
    const hasInvalidUser = calculatedUsers.some(user => user.totalAmount <= 0);
    
    if (hasInvalidUser) {
      toast({
        title: 'Invalid Split',
        description: 'Each selected person must have at least some guest count assigned',
        variant: 'destructive',
      });
      return false;
    }

    // Verify totals match (allow for small floating point differences)
    for (const day of dailyBreakdown) {
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
    console.log('🔄 [SPLIT] Starting split costs process...');
    console.log('🔄 [SPLIT] Source user ID:', sourceUserId);
    console.log('🔄 [SPLIT] Source family group:', sourceFamilyGroup);
    console.log('🔄 [SPLIT] Daily breakdown:', dailyBreakdown);
    console.log('🔄 [SPLIT] Selected users:', selectedUsers);
    
    if (!validateSplit()) {
      console.log('❌ [SPLIT] Validation failed');
      return;
    }

    setLoading(true);
    try {
      // CRITICAL: Refresh the session to ensure we have a valid auth token
      console.log('🔄 [SPLIT] Refreshing session...');
      const { data: { session }, error: sessionError } = await supabase.auth.refreshSession();
      
      if (sessionError || !session) {
        logger.error('Session refresh failed during cost split', {
          component: 'GuestCostSplitDialog',
          action: 'handleSplitCosts',
          organizationId,
          error: sessionError?.message
        });
        throw new Error('Authentication session expired. Please log in again.');
      }
      
      console.log('✅ [SPLIT] Session refreshed successfully');
      console.log('✅ [SPLIT] User ID:', session.user.id);
      console.log('✅ [SPLIT] User email:', session.user.email);
      
      const user = session.user;

      // Use the memoized values already calculated at component level
      console.log('💰 [SPLIT] Using calculated costs:', { sourceTotal, perDiem, calculatedUsers });
      
      
      // CRITICAL: Verify user is in the correct organization
      console.log('🔍 [SPLIT] Verifying organization membership...');
      console.log('  User ID:', user.id);
      console.log('  User Email:', user.email);
      console.log('  Target Organization ID:', organizationId);
      
      const { data: userOrgData, error: userOrgError } = await supabase
        .from('user_organizations')
        .select('organization_id, role')
        .eq('user_id', user.id)
        .eq('organization_id', organizationId)
        .maybeSingle();
      
      console.log('👤 [SPLIT] Membership check result:', userOrgData);
      if (userOrgError) {
        logger.error('Organization membership check failed', {
          component: 'GuestCostSplitDialog',
          action: 'handleSplitCosts',
          userId: user.id,
          organizationId,
          error: userOrgError.message
        });
      }
      
      if (!userOrgData) {
        logger.error('Organization mismatch - user not member', {
          component: 'GuestCostSplitDialog',
          action: 'handleSplitCosts',
          userId: user.id,
          userEmail: user.email,
          organizationId
        });
        
        // Get user's actual organization
        const { data: userActualOrg } = await supabase
          .from('user_organizations')
          .select('organization_id')
          .eq('user_id', user.id)
          .eq('is_primary', true)
          .maybeSingle();
        
        let actualOrgName = 'your organization';
        if (userActualOrg?.organization_id) {
          const { data: orgData } = await supabase
            .from('organizations')
            .select('name')
            .eq('id', userActualOrg.organization_id)
            .single();
          actualOrgName = orgData?.name || actualOrgName;
        }
        
        const errorMsg = `ORGANIZATION MISMATCH: You are logged in as ${user.email}, but you're trying to create a payment in a different organization. Please make sure you're working within your own organization (${actualOrgName}). If you need to manage multiple organizations, please switch organizations first.`;
        
        toast({
          title: "Organization Mismatch",
          description: errorMsg,
          variant: "destructive",
          duration: 10000,
        });
        throw new Error(errorMsg);
      }

      console.log('✅ [SPLIT] Organization membership confirmed:', userOrgData);

      // Call edge function to create all payments with service role permissions
      console.log('📞 [SPLIT] Calling edge function to create split payments...');
      
      const sourceDailyOccupancy = dailyBreakdown.map(day => ({
        date: day.date,
        guests: sourceDailyGuests[day.date] || 0,
        cost: (sourceDailyGuests[day.date] || 0) * perDiem
      }));
      
      const seasonEnd = new Date(new Date().getFullYear(), 9, 31); // Oct 31
      
      const { data: edgeFunctionResult, error: edgeFunctionError } = await supabase.functions.invoke(
        'create-split-payments',
        {
          body: {
            organizationId,
            reservationId,
            sourceFamilyGroup,
            sourceUserId,
            sourceAmount: sourceTotal,
            sourceDailyOccupancy,
            splitUsers: calculatedUsers.map(u => ({
              userId: u.userId,
              familyGroup: u.familyGroup,
              displayName: u.displayName,
              amount: u.totalAmount,
              dailyOccupancy: dailyBreakdown
                .map(day => ({
                  date: day.date,
                  guests: u.dailyGuests[day.date] || 0,
                  cost: (u.dailyGuests[day.date] || 0) * perDiem
                }))
                .filter(day => day.guests > 0)
            })),
            description: `Use fee (split with ${calculatedUsers.length} ${calculatedUsers.length === 1 ? 'person' : 'people'}) - ${dailyBreakdown[0]?.date} to ${dailyBreakdown[dailyBreakdown.length - 1]?.date}`,
            dateRange: {
              start: dailyBreakdown[0]?.date,
              end: dailyBreakdown[dailyBreakdown.length - 1]?.date
            }
          }
        }
      );

      if (edgeFunctionError) {
        logger.error('Edge function call failed', {
          component: 'GuestCostSplitDialog',
          action: 'handleSplitCosts',
          organizationId,
          error: edgeFunctionError.message
        });
        throw new Error(edgeFunctionError.message || 'Failed to create split payments');
      }

      if (!edgeFunctionResult?.success) {
        throw new Error(edgeFunctionResult?.error || 'Failed to create split payments');
      }

      console.log('✅ [SPLIT] Edge function completed successfully:', edgeFunctionResult);

      const totalSplit = calculatedUsers.reduce((sum, u) => sum + u.totalAmount, 0);
      const userNames = calculatedUsers.map(u => u.displayName).join(', ');

      console.log('✅ [SPLIT] All splits completed successfully!');
      toast({
        title: 'Split Created',
        description: `Successfully split ${BillingCalculator.formatCurrency(totalSplit)} with ${calculatedUsers.length} ${calculatedUsers.length === 1 ? 'person' : 'people'}. They will be notified.`,
      });

      onSplitCreated?.();
      onOpenChange(false);

    } catch (error: any) {
      logger.error('Failed to create cost split', {
        component: 'GuestCostSplitDialog',
        action: 'handleSplitCosts',
        organizationId,
        sourceFamilyGroup,
        error: error.message,
        errorCode: error.code,
        errorDetails: error.details,
        errorHint: error.hint
      });
      toast({
        title: 'Error',
        description: error.message || 'Failed to create cost split',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
      console.log('🏁 [SPLIT] Split process finished');
    }
  };

  // Recalculate costs whenever guest counts change
  const { sourceTotal, users: calculatedUsers, perDiem } = useMemo(() => {
    const totalGuestNights = dailyBreakdown.reduce((sum, d) => sum + d.guests, 0);
    const perDiem = totalGuestNights > 0 ? totalAmount / totalGuestNights : 0;

    // Calculate source total
    const sourceTotal = dailyBreakdown.reduce((sum, day) => {
      return sum + (sourceDailyGuests[day.date] || 0) * perDiem;
    }, 0);

    // Calculate each user's total
    const updatedUsers = selectedUsers.map(user => {
      const userTotal = dailyBreakdown.reduce((sum, day) => {
        return sum + (user.dailyGuests[day.date] || 0) * perDiem;
      }, 0);
      return { ...user, totalAmount: userTotal };
    });

    return { sourceTotal, users: updatedUsers, perDiem };
  }, [dailyBreakdown, totalAmount, sourceDailyGuests, selectedUsers]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Split Guest Costs
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
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
                  Assign guest counts for each person each day. Costs calculated based on per-guest charges.
                </AlertDescription>
              </Alert>

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
                    {dailyBreakdown.map(day => {
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
                              onChange={(e) => handleGuestCountChange(day.date, 'source', e.target.value)}
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
                                onChange={(e) => handleGuestCountChange(day.date, user.userId, e.target.value)}
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
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleSplitCosts} disabled={loading || selectedUsers.length === 0}>
            {loading ? 'Creating Split...' : `Create Split for ${selectedUsers.length} ${selectedUsers.length === 1 ? 'Person' : 'People'}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
