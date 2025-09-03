import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Upload, FileText, Loader2, Type } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface WordDocumentUploaderProps {
  onChecklistCreated?: (checklistId: string) => void;
}

export const WordDocumentUploader: React.FC<WordDocumentUploaderProps> = ({
  onChecklistCreated
}) => {
  const [file, setFile] = useState<File | null>(null);
  const [textContent, setTextContent] = useState<string>('');
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

  const processTextContent = async () => {
    if (!textContent.trim() || !checklistType) {
      toast({
        title: "Missing Information",
        description: "Please enter text content and select checklist type",
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

      // Process text content directly with the edge function
      const { data, error } = await supabase.functions.invoke('process-word-to-checklist', {
        body: {
          wordFile: `data:text/plain;base64,${btoa(textContent)}`,
          checklistType,
          organizationId
        }
      });

      if (error) {
        throw new Error(`Function call failed: ${error.message || JSON.stringify(error)}`);
      }

      if (!data || !data.success) {
        throw new Error(data?.error || data?.message || 'Processing failed');
      }

      toast({
        title: "Checklist Created Successfully!",
        description: `Created checklist with ${data.itemsCount} items`
      });

      // Clear form
      setTextContent('');
      setChecklistType('');
      
      // Notify parent component
      if (onChecklistCreated) {
        onChecklistCreated(data.checklistId);
      }

    } catch (error) {
      console.error('Processing error:', error);
      
      let errorMessage = "Failed to process the text content";
      if (error && error.message) {
        errorMessage = error.message;
      }
      
      toast({
        title: "Processing Failed",
        description: errorMessage,
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
    }
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
      // Get user's organization using the database function
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

      console.log('Edge function response:', { data, error });

      if (error) {
        console.error('Supabase function error:', error);
        throw new Error(`Function call failed: ${error.message || JSON.stringify(error)}`);
      }

      if (!data) {
        throw new Error('No response data received from processing function');
      }

      if (!data.success) {
        console.error('Processing failed:', data);
        throw new Error(data.error || data.message || 'Processing failed');
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
      console.error('Upload error details:', {
        error,
        message: error?.message,
        type: typeof error,
        constructor: error?.constructor?.name,
        keys: Object.keys(error || {}),
        stack: error?.stack
      });
      
      let errorMessage = "Failed to process the Word document";
      
      // Handle different error types
      if (error && error.message) {
        errorMessage = error.message;
      } else if (typeof error === 'string') {
        errorMessage = error;
      } else if (error && error.error) {
        errorMessage = error.error;
      } else if (error && error.details) {
        errorMessage = error.details;
      }
      
      toast({
        title: "Processing Failed",
        description: errorMessage,
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
          Create Checklist from Content
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

        <Tabs defaultValue="text" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="text" className="flex items-center gap-2">
              <Type className="h-4 w-4" />
              Text Input
            </TabsTrigger>
            <TabsTrigger value="file" className="flex items-center gap-2">
              <Upload className="h-4 w-4" />
              Word Document
            </TabsTrigger>
          </TabsList>

          <TabsContent value="text" className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="text-content">Checklist Content</Label>
              <Textarea
                id="text-content"
                value={textContent}
                onChange={(e) => setTextContent(e.target.value)}
                placeholder="Paste your checklist content here... 

For example:
1. Turn off main water supply
2. Drain all water pipes
3. Check for any leaks
4. Close all windows and doors
5. Set thermostat to 55°F"
                className="min-h-[200px]"
              />
              <p className="text-sm text-muted-foreground">
                Copy and paste your checklist steps from any document. The AI will convert it into an interactive checklist.
              </p>
            </div>

            <Button 
              onClick={processTextContent}
              disabled={!textContent.trim() || !checklistType || isProcessing}
              className="w-full"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Creating Checklist...
                </>
              ) : (
                <>
                  <FileText className="h-4 w-4 mr-2" />
                  Create Checklist from Text
                </>
              )}
            </Button>
          </TabsContent>

          <TabsContent value="file" className="space-y-4">
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
                Upload a Word document (.docx) containing step-by-step instructions
              </p>
            </div>

            <div className="bg-orange-50 border border-orange-200 p-4 rounded-lg">
              <h4 className="font-medium mb-2 text-orange-800">⚠️ Word Document Parsing (Beta)</h4>
              <div className="text-sm text-orange-700 space-y-1">
                <p>Document parsing is still being improved. For best results:</p>
                <ul className="ml-4 space-y-1">
                  <li>• Use the Text Input tab above (copy/paste content)</li>
                  <li>• Or try uploading and see if it extracts your content correctly</li>
                </ul>
              </div>
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
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};