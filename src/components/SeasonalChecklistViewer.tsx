import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { CheckSquare, Clock, Edit2, Save, X, Image as ImageIcon } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import type { CustomChecklist } from '@/hooks/useChecklistData';
import { useCustomChecklists } from '@/hooks/useChecklistData';
import { ChecklistEditor } from './ChecklistEditor';

interface ChecklistImage {
  itemId: string;
  url: string;
  description?: string;
  position: 'before' | 'after';
}

interface ChecklistItem {
  id: string;
  text: string;
  completed?: boolean;
  imageUrl?: string;
  imageDescription?: string;
  imagePosition?: 'before' | 'after';
}

interface ChecklistSection {
  title: string;
  items: ChecklistItem[];
}

interface EnhancedCustomChecklist extends CustomChecklist {
  images?: ChecklistImage[];
}

interface SeasonalChecklistViewerProps {
  checklist: EnhancedCustomChecklist;
  onUpdate: () => void;
}

export const SeasonalChecklistViewer: React.FC<SeasonalChecklistViewerProps> = ({ 
  checklist, 
  onUpdate 
}) => {
  const [completedItems, setCompletedItems] = useState<Record<string, boolean>>({});
  const [isSessionMode, setIsSessionMode] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [sessionStartTime] = useState<Date>(new Date());
  const { saveChecklist } = useCustomChecklists();

  // Get checklist sections from the checklist data
  const sections: ChecklistSection[] = Array.isArray(checklist.items) ? checklist.items : [];
  
  // Calculate progress
  const totalItems = sections.reduce((acc, section) => acc + (section.items?.length || 0), 0);
  const completedCount = Object.values(completedItems).filter(Boolean).length;
  const progress = totalItems > 0 ? (completedCount / totalItems) * 100 : 0;

  // Toggle item completion
  const toggleItem = (itemId: string) => {
    setCompletedItems(prev => ({
      ...prev,
      [itemId]: !prev[itemId]
    }));
  };

  // Start a new session
  const startSession = () => {
    setIsSessionMode(true);
    setCompletedItems({});
    toast({ title: `Started ${checklist.checklist_type} session` });
  };

  // Complete session
  const completeSession = () => {
    const sessionData = {
      checklist_type: checklist.checklist_type,
      completed_items: completedItems,
      completion_percentage: Math.round(progress),
      session_start: sessionStartTime,
      session_end: new Date(),
      total_items: totalItems,
      completed_count: completedCount
    };

    // In a real app, you'd save the session data to the database
    console.log('Session completed:', sessionData);
    
    setIsSessionMode(false);
    setCompletedItems({});
    
    toast({ 
      title: `Session completed with ${Math.round(progress)}% completion`,
      description: `${completedCount} of ${totalItems} items completed`
    });
  };

  // Cancel session
  const cancelSession = () => {
    setIsSessionMode(false);
    setCompletedItems({});
    toast({ title: "Session cancelled" });
  };

  // Render individual checklist item with image support
  const renderChecklistItem = (item: ChecklistItem, itemIndex: number) => {
    // Find associated image for this item
    const itemImage = checklist.images?.find(img => img.itemId === item.id) || 
                      (item.imageUrl ? { url: item.imageUrl, description: item.imageDescription, position: item.imagePosition || 'after' } : null);

    return (
      <div key={item.id} className="space-y-3">
        {/* Image before text */}
        {itemImage && itemImage.position === 'before' && (
          <div className="relative ml-6">
            <img 
              src={itemImage.url} 
              alt={itemImage.description || `Image for ${item.text}`}
              className="w-full max-w-md mx-auto rounded-lg shadow-sm border"
              loading="lazy"
            />
            {itemImage.description && (
              <p className="text-xs text-muted-foreground mt-1 text-center">{itemImage.description}</p>
            )}
          </div>
        )}

        {/* Checklist item */}
        <div 
          className={`flex items-start gap-3 p-3 rounded-lg transition-colors ${
            isSessionMode 
              ? 'bg-muted/30 hover:bg-muted/50 cursor-pointer' 
              : 'bg-background'
          } ${
            completedItems[item.id] ? 'opacity-60' : ''
          }`}
          onClick={() => isSessionMode && toggleItem(item.id)}
        >
          {isSessionMode ? (
            <Checkbox 
              checked={completedItems[item.id] || false}
              onCheckedChange={() => toggleItem(item.id)}
              className="mt-0.5"
            />
          ) : (
            <CheckSquare className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
          )}
          
          <div className="flex-1">
            <span 
              className={`text-sm leading-relaxed ${
                completedItems[item.id] ? 'line-through text-muted-foreground' : ''
              }`}
            >
              {item.text}
            </span>
          </div>

          <div className="flex items-center gap-2">
            {itemImage && (
              <ImageIcon className="h-4 w-4 text-muted-foreground" />
            )}
            {!isSessionMode && (
              <Button 
                size="sm" 
                variant="ghost" 
                className="h-6 w-6 p-0"
                onClick={() => setIsEditMode(true)}
              >
                <Edit2 className="h-3 w-3" />
              </Button>
            )}
          </div>
        </div>

        {/* Image after text */}
        {itemImage && itemImage.position === 'after' && (
          <div className="relative ml-6">
            <img 
              src={itemImage.url} 
              alt={itemImage.description || `Image for ${item.text}`}
              className="w-full max-w-md mx-auto rounded-lg shadow-sm border"
              loading="lazy"
            />
            {itemImage.description && (
              <p className="text-xs text-muted-foreground mt-1 text-center">{itemImage.description}</p>
            )}
          </div>
        )}
      </div>
    );
  };

  if (sections.length === 0) {
    return (
      <div className="text-center py-8">
        <CheckSquare className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
        <h3 className="text-lg font-medium">Checklist is empty</h3>
        <p className="text-muted-foreground">This checklist doesn't have any items yet.</p>
      </div>
    );
  }

  const totalImages = checklist.images?.length || 0;

  const handleSaveEdit = async (updatedSections: ChecklistSection[]) => {
    try {
      await saveChecklist(checklist.checklist_type, updatedSections, checklist.images);
      setIsEditMode(false);
      onUpdate();
      toast({ title: "Checklist updated successfully!" });
    } catch (error) {
      console.error('Error saving checklist:', error);
      toast({ 
        title: "Error saving checklist", 
        description: "Please try again.",
        variant: "destructive" 
      });
    }
  };

  // Show editor mode
  if (isEditMode) {
    return (
      <ChecklistEditor
        sections={sections}
        onSave={handleSaveEdit}
        onCancel={() => setIsEditMode(false)}
        checklistType={checklist.checklist_type}
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with progress and actions */}
      <div className="space-y-4">
        {isSessionMode && (
          <>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                <span className="text-sm font-medium">Session in progress</span>
                <Badge variant="outline">{Math.round(progress)}% complete</Badge>
              </div>
              <div className="flex gap-2">
                <Button size="sm" onClick={completeSession} disabled={progress === 0}>
                  <Save className="h-4 w-4 mr-2" />
                  Complete Session
                </Button>
                <Button size="sm" variant="outline" onClick={cancelSession}>
                  <X className="h-4 w-4 mr-2" />
                  Cancel
                </Button>
              </div>
            </div>
            
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>{completedCount} of {totalItems} items completed</span>
                <span>{Math.round(progress)}%</span>
              </div>
              <Progress value={progress} className="h-2" />
            </div>
          </>
        )}

        {!isSessionMode && !isEditMode && (
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <h3 className="text-lg font-medium capitalize">
                {checklist.checklist_type.replace('_', ' ')} Checklist
              </h3>
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <span>{totalItems} total items across {sections.length} sections</span>
                {totalImages > 0 && (
                  <div className="flex items-center gap-1">
                    <ImageIcon className="h-3 w-3" />
                    <span>{totalImages} images</span>
                  </div>
                )}
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setIsEditMode(true)}>
                <Edit2 className="h-4 w-4 mr-2" />
                Edit Checklist
              </Button>
              <Button onClick={startSession}>
                <CheckSquare className="h-4 w-4 mr-2" />
                Start Session
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Checklist Sections */}
      {!isEditMode && (
        <div className="space-y-4">
          {sections.map((section, sectionIndex) => (
            <Card key={sectionIndex} className="border-l-4 border-l-primary">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center justify-between">
                  <span>{section.title}</span>
                  {isSessionMode && (
                    <Badge variant="secondary">
                      {(section.items || []).filter(item => completedItems[item.id]).length} / {section.items?.length || 0}
                    </Badge>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {(section.items || []).map((item, itemIndex) => renderChecklistItem(item, itemIndex))}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
      
      {/* Session Summary */}
      {isSessionMode && progress > 0 && (
        <Card className="bg-primary/5 border-primary/20">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="flex-1">
                <h4 className="font-medium">Session Progress</h4>
                <p className="text-sm text-muted-foreground">
                  You've completed {completedCount} out of {totalItems} items
                </p>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-primary">{Math.round(progress)}%</div>
                <div className="text-xs text-muted-foreground">Complete</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};