import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { Trash2, Download, Upload, Plus, Save } from 'lucide-react';

interface CheckboxItem {
  id: string;
  x: number;
  y: number;
  checked: boolean;
  text?: string;
}

interface InteractivePdfViewerProps {
  onSave?: (checkboxes: CheckboxItem[]) => void;
}

export const InteractivePdfViewer = ({ onSave }: InteractivePdfViewerProps) => {
  const [pdfUrl, setPdfUrl] = useState<string>('');
  const [checkboxes, setCheckboxes] = useState<CheckboxItem[]>([]);
  const [isAddingMode, setIsAddingMode] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    console.log('File upload started');
    const file = event.target.files?.[0];
    console.log('Selected file:', file);
    
    if (!file || file.type !== 'application/pdf') {
      console.log('Invalid file type:', file?.type);
      toast({
        title: "Invalid File",
        description: "Please upload a PDF file.",
        variant: "destructive",
      });
      return;
    }

    console.log('Creating blob URL for PDF...');
    try {
      const url = URL.createObjectURL(file);
      console.log('Blob URL created:', url);
      setPdfUrl(url);
      setCheckboxes([]); // Reset checkboxes for new document
      
      toast({
        title: "PDF Loaded Successfully",
        description: "Your document is ready. Turn on 'Add Checkboxes' mode and click on the document to place checkboxes.",
      });
      console.log('PDF loaded successfully');
    } catch (error) {
      console.error('Error creating blob URL:', error);
      toast({
        title: "Error",
        description: "Failed to load PDF. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleDocumentClick = (event: React.MouseEvent<HTMLDivElement>) => {
    if (!isAddingMode) return;

    const rect = event.currentTarget.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * 100;
    const y = ((event.clientY - rect.top) / rect.height) * 100;

    const newCheckbox: CheckboxItem = {
      id: `checkbox-${Date.now()}`,
      x,
      y,
      checked: false,
    };

    setCheckboxes(prev => [...prev, newCheckbox]);
    
    toast({
      title: "Checkbox Added",
      description: "Click anywhere else to add more checkboxes, or turn off Add Mode.",
    });
  };

  const toggleCheckbox = (id: string) => {
    setCheckboxes(prev =>
      prev.map(cb => cb.id === id ? { ...cb, checked: !cb.checked } : cb)
    );
  };

  const deleteCheckbox = (id: string) => {
    setCheckboxes(prev => prev.filter(cb => cb.id !== id));
  };

  const clearAllCheckboxes = () => {
    setCheckboxes([]);
    toast({
      title: "Checkboxes Cleared",
      description: "All checkboxes have been removed.",
    });
  };

  const handleSave = () => {
    onSave?.(checkboxes);
    toast({
      title: "Progress Saved",
      description: "Your checklist progress has been saved.",
    });
  };

  const completedCount = checkboxes.filter(cb => cb.checked).length;
  const progressPercent = checkboxes.length > 0 ? (completedCount / checkboxes.length) * 100 : 0;

  return (
    <div className="space-y-6">
      {/* Upload Section */}
      {!pdfUrl && (
        <Card>
          <CardContent className="p-6">
            <div className="text-center space-y-4">
              <h3 className="text-lg font-semibold">Upload Your Winterizing Document</h3>
              <p className="text-muted-foreground">
                Upload your PDF with text and pictures. You'll then be able to add checkboxes anywhere on the document.
              </p>
              <input
                type="file"
                accept=".pdf"
                onChange={handleFileUpload}
                ref={fileInputRef}
                className="hidden"
              />
              <Button
                onClick={() => {
                  console.log('Upload button clicked');
                  fileInputRef.current?.click();
                }}
                className="w-full max-w-sm"
                size="lg"
              >
                <Upload className="mr-2 h-5 w-5" />
                Upload PDF Document
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Controls */}
      {pdfUrl && (
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-wrap gap-3 items-center justify-between">
              <div className="flex flex-wrap gap-2">
                <Button
                  variant={isAddingMode ? "default" : "outline"}
                  onClick={() => setIsAddingMode(!isAddingMode)}
                  size="sm"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  {isAddingMode ? "Adding Checkboxes..." : "Add Checkboxes"}
                </Button>
                
                <Button
                  variant="outline"
                  onClick={clearAllCheckboxes}
                  size="sm"
                  disabled={checkboxes.length === 0}
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Clear All
                </Button>
                
                <Button
                  variant="outline"
                  onClick={handleSave}
                  size="sm"
                  disabled={checkboxes.length === 0}
                >
                  <Save className="mr-2 h-4 w-4" />
                  Save Progress
                </Button>

                <Button
                  variant="outline"
                  onClick={() => {
                    setPdfUrl('');
                    setCheckboxes([]);
                    setIsAddingMode(false);
                  }}
                  size="sm"
                >
                  <Upload className="mr-2 h-4 w-4" />
                  Upload New PDF
                </Button>
              </div>

              <div className="text-sm text-muted-foreground">
                Progress: {completedCount}/{checkboxes.length} items ({Math.round(progressPercent)}%)
              </div>
            </div>

            {isAddingMode && (
              <div className="mt-3 p-3 bg-blue-50 rounded-lg">
                <p className="text-sm text-blue-700">
                  📍 <strong>Add Mode Active:</strong> Click anywhere on the document below to place checkboxes next to line items.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* PDF Viewer with Interactive Checkboxes */}
      {pdfUrl && (
        <Card>
          <CardContent className="p-4">
            {/* Document Display */}
            <div 
              ref={containerRef}
              className="relative border rounded-lg overflow-hidden bg-white"
              onClick={handleDocumentClick}
              style={{ minHeight: '600px' }}
            >
              <div className="relative w-full">
                <iframe
                  src={pdfUrl}
                  className="w-full border-0"
                  style={{ 
                    height: '800px',
                    minHeight: '600px',
                    pointerEvents: isAddingMode ? 'none' : 'auto'
                  }}
                  title="PDF Document"
                />
                
                {/* Overlay div for capturing clicks */}
                {isAddingMode && (
                  <div 
                    className="absolute inset-0 cursor-crosshair bg-transparent"
                    style={{ zIndex: 10 }}
                    onClick={handleDocumentClick}
                  />
                )}

                {/* Overlay Checkboxes */}
                {checkboxes.map(checkbox => (
                  <div
                    key={checkbox.id}
                    className="absolute flex items-center gap-2 group z-20"
                    style={{
                      left: `${checkbox.x}%`,
                      top: `${checkbox.y}%`,
                      transform: 'translate(-50%, -50%)',
                    }}
                  >
                    <div className="bg-white rounded-lg shadow-lg border-2 border-primary p-2 flex items-center gap-2">
                      <Checkbox
                        checked={checkbox.checked}
                        onCheckedChange={() => toggleCheckbox(checkbox.id)}
                        className="scale-125"
                      />
                      <Button
                        variant="destructive"
                        size="sm"
                        className="p-1 h-6 w-6"
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteCheckbox(checkbox.id);
                        }}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Progress Summary */}
      {checkboxes.length > 0 && (
        <Card>
          <CardContent className="p-4">
            <h3 className="font-semibold mb-2">Checklist Summary</h3>
            <div className="space-y-2">
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-green-600 h-2 rounded-full transition-all duration-300" 
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
              <p className="text-sm text-muted-foreground">
                {completedCount} of {checkboxes.length} items completed
                {progressPercent === 100 && " 🎉 All done!"}
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};