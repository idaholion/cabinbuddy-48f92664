import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Trash2, ListChecks, Save, ArrowLeft, Type, GripVertical } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { useCustomChecklists } from '@/hooks/useChecklistData';
import { useNavigate } from 'react-router-dom';

interface QuickChecklistCreatorProps {
  onBack: () => void;
}

export const QuickChecklistCreator: React.FC<QuickChecklistCreatorProps> = ({ onBack }) => {
  const navigate = useNavigate();
  const { saveChecklist } = useCustomChecklists();
  const [items, setItems] = useState<Array<{ id: string; text: string }>>([]);
  const [newItemText, setNewItemText] = useState('');
  const [pasteContent, setPasteContent] = useState('');
  const [checklistType, setChecklistType] = useState('');
  const [customTypeName, setCustomTypeName] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const addItem = () => {
    if (!newItemText.trim()) return;
    setItems(prev => [...prev, { id: `item-${Date.now()}`, text: newItemText.trim() }]);
    setNewItemText('');
  };

  const parseContent = () => {
    if (!pasteContent.trim()) return;
    const lines = pasteContent.split('\n').filter(line => line.trim());
    const newItems = lines.map((line, i) => ({
      id: `pasted-${Date.now()}-${i}`,
      text: line.trim().replace(/^[-•*]\s*/, '')
    }));
    setItems(prev => [...prev, ...newItems]);
    setPasteContent('');
    toast({ title: `${newItems.length} items added` });
  };

  const removeItem = (id: string) => {
    setItems(prev => prev.filter(item => item.id !== id));
  };

  const handleSave = async () => {
    if (items.length === 0) {
      toast({ title: "Add some items first", variant: "destructive" });
      return;
    }
    const typeToSave = checklistType === 'custom' ? customTypeName.trim() : checklistType;
    if (!typeToSave) {
      toast({ title: "Select a checklist type", variant: "destructive" });
      return;
    }

    setIsSaving(true);
    try {
      const sections = [{
        title: `${typeToSave} Checklist`,
        items: items.map(item => ({ id: item.id, text: item.text, completed: false }))
      }];
      await saveChecklist(typeToSave, sections, []);
      toast({ title: "Checklist saved!", description: `Saved as "${typeToSave}" with ${items.length} items.` });
      navigate('/seasonal-checklists');
    } catch {
      toast({ title: "Error saving checklist", variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="outline" size="sm" onClick={onBack}>
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back
        </Button>
        <div>
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <ListChecks className="h-5 w-5 text-emerald-600" />
            Quick Checklist
          </h2>
          <p className="text-sm text-muted-foreground">Text only — type or paste your items</p>
        </div>
      </div>

      {/* Paste section */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Type className="h-4 w-4" />
            Paste a List
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Textarea
            value={pasteContent}
            onChange={(e) => setPasteContent(e.target.value)}
            placeholder="Paste your checklist here (one item per line)..."
            className="min-h-[100px]"
          />
          <Button onClick={parseContent} disabled={!pasteContent.trim()} size="sm">
            <Plus className="h-4 w-4 mr-1" />
            Add All Lines
          </Button>
        </CardContent>
      </Card>

      {/* Add one at a time */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Add Items</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex gap-2">
            <Input
              value={newItemText}
              onChange={(e) => setNewItemText(e.target.value)}
              placeholder="Type a checklist item..."
              onKeyDown={(e) => e.key === 'Enter' && addItem()}
            />
            <Button onClick={addItem} disabled={!newItemText.trim()}>
              <Plus className="h-4 w-4 mr-1" />
              Add
            </Button>
          </div>

          {items.length > 0 && (
            <div className="space-y-2 mt-4">
              <p className="text-sm font-medium">{items.length} items</p>
              {items.map((item, index) => (
                <div key={item.id} className="flex items-center gap-2 p-2.5 border rounded-lg bg-background">
                  <span className="text-xs text-muted-foreground w-5 text-right">{index + 1}.</span>
                  <p className="text-sm flex-1">{item.text}</p>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-6 w-6 p-0 text-destructive"
                    onClick={() => removeItem(item.id)}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Save */}
      {items.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Save Checklist</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Select value={checklistType} onValueChange={setChecklistType}>
              <SelectTrigger>
                <SelectValue placeholder="Select checklist type..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="opening">Opening Checklist</SelectItem>
                <SelectItem value="checkout">Departure (Post-Stay Cleanup)</SelectItem>
                <SelectItem value="closing">Closing (End of Season)</SelectItem>
                <SelectItem value="seasonal">Seasonal Tasks</SelectItem>
                <SelectItem value="maintenance">Maintenance</SelectItem>
                <SelectItem value="arrival">Arrival Checklist</SelectItem>
                <SelectItem value="daily">Daily Tasks</SelectItem>
                <SelectItem value="custom">Custom Type...</SelectItem>
              </SelectContent>
            </Select>
            {checklistType === 'custom' && (
              <Input
                value={customTypeName}
                onChange={(e) => setCustomTypeName(e.target.value)}
                placeholder="Enter custom type name..."
              />
            )}
            <Button onClick={handleSave} disabled={isSaving} className="w-full">
              <Save className="h-4 w-4 mr-2" />
              Save Checklist ({items.length} items)
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
