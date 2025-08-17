import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useOrganization } from '@/hooks/useOrganization';
import { Progress } from '@/components/ui/progress';

interface FamilyGroupShare {
  family_group_name: string;
  allocated_shares: number;
}

interface MemberAllocation {
  id?: string;
  family_group_name: string;
  member_name: string;
  member_email: string;
  allocated_shares: number;
}

interface FamilyGroupOverview {
  name: string;
  totalShares: number;
  members: MemberAllocation[];
  totalAllocated: number;
  remainingShares: number;
}

export const AdminShareOverview = () => {
  const { organization } = useOrganization();
  const { toast } = useToast();
  const [familyGroups, setFamilyGroups] = useState<FamilyGroupOverview[]>([]);
  const [loading, setLoading] = useState(true);
  const [organizationTotalShares, setOrganizationTotalShares] = useState(0);

  useEffect(() => {
    if (organization?.id) {
      fetchAllFamilyGroupData();
    }
  }, [organization?.id]);

  const fetchAllFamilyGroupData = async () => {
    try {
      setLoading(true);

      // Get organization voting settings
      const { data: votingSettings } = await supabase
        .from('organization_voting_settings')
        .select('total_shares')
        .eq('organization_id', organization?.id)
        .single();

      setOrganizationTotalShares(votingSettings?.total_shares || 0);

      // Get all family group shares
      const { data: familyGroupShares, error: sharesError } = await supabase
        .from('family_group_shares')
        .select('*')
        .eq('organization_id', organization?.id)
        .order('family_group_name');

      if (sharesError) throw sharesError;

      // Get all member allocations
      const { data: memberAllocations, error: allocError } = await supabase
        .from('member_share_allocations')
        .select('*')
        .eq('organization_id', organization?.id)
        .order('family_group_name, member_name');

      if (allocError) throw allocError;

      // Combine the data
      const groupOverviews: FamilyGroupOverview[] = (familyGroupShares || []).map((group: FamilyGroupShare) => {
        const groupMembers = (memberAllocations || []).filter(
          (member: MemberAllocation) => member.family_group_name === group.family_group_name
        );
        
        const totalAllocated = groupMembers.reduce((sum, member) => sum + member.allocated_shares, 0);
        
        return {
          name: group.family_group_name,
          totalShares: group.allocated_shares,
          members: groupMembers,
          totalAllocated,
          remainingShares: group.allocated_shares - totalAllocated
        };
      });

      setFamilyGroups(groupOverviews);
    } catch (error: any) {
      console.error('Error fetching family group data:', error);
      toast({
        title: "Error",
        description: "Failed to fetch family group share data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getTotalAllocatedShares = () => {
    return familyGroups.reduce((sum, group) => sum + group.totalShares, 0);
  };

  const getOrganizationRemainingShares = () => {
    return organizationTotalShares - getTotalAllocatedShares();
  };

  if (loading) {
    return <div>Loading organization share overview...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Organization Overview */}
      <Card>
        <CardHeader>
          <CardTitle>Organization Share Overview</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-primary">{organizationTotalShares}</div>
              <div className="text-sm text-muted-foreground">Total Shares</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{getTotalAllocatedShares()}</div>
              <div className="text-sm text-muted-foreground">Allocated to Groups</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">{getOrganizationRemainingShares()}</div>
              <div className="text-sm text-muted-foreground">Unallocated</div>
            </div>
          </div>
          <Progress 
            value={(getTotalAllocatedShares() / organizationTotalShares) * 100} 
            className="w-full" 
          />
          <div className="text-xs text-muted-foreground mt-1 text-center">
            {((getTotalAllocatedShares() / organizationTotalShares) * 100).toFixed(1)}% allocated
          </div>
        </CardContent>
      </Card>

      {/* Family Group Details */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {familyGroups.map((group) => (
          <Card key={group.name}>
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle className="text-lg">{group.name}</CardTitle>
                <Badge variant={group.remainingShares < 0 ? "destructive" : "secondary"}>
                  {group.totalShares} shares
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Group Summary */}
              <div className="grid grid-cols-3 gap-2 text-sm">
                <div className="text-center">
                  <div className="font-medium text-primary">{group.totalShares}</div>
                  <div className="text-muted-foreground">Allocated</div>
                </div>
                <div className="text-center">
                  <div className="font-medium text-green-600">{group.totalAllocated}</div>
                  <div className="text-muted-foreground">Distributed</div>
                </div>
                <div className="text-center">
                  <div className={`font-medium ${group.remainingShares < 0 ? 'text-red-600' : 'text-orange-600'}`}>
                    {group.remainingShares}
                  </div>
                  <div className="text-muted-foreground">Remaining</div>
                </div>
              </div>

              <Progress 
                value={group.totalShares > 0 ? (group.totalAllocated / group.totalShares) * 100 : 0} 
                className="w-full" 
              />

              {/* Member Details */}
              <div className="space-y-2">
                <div className="text-sm font-medium">Member Allocations:</div>
                {group.members.length === 0 ? (
                  <div className="text-sm text-muted-foreground italic">
                    No member allocations set
                  </div>
                ) : (
                  group.members.map((member, index) => (
                    <div key={index} className="flex justify-between items-center text-sm">
                      <div>
                        <div className="font-medium">{member.member_name}</div>
                        <div className="text-muted-foreground text-xs">{member.member_email}</div>
                      </div>
                      <Badge variant="outline">
                        {member.allocated_shares} shares
                      </Badge>
                    </div>
                  ))
                )}
              </div>

              {group.remainingShares < 0 && (
                <div className="p-2 bg-destructive/10 text-destructive text-sm rounded">
                  ⚠️ Over-allocated by {Math.abs(group.remainingShares)} shares
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {familyGroups.length === 0 && (
        <Card>
          <CardContent className="text-center py-8">
            <div className="text-muted-foreground">
              No family groups with share allocations found.
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};