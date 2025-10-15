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
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/hooks/useOrganization";
import { useReservations } from "@/hooks/useReservations";
import { parseDateOnly } from "@/lib/date-utils";
const CheckIn = () => {
  const { toast } = useToast();
  const { organization } = useOrganization();
  const { reservations, loading: reservationsLoading } = useReservations();
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
  const [loading, setLoading] = useState(true);
  const { isAdmin } = useOrgAdmin();
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [editingLabel, setEditingLabel] = useState("");

  // Get current user's family group from localStorage
  const getCurrentUserReservation = () => {
    const familyData = localStorage.getItem('familySetupData');
    console.log('📋 [CHECK-IN] Family data from localStorage:', familyData);
    
    if (!familyData) {
      console.log('❌ [CHECK-IN] No family data in localStorage');
      return null;
    }
    
    const { familyName } = JSON.parse(familyData);
    console.log('📋 [CHECK-IN] Looking for reservations for family:', familyName);
    console.log('📋 [CHECK-IN] Total reservations available:', reservations.length);
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    console.log('📋 [CHECK-IN] Today\'s date:', today.toISOString().split('T')[0]);
    
    const matchingReservation = reservations.find(res => {
      const startDate = parseDateOnly(res.start_date);
      const endDate = parseDateOnly(res.end_date);
      
      const familyMatch = res.family_group === familyName;
      const dateInRange = startDate <= today && endDate >= today;
      
      console.log('📋 [CHECK-IN] Checking reservation:', {
        family: res.family_group,
        startDate: startDate.toISOString().split('T')[0],
        endDate: endDate.toISOString().split('T')[0],
        familyMatch,
        dateInRange,
        matches: familyMatch && dateInRange
      });
      
      return familyMatch && dateInRange;
    });
    
    if (!matchingReservation) {
      console.log('❌ [CHECK-IN] No matching reservation found!');
    } else {
      console.log('✅ [CHECK-IN] Found current reservation:', matchingReservation);
    }
    
    return matchingReservation;
  };

  const currentReservation = getCurrentUserReservation();

  // Load checklist from database on mount
  useEffect(() => {
    const loadChecklist = async () => {
      console.log('🟢 [LOAD] Loading checklist for org:', organization?.id);
      if (!organization?.id) {
        console.log('🟢 [LOAD] No organization, skipping');
        setLoading(false);
        return;
      }
      try {
        const { data, error } = await supabase
          .from('custom_checklists')
          .select('*')
          .eq('organization_id', organization.id)
          .eq('checklist_type', 'arrival')
          .single();

        console.log('Load response:', { data, error });

        if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
          console.error('Error loading checklist:', error);
          throw error;
        }

        if (data?.items && Array.isArray(data.items)) {
          console.log('Setting items from DB:', data.items);
          setChecklistItems(data.items as any[]);
        }
      } catch (error) {
        console.error('Failed to load checklist:', error);
        toast({
          title: "Error",
          description: "Failed to load checklist from database",
          variant: "destructive"
        });
      } finally {
        setLoading(false);
      }
    };

    loadChecklist();
  }, [organization?.id]);

  // Load checked items from database based on current reservation
  useEffect(() => {
    const loadCheckedItems = async () => {
      if (!organization?.id || !currentReservation) return;

      try {
        // Check if checklist should be reset (one day after stay end date OR after checkout)
        const endDate = parseDateOnly(currentReservation.end_date);
        const resetDate = new Date(endDate);
        resetDate.setDate(resetDate.getDate() + 2); // One day after end date
        resetDate.setHours(0, 0, 0, 0);
        
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        if (today >= resetDate) {
          console.log('✅ [ARRIVAL-CHECKLIST] Resetting checklist (past reset date)');
          setCheckedItems({});
          return;
        }

        // Load the most recent arrival checkin session for this reservation
        const { data: session, error } = await supabase
          .from('checkin_sessions')
          .select('*')
          .eq('session_type', 'arrival')
          .eq('family_group', currentReservation.family_group)
          .gte('check_date', currentReservation.start_date)
          .lte('check_date', currentReservation.end_date)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (!error && session?.checklist_responses) {
          const responses = session.checklist_responses as any;
          if (responses.checkedItems) {
            console.log('✅ [ARRIVAL-CHECKLIST] Loaded from database:', responses.checkedItems);
            setCheckedItems(responses.checkedItems);
          }
          if (responses.notes) {
            setNotes(responses.notes);
          }
        }
      } catch (error) {
        console.error('❌ [ARRIVAL-CHECKLIST] Failed to load:', error);
      }
    };

    loadCheckedItems();
  }, [organization?.id, currentReservation?.id]);
  const handleCheckChange = (itemId: string, checked: boolean) => {
    setCheckedItems(prev => ({ ...prev, [itemId]: checked }));
  };

  // IMPORTANT: Save function for checklist persistence
  const saveChecklist = async (itemsToSave = checklistItems) => {
    console.log('🔵 [SAVE] Starting save operation', {
      itemCount: itemsToSave.length,
      orgId: organization?.id
    });

    if (!organization?.id) {
      console.error('❌ No organization ID');
      toast({
        title: "Error",
        description: "No organization selected. Please select an organization first.",
        variant: "destructive"
      });
      return;
    }

    try {
      console.log('🔵 Checking for existing record...');
      const { data: existing, error: existingError } = await supabase
        .from('custom_checklists')
        .select('id')
        .eq('organization_id', organization.id)
        .eq('checklist_type', 'arrival')
        .maybeSingle();

      console.log('🔵 Existing check result:', { existing, existingError });

      let result;
      if (existing) {
        console.log('🔵 Updating existing record:', existing.id);
        result = await supabase
          .from('custom_checklists')
          .update({ items: itemsToSave })
          .eq('id', existing.id)
          .select();
        console.log('🔵 Update result:', result);
      } else {
        console.log('🔵 Inserting new record');
        result = await supabase
          .from('custom_checklists')
          .insert({
            organization_id: organization.id,
            checklist_type: 'arrival',
            items: itemsToSave
          })
          .select();
        console.log('🔵 Insert result:', result);
      }

      if (result.error) {
        console.error('❌ Database error:', result.error);
        throw result.error;
      }

      console.log('✅ Save successful!');
      toast({
        title: "Checklist Saved",
        description: "Changes saved successfully.",
      });
    } catch (error: any) {
      console.error('❌ Save error:', error);
      toast({
        title: "Save Failed",
        description: error.message || "Failed to save checklist.",
        variant: "destructive"
      });
    }
  };

  const addNewItem = async () => {
    if (newItemLabel.trim()) {
      const newItem = {
        id: `custom_${Date.now()}`,
        label: newItemLabel.trim(),
        category: "arrival"
      };
      const updatedItems = [...checklistItems, newItem];
      setChecklistItems(updatedItems);
      setNewItemLabel("");
      await saveChecklist(updatedItems);
    }
  };

  const deleteItem = async (itemId: string) => {
    const updatedItems = checklistItems.filter(item => item.id !== itemId);
    setChecklistItems(updatedItems);
    await saveChecklist(updatedItems);
    toast({
      title: "Item Deleted",
      description: "Checklist item has been removed.",
    });
  };

  const startEditItem = (item: any) => {
    setEditingItemId(item.id);
    setEditingLabel(item.label);
  };

  const saveEditItem = async () => {
    if (editingLabel.trim() && editingItemId) {
      const updatedItems = checklistItems.map(item => 
        item.id === editingItemId 
          ? { ...item, label: editingLabel.trim() }
          : item
      );
      setChecklistItems(updatedItems);
      setEditingItemId(null);
      setEditingLabel("");
      await saveChecklist(updatedItems);
      toast({
        title: "Item Updated",
        description: "Checklist item has been updated.",
      });
    }
  };

  const cancelEdit = () => {
    setEditingItemId(null);
    setEditingLabel("");
  };

  const handleSubmit = async () => {
    const completedItems = Object.values(checkedItems).filter(Boolean).length;
    
    // Check if still loading
    if (reservationsLoading) {
      toast({
        title: "Please Wait",
        description: "Loading your reservation data...",
      });
      return;
    }
    
    if (!organization?.id || !currentReservation) {
      console.error('❌ [CHECK-IN] Missing data:', {
        hasOrganization: !!organization?.id,
        hasReservation: !!currentReservation,
        reservationsCount: reservations.length,
        isLoading: reservationsLoading
      });
      
      toast({
        title: "Error",
        description: "Unable to save check-in. Please ensure you have an active reservation.",
        variant: "destructive",
      });
      return;
    }

    try {
      // Save to database
      await supabase.from('checkin_sessions').insert({
        organization_id: organization.id,
        session_type: 'arrival',
        family_group: currentReservation.family_group,
        check_date: new Date().toISOString().split('T')[0],
        checklist_responses: {
          checkedItems,
          notes,
          completedItems,
          totalItems: checklistItems.length,
        },
        notes,
      });

      toast({
        title: "Check-in Completed",
        description: `${completedItems} of ${checklistItems.length} items completed.`,
      });
    } catch (error) {
      console.error('Failed to save check-in:', error);
      toast({
        title: "Error",
        description: "Failed to save check-in. Please try again.",
        variant: "destructive",
      });
    }
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
                <div className="flex justify-end">
                  <Button onClick={handleSubmit} className="bg-primary text-base">
                    Complete Check-In
                  </Button>
                </div>
                
                {isAdmin && (
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={async () => {
                        if (isEditing) {
                          await saveChecklist();
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