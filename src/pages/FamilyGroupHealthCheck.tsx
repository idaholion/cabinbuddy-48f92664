import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useRobustMultiOrganization } from '@/hooks/useRobustMultiOrganization';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { AlertCircle, CheckCircle, Mail, UserX, Users, RefreshCw, ListChecks } from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDown, ChevronUp } from 'lucide-react';

interface MismatchedMember {
  familyGroup: string;
  memberName: string;
  memberEmail: string;
  memberType: 'group_lead' | 'host_member';
  hasUserAccount: boolean;
  hasClaimed: boolean;
}

interface UnlinkedUser {
  email: string;
  displayName: string;
  hasClaimedProfile: boolean;
}

interface AllMember {
  familyGroup: string;
  memberName: string;
  memberEmail: string;
  memberType: 'group_lead' | 'host_member';
  hasUserAccount: boolean;
  hasClaimed: boolean;
  claimedByEmail?: string;
}

/**
 * FamilyGroupHealthCheck - Admin tool to identify and fix email mismatches
 * Phase 4: Future Enhancement
 */
export default function FamilyGroupHealthCheck() {
  const { activeOrganization } = useRobustMultiOrganization();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [mismatchedMembers, setMismatchedMembers] = useState<MismatchedMember[]>([]);
  const [unlinkedUsers, setUnlinkedUsers] = useState<UnlinkedUser[]>([]);
  const [statsLoading, setStatsLoading] = useState(false);
  const [allMembers, setAllMembers] = useState<AllMember[]>([]);
  const [showAllMembers, setShowAllMembers] = useState(false);

  const loadHealthCheck = async () => {
    if (!activeOrganization?.organization_id) return;

    setLoading(true);
    try {
      // Get all family groups
      const { data: familyGroups, error: fgError } = await supabase
        .from('family_groups')
        .select('name, lead_name, lead_email, host_members')
        .eq('organization_id', activeOrganization.organization_id);

      if (fgError) throw fgError;

      // Get all user accounts in this organization
      const { data: orgUsers, error: ouError } = await supabase
        .rpc('get_organization_user_emails', {
          org_id: activeOrganization.organization_id
        });

      if (ouError) throw ouError;

      // Get all profile claims with user emails
      const { data: profileLinks, error: plError } = await supabase
        .from('member_profile_links')
        .select('member_name, family_group_name, claimed_by_user_id')
        .eq('organization_id', activeOrganization.organization_id);

      if (plError) throw plError;

      // Create email -> user mapping
      const userEmailMap = new Map(
        (orgUsers || []).map((u: any) => [u.email.toLowerCase().trim(), u])
      );

      // Create user_id -> email mapping for claimed profiles
      const userIdToEmail = new Map(
        (orgUsers || []).map((u: any) => [u.user_id, u.email])
      );

      // Create user_id -> claim mapping
      const claimedProfiles = new Set(
        (profileLinks || []).map(link => link.claimed_by_user_id)
      );

      // Create member name -> claimed user email mapping
      const memberClaimMap = new Map(
        (profileLinks || []).map(link => [
          `${link.family_group_name}:${link.member_name.trim()}`,
          userIdToEmail.get(link.claimed_by_user_id) || null
        ])
      );

      // Check for mismatched members (includes members without emails)
      // NOTE: We only check host_members now since lead info is derived from host_members[0]
      const mismatches: MismatchedMember[] = [];
      
      familyGroups?.forEach(group => {
        // Check host members (first member is the Group Lead)
        if (group.host_members && Array.isArray(group.host_members)) {
          group.host_members.forEach((member: any, memberIndex: number) => {
            if (!member.name) return;
            
            const claimKey = `${group.name}:${member.name.trim()}`;
            const claimedByEmail = memberClaimMap.get(claimKey);
            const isGroupLead = memberIndex === 0;
            
            if (member.email) {
              const normalizedEmail = member.email.toLowerCase().trim();
              const hasAccount = userEmailMap.has(normalizedEmail);
              const user = userEmailMap.get(normalizedEmail);
              const hasClaimed = user ? claimedProfiles.has(user.user_id) : !!claimedByEmail;

              if (!hasAccount || !hasClaimed) {
                mismatches.push({
                  familyGroup: group.name,
                  memberName: member.name,
                  memberEmail: member.email,
                  memberType: isGroupLead ? 'group_lead' : 'host_member',
                  hasUserAccount: hasAccount,
                  hasClaimed: hasClaimed,
                });
              }
            } else if (!claimedByEmail) {
              // Member has no email and hasn't been claimed
              mismatches.push({
                familyGroup: group.name,
                memberName: member.name,
                memberEmail: '',
                memberType: isGroupLead ? 'group_lead' : 'host_member',
                hasUserAccount: false,
                hasClaimed: false,
              });
            }
          });
        }
      });

      setMismatchedMembers(mismatches);

      // Build ALL members list (for complete overview)
      // NOTE: We only use host_members now since lead info is derived from host_members[0]
      const allMembersList: AllMember[] = [];
      
      familyGroups?.forEach(group => {
        // Add host members (first member is the Group Lead)
        if (group.host_members && Array.isArray(group.host_members)) {
          group.host_members.forEach((member: any, memberIndex: number) => {
            if (member.name) {
              const normalizedEmail = member.email?.toLowerCase().trim() || '';
              const hasAccount = normalizedEmail ? userEmailMap.has(normalizedEmail) : false;
              const user = normalizedEmail ? userEmailMap.get(normalizedEmail) : null;
              const hasClaimed = user ? claimedProfiles.has(user.user_id) : false;
              const claimedByEmail = memberClaimMap.get(`${group.name}:${member.name.trim()}`);
              const isGroupLead = memberIndex === 0;
              
              allMembersList.push({
                familyGroup: group.name,
                memberName: member.name,
                memberEmail: member.email || '',
                memberType: isGroupLead ? 'group_lead' : 'host_member',
                hasUserAccount: hasAccount,
                hasClaimed: hasClaimed || !!claimedByEmail,
                claimedByEmail: claimedByEmail || undefined,
              });
            }
          });
        }
      });

      // Sort by family group, then by type (leads first), then by name
      allMembersList.sort((a, b) => {
        if (a.familyGroup !== b.familyGroup) return a.familyGroup.localeCompare(b.familyGroup);
        if (a.memberType !== b.memberType) return a.memberType === 'group_lead' ? -1 : 1;
        return a.memberName.localeCompare(b.memberName);
      });

      setAllMembers(allMembersList);

      // Check for unlinked users
      const unlinked: UnlinkedUser[] = [];
      orgUsers?.forEach((user: any) => {
        const hasClaimed = claimedProfiles.has(user.user_id);
        
        if (!hasClaimed) {
          unlinked.push({
            email: user.email,
            displayName: user.display_name || user.email.split('@')[0],
            hasClaimedProfile: false,
          });
        }
      });

      setUnlinkedUsers(unlinked);

    } catch (error: any) {
      console.error('Health check error:', error);
      toast({
        title: "Failed to load health check",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadHealthCheck();
  }, [activeOrganization?.organization_id]);

  const handleRefresh = async () => {
    setStatsLoading(true);
    await loadHealthCheck();
    setStatsLoading(false);
    toast({
      title: "Refreshed",
      description: "Health check data has been updated.",
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  const totalIssues = mismatchedMembers.length + unlinkedUsers.length;
  const membersWithoutEmails = mismatchedMembers.filter(m => !m.memberEmail).length;
  const membersWithoutAccounts = mismatchedMembers.filter(m => m.memberEmail && !m.hasUserAccount).length;
  // Unclaimed profiles = members who haven't claimed (regardless of account status)
  const membersWithoutClaims = mismatchedMembers.filter(m => !m.hasClaimed).length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Family Group Health Check</h1>
          <p className="text-muted-foreground mt-1">
            Identify and resolve email mismatches and unclaimed profiles
          </p>
        </div>
        <Button onClick={handleRefresh} disabled={statsLoading} variant="outline">
          <RefreshCw className={`h-4 w-4 mr-2 ${statsLoading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Issues</CardDescription>
            <CardTitle className="text-3xl">{totalIssues}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>No Email Listed</CardDescription>
            <CardTitle className="text-3xl">{membersWithoutEmails}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Need to Create Account</CardDescription>
            <CardTitle className="text-3xl">{membersWithoutAccounts}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Profile Not Claimed</CardDescription>
            <CardTitle className="text-3xl">{membersWithoutClaims}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Users Without Profile</CardDescription>
            <CardTitle className="text-3xl">{unlinkedUsers.length}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      {totalIssues === 0 ? (
        <Alert className="border-green-500 bg-green-50 dark:bg-green-950">
          <CheckCircle className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-800 dark:text-green-200">
            <strong>All Good!</strong> No email mismatches or unclaimed profiles found.
          </AlertDescription>
        </Alert>
      ) : (
        <>
          {/* Mismatched Members */}
          {mismatchedMembers.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <UserX className="h-5 w-5" />
                  Members with Issues ({mismatchedMembers.length})
                </CardTitle>
                <CardDescription>
                  Family members with email addresses that don't match any user accounts or haven't claimed their profiles
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {mismatchedMembers.map((member, idx) => (
                    <div key={idx} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{member.memberName}</span>
                          <Badge variant={member.memberType === 'group_lead' ? 'default' : 'secondary'}>
                            {member.memberType === 'group_lead' ? 'Lead' : 'Member'}
                          </Badge>
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {member.familyGroup} • {member.memberEmail || <span className="italic">No email on file</span>}
                        </div>
                        <div className="flex items-center gap-2 text-sm flex-wrap">
                          {/* Email status */}
                          {member.memberEmail ? (
                            <Badge className="text-xs bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 border-green-300">
                              Email Listed
                            </Badge>
                          ) : (
                            <Badge variant="destructive" className="text-xs">
                              No Email
                            </Badge>
                          )}
                          {/* Claim status */}
                          {!member.hasClaimed && (
                            <Badge variant="destructive" className="text-xs">
                              Profile Not Claimed
                            </Badge>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        {member.memberEmail && !member.hasUserAccount && (
                          <Button size="sm" variant="outline">
                            <Mail className="h-4 w-4 mr-1" />
                            Send Invite
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Unlinked Users */}
          {unlinkedUsers.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Users Without Profiles ({unlinkedUsers.length})
                </CardTitle>
                <CardDescription>
                  Users who have accounts but haven't claimed a family member profile
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {unlinkedUsers.map((user, idx) => (
                    <div key={idx} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="space-y-1">
                        <div className="font-medium">{user.displayName}</div>
                        <div className="text-sm text-muted-foreground">{user.email}</div>
                      </div>
                      <Badge variant="secondary">No Profile Claimed</Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <strong>Recommended Actions:</strong>
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li>Members without accounts should sign up at your organization's login page</li>
                <li>Members with accounts should log in and claim their profile when prompted</li>
                <li>Contact unlinked users and ask them to search for and claim their profiles</li>
                <li>Verify that email addresses in family groups match the user's actual email</li>
              </ul>
            </AlertDescription>
          </Alert>
        </>
      )}

      {/* All Members Overview - Collapsible */}
      <Collapsible open={showAllMembers} onOpenChange={setShowAllMembers}>
        <Card>
          <CollapsibleTrigger asChild>
            <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ListChecks className="h-5 w-5" />
                  <div>
                    <CardTitle className="text-lg">All Organization Members ({allMembers.length})</CardTitle>
                    <CardDescription className="mt-1">
                      Complete list of all family group members and their status
                    </CardDescription>
                  </div>
                </div>
                {showAllMembers ? (
                  <ChevronUp className="h-5 w-5 text-muted-foreground" />
                ) : (
                  <ChevronDown className="h-5 w-5 text-muted-foreground" />
                )}
              </div>
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent className="pt-0">
              <div className="space-y-4">
                {/* Group members by family */}
                {Array.from(new Set(allMembers.map(m => m.familyGroup))).map(familyGroup => (
                  <div key={familyGroup} className="space-y-2">
                    <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
                      {familyGroup}
                    </h3>
                    <div className="space-y-2">
                      {allMembers
                        .filter(m => m.familyGroup === familyGroup)
                        .map((member, idx) => (
                          <div 
                            key={idx} 
                            className="flex items-center justify-between p-3 border rounded-lg bg-card"
                          >
                            <div className="flex items-center gap-3">
                              <div className="space-y-1">
                                <div className="flex items-center gap-2">
                                  <span className="font-medium">{member.memberName}</span>
                                  <Badge 
                                    variant={member.memberType === 'group_lead' ? 'default' : 'outline'}
                                    className="text-xs"
                                  >
                                    {member.memberType === 'group_lead' ? 'Lead' : 'Member'}
                                  </Badge>
                                </div>
                                <div className="text-sm text-muted-foreground">
                                  {member.memberEmail || 'No email on file'}
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-2 flex-wrap">
                              {/* Email status */}
                              {member.memberEmail ? (
                                <Badge className="text-xs bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 border-green-300">
                                  Email Listed
                                </Badge>
                              ) : (
                                <Badge variant="destructive" className="text-xs">
                                  No Email
                                </Badge>
                              )}
                              {/* Claim status */}
                              {member.hasClaimed ? (
                                <Badge className="text-xs bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 border-green-300">
                                  <CheckCircle className="h-3 w-3 mr-1" />
                                  Profile Claimed
                                  {member.claimedByEmail && member.claimedByEmail !== member.memberEmail && (
                                    <span className="ml-1 opacity-75">({member.claimedByEmail})</span>
                                  )}
                                </Badge>
                              ) : (
                                <Badge variant="destructive" className="text-xs">
                                  Profile Not Claimed
                                </Badge>
                              )}
                            </div>
                          </div>
                        ))}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>
    </div>
  );
}
