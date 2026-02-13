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
      
      // First, let's try a direct approach to populate marker names
      const { data: checklistData, error: fetchError } = await supabase
        .from('custom_checklists')
        .select('id, organization_id, items')
        .eq('checklist_type', 'checkout');
        
      if (fetchError || !checklistData?.length) {
        throw new Error('Could not fetch checklist data');
      }
      
      console.log('Found checklist data, processing images...');
      
      let imagesProcessed = 0;
      const checklist = checklistData[0];
      
      if (checklist.items && Array.isArray(checklist.items)) {
        for (const item of checklist.items) {
          // Cast item to any to access properties from JSON
          const itemData = item as any;
          
          // Process single imageUrl
          if (itemData.imageUrl && itemData.imageMarker) {
            const markers = itemData.imageMarker.split(',').map((m: string) => m.trim());
            const markerName = markers[0]; // First marker for single image
            
            const { error: updateError } = await supabase
              .from('checklist_images')
              .update({ marker_name: markerName })
              .eq('organization_id', checklist.organization_id)
              .eq('image_url', itemData.imageUrl);
              
            if (!updateError) imagesProcessed++;
          }
          
          // Process multiple imageUrls
          if (itemData.imageUrls && Array.isArray(itemData.imageUrls) && itemData.imageMarker) {
            const markers = itemData.imageMarker.split(',').map((m: string) => m.trim());
            
            for (let i = 0; i < itemData.imageUrls.length; i++) {
              const imageUrl = itemData.imageUrls[i];
              const markerName = markers[i] || null;
              
              if (markerName) {
                const { error: updateError } = await supabase
                  .from('checklist_images')
                  .update({ marker_name: markerName })
                  .eq('organization_id', checklist.organization_id)
                  .eq('image_url', imageUrl);
                  
                if (!updateError) imagesProcessed++;
              }
            }
          }
        }
      }
      
      console.log('Backfill completed successfully:', imagesProcessed);
      setIsComplete(true);
      
      toast({
        title: "Images Backfilled Successfully!",
        description: `${imagesProcessed} images have been processed and are now available for auto-matching.`,
      });
      
    } catch (error) {
      console.error('Backfill error:', error);
      toast({
        title: "Backfill Failed",
        description: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
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
        <CardContent>
          <Button 
            onClick={() => setIsComplete(false)}
            variant="outline"
            className="w-full"
          >
            Run Again
          </Button>
        </CardContent>
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