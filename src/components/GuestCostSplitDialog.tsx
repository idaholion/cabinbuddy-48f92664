import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { BillingCalculator } from '@/lib/billing-calculator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, Users } from 'lucide-react';

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
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [selectedUserFamilyGroup, setSelectedUserFamilyGroup] = useState<string>('');
  const [dailySplits, setDailySplits] = useState<Record<string, { yourGuests: number; guestGuests: number }>>({});

  useEffect(() => {
    if (open) {
      fetchUsers();
      initializeDailySplits();
    }
  }, [open, dailyBreakdown]);

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

    // Filter out current user
    const filteredUsers = data?.filter((u: OrgUser) => u.user_id !== sourceUserId) || [];
    setUsers(filteredUsers);
  };

  const initializeDailySplits = () => {
    const splits: Record<string, { yourGuests: number; guestGuests: number }> = {};
    dailyBreakdown.forEach(day => {
      splits[day.date] = {
        yourGuests: day.guests,
        guestGuests: 0
      };
    });
    setDailySplits(splits);
  };

  const handleGuestCountChange = (date: string, field: 'yourGuests' | 'guestGuests', value: string) => {
    const numValue = parseInt(value) || 0;
    const originalGuests = dailyBreakdown.find(d => d.date === date)?.guests || 0;

    setDailySplits(prev => {
      const current = prev[date];
      const newSplit = { ...current, [field]: numValue };

      // Auto-adjust the other field to not exceed total
      if (field === 'yourGuests') {
        newSplit.guestGuests = Math.max(0, originalGuests - numValue);
      } else {
        newSplit.yourGuests = Math.max(0, originalGuests - numValue);
      }

      return { ...prev, [date]: newSplit };
    });
  };

  const calculateSplitCosts = () => {
    const perDiem = totalAmount / dailyBreakdown.reduce((sum, d) => sum + d.guests, 0);

    const yourTotal = dailyBreakdown.reduce((sum, day) => {
      const split = dailySplits[day.date];
      return sum + (split?.yourGuests || day.guests) * perDiem;
    }, 0);

    const guestTotal = dailyBreakdown.reduce((sum, day) => {
      const split = dailySplits[day.date];
      return sum + (split?.guestGuests || 0) * perDiem;
    }, 0);

    return { yourTotal, guestTotal, perDiem };
  };

  const validateSplit = (): boolean => {
    if (!selectedUserId) {
      toast({
        title: 'Select a Guest',
        description: 'Please select who you want to split costs with',
        variant: 'destructive',
      });
      return false;
    }

    const { guestTotal } = calculateSplitCosts();
    if (guestTotal <= 0) {
      toast({
        title: 'Invalid Split',
        description: 'Guest must have at least some guest count assigned',
        variant: 'destructive',
      });
      return false;
    }

    return true;
  };

  const handleSplitCosts = async () => {
    if (!validateSplit()) return;

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { yourTotal, guestTotal, perDiem } = calculateSplitCosts();

      // Create guest's daily occupancy array
      const guestDailyOccupancy = dailyBreakdown
        .map(day => ({
          date: day.date,
          guests: dailySplits[day.date]?.guestGuests || 0,
          cost: (dailySplits[day.date]?.guestGuests || 0) * perDiem
        }))
        .filter(day => day.guests > 0);

      // Create your reduced daily occupancy array
      const yourDailyOccupancy = dailyBreakdown.map(day => ({
        date: day.date,
        guests: dailySplits[day.date]?.yourGuests || day.guests,
        cost: (dailySplits[day.date]?.yourGuests || day.guests) * perDiem
      }));

      // Create guest's payment
      const { data: guestPayment, error: guestPaymentError } = await supabase
        .from('payments')
        .insert({
          organization_id: organizationId,
          family_group: selectedUserFamilyGroup,
          payment_type: 'use_fee',
          amount: guestTotal,
          amount_paid: 0,
          status: 'deferred',
          description: `Guest cost split - ${dailyBreakdown[0]?.date} to ${dailyBreakdown[dailyBreakdown.length - 1]?.date}`,
          daily_occupancy: guestDailyOccupancy,
          created_by_user_id: user.id,
          notes: `Split from ${sourceFamilyGroup}`
        })
        .select()
        .single();

      if (guestPaymentError) throw guestPaymentError;

      // Note: In a full implementation, you would also create/update the source payment here
      // For now, we're just creating the guest payment and the split record

      // Create split tracking record
      const { data: splitRecord, error: splitError } = await supabase
        .from('payment_splits')
        .insert({
          organization_id: organizationId,
          source_payment_id: guestPayment.id, // Temporary - should be actual source payment
          split_payment_id: guestPayment.id,
          source_family_group: sourceFamilyGroup,
          source_user_id: sourceUserId,
          split_to_family_group: selectedUserFamilyGroup,
          split_to_user_id: selectedUserId,
          daily_occupancy_split: guestDailyOccupancy,
          created_by_user_id: user.id,
          notification_status: 'pending'
        })
        .select()
        .single();

      if (splitError) throw splitError;

      // Call edge function to send notification
      const { error: notificationError } = await supabase.functions.invoke('send-guest-split-notification', {
        body: {
          splitId: splitRecord.id,
          organizationId: organizationId
        }
      });

      if (notificationError) {
        console.error('Notification error:', notificationError);
        // Don't fail the whole operation if notification fails
      }

      toast({
        title: 'Split Created',
        description: `${users.find(u => u.user_id === selectedUserId)?.display_name} will be notified of their ${BillingCalculator.formatCurrency(guestTotal)} charge`,
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

  const { yourTotal, guestTotal } = calculateSplitCosts();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Split Guest Costs
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          <div>
            <Label>Who are you splitting costs with?</Label>
            <Select value={selectedUserId} onValueChange={(value) => {
              setSelectedUserId(value);
              // Fetch user's family group
              const user = users.find(u => u.user_id === value);
              // In production, you'd fetch this from member_profile_links or family_groups
              setSelectedUserFamilyGroup(user?.display_name || '');
            }}>
              <SelectTrigger className="mt-2">
                <SelectValue placeholder="Select a guest..." />
              </SelectTrigger>
              <SelectContent>
                {users.map(user => (
                  <SelectItem key={user.user_id} value={user.user_id}>
                    {user.display_name || `${user.first_name} ${user.last_name}`} ({user.email})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Split guest counts for each day. The costs will be calculated based on per-guest charges.
            </AlertDescription>
          </Alert>

          <div className="border rounded-lg overflow-hidden">
            <table className="w-full">
              <thead className="bg-muted">
                <tr>
                  <th className="text-left p-3">Date</th>
                  <th className="text-right p-3">Your Guests</th>
                  <th className="text-right p-3">Guest's Guests</th>
                  <th className="text-right p-3">Total</th>
                </tr>
              </thead>
              <tbody>
                {dailyBreakdown.map(day => {
                  const split = dailySplits[day.date] || { yourGuests: day.guests, guestGuests: 0 };
                  return (
                    <tr key={day.date} className="border-t">
                      <td className="p-3">{new Date(day.date).toLocaleDateString()}</td>
                      <td className="p-3">
                        <Input
                          type="number"
                          min="0"
                          max={day.guests}
                          value={split.yourGuests}
                          onChange={(e) => handleGuestCountChange(day.date, 'yourGuests', e.target.value)}
                          className="w-20 ml-auto"
                        />
                      </td>
                      <td className="p-3">
                        <Input
                          type="number"
                          min="0"
                          max={day.guests}
                          value={split.guestGuests}
                          onChange={(e) => handleGuestCountChange(day.date, 'guestGuests', e.target.value)}
                          className="w-20 ml-auto"
                        />
                      </td>
                      <td className="text-right p-3 text-muted-foreground">
                        {day.guests}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="grid grid-cols-2 gap-4 p-4 bg-muted rounded-lg">
            <div>
              <div className="text-sm text-muted-foreground mb-1">Your Portion</div>
              <div className="text-2xl font-bold text-primary">
                {BillingCalculator.formatCurrency(yourTotal)}
              </div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground mb-1">Guest's Portion</div>
              <div className="text-2xl font-bold text-green-600">
                {BillingCalculator.formatCurrency(guestTotal)}
              </div>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleSplitCosts} disabled={loading}>
            {loading ? 'Creating Split...' : 'Split and Notify'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
