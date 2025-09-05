import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { CheckSquare, Clock, Edit2, Save, X, Image as ImageIcon, Wrench, AlertTriangle, Calendar } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import type { CustomChecklist } from '@/hooks/useChecklistData';
import { useCustomChecklists } from '@/hooks/useChecklistData';
import { ChecklistEditor } from './ChecklistEditor';
import { useOrgAdmin } from '@/hooks/useOrgAdmin';

interface ChecklistImage {
  id?: string;
  itemId?: string;
  url?: string;
  data?: string | null;
  description?: string;
  position?: 'before' | 'after';
  type?: string;
  filename?: string;
  alt?: string;
}

interface ChecklistItem {
  id: string;
  text: string;
  completed?: boolean;
  imageUrl?: string;
  imageUrls?: string[];
  imageDescription?: string;
  imagePosition?: 'before' | 'after';
  imageMarker?: string;
  imageSize?: string;
  formatting?: {
    bold?: boolean;
    italic?: boolean;
    icon?: string;
    type?: string;
  };
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
  const [isEditMode, setIsEditMode] = useState(false);
  const { saveChecklist } = useCustomChecklists();
  const { isAdmin } = useOrgAdmin();

  // Convert flat items array to sections structure
  const sections: ChecklistSection[] = Array.isArray(checklist.items) && checklist.items.length > 0 ? [
    {
      title: `${checklist.checklist_type.charAt(0).toUpperCase() + checklist.checklist_type.slice(1)} Checklist`,
      items: checklist.items.map((item: any) => ({
        id: item.id?.toString() || Math.random().toString(),
        text: item.text || '',
        completed: item.completed || false,
        imageUrl: item.imageUrl,
        imageUrls: item.imageUrls,
        imageDescription: item.imageDescription,
        imagePosition: item.imagePosition || 'after',
        imageMarker: item.imageMarker,
        imageSize: item.imageSize,
        formatting: {
          bold: item.formatting?.bold || false,
          italic: item.formatting?.italic || false,
          icon: item.formatting?.icon,
          type: item.formatting?.type
        }
      }))
    }
  ] : [];
  
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

  // Render individual checklist item with rich formatting and multiple images
  const renderChecklistItem = (item: ChecklistItem, itemIndex: number) => {
    // Get all images for this item (both single and multiple)
    const images: string[] = [];
    if (item.imageUrl) images.push(item.imageUrl);
    if (item.imageUrls && Array.isArray(item.imageUrls)) {
      images.push(...item.imageUrls);
    }

    // Get image size class - matching InteractiveChecklist exactly
    const getImageSizeClass = (size?: string) => {
      switch (size) {
        case 'small': return 'max-w-xs';
        case 'medium': return 'max-w-sm';
        case 'large': return 'max-w-lg';
        case 'xl': return 'max-w-2xl';
        case 'full': return 'max-w-full';
        default: return 'max-w-sm';
      }
    };

    // Get the icon component
    const getIconComponent = (iconName?: string) => {
      if (!iconName) return CheckSquare;
      
      // Map icon names to actual icon components
      const iconMap: Record<string, any> = {
        'wrench': Wrench,
        'alert-triangle': AlertTriangle,
        'check-square': CheckSquare,
        'calendar': Calendar,
        'clock': Clock,
        'image': ImageIcon,
      };
      
      return iconMap[iconName] || CheckSquare;
    };

    const IconComponent = getIconComponent(item.formatting?.icon);
    
    return (
      <div key={item.id} className="space-y-3">
        {/* Images before text */}
        {images.length > 0 && item.imagePosition === 'before' && (
          <div className="ml-6">
            <div className="flex flex-wrap gap-3">
              {images.map((imageUrl, imgIndex) => (
                <div key={imgIndex} className={`${getImageSizeClass(item.imageSize)} relative`}>
                  <div className="rounded-lg overflow-hidden border shadow-sm bg-white">
                    <img 
                      src={imageUrl} 
                      alt={item.imageDescription || `Image ${imgIndex + 1} for item ${itemIndex + 1}`}
                      className="w-full h-auto"
                      loading="lazy"
                      onError={(e) => {
                        console.log('Image failed to load:', imageUrl);
                        e.currentTarget.style.display = 'none';
                      }}
                    />
                  </div>
                  {item.imageDescription && imgIndex === 0 && (
                    <p className="text-xs text-muted-foreground mt-1 text-center">
                      {item.imageDescription}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Checklist item with formatting */}
        <div 
          className={`flex items-start gap-3 p-3 rounded-lg transition-colors bg-muted/30 hover:bg-muted/50 cursor-pointer ${
            completedItems[item.id] ? 'opacity-60' : ''
          }`}
          onClick={() => toggleItem(item.id)}
        >
          <Checkbox 
            checked={completedItems[item.id] || false}
            onCheckedChange={() => toggleItem(item.id)}
            className="mt-0.5"
          />
          
          <div className="flex-1">
            <span 
              className={`text-sm leading-relaxed ${
                completedItems[item.id] ? 'line-through text-muted-foreground' : ''
              } ${
                item.formatting?.bold ? 'font-bold' : ''
              } ${
                item.formatting?.italic ? 'italic' : ''
              } ${
                item.formatting?.type === 'warning' ? 'text-amber-700 dark:text-amber-400' : ''
              }`}
            >
              {item.text}
            </span>
          </div>

          <div className="flex items-center gap-2">
            {images.length > 0 && (
              <div className="flex items-center gap-1">
                <ImageIcon className="h-4 w-4 text-muted-foreground" />
                {images.length > 1 && (
                  <span className="text-xs text-muted-foreground">{images.length}</span>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Images after text */}
        {images.length > 0 && (!item.imagePosition || item.imagePosition === 'after') && (
          <div className="ml-6">
            <div className="flex flex-wrap gap-3">
              {images.map((imageUrl, imgIndex) => (
                <div key={imgIndex} className={`${getImageSizeClass(item.imageSize)} relative`}>
                  <div className="rounded-lg overflow-hidden border shadow-sm bg-white">
                    <img 
                      src={imageUrl} 
                      alt={item.imageDescription || `Image ${imgIndex + 1} for item ${itemIndex + 1}`}
                      className="w-full h-auto"
                      loading="lazy"
                      onError={(e) => {
                        console.log('Image failed to load:', imageUrl);
                        e.currentTarget.style.display = 'none';
                      }}
                    />
                  </div>
                  {item.imageDescription && imgIndex === 0 && (
                    <p className="text-xs text-muted-foreground mt-1 text-center">
                      {item.imageDescription}
                    </p>
                  )}
                </div>
              ))}
            </div>
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

  const totalImages = sections.reduce((acc, section) => {
    return acc + section.items.reduce((itemAcc, item) => {
      let imageCount = 0;
      if (item.imageUrl) imageCount++;
      if (item.imageUrls && Array.isArray(item.imageUrls)) {
        imageCount += item.imageUrls.length;
      }
      return itemAcc + imageCount;
    }, 0);
  }, 0);

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
        <div className="flex items-center justify-between">
          <div className="text-center flex-1">
            <h1 className="text-6xl mb-4 font-kaushan text-primary drop-shadow-lg capitalize">
              {checklist.checklist_type.replace('_', ' ')} Checklist
            </h1>
          </div>
          <div className="flex gap-2">
            {isAdmin && (
              <Button variant="outline" onClick={() => setIsEditMode(true)}>
                <Edit2 className="h-4 w-4 mr-2" />
                Edit Checklist
              </Button>
            )}
          </div>
        </div>

        {/* Progress display */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>{completedCount} of {totalItems} items completed</span>
            <span>{Math.round(progress)}%</span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>
      </div>

      {/* Display introductory text if it exists */}
      {checklist.introductory_text && (
        <Card className="bg-blue-50 border-blue-200 dark:bg-blue-950/50 dark:border-blue-800">
          <CardContent className="p-4">
            <div className="prose prose-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
              {checklist.introductory_text}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Checklist Sections */}
      <div className="space-y-4">
        {sections.map((section, sectionIndex) => (
          <Card key={sectionIndex} className="border-l-4 border-l-primary">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center justify-between">
                <span>{section.title}</span>
                <Badge variant="secondary">
                  {(section.items || []).filter(item => completedItems[item.id]).length} / {section.items?.length || 0}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {(section.items || []).map((item, itemIndex) => renderChecklistItem(item, itemIndex))}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};