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
      const fileName = selectedFile.name.toLowerCase();
      if (!fileName.endsWith('.docx') && !fileName.endsWith('.txt') && !fileName.endsWith('.rtf')) {
        toast({
          title: "Invalid File Type",
          description: "Please select a Word document (.docx), text file (.txt), or RTF file (.rtf)",
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
          Create Checklist from Document
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
          <Label htmlFor="word-file">Upload Document</Label>
          <div className="flex items-center gap-4">
            <Input
              id="word-file"
              type="file"
              accept=".docx,.txt,.rtf"
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
          <div className="bg-blue-50 border border-blue-200 p-3 rounded-lg">
            <p className="text-sm text-blue-800 font-medium">💡 For best results with Word documents:</p>
            <ol className="text-sm text-blue-700 mt-1 ml-4 space-y-1">
              <li>1. Open your Word document</li>
              <li>2. Select all content (Ctrl+A)</li>
              <li>3. Copy (Ctrl+C)</li>
              <li>4. Use "Paste text content" option below instead</li>
            </ol>
            <p className="text-xs text-blue-600 mt-2">Or try saving your Word doc as a .txt file and uploading that.</p>
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
              Upload & Create Checklist
            </>
          )}
        </Button>

        <div className="border-t pt-4">
          <details className="space-y-3">
            <summary className="cursor-pointer text-sm font-medium text-muted-foreground hover:text-foreground">
              Alternative: Paste text content instead
            </summary>
            <div className="space-y-3">
              <Textarea
                value={textContent}
                onChange={(e) => setTextContent(e.target.value)}
                placeholder="If document upload doesn't work, paste your checklist content here..."
                className="min-h-[120px]"
              />
              <Button 
                onClick={processTextContent}
                disabled={!textContent.trim() || !checklistType || isProcessing}
                variant="outline"
                className="w-full"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Creating Checklist...
                  </>
                ) : (
                  <>
                    <Type className="h-4 w-4 mr-2" />
                    Create from Text
                  </>
                )}
              </Button>
            </div>
          </details>
        </div>
      </CardContent>
    </Card>
  );
};