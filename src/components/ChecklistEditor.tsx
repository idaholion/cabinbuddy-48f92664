import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Edit2, 
  Save, 
  X, 
  Plus, 
  Trash2, 
  GripVertical, 
  Image as ImageIcon,
  Upload,
  RotateCcw
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { DndContext, closestCenter, DragEndEvent } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, arrayMove } from '@dnd-kit/sortable';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface ChecklistItem {
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

interface ChecklistSection {
  title: string;
  items: ChecklistItem[];
}

interface ChecklistEditorProps {
  sections: ChecklistSection[];
  onSave: (sections: ChecklistSection[]) => void;
  onCancel: () => void;
  checklistType: string;
}

interface SortableItemProps {
  item: ChecklistItem;
  onUpdate: (item: ChecklistItem) => void;
  onDelete: () => void;
  onRegenerateImage: (item: ChecklistItem) => void;
}

const SortableItem: React.FC<SortableItemProps> = ({ 
  item, 
  onUpdate, 
  onDelete, 
  onRegenerateImage 
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(item.text);
  const [editImageDescription, setEditImageDescription] = useState(item.imageDescription || '');
  
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
      imageDescription: editImageDescription
    });
    setIsEditing(false);
    toast({ title: "Item updated successfully" });
  };

  const handleCancel = () => {
    setEditText(item.text);
    setEditImageDescription(item.imageDescription || '');
    setIsEditing(false);
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
                    placeholder="Optional: Describe an image for this item..."
                  />
                  
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
                  
                  {/* Display single image or multiple images */}
                  {(item.imageUrl || (item.imageUrls && item.imageUrls.length > 0)) && (
                    <div className="space-y-3">
                      {/* Single image */}
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
                      
                      {/* Multiple images */}
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
                      
                      {/* Image description */}
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

export const ChecklistEditor: React.FC<ChecklistEditorProps> = ({
  sections,
  onSave,
  onCancel,
  checklistType
}) => {
  const [editableSections, setEditableSections] = useState<ChecklistSection[]>(sections);
  const [newItemText, setNewItemText] = useState('');
  const [activeSection, setActiveSection] = useState(0);

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    
    if (!over || active.id === over.id) return;

    const section = editableSections[activeSection];
    const oldIndex = section.items.findIndex(item => item.id === active.id);
    const newIndex = section.items.findIndex(item => item.id === over.id);

    const newItems = arrayMove(section.items, oldIndex, newIndex);
    
    setEditableSections(prev => 
      prev.map((sec, idx) => 
        idx === activeSection ? { ...sec, items: newItems } : sec
      )
    );
  };

  const addNewItem = () => {
    if (!newItemText.trim()) return;

    const newItem: ChecklistItem = {
      id: `item-${Date.now()}`,
      text: newItemText.trim(),
      completed: false
    };

    setEditableSections(prev => 
      prev.map((sec, idx) => 
        idx === activeSection 
          ? { ...sec, items: [...sec.items, newItem] }
          : sec
      )
    );
    
    setNewItemText('');
    toast({ title: "Item added successfully" });
  };

  const updateItem = (itemId: string, updatedItem: ChecklistItem) => {
    setEditableSections(prev => 
      prev.map((sec, idx) => 
        idx === activeSection
          ? {
              ...sec,
              items: sec.items.map(item => 
                item.id === itemId ? updatedItem : item
              )
            }
          : sec
      )
    );
  };

  const deleteItem = (itemId: string) => {
    setEditableSections(prev => 
      prev.map((sec, idx) => 
        idx === activeSection
          ? {
              ...sec,
              items: sec.items.filter(item => item.id !== itemId)
            }
          : sec
      )
    );
    toast({ title: "Item deleted successfully" });
  };

  const regenerateImage = async (item: ChecklistItem) => {
    // This would call the image generation API
    toast({ 
      title: "Image generation requested", 
      description: "This feature will generate a new image based on the description." 
    });
  };

  const currentSection = editableSections[activeSection];
  const totalItems = editableSections.reduce((acc, sec) => acc + sec.items.length, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium">
            Edit {checklistType.replace('_', ' ')} Checklist
          </h3>
          <p className="text-sm text-muted-foreground">
            {totalItems} total items across {editableSections.length} sections
          </p>
        </div>
        
        <div className="flex gap-2">
          <Button onClick={() => onSave(editableSections)}>
            <Save className="h-4 w-4 mr-2" />
            Save Changes
          </Button>
          <Button variant="outline" onClick={onCancel}>
            <X className="h-4 w-4 mr-2" />
            Cancel
          </Button>
        </div>
      </div>

      {/* Section Tabs */}
      {editableSections.length > 1 && (
        <div className="flex gap-2">
          {editableSections.map((section, index) => (
            <Button
              key={index}
              variant={activeSection === index ? 'default' : 'outline'}
              size="sm"
              onClick={() => setActiveSection(index)}
            >
              {section.title}
              <Badge variant="secondary" className="ml-2">
                {section.items.length}
              </Badge>
            </Button>
          ))}
        </div>
      )}

      {/* Add New Item */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Add New Item</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex gap-2">
            <Input
              value={newItemText}
              onChange={(e) => setNewItemText(e.target.value)}
              placeholder="Enter new checklist item..."
              onKeyPress={(e) => e.key === 'Enter' && addNewItem()}
            />
            <Button onClick={addNewItem} disabled={!newItemText.trim()}>
              <Plus className="h-4 w-4 mr-2" />
              Add
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Current Section Items */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center justify-between">
            <span>{currentSection.title}</span>
            <Badge variant="outline">
              {currentSection.items.length} items
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {currentSection.items.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              No items in this section. Add some items above.
            </p>
          ) : (
            <DndContext 
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext 
                items={currentSection.items.map(item => item.id)}
                strategy={verticalListSortingStrategy}
              >
                {currentSection.items.map((item) => (
                  <SortableItem
                    key={item.id}
                    item={item}
                    onUpdate={(updatedItem) => updateItem(item.id, updatedItem)}
                    onDelete={() => deleteItem(item.id)}
                    onRegenerateImage={regenerateImage}
                  />
                ))}
              </SortableContext>
            </DndContext>
          )}
        </CardContent>
      </Card>
    </div>
  );
};