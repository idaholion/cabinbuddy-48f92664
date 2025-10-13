import { useState, useEffect } from 'react';
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

interface DailyBreakdown {
  date: string;
  guests: number;
  cost: number;
}

interface GuestCostSplitDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  organizationId: string;
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
      console.error('Error fetching users:', error);
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
      console.error('Error fetching family groups:', fgError);
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
          const maxForUser = originalGuests - sourceDailyGuests[date] - otherUsersTotal;
          const adjustedValue = Math.min(numValue, maxForUser);
          
          return {
            ...user,
            dailyGuests: { ...user.dailyGuests, [date]: adjustedValue }
          };
        }
        return user;
      }));
    }
  };

  const calculateSplitCosts = () => {
    const totalGuestNights = dailyBreakdown.reduce((sum, d) => sum + d.guests, 0);
    const perDiem = totalGuestNights > 0 ? totalAmount / totalGuestNights : 0;

    // Calculate source total
    const sourceTotal = dailyBreakdown.reduce((sum, day) => {
      return sum + (sourceDailyGuests[day.date] || 0) * perDiem;
    }, 0);

    // Calculate each user's total and update in state
    const updatedUsers = selectedUsers.map(user => {
      const userTotal = dailyBreakdown.reduce((sum, day) => {
        return sum + (user.dailyGuests[day.date] || 0) * perDiem;
      }, 0);
      return { ...user, totalAmount: userTotal };
    });

    return { sourceTotal, users: updatedUsers, perDiem };
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

    const { users } = calculateSplitCosts();
    const hasInvalidUser = users.some(user => user.totalAmount <= 0);
    
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
    if (!validateSplit()) return;

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { sourceTotal, users: calculatedUsers, perDiem } = calculateSplitCosts();
      const seasonEnd = new Date(new Date().getFullYear(), 9, 31); // Oct 31

      // Create source payment (Person A - reduced amount)
      const sourceDailyOccupancy = dailyBreakdown.map(day => ({
        date: day.date,
        guests: sourceDailyGuests[day.date] || 0,
        cost: (sourceDailyGuests[day.date] || 0) * perDiem
      }));

      const { data: sourcePayment, error: sourcePaymentError } = await supabase
        .from('payments')
        .insert({
          organization_id: organizationId,
          family_group: sourceFamilyGroup,
          payment_type: 'use_fee',
          amount: sourceTotal,
          amount_paid: 0,
          status: 'deferred',
          due_date: seasonEnd.toISOString().split('T')[0],
          description: `Use fee (split with ${calculatedUsers.length} ${calculatedUsers.length === 1 ? 'person' : 'people'}) - ${dailyBreakdown[0]?.date} to ${dailyBreakdown[dailyBreakdown.length - 1]?.date}`,
          notes: `Cost split with: ${calculatedUsers.map(u => u.displayName).join(', ')}`,
          daily_occupancy: sourceDailyOccupancy,
          created_by_user_id: user.id,
        })
        .select()
        .single();

      if (sourcePaymentError) throw sourcePaymentError;

      // Create payments and split records for each guest
      const splitPromises = calculatedUsers.map(async (splitUser) => {
        // Create guest's daily occupancy
        const guestDailyOccupancy = dailyBreakdown
          .map(day => ({
            date: day.date,
            guests: splitUser.dailyGuests[day.date] || 0,
            cost: (splitUser.dailyGuests[day.date] || 0) * perDiem
          }))
          .filter(day => day.guests > 0);

        // Create guest's payment
        const { data: guestPayment, error: guestPaymentError } = await supabase
          .from('payments')
          .insert({
            organization_id: organizationId,
            family_group: splitUser.familyGroup,
            payment_type: 'use_fee',
            amount: splitUser.totalAmount,
            amount_paid: 0,
            status: 'deferred',
            due_date: seasonEnd.toISOString().split('T')[0],
            description: `Guest cost split - ${dailyBreakdown[0]?.date} to ${dailyBreakdown[dailyBreakdown.length - 1]?.date}`,
            daily_occupancy: guestDailyOccupancy,
            created_by_user_id: user.id,
            notes: `Split from ${sourceFamilyGroup}`
          })
          .select()
          .single();

        if (guestPaymentError) throw guestPaymentError;

        // Create split tracking record
        const { data: splitRecord, error: splitError } = await supabase
          .from('payment_splits')
          .insert({
            organization_id: organizationId,
            source_payment_id: sourcePayment.id,
            split_payment_id: guestPayment.id,
            source_family_group: sourceFamilyGroup,
            source_user_id: sourceUserId,
            split_to_family_group: splitUser.familyGroup,
            split_to_user_id: splitUser.userId,
            daily_occupancy_split: guestDailyOccupancy,
            created_by_user_id: user.id,
            notification_status: 'pending'
          })
          .select()
          .single();

        if (splitError) throw splitError;

        // Send notification
        const { error: notificationError } = await supabase.functions.invoke('send-guest-split-notification', {
          body: {
            splitId: splitRecord.id,
            organizationId: organizationId
          }
        });

        if (notificationError) {
          console.error('Notification error for', splitUser.displayName, ':', notificationError);
        }

        return { user: splitUser, payment: guestPayment };
      });

      await Promise.all(splitPromises);

      const totalSplit = calculatedUsers.reduce((sum, u) => sum + u.totalAmount, 0);
      const userNames = calculatedUsers.map(u => u.displayName).join(', ');

      toast({
        title: 'Split Created',
        description: `Successfully split ${BillingCalculator.formatCurrency(totalSplit)} with ${calculatedUsers.length} ${calculatedUsers.length === 1 ? 'person' : 'people'}. They will be notified.`,
      });

      onSplitCreated?.();
      onOpenChange(false);

    } catch (error: any) {
      console.error('Error creating split:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to create cost split',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const { sourceTotal, users: calculatedUsers } = calculateSplitCosts();

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
