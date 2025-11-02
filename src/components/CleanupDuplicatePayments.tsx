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

      // Find orphaned source payments (no reservation_id, created for split attempts)
      const { data: orphanedPayments, error: orphanedError } = await supabase
        .from('payments')
        .select('*')
        .eq('organization_id', orgData)
        .eq('family_group', 'Woolf Family')
        .like('description', '%split with%')
        .gte('created_at', '2025-11-02')
        .is('reservation_id', null)
        .order('created_at', { ascending: false });

      if (orphanedError) throw orphanedError;

      // Find the original payment that might have been modified
      const { data: originalPayment, error: originalError } = await supabase
        .from('payments')
        .select('*')
        .eq('organization_id', orgData)
        .eq('family_group', 'Woolf Family')
        .eq('description', 'Use fee (split with 1 person) - 2025-10-06 to 2025-10-11')
        .single();

      if (originalError && originalError.code !== 'PGRST116') {
        console.warn('Could not find original payment:', originalError);
      }

      const totalIssues = (orphanedPayments?.length || 0) + (originalPayment ? 1 : 0);

      setFailedSplitData({
        orphanedPayments: orphanedPayments || [],
        originalPayment,
        totalToCleanup: totalIssues
      });

      if (totalIssues > 0) {
        toast.info(`Found ${totalIssues} issue(s) from failed split attempts`);
      } else {
        toast.success('No failed split issues found');
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
          Cleanup Failed Split Operations
        </CardTitle>
        <CardDescription>
          Remove orphaned payments created from failed split cost attempts
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            When a split cost operation fails due to RLS errors, it can leave behind orphaned 
            "source" payments that aren't visible in the regular Stay History view. This tool 
            cleans up those orphaned payments so the split can be retried cleanly.
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
