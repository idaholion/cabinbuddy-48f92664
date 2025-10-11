import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, CheckCircle, XCircle } from 'lucide-react';

export const BackfillProfileClaims = () => {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const { toast } = useToast();

  const handleBackfill = async () => {
    setLoading(true);
    setResult(null);

    try {
      const { data, error } = await supabase.functions.invoke('backfill-member-profiles');

      if (error) throw error;

      setResult(data);
      
      if (data.success) {
        toast({
          title: "Profiles Claimed Successfully",
          description: `${data.summary.claimed} profiles claimed, ${data.summary.skipped} already claimed`,
        });
      } else {
        toast({
          title: "Backfill Failed",
          description: data.error || "An error occurred",
          variant: "destructive",
        });
      }
    } catch (error: any) {
      console.error('Backfill error:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to backfill profile claims",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Auto-Claim Profiles</CardTitle>
        <CardDescription>
          Automatically claim profiles for users who have logged in but haven't claimed their profile yet.
          This matches user emails with family group member emails.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Button 
          onClick={handleBackfill}
          disabled={loading}
          className="w-full"
        >
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Processing...
            </>
          ) : (
            'Run Profile Backfill'
          )}
        </Button>

        {result && (
          <Alert className={result.success ? "border-green-500" : "border-red-500"}>
            <AlertDescription>
              <div className="space-y-2">
                <div className="flex items-center gap-2 font-semibold">
                  {result.success ? (
                    <>
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      Backfill Complete
                    </>
                  ) : (
                    <>
                      <XCircle className="h-4 w-4 text-red-500" />
                      Backfill Failed
                    </>
                  )}
                </div>
                
                {result.summary && (
                  <div className="text-sm space-y-1">
                    <p>Processed: {result.summary.processed}</p>
                    <p>Claimed: {result.summary.claimed}</p>
                    <p>Already Claimed: {result.summary.skipped}</p>
                    <p>Errors: {result.summary.errors}</p>
                  </div>
                )}

                {result.details && result.details.length > 0 && (
                  <details className="mt-2">
                    <summary className="cursor-pointer text-sm font-medium">View Details</summary>
                    <div className="mt-2 max-h-60 overflow-y-auto text-xs space-y-1">
                      {result.details.map((detail: any, idx: number) => (
                        <div key={idx} className="p-2 bg-muted rounded">
                          <p><strong>{detail.name}</strong> ({detail.email})</p>
                          <p className="text-muted-foreground">
                            {detail.familyGroup} - {detail.type} - {detail.status}
                          </p>
                          {detail.error && (
                            <p className="text-red-500">{detail.error}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  </details>
                )}
              </div>
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
};
