import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { Trash2, Upload, Plus, Save, Loader2 } from 'lucide-react';

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
  const [htmlContent, setHtmlContent] = useState<string>('');
  const [checkboxes, setCheckboxes] = useState<CheckboxItem[]>([]);
  const [isAddingMode, setIsAddingMode] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    
    if (!file) {
      return;
    }
    
    const isHtmlFile = file.name.toLowerCase().endsWith('.html') || 
                       file.name.toLowerCase().endsWith('.htm') ||
                       file.type === 'text/html';
    
    if (!isHtmlFile) {
      toast({
        title: "Invalid File",
        description: "Please upload an HTML file (.html or .htm).",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    
    try {
      // Read file as text
      const text = await fileToText(file);
      setHtmlContent(text);
      
      toast({
        title: "Document Loaded Successfully!",
        description: "Your document is ready. Click 'Add Checkboxes' to start adding checkboxes anywhere on the document.",
      });
    } catch (error) {
      console.error('Error reading HTML:', error);
      toast({
        title: "Error",
        description: "Failed to read HTML file. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const fileToText = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsText(file, 'UTF-8'); // Specify UTF-8 encoding
      reader.onload = () => {
        let content = reader.result as string;
        
        // Clean up common HTML issues from Word
        content = content
          .replace(/â€™/g, "'") // Fix apostrophes
          .replace(/â€œ/g, '"') // Fix opening quotes
          .replace(/â€/g, '"')  // Fix closing quotes
          .replace(/â€¢/g, "•") // Fix bullets
          .replace(/â€"/g, "–") // Fix en-dashes
          .replace(/â€"/g, "—") // Fix em-dashes
          .replace(/Â /g, " ")   // Fix non-breaking spaces
          .replace(/ï¿½/g, "")   // Remove replacement characters
          .replace(/\uFFFD/g, ""); // Remove Unicode replacement characters
        
        // Add error handling to images instead of replacing them
        content = content.replace(/<img([^>]*?)>/gi, (match, attributes) => {
          return `<img${attributes} onerror="this.outerHTML='<div style=&quot;border: 2px dashed #ccc; padding: 20px; margin: 10px 0; text-align: center; background: #f9f9f9; color: #666;&quot;>📷 Image failed to load<br><small>Image was referenced but could not be displayed</small></div>'" />`;
        });
        
        resolve(content);
      };
      reader.onerror = error => reject(error);
    });
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
      {!htmlContent && (
        <Card>
          <CardContent className="p-6">
            <div className="text-center space-y-4">
              <h3 className="text-lg font-semibold">Upload Your Document</h3>
              <p className="text-muted-foreground mb-4">
                Upload your HTML document (saved from Word as HTML). For images to display properly:
              </p>
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-4">
                <h4 className="font-semibold text-amber-800 mb-2">📋 For Images to Work:</h4>
                <ul className="text-sm text-amber-700 space-y-1">
                  <li>• <strong>Save as "Web Page, Complete"</strong> from Word (not just "Web Page")</li>
                  <li>• This creates an HTML file + a folder with images</li>
                  <li>• Upload the HTML file here, then the images should display</li>
                  <li>• Or embed images directly in Word before saving</li>
                </ul>
              </div>
              
              <div className="mt-4 p-6 border-2 border-dashed border-blue-300 rounded-lg bg-blue-50">
                <div className="text-center">
                  <p className="text-sm text-blue-700 mb-3 font-medium">Select your HTML file:</p>
                  <input
                    id="html-file-input"
                    type="file"
                    accept=".html,.htm"
                    onChange={handleFileUpload}
                    className="block w-full text-sm text-gray-900 border border-gray-300 rounded-lg cursor-pointer bg-gray-50 focus:outline-none file:bg-blue-600 file:text-white file:border-0 file:py-2 file:px-4 file:rounded-lg file:cursor-pointer"
                    disabled={isLoading}
                  />
                  <p className="text-xs text-blue-600 mt-2">Choose your HTML file (saved from Word)</p>
                </div>
              </div>
              
              {isLoading && (
                <div className="flex items-center justify-center">
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Loading document...
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Controls */}
      {htmlContent && (
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
                    setHtmlContent('');
                    setCheckboxes([]);
                    setIsAddingMode(false);
                  }}
                  size="sm"
                >
                  <Upload className="mr-2 h-4 w-4" />
                  Upload New Document
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

      {/* Document Viewer with Interactive Checkboxes */}
      {htmlContent && (
        <Card>
          <CardContent className="p-4">
            <div 
              ref={containerRef}
              className="relative border rounded-lg overflow-hidden bg-white"
              onClick={handleDocumentClick}
              style={{ minHeight: '600px' }}
            >
              {/* Original Document Content */}
              <div 
                className="relative p-6"
                style={{ 
                  pointerEvents: isAddingMode ? 'none' : 'auto'
                }}
                dangerouslySetInnerHTML={{ __html: htmlContent }}
              />
              
              {/* Overlay div for capturing clicks in add mode */}
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