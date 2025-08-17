import { useState, useEffect } from 'react';
import { useOrganization } from '@/hooks/useOrganization';
import { useFamilyGroups } from '@/hooks/useFamilyGroups';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2, Save, Settings } from 'lucide-react';

interface VotingSettings {
  id?: string;
  total_shares: number;
}

interface FamilyGroupShare {
  id?: string;
  family_group_name: string;
  allocated_shares: number;
}

export function VotingSettings() {
  const { organization } = useOrganization();
  const { familyGroups } = useFamilyGroups();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [votingSettings, setVotingSettings] = useState<VotingSettings>({ total_shares: 100 });
  const [familyShares, setFamilyShares] = useState<FamilyGroupShare[]>([]);

  useEffect(() => {
    if (organization?.id) {
      fetchVotingSettings();
      fetchFamilyShares();
    }
  }, [organization?.id]);

  const fetchVotingSettings = async () => {
    if (!organization?.id) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('organization_voting_settings')
        .select('*')
        .eq('organization_id', organization.id)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      if (data) {
        setVotingSettings(data);
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to fetch voting settings",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchFamilyShares = async () => {
    if (!organization?.id) return;

    try {
      const { data, error } = await supabase
        .from('family_group_shares')
        .select('*')
        .eq('organization_id', organization.id);

      if (error) throw error;

      // Create shares for all family groups
      const shares = familyGroups.map(group => {
        const existingShare = data?.find(s => s.family_group_name === group.name);
        return {
          id: existingShare?.id,
          family_group_name: group.name,
          allocated_shares: existingShare?.allocated_shares || 0
        };
      });

      setFamilyShares(shares);
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to fetch family group shares",
        variant: "destructive",
      });
    }
  };

  const saveSettings = async () => {
    if (!organization?.id) return;

    setSaving(true);
    try {
      // Save voting settings
      const { error: settingsError } = await supabase
        .from('organization_voting_settings')
        .upsert({
          organization_id: organization.id,
          total_shares: votingSettings.total_shares,
        });

      if (settingsError) throw settingsError;

      // Save family group shares
      for (const share of familyShares) {
        const { error } = await supabase
          .from('family_group_shares')
          .upsert({
            organization_id: organization.id,
            family_group_name: share.family_group_name,
            allocated_shares: share.allocated_shares,
          });

        if (error) throw error;
      }

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
    } finally {
      setSaving(false);
    }
  };

  const updateFamilyShares = (groupName: string, shares: number) => {
    setFamilyShares(prev => 
      prev.map(group => 
        group.family_group_name === groupName 
          ? { ...group, allocated_shares: shares }
          : group
      )
    );
  };

  const totalAllocatedShares = familyShares.reduce((sum, group) => sum + group.allocated_shares, 0);
  const remainingShares = votingSettings.total_shares - totalAllocatedShares;

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Organization Voting Settings
          </CardTitle>
          <CardDescription>
            Configure the total number of shares and allocate them to family groups
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid w-full max-w-sm items-center gap-1.5">
            <Label htmlFor="total-shares">Total Organization Shares</Label>
            <Input
              id="total-shares"
              type="number"
              value={votingSettings.total_shares}
              onChange={(e) => setVotingSettings(prev => ({ 
                ...prev, 
                total_shares: parseInt(e.target.value) || 0 
              }))}
            />
          </div>

          <div className="bg-muted p-4 rounded-lg">
            <div className="flex justify-between text-sm">
              <span>Total Shares:</span>
              <span className="font-medium">{votingSettings.total_shares}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span>Allocated:</span>
              <span className="font-medium">{totalAllocatedShares}</span>
            </div>
            <div className="flex justify-between text-sm border-t pt-1 mt-1">
              <span>Remaining:</span>
              <span className={`font-medium ${remainingShares < 0 ? 'text-destructive' : 'text-muted-foreground'}`}>
                {remainingShares}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Family Group Share Allocation</CardTitle>
          <CardDescription>
            Allocate shares to each family group. Group leads will distribute their shares to members.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Family Group</TableHead>
                <TableHead>Allocated Shares</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {familyShares.map((group) => (
                <TableRow key={group.family_group_name}>
                  <TableCell className="font-medium">{group.family_group_name}</TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      value={group.allocated_shares}
                      onChange={(e) => updateFamilyShares(
                        group.family_group_name, 
                        parseInt(e.target.value) || 0
                      )}
                      className="w-24"
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          <div className="flex justify-end pt-4">
            <Button onClick={saveSettings} disabled={saving || remainingShares < 0}>
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Save Settings
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}