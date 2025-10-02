import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { CheckCircle, Clock, AlertTriangle, Plus, Edit3, Trash2 } from "lucide-react";
import { Link } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { PageHeader } from "@/components/ui/page-header";
import { NavigationHeader } from "@/components/ui/navigation-header";
import { useOrgAdmin } from "@/hooks/useOrgAdmin";
const CheckIn = () => {
  const { toast } = useToast();
  const [checkedItems, setCheckedItems] = useState<Record<string, boolean>>({});
  const [notes, setNotes] = useState("");
  const [checklistItems, setChecklistItems] = useState([
    { id: "keys", label: "Picked up keys", category: "arrival" },
    { id: "walkthrough", label: "Completed property walkthrough", category: "arrival" },
    { id: "utilities", label: "Checked utilities (water, power, heat)", category: "arrival" },
    { id: "wifi", label: "Connected to WiFi", category: "arrival" },
    { id: "emergency", label: "Located emergency contacts and procedures", category: "arrival" },
    { id: "rules", label: "Reviewed cabin rules and policies", category: "arrival" },
  ]);
  const [isEditing, setIsEditing] = useState(false);
  const [newItemLabel, setNewItemLabel] = useState("");
  const { isAdmin } = useOrgAdmin();
  console.log('CheckIn component - isAdmin:', isAdmin);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [editingLabel, setEditingLabel] = useState("");

  // Load organization-specific checklist on mount
  useEffect(() => {
    const familyData = localStorage.getItem('familySetupData');
    console.log('Loading checklist - familyData:', familyData);
    
    // Use organization-specific key if available, otherwise use default key
    let key = 'checklist_default';
    if (familyData) {
      const { organizationCode } = JSON.parse(familyData);
      console.log('organizationCode:', organizationCode);
      key = `checklist_${organizationCode}`;
    }
    
    const savedChecklist = localStorage.getItem(key);
    console.log('Loaded checklist from key:', key, 'data:', savedChecklist);
    if (savedChecklist) {
      const parsed = JSON.parse(savedChecklist);
      console.log('Setting checklist items to:', parsed);
      setChecklistItems(parsed);
    }
  }, []);
  const handleCheckChange = (itemId: string, checked: boolean) => {
    setCheckedItems(prev => ({ ...prev, [itemId]: checked }));
  };

  const saveChecklist = (itemsToSave = checklistItems) => {
    console.log('saveChecklist called with:', itemsToSave);
    const familyData = localStorage.getItem('familySetupData');
    console.log('familyData:', familyData);
    
    // Use organization-specific key if available, otherwise use default key
    let key = 'checklist_default';
    if (familyData) {
      const { organizationCode } = JSON.parse(familyData);
      console.log('organizationCode:', organizationCode);
      key = `checklist_${organizationCode}`;
    }
    
    console.log('Saving to localStorage key:', key);
    localStorage.setItem(key, JSON.stringify(itemsToSave));
    const saved = localStorage.getItem(key);
    console.log('Verified saved data:', saved);
    toast({
      title: "Checklist Saved",
      description: "Checklist has been saved.",
    });
  };

  const addNewItem = () => {
    console.log('addNewItem called - newItemLabel:', newItemLabel);
    if (newItemLabel.trim()) {
      const newItem = {
        id: `custom_${Date.now()}`,
        label: newItemLabel.trim(),
        category: "arrival"
      };
      const updatedItems = [...checklistItems, newItem];
      console.log('Adding new item, updated items:', updatedItems);
      setChecklistItems(updatedItems);
      setNewItemLabel("");
      saveChecklist(updatedItems);
    }
  };

  const deleteItem = (itemId: string) => {
    const updatedItems = checklistItems.filter(item => item.id !== itemId);
    setChecklistItems(updatedItems);
    saveChecklist(updatedItems);
    toast({
      title: "Item Deleted",
      description: "Checklist item has been removed.",
    });
  };

  const startEditItem = (item: any) => {
    setEditingItemId(item.id);
    setEditingLabel(item.label);
  };

  const saveEditItem = () => {
    console.log('saveEditItem called - editingLabel:', editingLabel, 'editingItemId:', editingItemId);
    if (editingLabel.trim() && editingItemId) {
      const updatedItems = checklistItems.map(item => 
        item.id === editingItemId 
          ? { ...item, label: editingLabel.trim() }
          : item
      );
      console.log('Updated items:', updatedItems);
      setChecklistItems(updatedItems);
      setEditingItemId(null);
      setEditingLabel("");
      saveChecklist(updatedItems);
      toast({
        title: "Item Updated",
        description: "Checklist item has been updated.",
      });
    } else {
      console.log('saveEditItem validation failed');
    }
  };

  const cancelEdit = () => {
    setEditingItemId(null);
    setEditingLabel("");
  };

  const handleSubmit = () => {
    const completedItems = Object.values(checkedItems).filter(Boolean).length;
    
    // Save notes to localStorage for organization
    const familyData = localStorage.getItem('familySetupData');
    if (familyData) {
      const { organizationCode } = JSON.parse(familyData);
      const checkInData = {
        notes,
        checkedItems,
        timestamp: new Date().toISOString(),
        completedItems
      };
      localStorage.setItem(`arrival_checkin_${organizationCode}`, JSON.stringify(checkInData));
    }
    
    toast({
      title: "Check-in Completed",
      description: `${completedItems} of ${checklistItems.length} items completed.`,
    });
  };

  return (
    <div className="min-h-screen bg-cover bg-center bg-no-repeat pt-[30px] px-4" style={{backgroundImage: 'url(/lovable-uploads/45c3083f-46c5-4e30-a2f0-31a24ab454f4.png)'}}>
      <div className="max-w-4xl mx-auto">
        <div className="mb-4 md:mb-8">
          <h1 className="text-4xl md:text-6xl mb-2 md:mb-4 font-kaushan text-primary drop-shadow-lg text-center flex items-center justify-center">
            <CheckCircle className="h-6 w-6 md:h-10 md:w-10 mr-2 md:mr-3" />
            Arrival Check-In
          </h1>
          <div className="relative flex items-center justify-center">
            <p className="text-lg md:text-2xl text-primary text-center font-medium">Complete your arrival checklist</p>
            <div className="absolute left-0">
              <NavigationHeader backLabel="Home" className="mb-0 text-base" />
            </div>
          </div>
        </div>

        <div className="grid gap-6">
          <Card className="bg-card/95">
            <CardHeader>
              <CardTitle className="text-2xl">Arrival Checklist</CardTitle>
              <CardDescription className="text-base">Please complete all items to finalize your check-in</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {checklistItems.map((item) => (
                <div key={item.id} className="flex items-center space-x-3 group">
                  <Checkbox
                    id={item.id}
                    checked={checkedItems[item.id] || false}
                    onCheckedChange={(checked) => handleCheckChange(item.id, checked as boolean)}
                  />
                  {editingItemId === item.id ? (
                    <div className="flex items-center space-x-2 flex-1">
                       <Input
                        value={editingLabel}
                        onChange={(e) => setEditingLabel(e.target.value)}
                        onKeyPress={(e) => {
                          if (e.key === 'Enter') saveEditItem();
                          if (e.key === 'Escape') cancelEdit();
                        }}
                        className="flex-1 text-base placeholder:text-base"
                        autoFocus
                      />
                      <Button onClick={saveEditItem} size="sm" variant="outline" className="text-base">
                        Save
                      </Button>
                      <Button onClick={cancelEdit} size="sm" variant="outline" className="text-base">
                        Cancel
                      </Button>
                    </div>
                  ) : (
                    <>
                      <label htmlFor={item.id} className="text-base font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 flex-1">
                        {item.label}
                      </label>
                      {isAdmin && isEditing && (
                        <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button 
                            onClick={() => startEditItem(item)} 
                            size="sm" 
                            variant="ghost"
                            className="h-6 w-6 p-0 text-base"
                          >
                            <Edit3 className="h-3 w-3" />
                          </Button>
                          <Button 
                            onClick={() => deleteItem(item.id)} 
                            size="sm" 
                            variant="ghost"
                            className="h-6 w-6 p-0 text-destructive hover:text-destructive text-base"
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      )}
                    </>
                  )}
                </div>
              ))}
              
              {isEditing && (
                <div className="flex items-center space-x-2 mt-4">
                  <Input
                    placeholder="Add new checklist item..."
                    value={newItemLabel}
                    onChange={(e) => setNewItemLabel(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && addNewItem()}
                    className="text-base placeholder:text-base"
                  />
                  <Button onClick={addNewItem} size="sm" className="text-base">
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              )}
              
              <div className="flex flex-col space-y-3 pt-4 border-t">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Clock className="h-5 w-5 text-muted-foreground" />
                    <span className="text-base text-muted-foreground">
                      Check-in time: {new Date().toLocaleString()}
                    </span>
                  </div>
                  <Button onClick={handleSubmit} className="bg-primary text-base">
                    Complete Check-In
                  </Button>
                </div>
                
                {isAdmin && (
                  <div className="flex items-center space-x-2">
                    <div className="text-xs text-muted-foreground">Admin: {String(isAdmin)}</div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        console.log('Done Editing button clicked! isEditing:', isEditing);
                        console.log('Current checklistItems:', checklistItems);
                        if (isEditing) {
                          console.log('Calling saveChecklist...');
                          saveChecklist();
                        }
                        setIsEditing(!isEditing);
                      }}
                      className="flex items-center gap-2 text-base"
                    >
                      <Edit3 className="h-4 w-4" />
                      {isEditing ? "Done Editing" : "Edit Checklist"}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setIsEditing(true)}
                      className="flex items-center gap-2 text-base"
                    >
                      <Plus className="h-4 w-4" />
                      Add Items
                    </Button>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card/95">
            <CardHeader>
              <CardTitle className="text-2xl">Additional Notes</CardTitle>
              <CardDescription className="text-base">Any issues or observations to report?</CardDescription>
            </CardHeader>
            <CardContent>
              <Textarea
                placeholder="Enter any notes, issues, or observations..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="min-h-[100px] text-base placeholder:text-base"
              />
            </CardContent>
          </Card>

        </div>
      </div>
    </div>
  );
};

export default CheckIn;