import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Database, Loader2, CheckCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

export const BackfillImages: React.FC = () => {
  const [isBackfilling, setIsBackfilling] = useState(false);
  const [isComplete, setIsComplete] = useState(false);

  const handleBackfill = async () => {
    setIsBackfilling(true);
    
    try {
      console.log('Starting image backfill process...');
      
      const { data, error } = await supabase.rpc('backfill_checklist_images');
      
      if (error) {
        console.error('Backfill error:', error);
        toast({
          title: "Backfill Failed",
          description: `Error: ${error.message}`,
          variant: "destructive"
        });
        return;
      }
      
      console.log('Backfill completed successfully:', data);
      setIsComplete(true);
      
      toast({
        title: "Images Backfilled Successfully!",
        description: `${data} images have been processed and are now available for auto-matching.`,
      });
      
    } catch (error) {
      console.error('Unexpected error during backfill:', error);
      toast({
        title: "Backfill Error",
        description: "An unexpected error occurred. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsBackfilling(false);
    }
  };

  if (isComplete) {
    return (
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-green-600" />
            Backfill Complete
          </CardTitle>
          <CardDescription>
            Your existing images are now available for auto-matching in future checklists.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Database className="h-5 w-5" />
          Image Auto-Matching Setup
        </CardTitle>
        <CardDescription>
          To enable auto-matching of images across checklists, we need to index your existing images. 
          This is a one-time setup process.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Button 
          onClick={handleBackfill} 
          disabled={isBackfilling}
          className="w-full"
        >
          {isBackfilling ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Processing Images...
            </>
          ) : (
            <>
              <Database className="h-4 w-4 mr-2" />
              Enable Auto-Matching
            </>
          )}
        </Button>
        <p className="text-xs text-muted-foreground mt-2">
          This will scan your existing checklists and make images available for reuse in new checklists.
        </p>
      </CardContent>
    </Card>
  );
};