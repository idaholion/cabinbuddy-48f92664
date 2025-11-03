import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { toast } from 'sonner';
import { Trash2, AlertTriangle, Info } from 'lucide-react';

interface FailedSplitData {
  orphanedPayments: any[];
  originalPayment: any | null;
  totalToCleanup: number;
}

export const CleanupDuplicatePayments = () => {
  const [loading, setLoading] = useState(false);
  const [failedSplitData, setFailedSplitData] = useState<FailedSplitData | null>(null);
  const [checking, setChecking] = useState(false);

  const checkForFailedSplits = async () => {
    setChecking(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Get primary org
      const { data: orgData } = await supabase.rpc('get_user_primary_organization_id');
      if (!orgData) throw new Error('No organization found');

      console.log('🔍 Checking for failed split payments...');

      // Find all payments with "split" in description for this reservation
      const { data: allSplitPayments, error: allError } = await supabase
        .from('payments')
        .select('*')
        .eq('organization_id', orgData)
        .eq('family_group', 'Woolf Family')
        .like('description', '%split with%')
        .order('created_at', { ascending: true });

      if (allError) throw allError;

      console.log('Found payments:', allSplitPayments);

      if (!allSplitPayments || allSplitPayments.length === 0) {
        setFailedSplitData(null);
        toast.success('No split payments found');
        setChecking(false);
        return;
      }

      // Keep the oldest payment, mark rest as duplicates
      const [originalPayment, ...duplicates] = allSplitPayments;

      setFailedSplitData({
        orphanedPayments: duplicates,
        originalPayment,
        totalToCleanup: duplicates.length
      });

      if (duplicates.length > 0) {
        toast.info(`Found ${duplicates.length} duplicate payment(s)`);
      } else {
        toast.success('No duplicate payments found');
      }
    } catch (error: any) {
      console.error('Error checking for failed splits:', error);
      toast.error(`Failed to check: ${error.message}`);
    } finally {
      setChecking(false);
    }
  };

  const cleanupFailedSplits = async () => {
    if (!failedSplitData || failedSplitData.totalToCleanup === 0) {
      toast.error('No issues to clean up');
      return;
    }

    setLoading(true);
    try {
      let deletedCount = 0;

      // Delete orphaned source payments
      if (failedSplitData.orphanedPayments.length > 0) {
        const ids = failedSplitData.orphanedPayments.map(p => p.id);
        
        console.log('🗑️ [CLEANUP] Deleting orphaned source payments:', ids);
        
        const { error } = await supabase
          .from('payments')
          .delete()
          .in('id', ids);

        if (error) throw error;
        deletedCount = ids.length;
      }

      toast.success(`Successfully cleaned up ${deletedCount} orphaned payment(s)`);
      
      if (failedSplitData.originalPayment) {
        toast.info('The original reservation payment remains. Barb can now retry the split operation.');
      }
      
      setFailedSplitData(null);
    } catch (error: any) {
      console.error('Error cleaning up failed splits:', error);
      toast.error(`Cleanup failed: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-3xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Trash2 className="h-5 w-5" />
          Cleanup Duplicate Payments
        </CardTitle>
        <CardDescription>
          Legacy cleanup and diagnostic tool for orphaned payment records
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            This tool identifies and removes orphaned payment records from legacy data or edge function failures. 
            Modern split cost operations use improved edge functions that prevent orphaned payments, 
            making this tool primarily useful for historical cleanup or rare edge cases.
          </AlertDescription>
        </Alert>

        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <strong>Admin Only:</strong> This operation will delete orphaned payment records. 
            Only use this for failed split operations where you're certain no actual payment was collected.
          </AlertDescription>
        </Alert>

        <div className="flex gap-2">
          <Button
            onClick={checkForFailedSplits}
            disabled={checking || loading}
            variant="outline"
          >
            {checking ? 'Checking...' : 'Check for Failed Splits'}
          </Button>

          {failedSplitData && failedSplitData.totalToCleanup > 0 && (
            <Button
              onClick={cleanupFailedSplits}
              disabled={loading}
              variant="destructive"
            >
              {loading ? 'Cleaning...' : `Clean Up ${failedSplitData.orphanedPayments.length} Orphaned Payment(s)`}
            </Button>
          )}
        </div>

        {failedSplitData && failedSplitData.totalToCleanup > 0 && (
          <div className="space-y-4">
            {failedSplitData.orphanedPayments.length > 0 && (
              <div className="space-y-2 p-4 bg-muted rounded-lg">
                <h4 className="font-semibold">Found {failedSplitData.orphanedPayments.length} orphaned source payment(s):</h4>
                <p className="text-sm text-muted-foreground">
                  These are "source" payments created when the split started, but the split never completed:
                </p>
                <ul className="text-sm space-y-1 list-disc list-inside">
                  {failedSplitData.orphanedPayments.map((payment) => (
                    <li key={payment.id}>
                      ${payment.amount} - {payment.description} - {new Date(payment.created_at).toLocaleString()}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {failedSplitData.originalPayment && (
              <div className="space-y-2 p-4 bg-blue-50 dark:bg-blue-950 rounded-lg border border-blue-200 dark:border-blue-800">
                <h4 className="font-semibold flex items-center gap-2">
                  <Info className="h-4 w-4" />
                  Original Reservation Payment Found
                </h4>
                <p className="text-sm">
                  The original payment for this reservation still exists:
                </p>
                <ul className="text-sm space-y-1 list-disc list-inside">
                  <li>${failedSplitData.originalPayment.amount} - {failedSplitData.originalPayment.description}</li>
                  <li>Current guest counts may have been modified during the failed split</li>
                </ul>
              </div>
            )}
          </div>
        )}

        <div className="pt-4 border-t">
          <h4 className="font-semibold mb-2">After Cleanup:</h4>
          <ol className="text-sm space-y-2 list-decimal list-inside">
            <li>The orphaned payments will be deleted</li>
            <li>The original reservation payment will remain (with any modified guest counts)</li>
            <li>Barb can go to Stay History and find the Woolf Family Oct 6-11 reservation</li>
            <li>She can retry "Split Cost" - the improved code should now work without RLS errors</li>
            <li>If needed, she can manually adjust guest counts before splitting</li>
          </ol>
        </div>
      </CardContent>
    </Card>
  );
};
