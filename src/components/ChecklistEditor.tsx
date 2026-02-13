import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Save, X, Plus, Image as ImageIcon } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { DndContext, closestCenter, DragEndEvent } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, arrayMove } from '@dnd-kit/sortable';
import { ChecklistImageSelector } from './ChecklistImageSelector';
import { ChecklistImageKey } from '@/lib/checklist-image-library';
import { SortableChecklistItem, ChecklistItem } from './checklist/SortableChecklistItem';

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
          ? { ...sec, items: sec.items.map(item => item.id === itemId ? updatedItem : item) }
          : sec
      )
    );
  };

  const deleteItem = (itemId: string) => {
    setEditableSections(prev => 
      prev.map((sec, idx) => 
        idx === activeSection
          ? { ...sec, items: sec.items.filter(item => item.id !== itemId) }
          : sec
      )
    );
    toast({ title: "Item deleted successfully" });
  };

  const regenerateImage = async (item: ChecklistItem) => {
    toast({ 
      title: "Image generation requested", 
      description: "This feature will generate a new image based on the description." 
    });
  };

  const currentSection = editableSections[activeSection];
  const totalItems = editableSections.reduce((acc, sec) => acc + sec.items.length, 0);

  return (
    <div className="space-y-6">
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
            <ChecklistImageSelector
              onImageSelect={(imageUrl, key) => {
                const newItem: ChecklistItem = {
                  id: `item-${Date.now()}`,
                  text: newItemText.trim() || key.replace(/-/g, ' '),
                  completed: false,
                  imageUrls: [imageUrl],
                  imageDescription: `Reference image for ${key.replace(/-/g, ' ')}`
                };
                setEditableSections(prev => 
                  prev.map((sec, idx) => 
                    idx === activeSection 
                      ? { ...sec, items: [...sec.items, newItem] }
                      : sec
                  )
                );
                setNewItemText('');
                toast({ title: "Item with image added successfully" });
              }}
              currentImages={[]}
              trigger={
                <Button variant="outline" size="default">
                  <ImageIcon className="h-4 w-4 mr-2" />
                  Browse Library
                </Button>
              }
            />
            <Button onClick={addNewItem} disabled={!newItemText.trim()}>
              <Plus className="h-4 w-4 mr-2" />
              Add Text
            </Button>
          </div>
        </CardContent>
      </Card>

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
                  <SortableChecklistItem
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
