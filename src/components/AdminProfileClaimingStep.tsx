import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { UserCheck, UserPlus, ArrowRight, Info } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useRobustMultiOrganization } from '@/hooks/useRobustMultiOrganization';

interface FamilyGroupOption {
  name: string;
  lead_name?: string;
  lead_email?: string;
  member_type: 'group_lead' | 'host_member';
  display_name: string;
}

interface AdminProfileClaimingStepProps {
  onProfileClaimed?: (claimedProfile: any) => void;
  onSkip?: () => void;
  familyGroups?: any[];
  adminEmail?: string;
}

export const AdminProfileClaimingStep = ({ 
  onProfileClaimed, 
  onSkip, 
  familyGroups = [],
  adminEmail 
}: AdminProfileClaimingStepProps) => {
  const { toast } = useToast();
  const { activeOrganization } = useRobustMultiOrganization();
  const [loading, setLoading] = useState(false);
  const [selectedProfile, setSelectedProfile] = useState<FamilyGroupOption | null>(null);

  // Build available profile options from family groups
  const buildProfileOptions = (): FamilyGroupOption[] => {
    const options: FamilyGroupOption[] = [];

    for (const group of familyGroups) {
      // Add group lead option if it exists
      if (group.lead_name) {
        options.push({
          name: group.name,
          lead_name: group.lead_name,
          lead_email: group.lead_email,
          member_type: 'group_lead',
          display_name: group.lead_name
        });
      }

      // Add host members if they exist (but skip if they're already group lead)
      if (group.host_members && Array.isArray(group.host_members)) {
        for (const member of group.host_members) {
          const memberData = member as any;
          if (memberData.name) {
            // Skip if this member is already the group lead
            const isAlreadyGroupLead = group.lead_name && 
              group.lead_name.toLowerCase().trim() === memberData.name.toLowerCase().trim();
            
            if (!isAlreadyGroupLead) {
              options.push({
                name: group.name,
                member_type: 'host_member',
                display_name: memberData.name
              });
            }
          }
        }
      }
    }

    return options;
  };

  const profileOptions = buildProfileOptions();

  // Suggest best match based on admin email
  const getSuggestedProfile = (): FamilyGroupOption | null => {
    if (!adminEmail) return null;
    
    // Look for group lead with matching email
    return profileOptions.find(option => 
      option.member_type === 'group_lead' && 
      option.lead_email?.toLowerCase() === adminEmail.toLowerCase()
    ) || null;
  };

  const suggestedProfile = getSuggestedProfile();

  const claimProfile = async (profile: FamilyGroupOption) => {
    if (!activeOrganization?.organization_id) {
      toast({
        title: "Error",
        description: "Organization not found. Please try again.",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.rpc('claim_family_member_profile', {
        p_organization_id: activeOrganization.organization_id,
        p_family_group_name: profile.name,
        p_member_name: profile.display_name,
        p_member_type: profile.member_type
      });

      if (error) throw error;

      const result = data as any;
      if (result?.success) {
        toast({
          title: "Profile claimed successfully!",
          description: `You are now linked to ${profile.display_name} in ${profile.name}`,
        });
        
        onProfileClaimed?.(result);
      } else {
        toast({
          title: "Claim failed",
          description: result?.error || "Failed to claim profile",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Profile claim error:', error);
      toast({
        title: "Claim failed",
        description: "Failed to claim profile. Please try again.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  if (profileOptions.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Info className="h-5 w-5" />
            No Profiles Available
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground mb-4">
            No family member profiles were found in the groups you created. You can set up detailed family group information in the next step.
          </p>
          <Button onClick={onSkip}>
            Continue to Family Group Setup
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <UserPlus className="h-5 w-5" />
          Link Your Administrator Account
        </CardTitle>
        <CardDescription>
          Would you like to link your administrator account to one of the family member profiles you created? 
          This will allow you to make reservations and manage your family group.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        
        {/* Suggested Profile */}
        {suggestedProfile && (
          <Alert>
            <UserCheck className="h-4 w-4" />
            <AlertDescription>
              <strong>Suggested match:</strong> We found a group lead profile that matches your email address.
            </AlertDescription>
          </Alert>
        )}

        {/* Available Profiles */}
        <div className="space-y-3">
          <h4 className="font-medium">Available Profiles:</h4>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {profileOptions.map((option, index) => {
              const isSuggested = suggestedProfile && 
                option.name === suggestedProfile.name && 
                option.display_name === suggestedProfile.display_name &&
                option.member_type === suggestedProfile.member_type;
              
              return (
                <Card 
                  key={index} 
                  className={`cursor-pointer transition-all hover:shadow-md ${
                    selectedProfile === option ? 'ring-2 ring-primary' : ''
                  } ${isSuggested ? 'border-green-200 bg-green-50' : ''}`}
                  onClick={() => setSelectedProfile(option)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <h5 className="font-medium">{option.display_name}</h5>
                          <Badge variant={option.member_type === 'group_lead' ? 'default' : 'secondary'}>
                            {option.member_type === 'group_lead' ? 'Group Lead' : 'Group Member'}
                          </Badge>
                          {isSuggested && (
                            <Badge variant="outline" className="border-green-500 text-green-700">
                              Suggested
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground">
                          Family Group: <span className="font-medium">{option.name}</span>
                        </p>
                        {option.lead_email && (
                          <p className="text-xs text-muted-foreground">
                            Email: {option.lead_email}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        {selectedProfile === option && (
                          <UserCheck className="h-4 w-4 text-primary" />
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-3 pt-4">
          <Button
            onClick={() => selectedProfile && claimProfile(selectedProfile)}
            disabled={!selectedProfile || loading}
            className="flex items-center gap-2"
          >
            <UserCheck className="h-4 w-4" />
            {loading ? 'Claiming Profile...' : 'Claim Selected Profile'}
          </Button>
          
          <Button
            variant="outline"
            onClick={onSkip}
            disabled={loading}
            className="flex items-center gap-2"
          >
            <ArrowRight className="h-4 w-4" />
            Skip for Now
          </Button>
        </div>

        <div className="text-sm text-muted-foreground">
          <p><strong>Note:</strong> You can claim a profile later from the "Group Member Profile" page if you skip this step.</p>
        </div>
      </CardContent>
    </Card>
  );
};