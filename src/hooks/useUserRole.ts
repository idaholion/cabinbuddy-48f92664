import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useFamilyGroups } from '@/hooks/useFamilyGroups';
import { useMultiOrganization } from '@/hooks/useMultiOrganization';
import { useQuery } from '@tanstack/react-query';
import { secureRpc, secureSelect, createOrganizationContext } from '@/lib/secure-queries';
import { resolveFamilyRole, type ClaimedFamilyProfile } from '@/lib/family-role-identity';
import { useRole } from '@/contexts/RoleContext';

export const useUserRole = () => {
  const { user } = useAuth();
  const { familyGroups, loading: familyGroupsLoading } = useFamilyGroups();
  const { activeOrganization, loading: organizationLoading } = useMultiOrganization();
  const { impersonatedFamilyGroup } = useRole();
  const { data: claimedProfile, isPending: claimPending, isFetching: claimFetching } = useQuery({
    queryKey: ['claimed-family-profile', user?.id, activeOrganization?.organization_id],
    enabled: !!user?.id && !!activeOrganization?.organization_id,
    queryFn: async () => {
      const { data, error } = await secureRpc('get_user_claimed_profile', {}, createOrganizationContext(activeOrganization?.organization_id));
      if (error) throw error;
      return data as ClaimedFamilyProfile | null;
    },
  });
  const [isGroupLead, setIsGroupLead] = useState(false);
  const [isCalendarKeeper, setIsCalendarKeeper] = useState(false);
  const [isNameMatchedGroupLead, setIsNameMatchedGroupLead] = useState(false);
  const [isNameMatchedMember, setIsNameMatchedMember] = useState(false);
  const [userFamilyGroup, setUserFamilyGroup] = useState<any>(null);
  const [userHostInfo, setUserHostInfo] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [organizationDetails, setOrganizationDetails] = useState<any>(null);

  // Temporarily disable console logging to prevent infinite loop
  // console.log('🎭 [USER ROLE] Hook called with:', {
  //   userEmail: user?.email,
  //   userId: user?.id,
  //   userMetadata: user?.user_metadata,
  //   familyGroupsCount: familyGroups.length,
  //   organizationId: organization?.id,
  //   organizationName: organization?.name,
  //   organizationAdminEmail: organization?.admin_email,
  //   organizationTreasurerEmail: organization?.treasurer_email,
  //   organizationCalendarKeeperEmail: organization?.calendar_keeper_email
  // });

  // Fetch full organization details
  useEffect(() => {
    const fetchOrgDetails = async () => {
      if (!activeOrganization?.organization_id) {
        setOrganizationDetails(null);
        return;
      }

      const { data, error } = await secureSelect('organizations', createOrganizationContext(activeOrganization.organization_id), { skipIsolation: true })
        .eq('id', activeOrganization.organization_id)
        .single();

      if (!error && data) {
        setOrganizationDetails(data);
      }
    };

    fetchOrgDetails();
  }, [activeOrganization?.organization_id]);

  useEffect(() => {
    const checkUserRole = () => {
      if (!user?.email || familyGroupsLoading || organizationLoading) {
      // Temporarily disable detailed logging to prevent infinite loop
      // console.log('🎭 [USER ROLE] Still loading:', { 
      //   hasUserEmail: !!user?.email,
      //   familyGroupsLoading,
      //   organizationLoading
      // });
        setLoading(true);
        return;
      }

      // console.log('🎭 [USER ROLE] Checking roles for user:', user.email);
      
      // Get user display name for matching
      const userDisplayName = user.user_metadata?.display_name || 
                             user.user_metadata?.full_name ||
                             `${user.user_metadata?.first_name || ''} ${user.user_metadata?.last_name || ''}`.trim();

      // Check if user is a calendar keeper
      const isCalKeeper = organizationDetails?.calendar_keeper_email?.toLowerCase() === user.email.toLowerCase();
      // Temporarily disable to prevent infinite loop
      // console.log('🎭 [USER ROLE] Calendar keeper check:', {
      //   organizationCalendarKeeperEmail: organization?.calendar_keeper_email,
      //   userEmail: user.email,
      //   isCalendarKeeper: isCalKeeper
      // });
      setIsCalendarKeeper(isCalKeeper);

      const resolved = resolveFamilyRole(familyGroups, { id: user.id, email: user.email, name: userDisplayName }, claimedProfile);
      setIsGroupLead(resolved.isLead);
      setIsNameMatchedGroupLead(resolved.isLead && resolved.nameMatched);
      setIsNameMatchedMember(!resolved.isLead && resolved.nameMatched);
      setUserFamilyGroup(resolved.group);
      setUserHostInfo(resolved.member);

      // Check admin/treasurer roles from organization table AND user_organizations table
      const isTreasurer = organizationDetails?.treasurer_email?.toLowerCase() === user?.email?.toLowerCase();
      const isOrgAdmin = organizationDetails?.admin_email?.toLowerCase() === user?.email?.toLowerCase();
      
      // ADMINISTRATOR FIX: Check if user has admin role in user_organizations table
      const isUserOrganizationAdmin = activeOrganization?.role === 'admin';
      const isAdmin = isOrgAdmin || isUserOrganizationAdmin;
      
      // Temporarily disable to prevent infinite loop
      // console.log('🎭 [USER ROLE] Final role determination:', {
      //   userEmail: user.email,
      //   userDisplayName,
      //   isOrgAdmin,
      //   isUserOrganizationAdmin,
      //   isAdmin,
      //   isTreasurer,
      //   isCalendarKeeper: isCalKeeper,
      //   isGroupLead: !!leadGroup,
      //   isNameMatchedGroupLead: !!nameMatchedLeadGroup,
      //   isGroupMember: !leadGroup && !!userHostInfo,
      //   isNameMatchedMember: isNameMatchedMember,
      //   isHost: !leadGroup && !!userHostInfo?.canHost,
      //   organizationAdminEmail: organization?.admin_email,
      //   organizationTreasurerEmail: organization?.treasurer_email,
      //   activeOrganizationRole: activeOrganization?.role,
      //   foundLeadGroup: leadGroup?.name,
      //   nameMatchedLeadGroup: nameMatchedLeadGroup?.name,
      //   familyGroupsWithLeadEmails: familyGroups.filter(g => g.lead_email).map(g => ({ name: g.name, lead_email: g.lead_email }))
      // });
      
      setLoading(false);
    };

    checkUserRole();
  }, [
    impersonatedFamilyGroup,
    claimedProfile,
    user?.email, 
    user?.id, 
    user?.user_metadata?.display_name,
    user?.user_metadata?.full_name,
    user?.user_metadata?.first_name,
    user?.user_metadata?.last_name,
    familyGroups, 
    familyGroupsLoading, 
    organizationDetails,
    organizationLoading, 
    activeOrganization?.role,
    activeOrganization?.organization_id
  ]);

  // Check if admin is impersonating a family group
  const isAdmin = organizationDetails?.admin_email?.toLowerCase() === user?.email?.toLowerCase() || activeOrganization?.role === 'admin';
  const impersonatedGroup = impersonatedFamilyGroup && isAdmin 
    ? familyGroups.find(fg => fg.name === impersonatedFamilyGroup)
    : null;

  return {
    isGroupLead,
    isNameMatchedGroupLead,
    isGroupMember: !isGroupLead && !!userHostInfo,
    isNameMatchedMember,
    isHost: !isGroupLead && !!userHostInfo?.canHost,
    isCalendarKeeper,
    isTreasurer: organizationDetails?.treasurer_email?.toLowerCase() === user?.email?.toLowerCase(),
    isAdmin,
    userFamilyGroup: impersonatedGroup || userFamilyGroup,
    userHostInfo: impersonatedGroup ? null : userHostInfo,
    claimedProfile,
    loading: loading || (!!user?.id && !!activeOrganization?.organization_id && (claimPending || claimFetching)),
  };
};
