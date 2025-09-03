import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { CheckCircle, Circle, RotateCcw, Save } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { useChecklistProgress } from '@/hooks/useChecklistProgress';

interface ChecklistItem {
  id: string;
  text: string;
  completed?: boolean;
  imageUrl?: string;
  imageDescription?: string;
  imagePosition?: 'before' | 'after';
}

interface InteractiveChecklistProps {
  checklistId: string;
  title: string;
  items: ChecklistItem[];
  onProgressUpdate?: (completedCount: number, totalCount: number) => void;
}

export const InteractiveChecklist: React.FC<InteractiveChecklistProps> = ({
  checklistId,
  title,
  items,
  onProgressUpdate
}) => {
  const {
    progress,
    loading,
    updateProgress,
    resetProgress,
    saveProgress
  } = useChecklistProgress(checklistId);

  const [localProgress, setLocalProgress] = useState<Record<string, boolean>>({});
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Initialize local progress from saved progress
  useEffect(() => {
    if (progress && Object.keys(progress).length > 0) {
      setLocalProgress(progress);
    }
  }, [progress]);

  // Calculate completion statistics
  const completedCount = Object.values(localProgress).filter(Boolean).length;
  const totalCount = items.length;
  const completionPercentage = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  // Notify parent of progress updates
  useEffect(() => {
    if (onProgressUpdate) {
      onProgressUpdate(completedCount, totalCount);
    }
  }, [completedCount, totalCount, onProgressUpdate]);

  const handleItemToggle = (itemId: string, completed: boolean) => {
    const newProgress = {
      ...localProgress,
      [itemId]: completed
    };
    
    setLocalProgress(newProgress);
    setHasUnsavedChanges(true);
    
    // Auto-save progress after short delay
    setTimeout(() => {
      updateProgress(newProgress, completedCount + (completed ? 1 : -1), totalCount);
      setHasUnsavedChanges(false);
    }, 1000);
  };

  const handleSaveProgress = async () => {
    await saveProgress();
    setHasUnsavedChanges(false);
    toast({
      title: "Progress Saved",
      description: "Your checklist progress has been saved"
    });
  };

  const handleResetProgress = async () => {
    setLocalProgress({});
    await resetProgress();
    setHasUnsavedChanges(false);
    toast({
      title: "Progress Reset",
      description: "All checklist items have been marked as incomplete"
    });
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with progress */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              {completionPercentage === 100 ? (
                <CheckCircle className="h-5 w-5 text-green-500" />
              ) : (
                <Circle className="h-5 w-5" />
              )}
              {title}
            </CardTitle>
            <div className="flex items-center gap-2">
              {hasUnsavedChanges && (
                <Button size="sm" onClick={handleSaveProgress}>
                  <Save className="h-3 w-3 mr-1" />
                  Save
                </Button>
              )}
              <Button size="sm" variant="outline" onClick={handleResetProgress}>
                <RotateCcw className="h-3 w-3 mr-1" />
                Reset
              </Button>
            </div>
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span>{completedCount} of {totalCount} completed</span>
              <Badge variant={completionPercentage === 100 ? "default" : "secondary"}>
                {completionPercentage}%
              </Badge>
            </div>
            <Progress value={completionPercentage} className="h-2" />
          </div>
        </CardHeader>
      </Card>

      {/* Checklist items */}
      <div className="space-y-4">
        {items.map((item, index) => {
          const isCompleted = localProgress[item.id] || false;
          
          return (
            <Card key={item.id} className={`transition-all ${isCompleted ? 'bg-green-50/50 border-green-200' : ''}`}>
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <Checkbox
                    id={item.id}
                    checked={isCompleted}
                    onCheckedChange={(checked) => handleItemToggle(item.id, checked as boolean)}
                    className="mt-1"
                  />
                  
                  <div className="flex-1 space-y-3">
                    <label
                      htmlFor={item.id}
                      className={`text-sm leading-relaxed cursor-pointer block ${
                        isCompleted ? 'line-through text-muted-foreground' : ''
                      }`}
                    >
                      <span className="font-medium text-xs text-muted-foreground mr-2">
                        {index + 1}.
                      </span>
                      {item.text}
                    </label>
                    
                    {item.imageUrl && (
                      <div className="max-w-md">
                        <img
                          src={item.imageUrl}
                          alt={item.imageDescription || `Step ${index + 1} illustration`}
                          className="w-full rounded-lg border shadow-sm"
                          loading="lazy"
                        />
                        {item.imageDescription && (
                          <p className="text-xs text-muted-foreground mt-2">
                            {item.imageDescription}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Completion summary */}
      {completionPercentage === 100 && (
        <Card className="bg-green-50 border-green-200">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-green-700">
              <CheckCircle className="h-5 w-5" />
              <span className="font-medium">Checklist Complete!</span>
            </div>
            <p className="text-sm text-green-600 mt-1">
              Congratulations! You've completed all {totalCount} items in this checklist.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};