import { useState } from 'react';
import { useProfileClaimState } from '@/hooks/useProfileClaimState';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { UserPlus, User, Users, Search, CheckCircle, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ProfileClaimBanner } from '@/components/ProfileClaimBanner';

/**
 * ProfileClaimingPrompt - Modal + Banner hybrid for profile claiming
 * 
 * - Shows modal on first visit with browsable list of unclaimed members
 * - If dismissed, shows persistent banner until profile is claimed
 * - Uses useProfileClaimState for centralized state management
 */
export const ProfileClaimingPrompt = () => {
  const { toast } = useToast();
  const {
    unclaimedMembers,
    loading,
    showModal,
    showBanner,
    openModal,
    closeModal,
    dismissModal,
    claimProfile
  } = useProfileClaimState();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [isClaiming, setIsClaiming] = useState(false);

  // Filter members by search query
  const filteredMembers = unclaimedMembers.filter(member => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase().trim();
    return (
      member.memberName.toLowerCase().includes(query) ||
      member.familyGroupName.toLowerCase().includes(query)
    );
  });

  const handleClaimProfile = async (
    familyGroupName: string,
    memberName: string,
    memberType: 'group_lead' | 'host_member'
  ) => {
    setIsClaiming(true);
    try {
      const success = await claimProfile(familyGroupName, memberName, memberType);
      
      if (success) {
        toast({
          title: "✅ Profile Claimed",
          description: `You've successfully linked your account to ${memberName} in ${familyGroupName}!`,
        });
      } else {
        toast({
          title: "Claim failed",
          description: "Unable to claim profile. It may already be claimed by another user.",
          variant: "destructive",
        });
      }
    } catch (error: any) {
      console.error('Claim error:', error);
      toast({
        title: "Claim failed",
        description: error.message || "Unable to claim profile. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsClaiming(false);
    }
  };

  // Render banner when modal was dismissed
  if (showBanner) {
    return <ProfileClaimBanner onClaimClick={openModal} />;
  }

  // Don't render modal if not needed
  if (!showModal) return null;

  return (
    <Dialog open={showModal} onOpenChange={(open) => !open && closeModal()}>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5 text-primary" />
            Which Family Member Are You?
          </DialogTitle>
          <DialogDescription>
            Link your account to your family member profile to access all features like making reservations and managing your group.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 flex-1 overflow-hidden flex flex-col">
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Select your name from the list below to link your login account to your family profile.
            </AlertDescription>
          </Alert>

          {/* Search filter */}
          <div className="space-y-2">
            <Label htmlFor="search-member" className="sr-only">Search by name</Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="search-member"
                placeholder="Search by name or family group..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>

          {/* Members list */}
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">
              Loading available profiles...
            </div>
          ) : filteredMembers.length > 0 ? (
            <ScrollArea className="flex-1 -mx-6 px-6">
              <div className="space-y-2 pb-4">
                {filteredMembers.map((member, idx) => (
                  <Card 
                    key={`${member.familyGroupName}-${member.memberName}-${idx}`}
                    className="hover:border-primary transition-colors cursor-pointer group"
                  >
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between gap-4">
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                          <div className="shrink-0">
                            {member.memberType === 'group_lead' ? (
                              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                                <User className="h-5 w-5 text-primary" />
                              </div>
                            ) : (
                              <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
                                <Users className="h-5 w-5 text-muted-foreground" />
                              </div>
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <h4 className="font-medium truncate">{member.memberName}</h4>
                              <Badge 
                                variant={member.memberType === 'group_lead' ? 'default' : 'secondary'}
                                className="shrink-0"
                              >
                                {member.memberType === 'group_lead' ? 'Group Lead' : 'Member'}
                              </Badge>
                            </div>
                            <p className="text-sm text-muted-foreground truncate">
                              {member.familyGroupName}
                            </p>
                          </div>
                        </div>
                        <Button
                          size="sm"
                          onClick={() => handleClaimProfile(
                            member.familyGroupName,
                            member.memberName,
                            member.memberType
                          )}
                          disabled={isClaiming}
                          className="shrink-0"
                        >
                          <CheckCircle className="h-4 w-4 mr-1" />
                          This is Me
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </ScrollArea>
          ) : searchQuery ? (
            <div className="text-center py-8">
              <AlertCircle className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
              <p className="text-muted-foreground">
                No profiles found matching "{searchQuery}"
              </p>
              <Button 
                variant="link" 
                onClick={() => setSearchQuery('')}
                className="mt-2"
              >
                Clear search
              </Button>
            </div>
          ) : (
            <div className="text-center py-8">
              <AlertCircle className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
              <p className="text-muted-foreground mb-2">
                No unclaimed profiles available
              </p>
              <p className="text-sm text-muted-foreground">
                All family members have already claimed their profiles, or no members have been added yet.
              </p>
            </div>
          )}

          {/* Footer actions */}
          <div className="flex justify-between pt-4 border-t">
            <Button variant="ghost" onClick={dismissModal}>
              Skip for Now
            </Button>
            <p className="text-xs text-muted-foreground self-center">
              You can claim your profile later from Settings
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
