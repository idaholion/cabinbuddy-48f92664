import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useOrganization } from '@/hooks/useOrganization';
import { useUserRole } from '@/hooks/useUserRole';
import { useOrgAdmin } from '@/hooks/useOrgAdmin';

interface MemberAllocation {
  member_name: string;
  member_email: string;
  allocated_shares: number;
}

export const ShareAllocation = () => {
  const { organization } = useOrganization();
  const { userFamilyGroup } = useUserRole();
  const { isAdmin } = useOrgAdmin();
  const { toast } = useToast();
  const [allocations, setAllocations] = useState<MemberAllocation[]>([]);
  const [groupTotalShares, setGroupTotalShares] = useState(0);
  const [loading, setLoading] = useState(true);
  const [availableFamilyGroups, setAvailableFamilyGroups] = useState<string[]>([]);
  const [selectedFamilyGroup, setSelectedFamilyGroup] = useState<string>('');

  useEffect(() => {
    if (organization?.id) {
      if (isAdmin) {
        fetchAvailableFamilyGroups();
      } else if (userFamilyGroup) {
        const groupName = getUserFamilyGroupName();
        if (groupName) {
          setSelectedFamilyGroup(groupName);
        }
      }
    }
  }, [organization?.id, userFamilyGroup, isAdmin]);

  useEffect(() => {
    if (selectedFamilyGroup) {
      fetchGroupShares();
      fetchMemberAllocations();
    }
  }, [selectedFamilyGroup]);

  const getUserFamilyGroupName = () => {
    if (!userFamilyGroup) return null;
    // Handle case where userFamilyGroup might be an object with a name property
    return typeof userFamilyGroup === 'string' ? userFamilyGroup : userFamilyGroup.name;
  };

  const fetchAvailableFamilyGroups = async () => {
    try {
      const { data, error } = await supabase
        .from('family_groups')
        .select('name')
        .eq('organization_id', organization?.id)
        .order('name');

      if (error) throw error;

      const groupNames = [...new Set(data?.map(group => group.name) || [])];
      setAvailableFamilyGroups(groupNames);
      
      // Auto-select user's family group if they have one
      const userGroup = getUserFamilyGroupName();
      if (userGroup && groupNames.includes(userGroup)) {
        setSelectedFamilyGroup(userGroup);
      } else if (groupNames.length > 0) {
        setSelectedFamilyGroup(groupNames[0]);
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to fetch family groups",
        variant: "destructive",
      });
    }
  };

  const fetchGroupShares = async () => {
    try {
      const groupName = isAdmin ? selectedFamilyGroup : getUserFamilyGroupName();
      if (!groupName) return;
      
      const { data, error } = await supabase
        .from('family_group_shares')
        .select('allocated_shares')
        .eq('organization_id', organization?.id)
        .eq('family_group_name', groupName)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      setGroupTotalShares(data?.allocated_shares || 0);
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to fetch group shares",
        variant: "destructive",
      });
    }
  };

  const fetchMemberAllocations = async () => {
    try {
      const groupName = isAdmin ? selectedFamilyGroup : getUserFamilyGroupName();
      if (!groupName) {
        console.log('No group name found');
        setLoading(false);
        return;
      }
      
      console.log('Fetching data for group:', groupName);
      
      // First, get the family group with its group members - prioritize the one with actual data
      const { data: familyGroups, error: groupError } = await supabase
        .from('family_groups')
        .select('host_members, lead_name, lead_email')
        .eq('organization_id', organization?.id)
        .eq('name', groupName)
        .order('updated_at', { ascending: false }); // Get the most recently updated one

      if (groupError) {
        console.error('Error fetching family group:', groupError);
        toast({
          title: "Error",
          description: `Failed to fetch family group: ${groupError.message}`,
          variant: "destructive",
        });
        return;
      }

      if (!familyGroups || familyGroups.length === 0) {
        console.error('No family group found for name:', groupName);
        toast({
          title: "Error",
          description: 'Family group not found',
          variant: "destructive",
        });
        return;
      }

      console.log('Found family groups:', familyGroups);

      // Find the group with actual data (has lead_name or host_members)
      const familyGroup = familyGroups.find(group => 
        group.lead_name || (group.host_members && Array.isArray(group.host_members) && group.host_members.length > 0)
      ) || familyGroups[0]; // fallback to first if none have data

      console.log('Selected family group:', familyGroup);

      // Get existing share allocations
      const { data: existingAllocations, error: allocError } = await supabase
        .from('member_share_allocations')
        .select('*')
        .eq('organization_id', organization?.id)
        .eq('family_group_name', groupName);

      if (allocError) {
        console.error('Error fetching allocations:', allocError);
        toast({
          title: "Error",
          description: `Failed to fetch allocations: ${allocError.message}`,
          variant: "destructive",
        });
        return;
      }

      console.log('Existing allocations:', existingAllocations);

      // Create allocation map from existing data
      const allocationMap = new Map(
        existingAllocations?.map(item => [item.member_name, item.allocated_shares]) || []
      );

      // Build allocations list from group members + group lead
      const memberAllocations: MemberAllocation[] = [];
      
      // Add the group lead with default allocation to all shares if no existing allocations
      if (familyGroup?.lead_name) {
        const hasExistingAllocations = existingAllocations && existingAllocations.length > 0;
        const defaultShares = hasExistingAllocations ? (allocationMap.get(familyGroup.lead_name) || 0) : groupTotalShares;
        
        memberAllocations.push({
          member_name: familyGroup.lead_name,
          member_email: familyGroup.lead_email || '',
          allocated_shares: defaultShares
        });
      }

      // Add group members
      if (familyGroup?.host_members && Array.isArray(familyGroup.host_members)) {
        familyGroup.host_members.forEach((member: any) => {
          if (member.name && member.name !== familyGroup.lead_name) {
            memberAllocations.push({
              member_name: member.name,
              member_email: member.email || '',
              allocated_shares: allocationMap.get(member.name) || 0
            });
          }
        });
      }

      console.log('Final member allocations:', memberAllocations);
      setAllocations(memberAllocations);
    } catch (error: any) {
      console.error('Unexpected error in fetchMemberAllocations:', error);
      toast({
        title: "Error",
        description: `Failed to fetch group members and allocations: ${error.message}`,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };



  const updateMemberShares = (index: number, shares: number) => {
    setAllocations(prev => 
      prev.map((member, i) => 
        i === index ? { ...member, allocated_shares: shares } : member
      )
    );
  };

  const saveAllocations = async () => {
    try {
      const totalAllocated = allocations.reduce((sum, member) => sum + member.allocated_shares, 0);
      
      if (totalAllocated > groupTotalShares) {
        toast({
          title: "Error",
          description: `Total allocated shares (${totalAllocated}) cannot exceed group shares (${groupTotalShares})`,
          variant: "destructive",
        });
        return;
      }

      // Delete existing allocations
      const groupName = isAdmin ? selectedFamilyGroup : getUserFamilyGroupName();
      if (!groupName) return;
      
      await supabase
        .from('member_share_allocations')
        .delete()
        .eq('organization_id', organization?.id)
        .eq('family_group_name', groupName);

      // Insert new allocations
      for (const allocation of allocations) {
        const { error } = await supabase
          .from('member_share_allocations')
          .insert({
            organization_id: organization?.id,
            family_group_name: groupName,
            member_name: allocation.member_name,
            member_email: allocation.member_email || null,
            allocated_shares: allocation.allocated_shares,
          });

        if (error) throw error;
      }

      toast({
        title: "Success",
        description: "Member share allocations saved successfully",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to save member allocations",
        variant: "destructive",
      });
    }
  };

  const totalAllocated = allocations.reduce((sum, member) => sum + member.allocated_shares, 0);

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="space-y-6">
      {isAdmin && (
        <Card>
          <CardHeader>
            <CardTitle>Administrator: Select Family Group</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <Label htmlFor="family-group-select">Family Group</Label>
              <Select value={selectedFamilyGroup} onValueChange={setSelectedFamilyGroup}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a family group" />
                </SelectTrigger>
                <SelectContent>
                  {availableFamilyGroups.map((groupName) => (
                    <SelectItem key={groupName} value={groupName}>
                      {groupName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>
      )}
      
      <Card>
        <CardHeader>
          <CardTitle>Share Distribution for {isAdmin ? selectedFamilyGroup : getUserFamilyGroupName()}</CardTitle>
          <p className="text-sm text-muted-foreground">
            Allocated: {totalAllocated} / {groupTotalShares} shares
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          {allocations.length === 0 ? (
            <p className="text-muted-foreground text-center py-4">
              No group members found. Please add group members to your family group first.
            </p>
          ) : (
            allocations.map((member, index) => (
              <div key={index} className="flex items-center gap-2 p-3 border rounded-lg">
                <div className="flex-1">
                  <p className="font-medium">{member.member_name}</p>
                  <p className="text-sm text-muted-foreground">{member.member_email}</p>
                </div>
                <Input
                  type="number"
                  value={member.allocated_shares}
                  onChange={(e) => updateMemberShares(index, parseInt(e.target.value) || 0)}
                  min="0"
                  max={groupTotalShares}
                  className="w-20"
                />
              </div>
            ))
          )}


          <Button onClick={saveAllocations} className="w-full">
            Save Share Allocations
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};