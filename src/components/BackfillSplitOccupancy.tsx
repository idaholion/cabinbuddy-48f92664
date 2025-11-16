import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { AlertCircle, CheckCircle2, Loader2 } from "lucide-react";

export function BackfillSplitOccupancy() {
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState<{
    processed: number;
    successful: number;
    errors: number;
    errorDetails?: any[];
  } | null>(null);

  const handleBackfill = async () => {
    setIsProcessing(true);
    setResult(null);

    try {
      const { data, error } = await supabase.functions.invoke('backfill-split-occupancy');

      if (error) throw error;

      setResult(data);
      
      if (data.errors === 0) {
        toast.success(`Successfully backfilled ${data.successful} payment splits`);
      } else {
        toast.warning(`Backfill completed with ${data.errors} errors. Check details below.`);
      }
    } catch (error: any) {
      console.error('Backfill error:', error);
      toast.error(`Backfill failed: ${error.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Backfill Split Payment Occupancy Data</CardTitle>
        <CardDescription>
          This utility fixes payment splits where the daily_occupancy field in the payments
          table doesn't match the split details. This ensures Stay History displays correct
          guest counts for split payments.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            This will update all active payment splits to ensure their daily occupancy data
            is correctly stored in the payments table. This is safe to run multiple times.
          </AlertDescription>
        </Alert>

        <Button
          onClick={handleBackfill}
          disabled={isProcessing}
          className="w-full"
        >
          {isProcessing ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Processing...
            </>
          ) : (
            'Run Backfill'
          )}
        </Button>

        {result && (
          <div className="space-y-3">
            <Alert variant={result.errors === 0 ? "default" : "destructive"}>
              {result.errors === 0 ? (
                <CheckCircle2 className="h-4 w-4" />
              ) : (
                <AlertCircle className="h-4 w-4" />
              )}
              <AlertDescription>
                <div className="space-y-1">
                  <div>Total splits processed: {result.processed}</div>
                  <div>Successfully updated: {result.successful}</div>
                  <div>Errors: {result.errors}</div>
                </div>
              </AlertDescription>
            </Alert>

            {result.errorDetails && result.errorDetails.length > 0 && (
              <div className="mt-4">
                <h4 className="text-sm font-semibold mb-2">Error Details:</h4>
                <div className="space-y-2 text-sm">
                  {result.errorDetails.map((err: any, idx: number) => (
                    <div key={idx} className="p-2 bg-muted rounded">
                      <div><strong>Split ID:</strong> {err.splitId}</div>
                      <div><strong>Error:</strong> {err.error}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
