import { useState } from "react";
import { Plus, Users, UserPlus, Mail, Phone, Calendar, Edit, Trash2, Crown, Shield, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
interface FamilyMember {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: "owner" | "admin" | "member";
  joinDate: string;
  lastActive: string;
  properties: string[];
}
export const FamilyGroups = () => {
  console.log("FamilyGroups component is loading correctly");
  const {
    toast
  } = useToast();
  const [members, setMembers] = useState<FamilyMember[]>([{
    id: "1",
    name: "John Smith",
    email: "john@example.com",
    phone: "(555) 123-4567",
    role: "owner",
    joinDate: "2023-01-15",
    lastActive: "2024-12-09",
    properties: ["Lake House", "City Apartment"]
  }, {
    id: "2",
    name: "Sarah Johnson",
    email: "sarah@example.com",
    phone: "(555) 234-5678",
    role: "admin",
    joinDate: "2023-03-20",
    lastActive: "2024-12-08",
    properties: ["Lake House", "Beach Condo"]
  }, {
    id: "3",
    name: "Mike Wilson",
    email: "mike@example.com",
    phone: "(555) 345-6789",
    role: "member",
    joinDate: "2023-06-10",
    lastActive: "2024-12-07",
    properties: ["Beach Condo"]
  }, {
    id: "4",
    name: "Lisa Chen",
    email: "lisa@example.com",
    phone: "(555) 456-7890",
    role: "member",
    joinDate: "2023-08-05",
    lastActive: "2024-12-06",
    properties: ["City Apartment"]
  }]);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [newMember, setNewMember] = useState({
    name: "",
    email: "",
    phone: "",
    role: "member" as const
  });
  const getRoleIcon = (role: string) => {
    switch (role) {
      case "owner":
        return Crown;
      case "admin":
        return Shield;
      default:
        return User;
    }
  };
  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case "owner":
        return "default";
      case "admin":
        return "secondary";
      default:
        return "outline";
    }
  };
  const handleAddMember = () => {
    if (!newMember.name || !newMember.email) {
      toast({
        title: "Error",
        description: "Please fill in all required fields.",
        variant: "destructive"
      });
      return;
    }
    const member: FamilyMember = {
      id: Date.now().toString(),
      ...newMember,
      joinDate: new Date().toISOString().split('T')[0],
      lastActive: new Date().toISOString().split('T')[0],
      properties: []
    };
    setMembers([...members, member]);
    setNewMember({
      name: "",
      email: "",
      phone: "",
      role: "member"
    });
    setIsAddDialogOpen(false);
    toast({
      title: "Member Added",
      description: `${member.name} has been added to the family group.`
    });
  };
  const handleRemoveMember = (memberId: string) => {
    const member = members.find(m => m.id === memberId);
    if (member?.role === "owner") {
      toast({
        title: "Cannot Remove Owner",
        description: "The property owner cannot be removed.",
        variant: "destructive"
      });
      return;
    }
    setMembers(members.filter(m => m.id !== memberId));
    toast({
      title: "Member Removed",
      description: "Family member has been removed from the group."
    });
  };
  return <div className="space-y-6">
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
                <Input id="name" value={newMember.name} onChange={e => setNewMember({
                ...newMember,
                name: e.target.value
              })} placeholder="Enter full name" />
              </div>
              <div>
                <Label htmlFor="email">Email Address *</Label>
                <Input id="email" type="email" value={newMember.email} onChange={e => setNewMember({
                ...newMember,
                email: e.target.value
              })} placeholder="Enter email address" />
              </div>
              <div>
                <Label htmlFor="phone">Phone Number</Label>
                <Input id="phone" value={newMember.phone} onChange={e => setNewMember({
                ...newMember,
                phone: e.target.value
              })} placeholder="Enter phone number" />
              </div>
              <div>
                <Label htmlFor="role">Role</Label>
                <Select value={newMember.role} onValueChange={(value: any) => setNewMember({
                ...newMember,
                role: value
              })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="member">Member</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
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
              <p className="text-2xl font-bold">{members.length}</p>
              <p className="text-gray-600 text-sm">Total Groups</p>
            </div>
          </CardContent>
        </Card>
        
        
      </div>

      {/* Members List */}
      <Card>
        <CardHeader>
          <CardTitle>Family Groups</CardTitle>
          <CardDescription>Manage access and permissions for family members</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {members.map(member => {
            const RoleIcon = getRoleIcon(member.role);
            return <div key={member.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors">
                  <div className="flex items-center space-x-4">
                    <Avatar className="h-12 w-12">
                      <AvatarFallback className="bg-blue-100 text-blue-600">
                        {member.name.split(' ').map(n => n[0]).join('')}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <div className="flex items-center space-x-2">
                        <h3 className="font-semibold text-gray-900">{member.name}</h3>
                        
                      </div>
                      <div className="flex items-center space-x-4 text-sm text-gray-500 mt-1">
                        <div className="flex items-center">
                          <Mail className="h-3 w-3 mr-1" />
                          {member.email}
                        </div>
                        {member.phone && <div className="flex items-center">
                            <Phone className="h-3 w-3 mr-1" />
                            {member.phone}
                          </div>}
                        <div className="flex items-center">
                          <Calendar className="h-3 w-3 mr-1" />
                          Joined {new Date(member.joinDate).toLocaleDateString()}
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-1 mt-2">
                        {member.properties.map((property, index) => <Badge key={index} variant="outline" className="text-xs">
                            {property}
                          </Badge>)}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button variant="outline" size="sm">
                      <Edit className="h-4 w-4" />
                    </Button>
                    {member.role !== "owner" && <Button variant="outline" size="sm" onClick={() => handleRemoveMember(member.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>}
                  </div>
                </div>;
          })}
          </div>
        </CardContent>
      </Card>
    </div>;
};

// Export as default as well for compatibility
export default FamilyGroups;