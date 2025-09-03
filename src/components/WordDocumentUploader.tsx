import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Upload, FileText, Loader2 } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface WordDocumentUploaderProps {
  onChecklistCreated?: (checklistId: string) => void;
}

export const WordDocumentUploader: React.FC<WordDocumentUploaderProps> = ({
  onChecklistCreated
}) => {
  const [file, setFile] = useState<File | null>(null);
  const [checklistType, setChecklistType] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState(false);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (selectedFile) {
      if (!selectedFile.name.toLowerCase().endsWith('.docx')) {
        toast({
          title: "Invalid File Type",
          description: "Please select a Word document (.docx file)",
          variant: "destructive"
        });
        return;
      }
      setFile(selectedFile);
    }
  };

  const convertFileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const handleUploadAndProcess = async () => {
    if (!file || !checklistType) {
      toast({
        title: "Missing Information",
        description: "Please select a Word document and checklist type",
        variant: "destructive"
      });
      return;
    }

    setIsProcessing(true);

    try {
      // Get user's organization
      const { data: organizationId, error: orgError } = await supabase
        .rpc('get_user_primary_organization_id');

      if (orgError) throw orgError;
      if (!organizationId) throw new Error('No organization found');

      // Convert file to base64
      const base64File = await convertFileToBase64(file);

      // Call the edge function to process the Word document
      const { data, error } = await supabase.functions.invoke('process-word-to-checklist', {
        body: {
          wordFile: base64File,
          checklistType,
          organizationId
        }
      });

      if (error) {
        throw new Error(error.message || 'Failed to process document');
      }

      if (!data.success) {
        throw new Error(data.error || 'Processing failed');
      }

      toast({
        title: "Document Processed Successfully!",
        description: `Created checklist with ${data.itemsCount} items and ${data.imagesCount} images`
      });

      // Clear form
      setFile(null);
      setChecklistType('');
      
      // Notify parent component
      if (onChecklistCreated) {
        onChecklistCreated(data.checklistId);
      }

    } catch (error) {
      console.error('Upload error:', error);
      toast({
        title: "Processing Failed",
        description: error.message || "Failed to process the Word document",
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          Upload Word Document
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="checklist-type">Checklist Type</Label>
          <Select value={checklistType} onValueChange={setChecklistType}>
            <SelectTrigger>
              <SelectValue placeholder="Select checklist type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="seasonal">Seasonal</SelectItem>
              <SelectItem value="maintenance">Maintenance</SelectItem>
              <SelectItem value="opening">Opening</SelectItem>
              <SelectItem value="closing">Closing</SelectItem>
              <SelectItem value="arrival">Arrival</SelectItem>
              <SelectItem value="daily">Daily</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="word-file">Word Document (.docx)</Label>
          <div className="flex items-center gap-4">
            <Input
              id="word-file"
              type="file"
              accept=".docx"
              onChange={handleFileChange}
              className="flex-1"
            />
            {file && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <FileText className="h-4 w-4" />
                {file.name}
              </div>
            )}
          </div>
          <p className="text-sm text-muted-foreground">
            Upload a Word document (.docx) containing step-by-step instructions with photos
          </p>
        </div>

        <div className="bg-muted/50 p-4 rounded-lg">
          <h4 className="font-medium mb-2">What happens next:</h4>
          <ul className="text-sm text-muted-foreground space-y-1">
            <li>• Text will be extracted (preserving lists and formatting)</li>
            <li>• Photos will be saved as image files</li>
            <li>• AI will convert text into structured checklist items</li>
            <li>• Photos will be matched to relevant checklist steps</li>
            <li>• Interactive checklist will be saved to your organization</li>
          </ul>
        </div>

        <Button 
          onClick={handleUploadAndProcess}
          disabled={!file || !checklistType || isProcessing}
          className="w-full"
        >
          {isProcessing ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Processing Document...
            </>
          ) : (
            <>
              <Upload className="h-4 w-4 mr-2" />
              Upload & Process Document
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
};