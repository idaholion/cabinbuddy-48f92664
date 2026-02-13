import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Edit2, Save, X, Trash2, GripVertical, Image as ImageIcon, RotateCcw } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { ChecklistImageSelector } from '@/components/ChecklistImageSelector';
import { ChecklistImageKey } from '@/lib/checklist-image-library';

export interface ChecklistItem {
  id: string;
  text: string;
  completed?: boolean;
  imageUrl?: string;
  imageUrls?: string[];
  imageDescription?: string;
  imagePosition?: 'before' | 'after';
  imageSize?: string;
  formatting?: {
    bold?: boolean;
    italic?: boolean;
    icon?: string;
    type?: string;
  };
}

interface SortableChecklistItemProps {
  item: ChecklistItem;
  onUpdate: (item: ChecklistItem) => void;
  onDelete: () => void;
  onRegenerateImage: (item: ChecklistItem) => void;
}

export const SortableChecklistItem: React.FC<SortableChecklistItemProps> = ({ 
  item, 
  onUpdate, 
  onDelete, 
  onRegenerateImage 
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(item.text);
  const [editImageDescription, setEditImageDescription] = useState(item.imageDescription || '');
  const [editImageUrls, setEditImageUrls] = useState<string[]>(item.imageUrls || []);
  
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({ id: item.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const handleSave = () => {
    onUpdate({
      ...item,
      text: editText,
      imageDescription: editImageDescription,
      imageUrls: editImageUrls.length > 0 ? editImageUrls : undefined
    });
    setIsEditing(false);
    toast({ title: "Item updated successfully" });
  };

  const handleCancel = () => {
    setEditText(item.text);
    setEditImageDescription(item.imageDescription || '');
    setEditImageUrls(item.imageUrls || []);
    setIsEditing(false);
  };

  const handleImageSelect = (imageUrl: string, key: ChecklistImageKey) => {
    if (!editImageUrls.includes(imageUrl)) {
      setEditImageUrls(prev => [...prev, imageUrl]);
      if (!editImageDescription) {
        setEditImageDescription(`Reference image for ${key.replace(/-/g, ' ')}`);
      }
    }
  };

  const removeImage = (imageUrl: string) => {
    setEditImageUrls(prev => prev.filter(url => url !== imageUrl));
  };

  return (
    <div ref={setNodeRef} style={style} className="space-y-3">
      <Card className="border-l-4 border-l-primary/50">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <div
              {...attributes}
              {...listeners}
              className="cursor-grab active:cursor-grabbing mt-1"
            >
              <GripVertical className="h-4 w-4 text-muted-foreground" />
            </div>
            
            <div className="flex-1 space-y-3">
              {isEditing ? (
                <div className="space-y-3">
                  <Textarea
                    value={editText}
                    onChange={(e) => setEditText(e.target.value)}
                    className="min-h-[60px]"
                    placeholder="Edit checklist item text..."
                  />
                  
                  <Input
                    value={editImageDescription}
                    onChange={(e) => setEditImageDescription(e.target.value)}
                    placeholder="Optional: Describe images for this item..."
                  />
                  
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <label className="text-sm font-medium">Add Shared Images</label>
                      <ChecklistImageSelector
                        onImageSelect={handleImageSelect}
                        currentImages={editImageUrls}
                        trigger={
                          <Button variant="outline" size="sm">
                            <ImageIcon className="h-4 w-4 mr-2" />
                            Browse Library
                          </Button>
                        }
                      />
                    </div>
                    
                    {editImageUrls.length > 0 && (
                      <div className="space-y-2">
                        <p className="text-sm text-muted-foreground">Selected images:</p>
                        <div className="flex flex-wrap gap-2">
                          {editImageUrls.map((imageUrl, index) => (
                            <div key={index} className="relative group">
                              <div className="w-16 h-16 rounded border overflow-hidden">
                                <img
                                  src={imageUrl}
                                  alt={`Selected image ${index + 1}`}
                                  className="w-full h-full object-cover"
                                />
                              </div>
                              <Button
                                size="sm"
                                variant="destructive"
                                className="absolute -top-1 -right-1 h-5 w-5 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                                onClick={() => removeImage(imageUrl)}
                              >
                                <X className="h-3 w-3" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                  
                  <div className="flex gap-2">
                    <Button size="sm" onClick={handleSave}>
                      <Save className="h-3 w-3 mr-1" />
                      Save
                    </Button>
                    <Button size="sm" variant="outline" onClick={handleCancel}>
                      <X className="h-3 w-3 mr-1" />
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <>
                  <p className="text-sm leading-relaxed">{item.text}</p>
                  
                  {(item.imageUrl || (item.imageUrls && item.imageUrls.length > 0)) && (
                    <div className="space-y-3">
                      {item.imageUrl && (
                        <div className="relative max-w-md">
                          <img 
                            src={item.imageUrl} 
                            alt={item.imageDescription || `Image for ${item.text}`}
                            className="w-full rounded-lg shadow-sm border"
                            loading="lazy"
                          />
                          <Button
                            size="sm"
                            variant="secondary"
                            className="absolute top-2 right-2"
                            onClick={() => onRegenerateImage(item)}
                          >
                            <RotateCcw className="h-3 w-3" />
                          </Button>
                        </div>
                      )}
                      
                      {item.imageUrls && item.imageUrls.length > 0 && (
                        <div className="flex flex-wrap gap-3">
                          {item.imageUrls.map((imageUrl, index) => (
                            <div key={index} className="relative max-w-md">
                              <img 
                                src={imageUrl} 
                                alt={item.imageDescription || `Image ${index + 1} for ${item.text}`}
                                className="w-full rounded-lg shadow-sm border"
                                loading="lazy"
                              />
                              <Button
                                size="sm"
                                variant="secondary"
                                className="absolute top-2 right-2"
                                onClick={() => onRegenerateImage(item)}
                              >
                                <RotateCcw className="h-3 w-3" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      )}
                      
                      {item.imageDescription && (
                        <p className="text-xs text-muted-foreground">{item.imageDescription}</p>
                      )}
                    </div>
                  )}
                  
                  {item.imageDescription && !item.imageUrl && (!item.imageUrls || item.imageUrls.length === 0) && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <ImageIcon className="h-4 w-4" />
                      <span>Image pending: {item.imageDescription}</span>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => onRegenerateImage(item)}
                      >
                        Generate
                      </Button>
                    </div>
                  )}
                </>
              )}
            </div>
            
            <div className="flex items-center gap-1">
              {!isEditing && (
                <>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-6 w-6 p-0"
                    onClick={() => setIsEditing(true)}
                  >
                    <Edit2 className="h-3 w-3" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-6 w-6 p-0 text-destructive"
                    onClick={onDelete}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
