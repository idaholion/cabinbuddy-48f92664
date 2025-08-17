import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useOrganization } from '@/hooks/useOrganization';
import { useFamilyGroups } from '@/hooks/useFamilyGroups';

interface VotingSettingsData {
  total_shares: number;
}

interface FamilyGroupShare {
  family_group_name: string;
  allocated_shares: number;
}

export const VotingSettings = () => {
  const { organization } = useOrganization();
  const { familyGroups } = useFamilyGroups();
  const { toast } = useToast();
  const [settings, setSettings] = useState<VotingSettingsData>({ total_shares: 100 });
  const [groupShares, setGroupShares] = useState<FamilyGroupShare[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (organization?.id) {
      fetchVotingSettings();
      fetchGroupShares();
    }
  }, [organization?.id]);

  const fetchVotingSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('organization_voting_settings')
        .select('*')
        .eq('organization_id', organization?.id)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      if (data) {
        setSettings({ total_shares: data.total_shares });
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to fetch voting settings",
        variant: "destructive",
      });
    }
  };

  const fetchGroupShares = async () => {
    try {
      const { data, error } = await supabase
        .from('family_group_shares')
        .select('*')
        .eq('organization_id', organization?.id);

      if (error) throw error;

      const shareMap = new Map(data?.map(item => [item.family_group_name, item.allocated_shares]) || []);
      
      const updatedShares = familyGroups.map(group => ({
        family_group_name: group.name,
        allocated_shares: shareMap.get(group.name) || 0
      }));

      setGroupShares(updatedShares);
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to fetch group shares",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const saveSettings = async () => {
    try {
      const { error } = await supabase
        .from('organization_voting_settings')
        .upsert({
          organization_id: organization?.id,
          total_shares: settings.total_shares,
        });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Voting settings saved successfully",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to save voting settings",
        variant: "destructive",
      });
    }
  };

  const saveGroupShares = async () => {
    try {
      const totalAllocated = groupShares.reduce((sum, group) => sum + group.allocated_shares, 0);
      
      if (totalAllocated > settings.total_shares) {
        toast({
          title: "Error",
          description: `Total allocated shares (${totalAllocated}) cannot exceed total shares (${settings.total_shares})`,
          variant: "destructive",
        });
        return;
      }

      for (const groupShare of groupShares) {
        const { error } = await supabase
          .from('family_group_shares')
          .upsert({
            organization_id: organization?.id,
            family_group_name: groupShare.family_group_name,
            allocated_shares: groupShare.allocated_shares,
          });

        if (error) throw error;
      }

      toast({
        title: "Success",
        description: "Group share allocations saved successfully",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to save group shares",
        variant: "destructive",
      });
    }
  };

  const updateGroupShare = (groupName: string, shares: number) => {
    setGroupShares(prev => 
      prev.map(group => 
        group.family_group_name === groupName 
          ? { ...group, allocated_shares: shares }
          : group
      )
    );
  };

  const totalAllocated = groupShares.reduce((sum, group) => sum + group.allocated_shares, 0);

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Organization Voting Settings</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="total_shares">Total Organization Shares</Label>
            <Input
              id="total_shares"
              type="number"
              value={settings.total_shares}
              onChange={(e) => setSettings({ ...settings, total_shares: parseInt(e.target.value) || 0 })}
              min="1"
            />
          </div>
          <Button onClick={saveSettings}>Save Settings</Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Family Group Share Allocation</CardTitle>
          <p className="text-sm text-muted-foreground">
            Allocated: {totalAllocated} / {settings.total_shares} shares
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          {groupShares.map((group) => (
            <div key={group.family_group_name} className="flex items-center justify-between">
              <Label className="flex-1">{group.family_group_name}</Label>
              <Input
                type="number"
                value={group.allocated_shares}
                onChange={(e) => updateGroupShare(group.family_group_name, parseInt(e.target.value) || 0)}
                min="0"
                max={settings.total_shares}
                className="w-24"
              />
            </div>
          ))}
          <Button onClick={saveGroupShares} className="w-full">
            Save Group Allocations
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};