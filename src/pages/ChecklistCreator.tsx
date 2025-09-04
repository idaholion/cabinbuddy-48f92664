import React, { useState } from 'react';
import { WordDocumentUploader } from '@/components/WordDocumentUploader';
import { InteractiveChecklist } from '@/components/InteractiveChecklist';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, FileText, List, Plus, CheckSquare } from 'lucide-react';
import { useCustomChecklists } from '@/hooks/useChecklistData';

export default function ChecklistCreator() {
  const [createdChecklistId, setCreatedChecklistId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'upload' | 'view'>('upload');
  const { checklists, loading, refetch } = useCustomChecklists();

  const handleChecklistCreated = (checklistId: string) => {
    setCreatedChecklistId(checklistId);
    setViewMode('view');
    refetch(); // Refresh the checklists list
  };

  const handleBackToUpload = () => {
    setViewMode('upload');
    setCreatedChecklistId(null);
  };

  if (viewMode === 'view' && createdChecklistId) {
    const selectedChecklist = checklists?.find(c => c.id === createdChecklistId);
    
    if (selectedChecklist) {
      return (
        <div className="container mx-auto p-6 space-y-6">
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
          
          <InteractiveChecklist
            checklistId={selectedChecklist.id}
            title={selectedChecklist.checklist_type}
            items={selectedChecklist.items}
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
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setCreatedChecklistId(checklist.id);
                      setViewMode('view');
                    }}
                  >
                    Open Checklist
                  </Button>
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
  );
}