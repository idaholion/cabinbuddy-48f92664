import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { Trash2, Download, Upload, Plus, Save, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface PageData {
  page: number;
  imageUrl: string;
  width: number;
  height: number;
}

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
  const [pdfPages, setPdfPages] = useState<PageData[]>([]);
  const [checkboxes, setCheckboxes] = useState<CheckboxItem[]>([]);
  const [isAddingMode, setIsAddingMode] = useState(false);
  const [selectedPage, setSelectedPage] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [checklistId, setChecklistId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    console.log('🔍 File upload started');
    const file = event.target.files?.[0];
    console.log('🔍 Selected file:', file?.name, 'Type:', file?.type, 'Size:', file?.size);
    
    if (!file) {
      console.log('❌ No file selected');
      return;
    }
    
    // More lenient file type checking - accept any file with .html/.htm extension
    const isHtmlFile = file.name.toLowerCase().endsWith('.html') || 
                       file.name.toLowerCase().endsWith('.htm') ||
                       file.type === 'text/html';
    
    if (!isHtmlFile) {
      console.log('❌ Invalid file type:', file?.type, 'Name:', file?.name);
      toast({
        title: "Invalid File",
        description: "Please upload an HTML file (.html or .htm).",
        variant: "destructive",
      });
      return;
    }
    
    console.log('✅ File validation passed');

    setIsLoading(true);
    console.log('Processing HTML file...');
    
    try {
      // Convert file to base64
      const base64 = await fileToBase64(file);
      console.log('File converted to base64, length:', base64.length);
      
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('User not authenticated');
      }

      // Get user's organization ID
      const { data: { user: authUser } } = await supabase.auth.getUser();
      const { data: userOrgs } = await supabase
        .from('user_organizations')
        .select('organization_id')
        .eq('user_id', authUser?.id)
        .eq('is_primary', true)
        .single();

      if (!userOrgs?.organization_id) {
        throw new Error('No organization found for user');
      }

      // Call edge function to process HTML
      const { data, error } = await supabase.functions.invoke('process-pdf-to-checklist', {
        body: {
          htmlFile: base64.split(',')[1], // Remove data:text/html;base64, prefix
          checklistType: 'html_generated',
          organizationId: userOrgs.organization_id
        }
      });

      if (error) {
        console.error('Edge function error:', error);
        throw new Error(`Failed to process HTML: ${error.message}`);
      }

      console.log('HTML processed successfully:', data);
      
      if (data.success && data.itemsCount > 0) {
        setChecklistId(data.checklistId);
        
        toast({
          title: "HTML Processed Successfully",
          description: `Created ${data.itemsCount} checklist items from your document.`,
        });
        console.log('HTML processed successfully');
        
        // Redirect to the checklist view or show success state
        window.location.href = '/seasonal-checklists';
      } else {
        throw new Error(data.error || 'No checklist items were generated from the HTML');
      }
    } catch (error) {
      console.error('Error processing HTML:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to process HTML. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
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
      {pdfPages.length === 0 && (
        <Card>
          <CardContent className="p-6">
            <div className="text-center space-y-4">
              <h3 className="text-lg font-semibold">Upload Your Winterizing Document</h3>
              <p className="text-muted-foreground">
                Upload your HTML document (saved from Word as HTML). We'll extract the content and convert it to an interactive checklist.
              </p>
              <input
                type="file"
                accept=".html,.htm,text/html"
                onChange={(e) => {
                  console.log('🔘 File input onChange fired');
                  handleFileUpload(e);
                }}
                ref={fileInputRef}
                className="hidden"
                disabled={isLoading}
                onClick={() => console.log('🔘 File input clicked')}
              />
              <Button
                onClick={() => {
                  console.log('🔘 Upload button clicked');
                  if (fileInputRef.current) {
                    console.log('🔘 File input exists, triggering click');
                    fileInputRef.current.click();
                  } else {
                    console.log('❌ File input ref is null');
                  }
                }}
                className="w-full max-w-sm"
                size="lg"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Processing HTML...
                  </>
                ) : (
                  <>
                    <Upload className="mr-2 h-5 w-5" />
                    Upload HTML Document
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Controls */}
      {pdfPages.length > 0 && (
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
                    setPdfPages([]);
                    setCheckboxes([]);
                    setIsAddingMode(false);
                    setChecklistId(null);
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
      {pdfPages.length > 0 && (
        <Card>
          <CardContent className="p-4">
            {/* Page Navigation */}
            {pdfPages.length > 1 && (
              <div className="mb-4 flex items-center gap-2">
                <span className="text-sm font-medium">Page:</span>
                {pdfPages.map((_, index) => (
                  <Button
                    key={index}
                    variant={selectedPage === index ? "default" : "outline"}
                    size="sm"
                    onClick={() => setSelectedPage(index)}
                  >
                    {index + 1}
                  </Button>
                ))}
              </div>
            )}

            {/* Document Display */}
            <div 
              ref={containerRef}
              className="relative border rounded-lg overflow-hidden bg-white"
              onClick={handleDocumentClick}
              style={{ minHeight: '600px' }}
            >
              <div className="relative w-full flex justify-center">
                <div 
                  className="relative"
                  style={{ 
                    pointerEvents: isAddingMode ? 'none' : 'auto'
                  }}
                >
                  <img
                    src={pdfPages[selectedPage]?.imageUrl}
                    alt={`Page ${selectedPage + 1}`}
                    className="max-w-full h-auto"
                    style={{ 
                      maxHeight: '1000px',
                      width: 'auto'
                    }}
                    onError={(e) => {
                      console.error('Error loading page image:', e);
                      // Fallback to PDF embed if image fails
                      const target = e.target as HTMLImageElement;
                      target.style.display = 'none';
                    }}
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
                  {checkboxes
                    .filter(cb => selectedPage === (cb as any).page || selectedPage === 0) 
                    .map(checkbox => (
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