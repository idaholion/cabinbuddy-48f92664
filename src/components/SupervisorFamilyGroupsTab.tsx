import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PhoneInput } from '@/components/ui/phone-input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ColorPicker } from '@/components/ui/color-picker';
import { Plus, Users, Palette, AlertTriangle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { unformatPhoneNumber } from '@/lib/phone-utils';
import { FamilyGroupBulkOperations } from '@/components/FamilyGroupBulkOperations';
import { GroupMember } from '@/types/group-member';

interface FamilyGroup {
  id: string;
  name: string;
  lead_name?: string;
  lead_phone?: string;
  lead_email?: string;
  host_members?: GroupMember[];
  color?: string;
}

interface SupervisorFamilyGroupsTabProps {
  organizationId: string;
}

export const SupervisorFamilyGroupsTab = ({ organizationId }: SupervisorFamilyGroupsTabProps) => {
  const { toast } = useToast();
  
  const [familyGroups, setFamilyGroups] = useState<FamilyGroup[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState("");
  const [leadName, setLeadName] = useState("");
  const [leadPhone, setLeadPhone] = useState("");
  const [leadEmail, setLeadEmail] = useState("");
  const [groupMembers, setGroupMembers] = useState<GroupMember[]>([
    { firstName: "", lastName: "", name: "", phone: "", email: "", canHost: false },
    { firstName: "", lastName: "", name: "", phone: "", email: "", canHost: false },
    { firstName: "", lastName: "", name: "", phone: "", email: "", canHost: false }
  ]);
  const [newGroupName, setNewGroupName] = useState("");
  const [groupColor, setGroupColor] = useState("");
  const [availableColors, setAvailableColors] = useState<string[]>([]);

  const fetchFamilyGroups = async () => {
    if (!organizationId) return;

    try {
      const { data, error } = await supabase
        .from('family_groups')
        .select('*')
        .eq('organization_id', organizationId)
        .order('name');

      if (error) throw error;
      
      const parsedData = (data || []).map(group => ({
        ...group,
        host_members: Array.isArray(group.host_members) ? (group.host_members as unknown as GroupMember[]) : []
      }));
      
      setFamilyGroups(parsedData);
    } catch (error) {
      console.error('Error fetching family groups:', error);
    }
  };

  const fetchAvailableColors = async (currentGroupId?: string) => {
    if (!organizationId) return;
    
    try {
      const { data, error } = await supabase.rpc('get_available_colors', {
        p_organization_id: organizationId,
        p_current_group_id: currentGroupId || null
      });
      
      if (error) throw error;
      setAvailableColors(data || []);
    } catch (error) {
      console.error('Error fetching available colors:', error);
    }
  };

  useEffect(() => {
    fetchFamilyGroups();
    fetchAvailableColors();
  }, [organizationId]);

  useEffect(() => {
    if (selectedGroup) {
      const group = familyGroups.find(g => g.name === selectedGroup);
      if (group) {
        setLeadName(group.lead_name || "");
        setLeadPhone(group.lead_phone || "");
        setLeadEmail(group.lead_email || "");
        setGroupColor(group.color || "");
        
        const existingMembers = group.host_members || [];
        const emptyMembers = Array(Math.max(3 - existingMembers.length, 0)).fill({ firstName: "", lastName: "", name: "", phone: "", email: "", canHost: false });
        setGroupMembers([...existingMembers, ...emptyMembers]);
        
        fetchAvailableColors(group.id);
      }
    } else {
      setLeadName("");
      setLeadPhone("");
      setLeadEmail("");
      setGroupColor("");
      setGroupMembers([
        { firstName: "", lastName: "", name: "", phone: "", email: "", canHost: false },
        { firstName: "", lastName: "", name: "", phone: "", email: "", canHost: false },
        { firstName: "", lastName: "", name: "", phone: "", email: "", canHost: false }
      ]);
      fetchAvailableColors();
    }
  }, [selectedGroup, familyGroups]);

  const createFamilyGroup = async () => {
    if (!organizationId || !newGroupName.trim()) {
      toast({
        title: "Error",
        description: "Please enter a family group name.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from('family_groups')
        .insert({
          organization_id: organizationId,
          name: newGroupName.trim(),
        });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Family group created successfully!",
      });

      setNewGroupName("");
      fetchFamilyGroups();
    } catch (error) {
      console.error('Error creating family group:', error);
      toast({
        title: "Error",
        description: "Failed to create family group.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const updateFamilyGroup = async () => {
    if (!selectedGroup) {
      toast({
        title: "Error",
        description: "Please select a family group.",
        variant: "destructive",
      });
      return;
    }

    const group = familyGroups.find(g => g.name === selectedGroup);
    if (!group) return;

    const groupMembersList = groupMembers.filter(member => member.name.trim() !== '').map(member => ({
      name: member.name.trim(),
      phone: member.phone ? unformatPhoneNumber(member.phone) : '',
      email: member.email.trim(),
      canHost: member.canHost || false
    }));
    
    setLoading(true);
    try {
      const { error } = await supabase
        .from('family_groups')
        .update({
          lead_name: leadName || undefined,
          lead_phone: leadPhone ? unformatPhoneNumber(leadPhone) : undefined,
          lead_email: leadEmail || undefined,
          host_members: groupMembersList.length > 0 ? groupMembersList : undefined,
          color: groupColor || undefined,
        })
        .eq('id', group.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Family group updated successfully!",
      });

      fetchFamilyGroups();
      fetchAvailableColors();
    } catch (error) {
      console.error('Error updating family group:', error);
      toast({
        title: "Error",
        description: "Failed to update family group.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleGroupMemberChange = (index: number, field: keyof GroupMember, value: string | boolean) => {
    const newGroupMembers = [...groupMembers];
    newGroupMembers[index] = { ...newGroupMembers[index], [field]: value };
    setGroupMembers(newGroupMembers);
  };

  const addGroupMember = () => {
    setGroupMembers([...groupMembers, { firstName: "", lastName: "", name: "", phone: "", email: "", canHost: false }]);
  };

  return (
    <div className="space-y-6">
      {/* Create New Group */}
      <Card>
        <CardHeader>
          <CardTitle>Create New Family Group</CardTitle>
          <CardDescription className="text-base">Add a new family group to this organization</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <Input
              placeholder="Enter family group name"
              value={newGroupName}
              onChange={(e) => setNewGroupName(e.target.value)}
              className="text-base placeholder:text-base"
            />
            <Button onClick={createFamilyGroup} disabled={loading} className="text-base">
              <Plus className="h-4 w-4 mr-2" />
              Create Group
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Edit Existing Group */}
      <Card>
        <CardHeader>
          <CardTitle>Edit Family Group</CardTitle>
          <CardDescription className="text-base">Update details for an existing family group</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Family Group Selection */}
          <div className="space-y-2">
            <Label htmlFor="groupName" className="text-base">Select Family Group</Label>
            <Select value={selectedGroup} onValueChange={setSelectedGroup}>
              <SelectTrigger className="text-base">
                <SelectValue placeholder="Select a family group" />
              </SelectTrigger>
              <SelectContent>
                {familyGroups.length > 0 ? (
                  familyGroups.map((group) => (
                    <SelectItem key={group.id} value={group.name} className="text-base">
                      {group.name}
                    </SelectItem>
                  ))
                ) : (
                  <SelectItem value="no-groups" disabled className="text-base">
                    No family groups found
                  </SelectItem>
                )}
              </SelectContent>
            </Select>
          </div>

          {selectedGroup && (
            <>
              {/* Family Group Lead Section */}
              <div className="space-y-2">
                <h3 className="text-lg font-semibold">Family Group Lead</h3>
                <div className="grid gap-2 md:grid-cols-3">
                  <div className="space-y-1">
                    <Label htmlFor="leadName" className="text-base">Name</Label>
                    <Input 
                      id="leadName" 
                      placeholder="Lead's full name"
                      value={leadName}
                      onChange={(e) => setLeadName(e.target.value)}
                      className="text-base placeholder:text-base"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="leadPhone" className="text-base">Phone Number</Label>
                    <PhoneInput 
                      id="leadPhone" 
                      value={leadPhone}
                      onChange={(formatted) => setLeadPhone(formatted)}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="leadEmail" className="text-base">Email Address</Label>
                    <Input 
                      id="leadEmail" 
                      type="email" 
                      placeholder="lead@example.com"
                      value={leadEmail}
                      onChange={(e) => setLeadEmail(e.target.value)}
                      className="text-base placeholder:text-base"
                    />
                  </div>
                </div>
              </div>

              {/* Color Selection */}
              <div className="space-y-2">
                <h3 className="text-lg font-semibold">Group Color</h3>
                <div className="space-y-1">
                  <Label htmlFor="groupColor" className="text-base">Calendar Color</Label>
                  <ColorPicker
                    value={groupColor}
                    onChange={setGroupColor}
                    availableColors={availableColors}
                  />
                  <p className="text-base text-muted-foreground">
                    This color will be used to identify this family group's reservations on the calendar.
                  </p>
                </div>
              </div>

              {/* Group Members Section */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Additional Group Members</h3>
                {groupMembers.map((member, index) => (
                  <div key={index} className="p-3 border rounded-lg space-y-3">
                    <div className="text-base font-medium text-muted-foreground">Group Member {index + 1}</div>
                    <div className="grid gap-2 md:grid-cols-3">
                      <div className="space-y-1">
                        <Label htmlFor={`memberName${index}`} className="text-base">Name</Label>
                        <Input 
                          id={`memberName${index}`}
                          placeholder="Full name"
                          value={member.name}
                          onChange={(e) => handleGroupMemberChange(index, 'name', e.target.value)}
                          className="text-base placeholder:text-base"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label htmlFor={`memberPhone${index}`} className="text-base">Phone Number</Label>
                        <PhoneInput 
                          id={`memberPhone${index}`}
                          value={member.phone}
                          onChange={(formatted) => handleGroupMemberChange(index, 'phone', formatted)}
                        />
                      </div>
                      <div className="space-y-1">
                        <Label htmlFor={`memberEmail${index}`} className="text-base">Email Address</Label>
                        <Input 
                          id={`memberEmail${index}`}
                          type="email"
                          placeholder="email@example.com"
                          value={member.email}
                          onChange={(e) => handleGroupMemberChange(index, 'email', e.target.value)}
                          className="text-base placeholder:text-base"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label htmlFor={`canHost${index}`} className="text-base">Can Host</Label>
                        <div className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            id={`canHost${index}`}
                            checked={member.canHost || false}
                            onChange={(e) => handleGroupMemberChange(index, 'canHost', e.target.checked)}
                            className="rounded border-input"
                          />
                          <span className="text-sm text-muted-foreground">
                            This member can make reservations
                          </span>
                        </div>
                  </div>
                </div>
              </div>
            ))}
                
                <div className="flex justify-center pt-2">
                  <Button variant="outline" onClick={addGroupMember} className="text-base">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Group Member
                  </Button>
                </div>
              </div>

              <Button onClick={updateFamilyGroup} disabled={loading} className="w-full text-base">
                {loading ? "Saving..." : "Update Family Group"}
              </Button>
            </>
          )}
        </CardContent>
      </Card>

      {/* Existing Groups Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Existing Family Groups
          </CardTitle>
          <CardDescription className="text-base">
            Overview of all family groups in this organization
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            {familyGroups.map((group) => (
              <div key={group.id} className="p-4 border rounded-lg space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium text-base">{group.name}</h4>
                  {group.color && (
                    <div 
                      className="w-4 h-4 rounded-full border"
                      style={{ backgroundColor: group.color }}
                    />
                  )}
                </div>
                {group.lead_name && (
                  <p className="text-base text-muted-foreground">Lead: {group.lead_name}</p>
                )}
                <p className="text-base text-muted-foreground">
                  {(group.host_members?.length || 0) + 1} members
                </p>
              </div>
            ))}
          </div>
          {familyGroups.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="text-base">No family groups found for this organization</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
