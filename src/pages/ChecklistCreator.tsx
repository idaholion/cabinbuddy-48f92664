import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { WordDocumentUploader } from '@/components/WordDocumentUploader';
import { InteractiveChecklist } from '@/components/InteractiveChecklist';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, FileText, List, Plus, CheckSquare, Trash2, Save, Eye } from 'lucide-react';
import { useCustomChecklists } from '@/hooks/useChecklistData';
import { ErrorBoundary, DefaultErrorFallback } from '@/components/ErrorBoundary';
import { toast } from '@/hooks/use-toast';

export default function ChecklistCreator() {
  const navigate = useNavigate();
  const [createdChecklistId, setCreatedChecklistId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'upload' | 'view'>('upload');
  const [isSaveDialogOpen, setIsSaveDialogOpen] = useState(false);
  const [selectedSeasonalType, setSelectedSeasonalType] = useState<'closing' | 'opening' | 'seasonal' | 'maintenance'>('seasonal');
  const { checklists, loading, refetch, deleteChecklist, saveChecklist } = useCustomChecklists();

  const handleChecklistCreated = (checklistId: string) => {
    setCreatedChecklistId(checklistId);
    setViewMode('view');
    refetch(); // Refresh the checklists list
  };

  const handleBackToUpload = () => {
    setViewMode('upload');
    setCreatedChecklistId(null);
  };

  const handleSaveToSeasonal = async () => {
    const selectedChecklist = checklists?.find(c => c.id === createdChecklistId);
    if (selectedChecklist) {
      try {
        await saveChecklist(
          selectedSeasonalType,
          selectedChecklist.items || [],
          selectedChecklist.images || []
        );
        toast({
          title: "Checklist Saved!",
          description: `Checklist saved to ${selectedSeasonalType} checklists successfully.`
        });
        setIsSaveDialogOpen(false);
        navigate('/seasonal-checklists');
      } catch (error) {
        toast({
          title: "Error",
          description: "Failed to save checklist. Please try again.",
          variant: "destructive"
        });
      }
    }
  };

  if (viewMode === 'view' && createdChecklistId) {
    const selectedChecklist = checklists?.find(c => c.id === createdChecklistId);
    
    if (selectedChecklist) {
      return (
        <div className="container mx-auto p-6 space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button 
                variant="outline" 
                onClick={handleBackToUpload}
                className="flex items-center gap-2"
              >
                <ArrowLeft className="h-4 w-4" />
                Back to Creator
              </Button>
              <div>
                <h1 className="text-2xl font-bold">Interactive Checklist</h1>
                <p className="text-muted-foreground">Track your progress through the checklist</p>
              </div>
            </div>
            
            <Dialog open={isSaveDialogOpen} onOpenChange={setIsSaveDialogOpen}>
              <DialogTrigger asChild>
                <Button className="flex items-center gap-2">
                  <Save className="h-4 w-4" />
                  Save to Seasonal Checklists
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Save to Seasonal Checklists</DialogTitle>
                  <DialogDescription>
                    Choose which type of seasonal checklist to save this as.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Checklist Type</label>
                    <Select value={selectedSeasonalType} onValueChange={(value: any) => setSelectedSeasonalType(value)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select checklist type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="closing">Cabin Closing</SelectItem>
                        <SelectItem value="opening">Cabin Opening</SelectItem>
                        <SelectItem value="seasonal">Seasonal Tasks</SelectItem>
                        <SelectItem value="maintenance">Maintenance</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={() => setIsSaveDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button onClick={handleSaveToSeasonal}>
                      Save Checklist
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
          
          <InteractiveChecklist
            checklistId={selectedChecklist.id}
            title={selectedChecklist.checklist_type}
            items={selectedChecklist.items}
            introductoryText={selectedChecklist.introductory_text}
          />
        </div>
      );
    } else {
      return (
        <div className="container mx-auto p-6">
          <Card>
            <CardContent className="p-6 text-center">
              <p className="text-muted-foreground">Checklist not found. Please try creating a new one.</p>
              <Button onClick={handleBackToUpload} className="mt-4">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Creator
              </Button>
            </CardContent>
          </Card>
        </div>
      );
    }
  }

  return (
    <ErrorBoundary fallback={DefaultErrorFallback}>
      <div className="container mx-auto p-6 space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold text-primary">Enhanced Checklist Creator</h1>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Create interactive checklists from your text with image markers. 
            Use formats like [IMAGE:Picture1] to mark where images should appear, then upload matching images.
          </p>
        </div>

        <div className="flex justify-center">
          <WordDocumentUploader onChecklistCreated={handleChecklistCreated} />
        </div>

        {!loading && checklists && checklists.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <List className="h-5 w-5" />
                Your Existing Checklists ({checklists.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3">
                {checklists.map((checklist) => (
                  <div key={checklist.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <CheckSquare className="h-4 w-4 text-primary" />
                      <div>
                        <h3 className="font-medium capitalize">{checklist.checklist_type}</h3>
                        <p className="text-sm text-muted-foreground">
                          {checklist.items?.length || 0} items
                          {checklist.images && checklist.images.length > 0 && (
                            <span> • {checklist.images.length} images</span>
                          )}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setCreatedChecklistId(checklist.id);
                          setViewMode('view');
                        }}
                      >
                        <Eye className="h-4 w-4 mr-2" />
                        View
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => deleteChecklist(checklist.id)}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="p-4">
            <h3 className="font-semibold text-blue-900 mb-2">✨ Enhanced Features</h3>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• <strong>Image Markers:</strong> Use [IMAGE:Picture1] or [IMAGE:tool.jpg:Description] in your text</li>
              <li>• <strong>Smart Formatting:</strong> **Bold text** and *italic text* are automatically styled</li>
              <li>• <strong>Visual Hierarchy:</strong> Warnings, notes, and steps get appropriate icons and colors</li>
              <li>• <strong>Interactive Progress:</strong> Check off items and track completion</li>
              <li>• <strong>Image Matching:</strong> Upload images that automatically match to your markers</li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </ErrorBoundary>
  );
}