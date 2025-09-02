import React, { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, FileText, Wand2, Upload, Image } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { useCustomChecklists } from '@/hooks/useChecklistData';
import { useOrganization } from '@/hooks/useOrganization';
import { supabase } from '@/integrations/supabase/client';

interface DocumentToChecklistConverterProps {
  onChecklistCreated?: (checklist: any) => void;
}

export const DocumentToChecklistConverter: React.FC<DocumentToChecklistConverterProps> = ({
  onChecklistCreated
}) => {
  const [documentText, setDocumentText] = useState('');
  const [checklistType, setChecklistType] = useState<string>('');
  const [isConverting, setIsConverting] = useState(false);
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [processingMode, setProcessingMode] = useState<'text' | 'pdf'>('text');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const { saveChecklist } = useCustomChecklists();
  const { organization } = useOrganization();

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && file.type === 'application/pdf') {
      setPdfFile(file);
      setProcessingMode('pdf');
    } else {
      toast({
        title: "Invalid File",
        description: "Please select a PDF file.",
        variant: "destructive",
      });
    }
  };

  const convertFileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        const result = reader.result as string;
        // Remove the data:application/pdf;base64, prefix
        const base64 = result.split(',')[1];
        resolve(base64);
      };
      reader.onerror = error => reject(error);
    });
  };

  const handleConvert = async () => {
    if (processingMode === 'text' && !documentText.trim()) {
      toast({
        title: "Missing Information",
        description: "Please provide document text.",
        variant: "destructive",
      });
      return;
    }

    if (processingMode === 'pdf' && !pdfFile) {
      toast({
        title: "Missing Information",
        description: "Please upload a PDF file.",
        variant: "destructive",
      });
      return;
    }

    if (!checklistType) {
      toast({
        title: "Missing Information",
        description: "Please select a checklist type.",
        variant: "destructive",
      });
      return;
    }

    if (!organization?.id) {
      toast({
        title: "Error",
        description: "Organization not found. Please try again.",
        variant: "destructive",
      });
      return;
    }

    setIsConverting(true);

    try {
      let checklist;

      if (processingMode === 'pdf' && pdfFile) {
        // Process PDF with AI
        const base64File = await convertFileToBase64(pdfFile);
        
        const { data, error } = await supabase.functions.invoke('process-pdf-to-checklist', {
          body: {
            pdfFile: base64File,
            checklistType,
            organizationId: organization.id
          }
        });

        if (error) {
          throw new Error(error.message || 'Failed to process PDF');
        }

        if (!data.success) {
          throw new Error(data.details || 'Failed to process PDF');
        }

        // Transform the AI response into the format expected by the checklist system
        const sections = [{
          title: `${checklistType} Checklist`,
          items: data.checklist.items.map((item: any) => ({
            id: item.id,
            text: item.text,
            completed: false,
            imageUrl: item.imageUrl,
            imageDescription: item.imageDescription,
            imagePosition: item.imagePosition
          }))
        }];

        checklist = {
          checklist_type: checklistType,
          items: sections,
          images: data.checklist.items.filter((item: any) => item.imageUrl).map((item: any) => ({
            itemId: item.id,
            url: item.imageUrl,
            description: item.imageDescription,
            position: item.imagePosition || 'after'
          }))
        };
      } else {
        // Process text manually
        const lines = documentText.split('\n').filter(line => line.trim());
        const items = lines.map((line, index) => ({
          id: `item-${index}`,
          text: line.trim(),
          completed: false
        }));

        const sections = [{
          title: `${checklistType} Checklist`,
          items
        }];

        checklist = {
          checklist_type: checklistType,
          items: sections,
          images: []
        };
      }

      await saveChecklist(checklistType as any, checklist.items[0].items, checklist.images);

      toast({
        title: "Success",
        description: `${checklistType} checklist created with ${checklist.items[0]?.items?.length || 0} items${checklist.images?.length ? ` and ${checklist.images.length} images` : ''}.`,
      });

      // Reset form
      setDocumentText('');
      setChecklistType('');
      setPdfFile(null);
      setProcessingMode('text');
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      
      // Notify parent component
      onChecklistCreated?.(checklist);

    } catch (error) {
      console.error('Error converting document:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to convert document to checklist. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsConverting(false);
    }
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          Enhanced Document to Visual Checklist Converter
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="checklistType">Checklist Type</Label>
          <Select value={checklistType} onValueChange={setChecklistType}>
            <SelectTrigger>
              <SelectValue placeholder="Select checklist type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="opening">Opening Checklist</SelectItem>
              <SelectItem value="closing">Closing Checklist</SelectItem>
              <SelectItem value="seasonal">Seasonal Checklist</SelectItem>
              <SelectItem value="maintenance">Maintenance Checklist</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-4">
          <Label>Input Method</Label>
          <div className="flex gap-4">
            <Button
              type="button"
              variant={processingMode === 'text' ? 'default' : 'outline'}
              onClick={() => setProcessingMode('text')}
              className="flex-1"
            >
              <FileText className="mr-2 h-4 w-4" />
              Text Input
            </Button>
            <Button
              type="button"
              variant={processingMode === 'pdf' ? 'default' : 'outline'}
              onClick={() => setProcessingMode('pdf')}
              className="flex-1"
            >
              <Upload className="mr-2 h-4 w-4" />
              PDF Upload
            </Button>
          </div>
        </div>

        {processingMode === 'text' ? (
          <div className="space-y-2">
            <Label htmlFor="documentText">Document Text</Label>
            <Textarea
              id="documentText"
              placeholder="Paste your document text here. Each line will become a checklist item."
              value={documentText}
              onChange={(e) => setDocumentText(e.target.value)}
              className="min-h-[200px]"
            />
          </div>
        ) : (
          <div className="space-y-2">
            <Label htmlFor="pdfFile">PDF Document</Label>
            <div className="flex items-center gap-4">
              <Input
                ref={fileInputRef}
                id="pdfFile"
                type="file"
                accept=".pdf"
                onChange={handleFileUpload}
                className="flex-1"
              />
              {pdfFile && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Image className="h-4 w-4" />
                  AI will extract images
                </div>
              )}
            </div>
            {pdfFile && (
              <p className="text-sm text-muted-foreground">
                Selected: {pdfFile.name} - AI will analyze the document and extract relevant images for checklist items.
              </p>
            )}
          </div>
        )}

        <Button 
          onClick={handleConvert} 
          disabled={isConverting || !checklistType || (processingMode === 'text' ? !documentText.trim() : !pdfFile)}
          className="w-full"
        >
          {isConverting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              {processingMode === 'pdf' ? 'Processing PDF with AI...' : 'Converting...'}
            </>
          ) : (
            <>
              <Wand2 className="mr-2 h-4 w-4" />
              {processingMode === 'pdf' ? 'Process PDF with AI' : 'Convert to Checklist'}
            </>
          )}
        </Button>
        
        {processingMode === 'pdf' && (
          <p className="text-xs text-muted-foreground">
            PDF processing uses AI to extract text, identify relevant images, and create visual checklist items with associated pictures where helpful.
          </p>
        )}
      </CardContent>
    </Card>
  );
};