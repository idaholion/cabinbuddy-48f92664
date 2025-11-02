import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { toast } from 'sonner';
import { Trash2, AlertTriangle } from 'lucide-react';

export const CleanupDuplicatePayments = () => {
  const [loading, setLoading] = useState(false);
  const [duplicates, setDuplicates] = useState<any[]>([]);
  const [checking, setChecking] = useState(false);

  const checkForDuplicates = async () => {
    setChecking(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Get primary org
      const { data: orgData } = await supabase.rpc('get_user_primary_organization_id');
      if (!orgData) throw new Error('No organization found');

      // Find duplicate payments
      const { data: payments, error } = await supabase
        .from('payments')
        .select('*')
        .eq('organization_id', orgData)
        .eq('family_group', 'Woolf Family')
        .eq('description', 'Use fee (split with 1 person) - 2025-10-06 to 2025-10-10')
        .eq('amount', 180.00)
        .order('created_at', { ascending: false });

      if (error) throw error;

      if (payments && payments.length > 1) {
        // Keep the most recent one, mark others as duplicates
        const dupes = payments.slice(1);
        setDuplicates(dupes);
        toast.info(`Found ${dupes.length} duplicate payments to clean up`);
      } else {
        toast.success('No duplicate payments found');
        setDuplicates([]);
      }
    } catch (error: any) {
      console.error('Error checking duplicates:', error);
      toast.error(`Failed to check: ${error.message}`);
    } finally {
      setChecking(false);
    }
  };

  const cleanupDuplicates = async () => {
    if (duplicates.length === 0) {
      toast.error('No duplicates to clean up');
      return;
    }

    setLoading(true);
    try {
      const ids = duplicates.map(p => p.id);
      
      console.log('🗑️ [CLEANUP] Deleting duplicate payments:', ids);
      
      const { error } = await supabase
        .from('payments')
        .delete()
        .in('id', ids);

      if (error) throw error;

      toast.success(`Successfully deleted ${duplicates.length} duplicate payment(s)`);
      setDuplicates([]);
    } catch (error: any) {
      console.error('Error cleaning up duplicates:', error);
      toast.error(`Cleanup failed: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Trash2 className="h-5 w-5" />
          Cleanup Duplicate Payments
        </CardTitle>
        <CardDescription>
          Remove duplicate payments created from failed split operations
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            This tool will remove duplicate payments for Woolf Family from Oct 6-10, 2025, 
            keeping only the most recent one. After cleanup, you can retry the split operation.
          </AlertDescription>
        </Alert>

        <div className="flex gap-2">
          <Button
            onClick={checkForDuplicates}
            disabled={checking || loading}
            variant="outline"
          >
            {checking ? 'Checking...' : 'Check for Duplicates'}
          </Button>

          {duplicates.length > 0 && (
            <Button
              onClick={cleanupDuplicates}
              disabled={loading}
              variant="destructive"
            >
              {loading ? 'Cleaning...' : `Delete ${duplicates.length} Duplicate(s)`}
            </Button>
          )}
        </div>

        {duplicates.length > 0 && (
          <div className="space-y-2">
            <h4 className="font-semibold">Found {duplicates.length} duplicate payment(s):</h4>
            <ul className="text-sm space-y-1 list-disc list-inside">
              {duplicates.map((dup) => (
                <li key={dup.id}>
                  ${dup.amount} - {new Date(dup.created_at).toLocaleString()}
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="pt-4 border-t">
          <h4 className="font-semibold mb-2">After Cleanup:</h4>
          <ol className="text-sm space-y-1 list-decimal list-inside">
            <li>Go back to Stay History</li>
            <li>Find the Woolf Family reservation for Oct 6-11</li>
            <li>Click "Split Cost" again</li>
            <li>The improved code should now complete successfully</li>
          </ol>
        </div>
      </CardContent>
    </Card>
  );
};
