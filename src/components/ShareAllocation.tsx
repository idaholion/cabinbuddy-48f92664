import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useOrganization } from '@/hooks/useOrganization';
import { useUserRole } from '@/hooks/useUserRole';

interface MemberAllocation {
  member_name: string;
  member_email: string;
  allocated_shares: number;
}

export const ShareAllocation = () => {
  const { organization } = useOrganization();
  const { userFamilyGroup } = useUserRole();
  const { toast } = useToast();
  const [allocations, setAllocations] = useState<MemberAllocation[]>([]);
  const [groupTotalShares, setGroupTotalShares] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (organization?.id && userFamilyGroup) {
      fetchGroupShares();
      fetchMemberAllocations();
    }
  }, [organization?.id, userFamilyGroup]);

  const getUserFamilyGroupName = () => {
    if (!userFamilyGroup) return null;
    // Handle case where userFamilyGroup might be an object with a name property
    return typeof userFamilyGroup === 'string' ? userFamilyGroup : userFamilyGroup.name;
  };

  const fetchGroupShares = async () => {
    try {
      const groupName = getUserFamilyGroupName();
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
      const groupName = getUserFamilyGroupName();
      if (!groupName) return;
      
      // First, get the family group with its host members
      const { data: familyGroup, error: groupError } = await supabase
        .from('family_groups')
        .select('host_members, lead_name, lead_email')
        .eq('organization_id', organization?.id)
        .eq('name', groupName)
        .maybeSingle();

      if (groupError) {
        console.error('Error fetching family group:', groupError);
        throw new Error(`Failed to fetch family group: ${groupError.message}`);
      }

      if (!familyGroup) {
        throw new Error('Family group not found');
      }

      // Get existing share allocations
      const { data: existingAllocations, error: allocError } = await supabase
        .from('member_share_allocations')
        .select('*')
        .eq('organization_id', organization?.id)
        .eq('family_group_name', groupName);

      if (allocError) throw allocError;

      // Create allocation map from existing data
      const allocationMap = new Map(
        existingAllocations?.map(item => [item.member_name, item.allocated_shares]) || []
      );

      // Build allocations list from host members + group lead
      const memberAllocations: MemberAllocation[] = [];
      
      // Add the group lead
      if (familyGroup?.lead_name) {
        memberAllocations.push({
          member_name: familyGroup.lead_name,
          member_email: familyGroup.lead_email || '',
          allocated_shares: allocationMap.get(familyGroup.lead_name) || 0
        });
      }

      // Add host members
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

      setAllocations(memberAllocations);
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to fetch host members and allocations",
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
      const groupName = getUserFamilyGroupName();
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
      <Card>
        <CardHeader>
          <CardTitle>Share Distribution for {getUserFamilyGroupName()}</CardTitle>
          <p className="text-sm text-muted-foreground">
            Allocated: {totalAllocated} / {groupTotalShares} shares
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          {allocations.length === 0 ? (
            <p className="text-muted-foreground text-center py-4">
              No host members found. Please add host members to your family group first.
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