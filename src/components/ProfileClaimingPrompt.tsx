import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRobustMultiOrganization } from '@/hooks/useRobustMultiOrganization';
import { useEnhancedProfileClaim } from '@/hooks/useEnhancedProfileClaim';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { AlertCircle, CheckCircle, User, Users } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

/**
 * ProfileClaimingPrompt - Automatically prompts users to claim their family member profile
 * when their email doesn't match any existing family group records.
 * 
 * Phase 1: Immediate - Catches email mismatches on login
 */
export const ProfileClaimingPrompt = () => {
  const { user } = useAuth();
  const { activeOrganization } = useRobustMultiOrganization();
  const { claimedProfile, searchForMatches, availableMatches, claimProfile } = useEnhancedProfileClaim(activeOrganization?.organization_id);
  const { toast } = useToast();
  
  const [showDialog, setShowDialog] = useState(false);
  const [searchName, setSearchName] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [isClaiming, setIsClaiming] = useState(false);
  const [hasChecked, setHasChecked] = useState(false);
  const [dismissedForSession, setDismissedForSession] = useState(false);

  // Check if user's email matches any family group records
  useEffect(() => {
    const checkEmailMatch = async () => {
      if (!user?.email || !activeOrganization?.organization_id || hasChecked || dismissedForSession || claimedProfile) {
        return;
      }

      setHasChecked(true);

      try {
        // Check if user's email matches any lead_email or host_members email
        const { data: familyGroups, error } = await supabase
          .from('family_groups')
          .select('name, lead_email, host_members')
          .eq('organization_id', activeOrganization.organization_id);

        if (error) throw error;

        // Check for email match
        const normalizedUserEmail = user.email.toLowerCase().trim();
        const hasMatch = familyGroups?.some(group => {
          // Check lead email
          if (group.lead_email?.toLowerCase().trim() === normalizedUserEmail) {
            return true;
          }
          
          // Check host members
          if (group.host_members && Array.isArray(group.host_members)) {
            return group.host_members.some((member: any) => 
              member.email?.toLowerCase().trim() === normalizedUserEmail
            );
          }
          
          return false;
        });

        // If no match found, suggest profile claiming
        if (!hasMatch && familyGroups && familyGroups.length > 0) {
          // Try to auto-search by user's name
          const userDisplayName = user.user_metadata?.display_name || 
                                 `${user.user_metadata?.first_name || ''} ${user.user_metadata?.last_name || ''}`.trim();
          
          if (userDisplayName) {
            setSearchName(userDisplayName);
            const matches = await searchForMatches(userDisplayName);
            
            // Only show dialog if we found potential matches
            if (matches && matches.length > 0) {
              setShowDialog(true);
            }
          }
        }
      } catch (error) {
        console.error('Error checking email match:', error);
      }
    };

    checkEmailMatch();
  }, [user, activeOrganization, hasChecked, dismissedForSession, claimedProfile, searchForMatches]);

  const handleSearch = async () => {
    if (!searchName.trim()) {
      toast({
        title: "Enter a name",
        description: "Please enter your name to search for your profile.",
        variant: "destructive",
      });
      return;
    }

    setIsSearching(true);
    try {
      await searchForMatches(searchName);
    } catch (error) {
      console.error('Search error:', error);
      toast({
        title: "Search failed",
        description: "Unable to search for profiles. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSearching(false);
    }
  };

  const handleClaimProfile = async (familyGroup: string, memberName: string, memberType: 'group_lead' | 'host_member') => {
    setIsClaiming(true);
    try {
      await claimProfile(familyGroup, memberName, memberType);
      
      toast({
        title: "✅ Profile Claimed",
        description: `You've successfully claimed your profile in ${familyGroup}!`,
      });
      
      setShowDialog(false);
    } catch (error: any) {
      console.error('Claim error:', error);
      toast({
        title: "Claim failed",
        description: error.message || "Unable to claim profile. Please try again or contact support.",
        variant: "destructive",
      });
    } finally {
      setIsClaiming(false);
    }
  };

  const handleDismiss = () => {
    setDismissedForSession(true);
    setShowDialog(false);
  };

  if (!showDialog) return null;

  return (
    <Dialog open={showDialog} onOpenChange={setShowDialog}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-warning" />
            Claim Your Family Member Profile
          </DialogTitle>
          <DialogDescription>
            We couldn't find a family member profile that matches your email address ({user?.email}).
            Please claim your profile to link your account.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 mt-4">
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              This step links your login account to your family member profile. Once claimed, you'll have access to all family group features.
            </AlertDescription>
          </Alert>

          <div className="space-y-2">
            <Label htmlFor="search-name">Search by your name</Label>
            <div className="flex gap-2">
              <Input
                id="search-name"
                placeholder="Enter your full name"
                value={searchName}
                onChange={(e) => setSearchName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              />
              <Button onClick={handleSearch} disabled={isSearching}>
                {isSearching ? 'Searching...' : 'Search'}
              </Button>
            </div>
          </div>

          {availableMatches.length > 0 && (
            <div className="space-y-2">
              <Label>Potential Matches</Label>
              <div className="space-y-2">
                {availableMatches.map((match, idx) => (
                  <Card key={idx} className="p-4 hover:border-primary transition-colors">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          {match.memberType === 'group_lead' ? (
                            <User className="h-4 w-4 text-primary" />
                          ) : (
                            <Users className="h-4 w-4 text-muted-foreground" />
                          )}
                          <h3 className="font-semibold">{match.memberName}</h3>
                          <Badge variant={match.exactMatch ? "default" : "secondary"}>
                            {match.matchScore}% match
                          </Badge>
                        </div>
                        <div className="space-y-1 text-sm text-muted-foreground">
                          <p><strong>Family Group:</strong> {match.familyGroup}</p>
                          <p><strong>Role:</strong> {match.memberType === 'group_lead' ? 'Group Lead' : 'Family Member'}</p>
                          {match.exactMatch && (
                            <div className="flex items-center gap-1 text-green-600 dark:text-green-400 mt-2">
                              <CheckCircle className="h-4 w-4" />
                              <span className="font-medium">Exact name match</span>
                            </div>
                          )}
                        </div>
                      </div>
                      <Button
                        onClick={() => handleClaimProfile(match.familyGroup, match.memberName, match.memberType)}
                        disabled={isClaiming}
                      >
                        {isClaiming ? 'Claiming...' : 'Claim This Profile'}
                      </Button>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {availableMatches.length === 0 && searchName && !isSearching && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                No matching profiles found. Try a different name spelling, or contact your organization administrator to add you to a family group.
              </AlertDescription>
            </Alert>
          )}

          <div className="flex justify-between pt-4 border-t">
            <Button variant="outline" onClick={handleDismiss}>
              I'll Do This Later
            </Button>
            <Button variant="ghost" onClick={() => setShowDialog(false)}>
              Close
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
