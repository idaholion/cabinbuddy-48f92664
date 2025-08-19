import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Edit3, Save, X, Plus, Trash2 } from 'lucide-react';
import { CabinRule } from '@/hooks/useCabinRules';

interface CabinRulesEditorProps {
  rule: CabinRule;
  onSave: (id: string, updates: Partial<CabinRule>) => Promise<any>;
  isEditing: boolean;
  onEditToggle: () => void;
}

export const CabinRulesEditor = ({ rule, onSave, isEditing, onEditToggle }: CabinRulesEditorProps) => {
  const [editedRule, setEditedRule] = useState<CabinRule>(rule);

  const handleSave = async () => {
    await onSave(rule.id, {
      section_title: editedRule.section_title,
      content: editedRule.content
    });
    onEditToggle();
  };

  const handleCancel = () => {
    setEditedRule(rule);
    onEditToggle();
  };

  const updateContent = (field: string, value: any) => {
    setEditedRule(prev => ({
      ...prev,
      content: {
        ...prev.content,
        [field]: value
      }
    }));
  };

  const addListItem = (listKey: string) => {
    const currentList = editedRule.content[listKey] || [];
    updateContent(listKey, [...currentList, '']);
  };

  const updateListItem = (listKey: string, index: number, value: string) => {
    const currentList = [...(editedRule.content[listKey] || [])];
    currentList[index] = value;
    updateContent(listKey, currentList);
  };

  const removeListItem = (listKey: string, index: number) => {
    const currentList = [...(editedRule.content[listKey] || [])];
    currentList.splice(index, 1);
    updateContent(listKey, currentList);
  };

  const renderEditableList = (listKey: string, items: string[]) => (
    <div className="space-y-2">
      {items.map((item, index) => (
        <div key={index} className="flex items-center gap-2">
          <Badge variant="destructive">{index + 1}</Badge>
          <Textarea
            value={item}
            onChange={(e) => updateListItem(listKey, index, e.target.value)}
            className="flex-1 text-body"
            rows={2}
          />
          <Button
            variant="ghost"
            size="sm"
            onClick={() => removeListItem(listKey, index)}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ))}
      <Button
        variant="outline"
        size="sm"
        onClick={() => addListItem(listKey)}
      >
        <Plus className="h-4 w-4 mr-2" />
        Add Item
      </Button>
    </div>
  );

  const renderViewList = (items: string[]) => (
    <div className="space-y-3">
      {items.map((item, index) => (
        <div key={index} className="flex items-start gap-3">
          <Badge variant="destructive" className="mt-1">{index + 1}</Badge>
          <p className="text-body">{item}</p>
        </div>
      ))}
    </div>
  );

  const renderContent = () => {
    if (!isEditing) {
      switch (rule.section_type) {
        case 'general':
        case 'guest_policy':
        case 'property_care':
        case 'cleaning_trash':
        case 'parking':
        case 'amenities':
          return renderViewList(rule.content.items || []);
        
        case 'checkin_checkout':
          return (
            <div className="space-y-3">
              <div>
                <h4 className="text-label">Check-in: {rule.content.checkin_time}</h4>
                <p className="text-body text-muted-foreground">{rule.content.checkin_note}</p>
              </div>
              <div>
                <h4 className="text-label">Check-out: {rule.content.checkout_time}</h4>
                <p className="text-body text-muted-foreground">{rule.content.checkout_note}</p>
              </div>
            </div>
          );
        
        case 'emergency':
          return (
            <div className="space-y-4">
              <div className="grid md:grid-cols-3 gap-4 text-center">
                <div>
                  <h4 className="text-label">Emergency Services</h4>
                  <p className="text-heading-secondary font-bold text-red-600">{rule.content.emergency_services}</p>
                </div>
                <div>
                  <h4 className="text-label">Property Manager</h4>
                  <p className="text-body">{rule.content.property_manager}</p>
                </div>
                <div>
                  <h4 className="text-label">Local Hospital</h4>
                  <p className="text-body">{rule.content.local_hospital}</p>
                </div>
              </div>
              <div className="text-center">
                <h4 className="text-label mb-2">Emergency Procedures</h4>
                {rule.content.procedures?.map((procedure: string, index: number) => (
                  <p key={index} className="text-body">{procedure}</p>
                ))}
              </div>
            </div>
          );
        
        case 'violation_policy':
          return (
            <div className="space-y-3">
              <p className="text-center text-body">{rule.content.policy}</p>
              <p className="text-center text-body text-muted-foreground">{rule.content.agreement}</p>
            </div>
          );
        
        default:
          return <div className="text-body">Content not configured for this section type.</div>;
      }
    }

    // Editing mode
    switch (editedRule.section_type) {
      case 'general':
      case 'guest_policy':
      case 'property_care':
      case 'cleaning_trash':
      case 'parking':
      case 'amenities':
        return renderEditableList('items', editedRule.content.items || []);
      
      case 'checkin_checkout':
        return (
          <div className="space-y-4">
            <div className="grid gap-2">
              <label className="text-label">Check-in Time:</label>
              <Input
                value={editedRule.content.checkin_time || ''}
                onChange={(e) => updateContent('checkin_time', e.target.value)}
                className="text-body"
              />
            </div>
            <div className="grid gap-2">
              <label className="text-label">Check-in Note:</label>
              <Textarea
                value={editedRule.content.checkin_note || ''}
                onChange={(e) => updateContent('checkin_note', e.target.value)}
                className="text-body"
              />
            </div>
            <div className="grid gap-2">
              <label className="text-label">Check-out Time:</label>
              <Input
                value={editedRule.content.checkout_time || ''}
                onChange={(e) => updateContent('checkout_time', e.target.value)}
                className="text-body"
              />
            </div>
            <div className="grid gap-2">
              <label className="text-label">Check-out Note:</label>
              <Textarea
                value={editedRule.content.checkout_note || ''}
                onChange={(e) => updateContent('checkout_note', e.target.value)}
                className="text-body"
              />
            </div>
          </div>
        );
      
      case 'emergency':
        return (
          <div className="space-y-4">
            <div className="grid md:grid-cols-3 gap-4">
              <div className="grid gap-2">
                <label className="text-label">Emergency Services:</label>
                <Input
                  value={editedRule.content.emergency_services || ''}
                  onChange={(e) => updateContent('emergency_services', e.target.value)}
                  className="text-body"
                />
              </div>
              <div className="grid gap-2">
                <label className="text-label">Property Manager:</label>
                <Input
                  value={editedRule.content.property_manager || ''}
                  onChange={(e) => updateContent('property_manager', e.target.value)}
                  className="text-body"
                />
              </div>
              <div className="grid gap-2">
                <label className="text-label">Local Hospital:</label>
                <Input
                  value={editedRule.content.local_hospital || ''}
                  onChange={(e) => updateContent('local_hospital', e.target.value)}
                  className="text-body"
                />
              </div>
            </div>
            <div className="grid gap-2">
              <label className="text-label">Emergency Procedures:</label>
              {renderEditableList('procedures', editedRule.content.procedures || [])}
            </div>
          </div>
        );
      
      case 'violation_policy':
        return (
          <div className="space-y-4">
            <div className="grid gap-2">
              <label className="text-label">Policy:</label>
              <Textarea
                value={editedRule.content.policy || ''}
                onChange={(e) => updateContent('policy', e.target.value)}
                className="text-body"
                rows={3}
              />
            </div>
            <div className="grid gap-2">
              <label className="text-label">Agreement:</label>
              <Textarea
                value={editedRule.content.agreement || ''}
                onChange={(e) => updateContent('agreement', e.target.value)}
                className="text-body"
                rows={2}
              />
            </div>
          </div>
        );
      
      default:
        return <div className="text-body">Editing not configured for this section type.</div>;
    }
  };

  return (
    <Card className="bg-card/95">
      <CardHeader>
        <div className="flex items-center justify-between">
          {isEditing ? (
            <Input
              value={editedRule.section_title}
              onChange={(e) => setEditedRule(prev => ({ ...prev, section_title: e.target.value }))}
              className="text-heading-tertiary"
            />
          ) : (
            <CardTitle className="text-heading-tertiary">{rule.section_title}</CardTitle>
          )}
          <div className="flex gap-2">
            {isEditing ? (
              <>
                <Button variant="outline" size="sm" onClick={handleSave}>
                  <Save className="h-4 w-4 mr-2" />
                  Save
                </Button>
                <Button variant="outline" size="sm" onClick={handleCancel}>
                  <X className="h-4 w-4 mr-2" />
                  Cancel
                </Button>
              </>
            ) : (
              <Button variant="outline" size="sm" onClick={onEditToggle}>
                <Edit3 className="h-4 w-4 mr-2" />
                Edit
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {renderContent()}
      </CardContent>
    </Card>
  );
};