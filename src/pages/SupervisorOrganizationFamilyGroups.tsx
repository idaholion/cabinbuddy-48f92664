import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { PhoneInput } from "@/components/ui/phone-input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, ArrowLeft } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { unformatPhoneNumber } from "@/lib/phone-utils";

interface HostMember {
  name: string;
  phone: string;
  email: string;
}

interface FamilyGroup {
  id: string;
  name: string;
  lead_name?: string;
  lead_phone?: string;
  lead_email?: string;
  host_members?: HostMember[];
}

const SupervisorOrganizationFamilyGroups = () => {
  const { organizationId } = useParams<{ organizationId: string }>();
  const { toast } = useToast();
  const navigate = useNavigate();
  
  const [familyGroups, setFamilyGroups] = useState<FamilyGroup[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState("");
  const [leadName, setLeadName] = useState("");
  const [leadPhone, setLeadPhone] = useState("");
  const [leadEmail, setLeadEmail] = useState("");
  const [hostMembers, setHostMembers] = useState<HostMember[]>([
    { name: "", phone: "", email: "" },
    { name: "", phone: "", email: "" },
    { name: "", phone: "", email: "" }
  ]);
  const [newGroupName, setNewGroupName] = useState("");

  const fetchFamilyGroups = async () => {
    if (!organizationId) return;

    try {
      const { data, error } = await supabase
        .from('family_groups')
        .select('*')
        .eq('organization_id', organizationId)
        .order('name');

      if (error) throw error;
      
      // Parse the JSONB host_members field
      const parsedData = (data || []).map(group => ({
        ...group,
        host_members: Array.isArray(group.host_members) ? (group.host_members as unknown as HostMember[]) : []
      }));
      
      setFamilyGroups(parsedData);
    } catch (error) {
      console.error('Error fetching family groups:', error);
    }
  };

  useEffect(() => {
    fetchFamilyGroups();
  }, [organizationId]);

  useEffect(() => {
    if (selectedGroup) {
      const group = familyGroups.find(g => g.name === selectedGroup);
      if (group) {
        setLeadName(group.lead_name || "");
        setLeadPhone(group.lead_phone || "");
        setLeadEmail(group.lead_email || "");
        
        // Handle host members - ensure we have at least 3 empty slots
        const existingMembers = group.host_members || [];
        const emptyMembers = Array(Math.max(3 - existingMembers.length, 0)).fill({ name: "", phone: "", email: "" });
        setHostMembers([...existingMembers, ...emptyMembers]);
      }
    } else {
      setLeadName("");
      setLeadPhone("");
      setLeadEmail("");
      setHostMembers([
        { name: "", phone: "", email: "" },
        { name: "", phone: "", email: "" },
        { name: "", phone: "", email: "" }
      ]);
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

    const hostMembersList = hostMembers.filter(member => member.name.trim() !== '').map(member => ({
      name: member.name.trim(),
      phone: member.phone ? unformatPhoneNumber(member.phone) : '',
      email: member.email.trim()
    }));
    
    setLoading(true);
    try {
      const { error } = await supabase
        .from('family_groups')
        .update({
          lead_name: leadName || undefined,
          lead_phone: leadPhone ? unformatPhoneNumber(leadPhone) : undefined,
          lead_email: leadEmail || undefined,
          host_members: hostMembersList.length > 0 ? hostMembersList : undefined,
        })
        .eq('id', group.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Family group updated successfully!",
      });

      fetchFamilyGroups();
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

  const handleHostMemberChange = (index: number, field: keyof HostMember, value: string) => {
    const newHostMembers = [...hostMembers];
    newHostMembers[index] = { ...newHostMembers[index], [field]: value };
    setHostMembers(newHostMembers);
  };

  const addHostMember = () => {
    setHostMembers([...hostMembers, { name: "", phone: "", email: "" }]);
  };

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => navigate('/supervisor')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Organizations
          </Button>
        </div>

        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold">Family Groups Management</h1>
          <p className="text-muted-foreground">Manage family groups for this organization</p>
        </div>

        {/* Create New Group */}
        <Card>
          <CardHeader>
            <CardTitle>Create New Family Group</CardTitle>
            <CardDescription>Add a new family group to this organization</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2">
              <Input
                placeholder="Enter family group name"
                value={newGroupName}
                onChange={(e) => setNewGroupName(e.target.value)}
              />
              <Button onClick={createFamilyGroup} disabled={loading}>
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
            <CardDescription>Update details for an existing family group</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Family Group Selection */}
            <div className="space-y-2">
              <Label htmlFor="groupName">Select Family Group</Label>
              <Select value={selectedGroup} onValueChange={setSelectedGroup}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a family group" />
                </SelectTrigger>
                <SelectContent>
                  {familyGroups.length > 0 ? (
                    familyGroups.map((group) => (
                      <SelectItem key={group.id} value={group.name}>
                        {group.name}
                      </SelectItem>
                    ))
                  ) : (
                    <SelectItem value="no-groups" disabled>
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
                      <Label htmlFor="leadName">Name</Label>
                      <Input 
                        id="leadName" 
                        placeholder="Lead's full name"
                        value={leadName}
                        onChange={(e) => setLeadName(e.target.value)}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="leadPhone">Phone Number</Label>
                      <PhoneInput 
                        id="leadPhone" 
                        value={leadPhone}
                        onChange={(formatted) => setLeadPhone(formatted)}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="leadEmail">Email Address</Label>
                      <Input 
                        id="leadEmail" 
                        type="email" 
                        placeholder="lead@example.com"
                        value={leadEmail}
                        onChange={(e) => setLeadEmail(e.target.value)}
                      />
                    </div>
                  </div>
                </div>

                {/* Host Members Section */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">Additional Host Members</h3>
                  {hostMembers.map((member, index) => (
                    <div key={index} className="p-3 border rounded-lg space-y-3">
                      <div className="text-sm font-medium text-muted-foreground">Host Member {index + 1}</div>
                      <div className="grid gap-2 md:grid-cols-3">
                        <div className="space-y-1">
                          <Label htmlFor={`hostName${index}`}>Name</Label>
                          <Input 
                            id={`hostName${index}`}
                            placeholder="Full name"
                            value={member.name}
                            onChange={(e) => handleHostMemberChange(index, 'name', e.target.value)}
                          />
                        </div>
                        <div className="space-y-1">
                          <Label htmlFor={`hostPhone${index}`}>Phone Number</Label>
                          <PhoneInput 
                            id={`hostPhone${index}`}
                            value={member.phone}
                            onChange={(formatted) => handleHostMemberChange(index, 'phone', formatted)}
                          />
                        </div>
                        <div className="space-y-1">
                          <Label htmlFor={`hostEmail${index}`}>Email Address</Label>
                          <Input 
                            id={`hostEmail${index}`}
                            type="email"
                            placeholder="email@example.com"
                            value={member.email}
                            onChange={(e) => handleHostMemberChange(index, 'email', e.target.value)}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                  
                  <div className="flex justify-center pt-2">
                    <Button variant="outline" onClick={addHostMember}>
                      <Plus className="h-4 w-4 mr-2" />
                      Add Host Member
                    </Button>
                  </div>
                </div>

                <Button onClick={updateFamilyGroup} disabled={loading} className="w-full">
                  {loading ? "Saving..." : "Update Family Group"}
                </Button>
              </>
            )}
          </CardContent>
        </Card>

        {/* Existing Groups Overview */}
        <Card>
          <CardHeader>
            <CardTitle>Existing Family Groups ({familyGroups.length})</CardTitle>
            <CardDescription>Overview of all family groups in this organization</CardDescription>
          </CardHeader>
          <CardContent>
            {familyGroups.length > 0 ? (
              <div className="grid gap-3">
                {familyGroups.map((group) => (
                  <div key={group.id} className="p-3 border rounded-lg">
                    <div className="font-medium">{group.name}</div>
                    {group.lead_name && (
                      <div className="text-sm text-muted-foreground">
                        Lead: {group.lead_name}
                        {group.lead_email && ` (${group.lead_email})`}
                      </div>
                    )}
                    {group.host_members && group.host_members.length > 0 && (
                      <div className="text-sm text-muted-foreground">
                        Host Members: {group.host_members.filter(m => m.name.trim()).length}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground text-center py-4">
                No family groups found. Create one above to get started.
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default SupervisorOrganizationFamilyGroups;
