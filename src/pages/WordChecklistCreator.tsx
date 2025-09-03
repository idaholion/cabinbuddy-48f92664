import React, { useState } from 'react';
import { WordDocumentUploader } from '@/components/WordDocumentUploader';
import { InteractiveChecklist } from '@/components/InteractiveChecklist';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, FileText, List } from 'lucide-react';
import { useCustomChecklists } from '@/hooks/useChecklistData';

export default function WordChecklistCreator() {
  const [createdChecklistId, setCreatedChecklistId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'upload' | 'view'>('upload');
  const { checklists, loading, refetch } = useCustomChecklists();

  const handleChecklistCreated = (checklistId: string) => {
    setCreatedChecklistId(checklistId);
    setViewMode('view');
    refetch(); // Refresh the checklists data
  };

  const handleBackToUpload = () => {
    setViewMode('upload');
    setCreatedChecklistId(null);
  };

  // Find the created checklist
  const createdChecklist = createdChecklistId ? 
    Object.values(checklists).find(cl => cl.id === createdChecklistId) : null;

  return (
    <div className="container mx-auto py-8 px-4 max-w-4xl">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          {viewMode === 'view' && (
            <Button variant="outline" onClick={handleBackToUpload}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Upload
            </Button>
          )}
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <FileText className="h-8 w-8" />
              Word Document to Checklist
            </h1>
            <p className="text-muted-foreground mt-1">
              Upload Word documents with photos and convert them to interactive checklists
            </p>
          </div>
        </div>

        {/* Content */}
        {viewMode === 'upload' && (
          <div className="space-y-6">
            <WordDocumentUploader onChecklistCreated={handleChecklistCreated} />
            
            {/* Instructions */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <List className="h-5 w-5" />
                  How it Works
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-3">
                    <h4 className="font-medium">What you provide:</h4>
                    <ul className="text-sm space-y-2 text-muted-foreground">
                      <li>• Word document (.docx) with step-by-step instructions</li>
                      <li>• Photos embedded in the document</li>
                      <li>• Numbered lists or bullet points</li>
                      <li>• Clear, actionable instructions</li>
                    </ul>
                  </div>
                  <div className="space-y-3">
                    <h4 className="font-medium">What you get:</h4>
                    <ul className="text-sm space-y-2 text-muted-foreground">
                      <li>• Interactive checklist with checkboxes</li>
                      <li>• Photos matched to relevant steps</li>
                      <li>• Progress tracking that saves automatically</li>
                      <li>• Accessible from any device</li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Existing Checklists */}
            {!loading && Object.keys(checklists).length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Your Existing Checklists</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-3">
                    {Object.entries(checklists).map(([type, checklist]) => (
                      <div key={type} className="flex items-center justify-between p-3 border rounded-lg">
                        <div>
                          <h4 className="font-medium capitalize">
                            {type.replace('_', ' ')} Checklist
                          </h4>
                          <p className="text-sm text-muted-foreground">
                            {checklist.items?.length || 0} items
                          </p>
                        </div>
                        <Button 
                          variant="outline" 
                          onClick={() => {
                            setCreatedChecklistId(checklist.id);
                            setViewMode('view');
                          }}
                        >
                          View
                        </Button>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {viewMode === 'view' && createdChecklist && (
          <InteractiveChecklist
            checklistId={createdChecklist.id}
            title={`${createdChecklist.checklist_type.replace('_', ' ')} Checklist`}
            items={createdChecklist.items || []}
            onProgressUpdate={(completed, total) => {
              console.log(`Progress: ${completed}/${total}`);
            }}
          />
        )}

        {viewMode === 'view' && !createdChecklist && !loading && (
          <Card>
            <CardContent className="p-6 text-center">
              <p className="text-muted-foreground">
                Checklist not found. Please try uploading again.
              </p>
              <Button className="mt-4" onClick={handleBackToUpload}>
                Back to Upload
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
