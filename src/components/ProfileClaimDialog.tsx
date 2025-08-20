import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { UserCheck, Users, Crown, User } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface FamilyGroup {
  id: string;
  name: string;
  lead_name?: string;
  host_members?: Array<{ name: string; email?: string; phone?: string }>;
}

interface ProfileClaimDialogProps {
  organizationId: string;
  familyGroups: FamilyGroup[];
  trigger?: React.ReactNode;
  onSuccess?: () => void;
}

export const ProfileClaimDialog = ({ 
  organizationId, 
  familyGroups, 
  trigger,
  onSuccess 
}: ProfileClaimDialogProps) => {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState('');
  const [userName, setUserName] = useState('');
  const [availableMembers, setAvailableMembers] = useState<Array<{
    name: string;
    type: 'group_lead' | 'host_member';
    isLead: boolean;
  }>>([]);

  const handleGroupChange = (groupName: string) => {
    setSelectedGroup(groupName);
    setUserName('');
    
    const group = familyGroups.find(g => g.name === groupName);
    if (!group) {
      setAvailableMembers([]);
      return;
    }

    const members: Array<{ name: string; type: 'group_lead' | 'host_member'; isLead: boolean }> = [];
    
    // Add group lead
    if (group.lead_name) {
      members.push({
        name: group.lead_name,
        type: 'group_lead',
        isLead: true
      });
    }
    
    // Add host members
    if (group.host_members) {
      group.host_members.forEach(member => {
        if (member.name && member.name !== group.lead_name) {
          members.push({
            name: member.name,
            type: 'host_member',
            isLead: false
          });
        }
      });
    }
    
    setAvailableMembers(members);
  };

  const handleClaimProfile = async () => {
    if (!selectedGroup || !userName) {
      toast({
        title: "Missing Information",
        description: "Please select a family group and enter your name.",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    
    try {
      // Find the member type
      const member = availableMembers.find(m => m.name === userName);
      const memberType = member?.type || 'host_member';

      const { data, error } = await supabase.rpc('claim_family_member_profile', {
        p_organization_id: organizationId,
        p_family_group_name: selectedGroup,
        p_member_name: userName,
        p_member_type: memberType
      });

      if (error) throw error;

      const result = data as { success: boolean; error?: string; message?: string };

      if (!result.success) {
        toast({
          title: "Claim Failed",
          description: result.error || "Unable to claim profile",
          variant: "destructive"
        });
        return;
      }

      toast({
        title: "Profile Claimed Successfully!",
        description: `You have been linked to ${userName} in ${selectedGroup}`,
      });

      setOpen(false);
      setSelectedGroup('');
      setUserName('');
      setAvailableMembers([]);
      onSuccess?.();

    } catch (error: any) {
      console.error('Profile claim error:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to claim profile",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const selectedMember = availableMembers.find(m => m.name === userName);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button className="w-full">
            <UserCheck className="h-4 w-4 mr-2" />
            Claim Your Profile
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserCheck className="h-5 w-5" />
            Claim Your Group Member Profile
          </DialogTitle>
          <DialogDescription>
            Link your account to your family group member profile by selecting your group and entering your name as it appears in the system.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* Family Group Selection */}
          <div className="space-y-2">
            <Label htmlFor="family-group">Family Group</Label>
            <Select value={selectedGroup} onValueChange={handleGroupChange}>
              <SelectTrigger>
                <SelectValue placeholder="Select your family group" />
              </SelectTrigger>
              <SelectContent>
                {familyGroups.map((group) => (
                  <SelectItem key={group.id} value={group.name}>
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4" />
                      {group.name}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Available Members */}
          {availableMembers.length > 0 && (
            <div className="space-y-2">
              <Label>Available Member Profiles</Label>
              <div className="grid gap-2 max-h-48 overflow-y-auto">
                {availableMembers.map((member, index) => (
                  <Card 
                    key={index}
                    className={`cursor-pointer transition-colors ${
                      userName === member.name 
                        ? 'border-primary bg-primary/5' 
                        : 'hover:bg-muted/50'
                    }`}
                    onClick={() => setUserName(member.name)}
                  >
                    <CardContent className="p-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {member.isLead ? (
                            <Crown className="h-4 w-4 text-yellow-600" />
                          ) : (
                            <User className="h-4 w-4 text-blue-600" />
                          )}
                          <span className="font-medium">{member.name}</span>
                        </div>
                        <Badge variant={member.isLead ? "default" : "outline"}>
                          {member.isLead ? "Group Lead" : "Member"}
                        </Badge>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* Manual Name Entry */}
          <div className="space-y-2">
            <Label htmlFor="user-name">Your Name (as it appears in the system)</Label>
            <Input
              id="user-name"
              value={userName}
              onChange={(e) => setUserName(e.target.value)}
              placeholder="Enter your name exactly as it appears"
            />
            {selectedMember && (
              <div className="text-sm text-muted-foreground">
                ✓ This will claim the {selectedMember.isLead ? 'Group Lead' : 'Member'} profile
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2 pt-4">
            <Button 
              variant="outline" 
              onClick={() => setOpen(false)}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button 
              onClick={handleClaimProfile}
              disabled={!selectedGroup || !userName || loading}
              className="flex-1"
            >
              {loading ? "Claiming..." : "Claim Profile"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};