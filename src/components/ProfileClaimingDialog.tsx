import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Users, UserCheck, AlertCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useRobustMultiOrganization } from '@/hooks/useRobustMultiOrganization';

interface ProfileClaimingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onProfileClaimed?: () => void;
}

interface AvailableProfile {
  family_group_name: string;
  member_name: string;
  member_type: 'group_lead' | 'host_member';
}

export const ProfileClaimingDialog = ({ open, onOpenChange, onProfileClaimed }: ProfileClaimingDialogProps) => {
  const { toast } = useToast();
  const { activeOrganization } = useRobustMultiOrganization();
  const [loading, setLoading] = useState(false);
  const [searchName, setSearchName] = useState('');
  const [availableProfiles, setAvailableProfiles] = useState<AvailableProfile[]>([]);
  const [searchPerformed, setSearchPerformed] = useState(false);

  const searchForProfiles = async () => {
    if (!activeOrganization?.organization_id || !searchName.trim()) {
      toast({
        title: "Error",
        description: "Please enter your name to search for profiles",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    setSearchPerformed(true);

    try {
      // Search for family groups with matching lead names or host members
      const { data: familyGroups, error } = await supabase
        .from('family_groups')
        .select('name, lead_name, host_members')
        .eq('organization_id', activeOrganization.organization_id);

      if (error) throw error;

      const profiles: AvailableProfile[] = [];
      const searchTerm = searchName.trim().toLowerCase();

      for (const group of familyGroups || []) {
        // Check group lead first
        if (group.lead_name) {
          const leadName = group.lead_name.toLowerCase().trim();
          if (leadName.includes(searchTerm) || searchTerm.includes(leadName)) {
            profiles.push({
              family_group_name: group.name,
              member_name: group.lead_name,
              member_type: 'group_lead'
            });
          }
        }

        // Check host members (but skip if they're already added as group lead)
        if (group.host_members && Array.isArray(group.host_members)) {
          for (const member of group.host_members) {
            const memberData = member as any;
            if (memberData.name) {
              const memberName = memberData.name.toLowerCase().trim();
              // Skip if this member is already listed as group lead
              const isAlreadyGroupLead = group.lead_name && 
                group.lead_name.toLowerCase().trim() === memberName;
              
              if (!isAlreadyGroupLead && (memberName.includes(searchTerm) || searchTerm.includes(memberName))) {
                profiles.push({
                  family_group_name: group.name,
                  member_name: memberData.name,
                  member_type: 'host_member'
                });
              }
            }
          }
        }
      }

      setAvailableProfiles(profiles);
      
      if (profiles.length === 0) {
        toast({
          title: "No matches found",
          description: "No profiles found matching your name. Please check with your group administrator.",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Profile search error:', error);
      toast({
        title: "Search failed",
        description: "Failed to search for profiles. Please try again.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const claimProfile = async (profile: AvailableProfile) => {
    if (!activeOrganization?.organization_id) {
      console.error('❌ [PROFILE-CLAIM] No active organization');
      return;
    }

    console.log('🔍 [PROFILE-CLAIM] Claiming profile:', {
      organizationId: activeOrganization.organization_id,
      familyGroup: profile.family_group_name,
      memberName: profile.member_name,
      memberType: profile.member_type
    });

    setLoading(true);
    try {
      const { data, error } = await supabase.rpc('claim_family_member_profile', {
        p_organization_id: activeOrganization.organization_id,
        p_family_group_name: profile.family_group_name,
        p_member_name: profile.member_name,
        p_member_type: profile.member_type
      });

      console.log('📊 [PROFILE-CLAIM] RPC Response:', { data, error });

      if (error) {
        console.error('❌ [PROFILE-CLAIM] RPC Error:', error);
        throw error;
      }

      const result = data as any;
      console.log('✅ [PROFILE-CLAIM] Result:', result);
      
      if (result?.success) {
        toast({
          title: "Profile claimed successfully!",
          description: `You are now linked to ${profile.member_name} in ${profile.family_group_name}`,
        });
        onOpenChange(false);
        onProfileClaimed?.();
      } else {
        console.error('❌ [PROFILE-CLAIM] Claim failed:', result?.error);
        toast({
          title: "Claim failed",
          description: result?.error || "Failed to claim profile",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('❌ [PROFILE-CLAIM] Exception:', error);
      toast({
        title: "Claim failed",
        description: error instanceof Error ? error.message : "Failed to claim profile. Please try again.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Claim Your Group Member Profile
          </DialogTitle>
          <DialogDescription>
            Search for your name to link your account to your family group profile. 
            This allows you to manage your group's information and make reservations.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Search Section */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="search-name">Enter Your Name</Label>
              <div className="flex gap-2">
                <Input
                  id="search-name"
                  value={searchName}
                  onChange={(e) => setSearchName(e.target.value)}
                  placeholder="Enter your name as it appears in the group..."
                  className="flex-1"
                  onKeyDown={(e) => e.key === 'Enter' && searchForProfiles()}
                />
                <Button 
                  onClick={searchForProfiles}
                  disabled={loading || !searchName.trim()}
                >
                  {loading ? 'Searching...' : 'Search'}
                </Button>
              </div>
            </div>
          </div>

          {/* Results Section */}
          {searchPerformed && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">
                {availableProfiles.length > 0 ? 'Available Profiles' : 'No Matches Found'}
              </h3>
              
              {availableProfiles.length > 0 ? (
                <div className="space-y-3">
                  {availableProfiles.map((profile, index) => (
                    <Card key={index} className="hover:shadow-md transition-shadow">
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <h4 className="font-medium">{profile.member_name}</h4>
                              <Badge variant={profile.member_type === 'group_lead' ? 'default' : 'secondary'}>
                                {profile.member_type === 'group_lead' ? 'Group Lead' : 'Group Member'}
                              </Badge>
                            </div>
                            <p className="text-sm text-muted-foreground">
                              Family Group: <span className="font-medium">{profile.family_group_name}</span>
                            </p>
                          </div>
                          <Button
                            onClick={() => claimProfile(profile)}
                            disabled={loading}
                            size="sm"
                          >
                            <UserCheck className="h-4 w-4 mr-1" />
                            Claim Profile
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <Card>
                  <CardContent className="p-6 text-center">
                    <AlertCircle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <h4 className="font-medium mb-2">No matching profiles found</h4>
                    <p className="text-sm text-muted-foreground mb-4">
                      Your name might not be in the system yet, or it might be spelled differently.
                    </p>
                    <div className="text-sm text-muted-foreground space-y-1">
                      <p>• Check that you entered your name correctly</p>
                      <p>• Try using just your first name or last name</p>
                      <p>• Contact your group administrator if you still can't find your profile</p>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};