import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useOrganization } from '@/hooks/useOrganization';
import { useUserRole } from '@/hooks/useUserRole';
import { Plus, Trash2 } from 'lucide-react';

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
  const [newMember, setNewMember] = useState({ name: '', email: '', shares: 0 });

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
      
      const { data, error } = await supabase
        .from('member_share_allocations')
        .select('*')
        .eq('organization_id', organization?.id)
        .eq('family_group_name', groupName);

      if (error) throw error;

      setAllocations(data?.map(item => ({
        member_name: item.member_name,
        member_email: item.member_email || '',
        allocated_shares: item.allocated_shares
      })) || []);
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to fetch member allocations",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const addMember = () => {
    if (!newMember.name.trim()) {
      toast({
        title: "Error",
        description: "Member name is required",
        variant: "destructive",
      });
      return;
    }

    setAllocations(prev => [...prev, {
      member_name: newMember.name,
      member_email: newMember.email,
      allocated_shares: newMember.shares
    }]);
    setNewMember({ name: '', email: '', shares: 0 });
  };

  const removeMember = (index: number) => {
    setAllocations(prev => prev.filter((_, i) => i !== index));
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
          {allocations.map((member, index) => (
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
              <Button
                variant="outline"
                size="sm"
                onClick={() => removeMember(index)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}

          <div className="border-t pt-4">
            <h3 className="font-medium mb-3">Add New Member</h3>
            <div className="flex gap-2">
              <Input
                placeholder="Member name"
                value={newMember.name}
                onChange={(e) => setNewMember({ ...newMember, name: e.target.value })}
              />
              <Input
                placeholder="Email (optional)"
                value={newMember.email}
                onChange={(e) => setNewMember({ ...newMember, email: e.target.value })}
              />
              <Input
                type="number"
                placeholder="Shares"
                value={newMember.shares}
                onChange={(e) => setNewMember({ ...newMember, shares: parseInt(e.target.value) || 0 })}
                min="0"
                className="w-20"
              />
              <Button onClick={addMember}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <Button onClick={saveAllocations} className="w-full">
            Save Share Allocations
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};