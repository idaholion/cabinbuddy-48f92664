import { useState, useEffect } from "react";
import { Plus, Users, UserPlus, Mail, Phone, Calendar, Edit, Trash2, Crown, Shield, User } from "lucide-react";
import { SearchInput } from "@/components/ui/search-input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { PhoneInput } from "@/components/ui/phone-input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { useFamilyGroups } from "@/hooks/useFamilyGroups";
import { useOrganization } from "@/hooks/useOrganization";
import { getInitials, formatNameForDisplay, parseFullName } from "@/lib/name-utils";

interface FamilyMember {
  id: string;
  name: string;
  firstName?: string;
  lastName?: string;
  displayName: string;
  email: string;
  phone: string;
  role: "lead" | "member";
  joinDate: string;
  lastActive: string;
  familyGroup: string;
}

export const FamilyGroups = () => {
  console.log("FamilyGroups component is loading correctly");
  const { toast } = useToast();
  const { organization } = useOrganization();
  const { familyGroups, loading } = useFamilyGroups();
  
  const [members, setMembers] = useState<FamilyMember[]>([]);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [newMember, setNewMember] = useState({
    name: "",
    email: "",
    phone: "",
    role: "member" as const,
    familyGroup: ""
  });
  const [searchQuery, setSearchQuery] = useState("");

  // Convert family groups data to members list
  useEffect(() => {
    const convertedMembers: FamilyMember[] = [];
    
    familyGroups.forEach(group => {
      // Add group lead as member
      if (group.lead_name) {
        const leadNameParts = parseFullName(group.lead_name);
        const displayName = formatNameForDisplay(group.lead_name);
        
        convertedMembers.push({
          id: `${group.id}-lead`,
          name: group.lead_name, // Keep for backward compatibility
          firstName: leadNameParts.firstName,
          lastName: leadNameParts.lastName,
          displayName: displayName,
          email: group.lead_email || '',
          phone: group.lead_phone || '',
          role: "lead",
          joinDate: group.created_at?.split('T')[0] || new Date().toISOString().split('T')[0],
          lastActive: group.updated_at?.split('T')[0] || new Date().toISOString().split('T')[0],
          familyGroup: group.name
        });
      }

      // Add host members
      if (group.host_members && Array.isArray(group.host_members)) {
        group.host_members.forEach((hostMember: any, index: number) => {
          if (hostMember.name && hostMember.name !== group.lead_name) {
            const memberNameParts = parseFullName(hostMember.name);
            const displayName = formatNameForDisplay(hostMember.name);
            
            convertedMembers.push({
              id: `${group.id}-host-${index}`,
              name: hostMember.name, // Keep for backward compatibility
              firstName: memberNameParts.firstName,
              lastName: memberNameParts.lastName,
              displayName: displayName,
              email: hostMember.email || '',
              phone: hostMember.phone || '',
              role: "member",
              joinDate: group.created_at?.split('T')[0] || new Date().toISOString().split('T')[0],
              lastActive: group.updated_at?.split('T')[0] || new Date().toISOString().split('T')[0],
              familyGroup: group.name
            });
          }
        });
      }
    });

    setMembers(convertedMembers);
  }, [familyGroups]);

  const getRoleIcon = (role: string) => {
    switch (role) {
      case "lead":
        return Crown;
      default:
        return User;
    }
  };

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case "lead":
        return "default";
      default:
        return "outline";
    }
  };

  const handleAddMember = () => {
    if (!newMember.name || !newMember.email || !newMember.familyGroup) {
      toast({
        title: "Error",
        description: "Please fill in all required fields.",
        variant: "destructive"
      });
      return;
    }
    
    // This would need to be implemented to actually add to database
    toast({
      title: "Feature Coming Soon",
      description: "Adding members directly is coming soon. Please use Family Group Setup page.",
    });
    
    setIsAddDialogOpen(false);
  };

  const handleRemoveMember = (memberId: string) => {
    const member = members.find(m => m.id === memberId);
    if (member?.role === "lead") {
      toast({
        title: "Cannot Remove Lead",
        description: "The family group lead cannot be removed directly. Please use Family Group Setup page.",
        variant: "destructive"
      });
      return;
    }
    
    toast({
      title: "Feature Coming Soon",
      description: "Removing members directly is coming soon. Please use Family Group Setup page.",
    });
  };

  const filteredMembers = members.filter(member =>
    member.displayName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    member.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    member.familyGroup.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (member.firstName && member.firstName.toLowerCase().includes(searchQuery.toLowerCase())) ||
    (member.lastName && member.lastName.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  if (loading) {
    return <div>Loading family groups...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Family Groups</h2>
          <p className="text-gray-600">Manage family members and their property access</p>
        </div>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <UserPlus className="h-4 w-4 mr-2" />
              Add Member
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Family Member</DialogTitle>
              <DialogDescription>
                Invite a new family member to access your properties
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="name">Full Name *</Label>
                <Input 
                  id="name" 
                  value={newMember.name} 
                  onChange={e => setNewMember({
                    ...newMember,
                    name: e.target.value
                  })} 
                  placeholder="Enter full name" 
                />
              </div>
              <div>
                <Label htmlFor="email">Email Address *</Label>
                <Input 
                  id="email" 
                  type="email" 
                  value={newMember.email} 
                  onChange={e => setNewMember({
                    ...newMember,
                    email: e.target.value
                  })} 
                  placeholder="Enter email address" 
                />
              </div>
              <div>
                <Label htmlFor="phone">Phone Number</Label>
                <PhoneInput 
                  id="phone" 
                  value={newMember.phone} 
                  onChange={(formatted) => setNewMember({
                    ...newMember,
                    phone: formatted
                  })} 
                />
              </div>
              <div>
                <Label htmlFor="familyGroup">Family Group *</Label>
                <Select 
                  value={newMember.familyGroup} 
                  onValueChange={(value) => setNewMember({
                    ...newMember,
                    familyGroup: value
                  })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select family group" />
                  </SelectTrigger>
                  <SelectContent>
                    {familyGroups.map((group) => (
                      <SelectItem key={group.id} value={group.name}>
                        {group.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex justify-end space-x-2">
                <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleAddMember}>
                  Add Member
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="flex items-center p-6">
            <Users className="h-8 w-8 text-blue-600 mr-4" />
            <div>
              <p className="text-2xl font-bold">{familyGroups.length}</p>
              <p className="text-gray-600 text-sm">Family Groups</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center p-6">
            <User className="h-8 w-8 text-green-600 mr-4" />
            <div>
              <p className="text-2xl font-bold">{members.length}</p>
              <p className="text-gray-600 text-sm">Total Members</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center p-6">
            <Crown className="h-8 w-8 text-yellow-600 mr-4" />
            <div>
              <p className="text-2xl font-bold">{members.filter(m => m.role === 'lead').length}</p>
              <p className="text-gray-600 text-sm">Group Leads</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Members List */}
      <Card>
        <CardHeader>
          <CardTitle>Family Group Members</CardTitle>
          <CardDescription>Manage access and permissions for family members</CardDescription>
          <div className="mt-4">
            <SearchInput
              placeholder="Search family members..."
              onSearch={setSearchQuery}
              className="w-full"
            />
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {filteredMembers.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                {members.length === 0 ? (
                  "No family group members found. Set up your family groups first."
                ) : (
                  "No members match your search criteria."
                )}
              </div>
            ) : (
              filteredMembers.map(member => {
                const RoleIcon = getRoleIcon(member.role);
                return (
                  <div key={member.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors">
                    <div className="flex items-center space-x-4">
                      <Avatar className="h-12 w-12">
                        <AvatarFallback className="bg-blue-100 text-blue-600">
                          {getInitials(member.displayName)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <div className="flex items-center space-x-2">
                          <h3 className="font-semibold text-gray-900">{member.displayName}</h3>
                          <Badge variant={getRoleBadgeVariant(member.role)}>
                            <RoleIcon className="h-3 w-3 mr-1" />
                            {member.role === 'lead' ? 'Group Lead' : 'Member'}
                          </Badge>
                        </div>
                        <div className="flex items-center space-x-4 text-sm text-gray-500 mt-1">
                          <div className="flex items-center">
                            <Mail className="h-3 w-3 mr-1" />
                            {member.email || 'No email'}
                          </div>
                          {member.phone && (
                            <div className="flex items-center">
                              <Phone className="h-3 w-3 mr-1" />
                              {member.phone}
                            </div>
                          )}
                          <div className="flex items-center">
                            <Calendar className="h-3 w-3 mr-1" />
                            Joined {new Date(member.joinDate).toLocaleDateString()}
                          </div>
                        </div>
                        <div className="flex flex-wrap gap-1 mt-2">
                          <Badge variant="outline" className="text-xs">
                            {member.familyGroup}
                          </Badge>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Button variant="outline" size="sm">
                        <Edit className="h-4 w-4" />
                      </Button>
                      {member.role !== "lead" && (
                        <Button variant="outline" size="sm" onClick={() => handleRemoveMember(member.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

// Export as default as well for compatibility
export default FamilyGroups;