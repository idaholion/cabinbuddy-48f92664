import { useState, useEffect, useMemo } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { UserCheck, Users, Crown, User, Search, AlertCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useEnhancedProfileClaim } from '@/hooks/useEnhancedProfileClaim';
import { formatNameForDisplay, parseFullName } from '@/lib/name-utils';

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
  const { 
    claimProfile, 
    searchForMatches, 
    availableMatches, 
    loading: claimLoading 
  } = useEnhancedProfileClaim(organizationId);
  
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState('');
  const [userName, setUserName] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [showingMatches, setShowingMatches] = useState(false);
  
  const availableMembers = useMemo(() => {
    if (!selectedGroup) return [];
    
    const group = familyGroups.find(g => g.name === selectedGroup);
    if (!group) return [];

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
    
    return members;
  }, [selectedGroup, familyGroups]);

  const handleGroupChange = (groupName: string) => {
    setSelectedGroup(groupName);
    setUserName('');
    setSearchResults([]);
    setShowingMatches(false);
  };

  const handleNameSearch = async (searchName: string) => {
    setUserName(searchName);
    
    if (searchName.length >= 2) {
      setLoading(true);
      try {
        const matches = await searchForMatches(searchName);
        setSearchResults(matches);
        setShowingMatches(matches.length > 0);
      } catch (error) {
        console.error('Error searching for matches:', error);
      } finally {
        setLoading(false);
      }
    } else {
      setSearchResults([]);
      setShowingMatches(false);
    }
  };

  const handleSelectMatch = (match: any) => {
    setSelectedGroup(match.familyGroup);
    setUserName(match.memberName);
    setSearchResults([]);
    setShowingMatches(false);
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

      const result = await claimProfile(selectedGroup, userName, memberType);

      toast({
        title: "Profile Claimed Successfully!",
        description: `You have been linked to ${formatNameForDisplay(userName)} in ${selectedGroup}`,
      });

      setOpen(false);
      setSelectedGroup('');
      setUserName('');
      setSearchResults([]);
      setShowingMatches(false);
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
          {/* Smart Name Search */}
          <div className="space-y-2">
            <Label htmlFor="user-name">
              <div className="flex items-center gap-2">
                <Search className="h-4 w-4" />
                Search Your Name
              </div>
            </Label>
            <Input
              id="user-name"
              value={userName}
              onChange={(e) => handleNameSearch(e.target.value)}
              placeholder="Start typing your name..."
            />
            {loading && (
              <div className="text-sm text-muted-foreground">
                Searching for matches...
              </div>
            )}
          </div>

          {/* Smart Search Results */}
          {showingMatches && searchResults.length > 0 && (
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <AlertCircle className="h-4 w-4" />
                Found Possible Matches
              </Label>
              <div className="grid gap-2 max-h-48 overflow-y-auto">
                {searchResults.slice(0, 5).map((match, index) => (
                  <Card 
                    key={index}
                    className={`cursor-pointer transition-colors hover:bg-muted/50 ${
                      match.exactMatch ? 'border-green-200 bg-green-50' : 'border-blue-200 bg-blue-50'
                    }`}
                    onClick={() => handleSelectMatch(match)}
                  >
                    <CardContent className="p-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {match.memberType === 'group_lead' ? (
                            <Crown className="h-4 w-4 text-yellow-600" />
                          ) : (
                            <User className="h-4 w-4 text-blue-600" />
                          )}
                          <div>
                            <span className="font-medium">{formatNameForDisplay(match.memberName)}</span>
                            <div className="text-xs text-muted-foreground">
                              in {match.familyGroup}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant={match.exactMatch ? "default" : "outline"}>
                            {match.exactMatch ? "Exact Match" : `${match.matchScore}% Match`}
                          </Badge>
                          <Badge variant={match.memberType === 'group_lead' ? "default" : "outline"}>
                            {match.memberType === 'group_lead' ? "Group Lead" : "Member"}
                          </Badge>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

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
                          <span className="font-medium">{formatNameForDisplay(member.name)}</span>
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
            <Label htmlFor="manual-name">Or Enter Name Manually</Label>
            <Input
              id="manual-name"
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