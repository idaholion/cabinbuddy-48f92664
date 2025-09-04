import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { CheckCircle, Circle, RotateCcw, Save, AlertTriangle, Info, Wrench, Settings, Image } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { useChecklistProgress } from '@/hooks/useChecklistProgress';
import * as Icons from 'lucide-react';

interface ChecklistItem {
  id: string;
  text: string;
  completed?: boolean;
  imageUrl?: string;
  imageUrls?: string[];
  imageDescription?: string;
  imagePosition?: 'before' | 'after';
  imageMarker?: string;
  imageSize?: 'small' | 'medium' | 'large' | 'xl' | 'full';
  formatting?: {
    bold?: boolean;
    italic?: boolean;
    type?: 'step' | 'warning' | 'note' | 'header';
    icon?: string;
  };
}

interface InteractiveChecklistProps {
  checklistId: string;
  title: string;
  items: ChecklistItem[];
  introductoryText?: string;
  onProgressUpdate?: (completedCount: number, totalCount: number) => void;
}

export const InteractiveChecklist: React.FC<InteractiveChecklistProps> = ({
  checklistId,
  title,
  items,
  introductoryText,
  onProgressUpdate
}) => {
  const {
    progress,
    loading,
    updateProgress,
    resetProgress,
    saveProgress,
    progressRecord,
    updateImageSizes
  } = useChecklistProgress(checklistId);

  const [localProgress, setLocalProgress] = useState<Record<string, boolean>>({});
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [globalImageSize, setGlobalImageSize] = useState<string>('medium');
  const [individualImageSizes, setIndividualImageSizes] = useState<Record<string, string>>({});
  const [hoveredImageId, setHoveredImageId] = useState<string | null>(null);

  // Initialize local progress from saved progress
  useEffect(() => {
    if (progress && Object.keys(progress).length > 0) {
      setLocalProgress(progress);
    }
  }, [progress]);

  useEffect(() => {
    if (progressRecord?.image_sizes) {
      setGlobalImageSize(progressRecord.image_sizes.globalSize || 'medium');
      setIndividualImageSizes(progressRecord.image_sizes.individualSizes || {});
    }
  }, [progressRecord]);

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

  const handleGlobalSizeChange = async (size: string) => {
    setGlobalImageSize(size);
    await updateImageSizes?.(size, individualImageSizes);
  };

  const handleIndividualSizeChange = async (itemId: string, size: string) => {
    const newIndividualSizes = { ...individualImageSizes, [itemId]: size };
    setIndividualImageSizes(newIndividualSizes);
    await updateImageSizes?.(globalImageSize, newIndividualSizes);
  };

  const getEffectiveImageSize = (itemId: string, defaultSize?: string) => {
    return individualImageSizes[itemId] || globalImageSize || defaultSize || 'medium';
  };

  const sizeOptions = [
    { label: 'S', value: 'small' },
    { label: 'M', value: 'medium' },
    { label: 'L', value: 'large' },
    { label: 'XL', value: 'xl' },
    { label: 'Full', value: 'full' }
  ];

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
              <Image className="h-4 w-4" />
              <span className="text-sm text-muted-foreground">Image size:</span>
              <div className="flex gap-1">
                {sizeOptions.map(option => (
                  <Button
                    key={option.value}
                    variant={globalImageSize === option.value ? "default" : "outline"}
                    size="sm"
                    className="h-7 px-2 text-xs"
                    onClick={() => handleGlobalSizeChange(option.value)}
                  >
                    {option.label}
                  </Button>
                ))}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
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

      {/* Display introductory text if it exists */}
      {introductoryText && (
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="p-4">
            <div className="prose prose-sm text-gray-700 whitespace-pre-wrap">
              {introductoryText}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Checklist items */}
      <div className="space-y-3">
        {items.map((item, index) => {
          const isCompleted = localProgress[item.id] || false;
          const formatting = item.formatting || {};
          
          // Get the appropriate icon
          const getItemIcon = () => {
            if (formatting.icon) {
              const IconComponent = (Icons as any)[formatting.icon];
              return IconComponent ? <IconComponent className="h-4 w-4" /> : null;
            }
            
            switch (formatting.type) {
              case 'warning':
                return <AlertTriangle className="h-4 w-4 text-amber-500" />;
              case 'note':
                return <Info className="h-4 w-4 text-blue-500" />;
              case 'header':
                return <Settings className="h-4 w-4 text-primary" />;
              default:
                return null;
            }
          };

          const ItemIcon = getItemIcon();
          
          return (
            <Card key={item.id} className={`transition-all ${
              isCompleted ? 'bg-green-50/50 border-green-200' : 
              formatting.type === 'warning' ? 'border-amber-200 bg-amber-50/30' :
              formatting.type === 'note' ? 'border-blue-200 bg-blue-50/30' :
              formatting.type === 'header' ? 'border-primary/20 bg-primary/5' :
              ''
            }`}>
              <CardContent className={`p-4 ${formatting.type === 'header' ? 'pb-2' : ''}`}>
                <div className="flex items-start gap-3">
                  {formatting.type !== 'header' && (
                    <Checkbox
                      id={item.id}
                      checked={isCompleted}
                      onCheckedChange={(checked) => handleItemToggle(item.id, checked as boolean)}
                      className="mt-1"
                    />
                  )}
                  
                  <div className="flex-1 space-y-3">
                    <div className="flex items-start gap-2">
                      {ItemIcon && (
                        <div className="mt-0.5">
                          {ItemIcon}
                        </div>
                      )}
                      
                      <label
                        htmlFor={item.id}
                        className={`cursor-pointer block leading-relaxed ${
                          formatting.type === 'header' ? 'text-lg font-semibold text-primary' :
                          formatting.bold ? 'font-semibold' : ''
                        } ${
                          formatting.italic ? 'italic' : ''
                        } ${
                          isCompleted && formatting.type !== 'header' ? 'line-through text-muted-foreground' : ''
                        } ${
                          formatting.type === 'warning' ? 'text-amber-800' :
                          formatting.type === 'note' ? 'text-blue-800' :
                          ''
                        }`}
                      >
                        {formatting.type !== 'header' && (
                          <span className="font-medium text-xs text-muted-foreground mr-2">
                            {index + 1}.
                          </span>
                        )}
                        
                        <span dangerouslySetInnerHTML={{
                          __html: item.text
                            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                            .replace(/\*(.*?)\*/g, '<em>$1</em>')
                        }} />
                      </label>
                    </div>
                    
                    {(item.imageUrl || (item.imageUrls && item.imageUrls.length > 0)) && (() => {
                      // Determine container size based on effective image size
                      const getContainerSize = () => {
                        const effectiveSize = getEffectiveImageSize(item.id, item.imageSize);
                        switch (effectiveSize) {
                          case 'small': return 'max-w-xs';
                          case 'medium': return 'max-w-sm';
                          case 'large': return 'max-w-lg';
                          case 'xl': return 'max-w-2xl';
                          case 'full': return 'max-w-full';
                          default: return 'max-w-sm'; // Default to medium
                        }
                      };

                      return (
                        <div 
                          className={`${getContainerSize()} space-y-3 relative`}
                          onMouseEnter={() => setHoveredImageId(item.id)}
                          onMouseLeave={() => setHoveredImageId(null)}
                        >
                          {/* Display single image if imageUrl exists */}
                          {item.imageUrl && (
                            <div className="rounded-lg overflow-hidden border shadow-sm bg-white relative">
                              <img
                                src={item.imageUrl}
                                alt={item.imageDescription || `Step ${index + 1} illustration`}
                                className="w-full h-auto"
                                loading="lazy"
                              />
                              {item.imageDescription && (
                                <div className="p-3 bg-gray-50 border-t">
                                  <p className="text-sm text-gray-600">
                                    {item.imageDescription}
                                  </p>
                                </div>
                              )}
                              {hoveredImageId === item.id && (
                                <div className="absolute top-2 right-2 flex gap-1 bg-background/90 backdrop-blur-sm p-1 rounded-md shadow-lg">
                                  {sizeOptions.map(option => (
                                    <Button
                                      key={option.value}
                                      variant={getEffectiveImageSize(item.id, item.imageSize) === option.value ? "default" : "ghost"}
                                      size="sm"
                                      className="h-6 w-6 p-0 text-xs"
                                      onClick={() => handleIndividualSizeChange(item.id, option.value)}
                                    >
                                      {option.label}
                                    </Button>
                                  ))}
                                </div>
                              )}
                            </div>
                          )}
                          
                          {/* Display multiple images if imageUrls array exists */}
                          {item.imageUrls && (
                            <div className="auto-fit-grid">
                              {item.imageUrls.map((imageUrl, imgIndex) => {
                                const effectiveSize = getEffectiveImageSize(item.id, item.imageSize);
                                
                                // Determine grid item class based on image size
                                const getGridClass = (size: string) => {
                                  switch (size) {
                                    case 'small':
                                      return 'grid-item-small';
                                    case 'medium':
                                      return 'grid-item-medium';
                                    case 'large':
                                      return 'grid-item-large';
                                    case 'xl':
                                      return 'grid-item-xl';
                                    case 'full':
                                      return 'grid-item-full';
                                    default:
                                      return 'grid-item-medium';
                                  }
                                };
                                
                                return (
                                  <div key={imgIndex} className={`${getGridClass(effectiveSize)} relative`}>
                                    <div className="rounded-lg overflow-hidden border shadow-sm bg-white h-full">
                                      <img
                                        src={imageUrl}
                                        alt={`Step ${index + 1} illustration ${imgIndex + 1}`}
                                        className="w-full h-auto object-cover"
                                        loading="lazy"
                                      />
                                    </div>
                                    {hoveredImageId === item.id && (
                                      <div className="absolute top-2 right-2 flex gap-1 bg-background/90 backdrop-blur-sm p-1 rounded-md shadow-lg">
                                        {sizeOptions.map(option => (
                                          <Button
                                            key={option.value}
                                            variant={effectiveSize === option.value ? "default" : "ghost"}
                                            size="sm"
                                            className="h-6 w-6 p-0 text-xs"
                                            onClick={() => handleIndividualSizeChange(item.id, option.value)}
                                          >
                                            {option.label}
                                          </Button>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      );
                    })()}
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