import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Upload, FileText, Loader2, Type, Image as ImageIcon } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { EnhancedImageUploader } from './EnhancedImageUploader';

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
  const [detectedImageMarkers, setDetectedImageMarkers] = useState<any[]>([]);
  const [imageFiles, setImageFiles] = useState<any[]>([]);
  const [showImageUploader, setShowImageUploader] = useState(false);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (selectedFile) {
      const fileName = selectedFile.name.toLowerCase();
      if (!fileName.endsWith('.docx') && !fileName.endsWith('.txt') && !fileName.endsWith('.rtf') && !fileName.endsWith('.pdf')) {
        toast({
          title: "Invalid File Type",
          description: "Please select a Word document (.docx), PDF (.pdf), text file (.txt), or RTF file (.rtf)",
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

  const detectImageMarkersInText = (text: string) => {
    const markers = [];
    
    // Pattern for [IMAGE:filename.jpg:description] format
    const imagePattern = /\[IMAGE:([^:\]]+):?([^\]]*)\]/gi;
    let match;
    
    while ((match = imagePattern.exec(text)) !== null) {
      markers.push({
        marker: match[0],
        filename: match[1].trim(),
        description: match[2] ? match[2].trim() : undefined,
        position: match.index
      });
    }
    
    // Pattern for {{filename.jpg}} format
    const bracketPattern = /\{\{([^}]+)\}\}/gi;
    while ((match = bracketPattern.exec(text)) !== null) {
      markers.push({
        marker: match[0],
        filename: match[1].trim(),
        description: undefined,
        position: match.index
      });
    }
    
    return markers.sort((a, b) => a.position - b.position);
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

    // Detect image markers in the text
    const markers = detectImageMarkersInText(textContent);
    
    if (markers.length > 0) {
      setDetectedImageMarkers(markers);
      setShowImageUploader(true);
      toast({
        title: "Image Markers Detected",
        description: `Found ${markers.length} image markers. Please upload the corresponding images.`,
      });
      return;
    }

    await processWithImages();
  };

  const processWithImages = async () => {
    setIsProcessing(true);

    try {
      // Get user's organization
      const { data: organizationId, error: orgError } = await supabase
        .rpc('get_user_primary_organization_id');

      if (orgError) throw orgError;
      if (!organizationId) throw new Error('No organization found');

      // Process text content with images
      const { data, error } = await supabase.functions.invoke('process-word-to-checklist', {
        body: {
          wordFile: `data:text/plain;base64,${btoa(textContent)}`,
          checklistType,
          organizationId,
          imageFiles
        }
      });

      if (error) {
        throw new Error(`Function call failed: ${error.message || JSON.stringify(error)}`);
      }

      if (!data || !data.success) {
        throw new Error(data?.error || data?.message || 'Processing failed');
      }

      toast({
        title: "Enhanced Checklist Created!",
        description: `Created checklist with ${data.itemsCount} items and ${data.matchedImagesCount} images`,
      });

      // Clear form
      setTextContent('');
      setChecklistType('');
      setDetectedImageMarkers([]);
      setImageFiles([]);
      setShowImageUploader(false);
      
      // Notify parent component
      if (onChecklistCreated) {
        onChecklistCreated(data.checklistId);
      }

    } catch (error) {
      console.error('Processing error:', error);
      
      let errorMessage = "Failed to process the content";
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

      // Determine which edge function to use based on file type
      const fileName = file.name.toLowerCase();
      const functionName = fileName.endsWith('.pdf') ? 'process-pdf-to-checklist' : 'process-word-to-checklist';
      const bodyKey = fileName.endsWith('.pdf') ? 'pdfFile' : 'wordFile';

      // Call the appropriate edge function
      const { data, error } = await supabase.functions.invoke(functionName, {
        body: {
          [bodyKey]: base64File,
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

        <Tabs defaultValue="text" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="text" className="flex items-center gap-2">
              <Type className="h-4 w-4" />
              Text + Images
            </TabsTrigger>
            <TabsTrigger value="file" className="flex items-center gap-2">
              <Upload className="h-4 w-4" />
              Upload File
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="text" className="space-y-4">
            <div className="space-y-3">
              <Textarea
                value={textContent}
                onChange={(e) => setTextContent(e.target.value)}
                placeholder="Paste your checklist content here. You can include image markers like:
[IMAGE:tool1.jpg:Photo of the wrench]
{{picture2.png}}

The text will be converted to a checklist and you can upload matching images."
                className="min-h-[150px]"
              />
              
              <div className="bg-green-50 border border-green-200 p-3 rounded-lg">
                <p className="text-sm text-green-800 font-medium">✨ Enhanced Text Processing:</p>
                <ul className="text-sm text-green-700 mt-1 ml-4 space-y-1">
                  <li>Use **bold text** for important steps</li>
                  <li>Use *italic text* for notes and tips</li>
                  <li>Mark images with <code>[IMAGE:filename.jpg:description]</code></li>
                  <li>Or use simple markers like <code>{'{{picture1.png}}'}</code></li>
                </ul>
              </div>

              {showImageUploader && detectedImageMarkers.length > 0 && (
                <EnhancedImageUploader
                  detectedMarkers={detectedImageMarkers}
                  onImagesReady={setImageFiles}
                  isProcessing={isProcessing}
                />
              )}

              <Button 
                onClick={showImageUploader ? processWithImages : processTextContent}
                disabled={!textContent.trim() || !checklistType || isProcessing}
                className="w-full"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Creating Enhanced Checklist...
                  </>
                ) : showImageUploader ? (
                  <>
                    <ImageIcon className="h-4 w-4 mr-2" />
                    Create Enhanced Checklist
                  </>
                ) : (
                  <>
                    <Type className="h-4 w-4 mr-2" />
                    Process Text & Detect Images
                  </>
                )}
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="file" className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="word-file">Upload Document</Label>
              <div className="flex items-center gap-4">
                <Input
                  id="word-file"
                  type="file"
                  accept=".docx,.txt,.rtf,.pdf"
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
              
              <div className="bg-blue-50 border border-blue-200 p-3 rounded-lg">
                <p className="text-sm text-blue-800 font-medium">💡 For best results:</p>
                <ol className="text-sm text-blue-700 mt-1 ml-4 space-y-1">
                  <li><strong>Text files:</strong> Work great for plain text processing</li>
                  <li><strong>Word documents:</strong> Basic text extraction only</li>
                  <li><strong>For images:</strong> Use the "Text + Images" tab instead</li>
                </ol>
              </div>
            </div>
          </TabsContent>
        </Tabs>

      </CardContent>
    </Card>
  );
};