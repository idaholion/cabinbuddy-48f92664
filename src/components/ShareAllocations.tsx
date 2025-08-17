import { useState, useEffect } from 'react';
import { useOrganization } from '@/hooks/useOrganization';
import { useUserRole } from '@/hooks/useUserRole';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Loader2, Save, Plus, Users, Trash2 } from 'lucide-react';

interface MemberAllocation {
  id?: string;
  member_name: string;
  member_email: string;
  allocated_shares: number;
}

interface FamilyGroupShare {
  family_group_name: string;
  allocated_shares: number;
}

export function ShareAllocations() {
  const { organization } = useOrganization();
  const { userFamilyGroup } = useUserRole();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [groupShares, setGroupShares] = useState<FamilyGroupShare | null>(null);
  const [memberAllocations, setMemberAllocations] = useState<MemberAllocation[]>([]);
  const [showAddMember, setShowAddMember] = useState(false);
  const [newMember, setNewMember] = useState({ name: '', email: '', shares: 0 });

  useEffect(() => {
    if (organization?.id && userFamilyGroup) {
      fetchGroupShares();
      fetchMemberAllocations();
    }
  }, [organization?.id, userFamilyGroup]);

  const fetchGroupShares = async () => {
    if (!organization?.id || !userFamilyGroup) return;

    try {
      const { data, error } = await supabase
        .from('family_group_shares')
        .select('*')
        .eq('organization_id', organization.id)
        .eq('family_group_name', userFamilyGroup)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      setGroupShares(data);
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to fetch group shares",
        variant: "destructive",
      });
    }
  };

  const fetchMemberAllocations = async () => {
    if (!organization?.id || !userFamilyGroup) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('member_share_allocations')
        .select('*')
        .eq('organization_id', organization.id)
        .eq('family_group_name', userFamilyGroup);

      if (error) throw error;

      setMemberAllocations(data || []);
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

  const saveMemberAllocations = async () => {
    if (!organization?.id || !userFamilyGroup) return;

    setSaving(true);
    try {
      for (const member of memberAllocations) {
        const { error } = await supabase
          .from('member_share_allocations')
          .upsert({
            organization_id: organization.id,
            family_group_name: userFamilyGroup,
            member_name: member.member_name,
            member_email: member.member_email,
            allocated_shares: member.allocated_shares,
            allocated_by_user_id: (await supabase.auth.getUser()).data.user?.id,
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
    } finally {
      setSaving(false);
    }
  };

  const addMember = () => {
    if (!newMember.name.trim()) return;

    const member: MemberAllocation = {
      member_name: newMember.name,
      member_email: newMember.email,
      allocated_shares: newMember.shares,
    };

    setMemberAllocations(prev => [...prev, member]);
    setNewMember({ name: '', email: '', shares: 0 });
    setShowAddMember(false);
  };

  const updateMemberShares = (index: number, shares: number) => {
    setMemberAllocations(prev => 
      prev.map((member, i) => 
        i === index ? { ...member, allocated_shares: shares } : member
      )
    );
  };

  const removeMember = async (index: number) => {
    const member = memberAllocations[index];
    
    if (member.id) {
      try {
        const { error } = await supabase
          .from('member_share_allocations')
          .delete()
          .eq('id', member.id);

        if (error) throw error;
      } catch (error: any) {
        toast({
          title: "Error",
          description: "Failed to remove member allocation",
          variant: "destructive",
        });
        return;
      }
    }

    setMemberAllocations(prev => prev.filter((_, i) => i !== index));
  };

  const totalAllocatedShares = memberAllocations.reduce((sum, member) => sum + member.allocated_shares, 0);
  const availableShares = groupShares?.allocated_shares || 0;
  const remainingShares = availableShares - totalAllocatedShares;

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!groupShares) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>No Shares Allocated</CardTitle>
          <CardDescription>
            Your family group has not been allocated any shares yet. Contact your organization administrator.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Share Distribution for {userFamilyGroup}
          </CardTitle>
          <CardDescription>
            Distribute your group's shares among family members. Only you can see this allocation.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="bg-muted p-4 rounded-lg mb-4">
            <div className="flex justify-between text-sm">
              <span>Total Group Shares:</span>
              <span className="font-medium">{availableShares}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span>Allocated to Members:</span>
              <span className="font-medium">{totalAllocatedShares}</span>
            </div>
            <div className="flex justify-between text-sm border-t pt-1 mt-1">
              <span>Remaining:</span>
              <span className={`font-medium ${remainingShares < 0 ? 'text-destructive' : 'text-muted-foreground'}`}>
                {remainingShares}
              </span>
            </div>
          </div>

          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-medium">Member Allocations</h3>
            <Dialog open={showAddMember} onOpenChange={setShowAddMember}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Member
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add Family Member</DialogTitle>
                  <DialogDescription>
                    Add a new family member and allocate shares to them.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="member-name">Name</Label>
                    <Input
                      id="member-name"
                      value={newMember.name}
                      onChange={(e) => setNewMember(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="Enter member name"
                    />
                  </div>
                  <div>
                    <Label htmlFor="member-email">Email (Optional)</Label>
                    <Input
                      id="member-email"
                      type="email"
                      value={newMember.email}
                      onChange={(e) => setNewMember(prev => ({ ...prev, email: e.target.value }))}
                      placeholder="Enter member email"
                    />
                  </div>
                  <div>
                    <Label htmlFor="member-shares">Allocated Shares</Label>
                    <Input
                      id="member-shares"
                      type="number"
                      value={newMember.shares}
                      onChange={(e) => setNewMember(prev => ({ ...prev, shares: parseInt(e.target.value) || 0 }))}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setShowAddMember(false)}>
                    Cancel
                  </Button>
                  <Button onClick={addMember} disabled={!newMember.name.trim()}>
                    Add Member
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Member Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Allocated Shares</TableHead>
                <TableHead className="w-[100px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {memberAllocations.map((member, index) => (
                <TableRow key={index}>
                  <TableCell className="font-medium">{member.member_name}</TableCell>
                  <TableCell>{member.member_email || 'Not provided'}</TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      value={member.allocated_shares}
                      onChange={(e) => updateMemberShares(index, parseInt(e.target.value) || 0)}
                      className="w-24"
                    />
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeMember(index)}
                      className="h-8 w-8 p-0"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {memberAllocations.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-muted-foreground">
                    No members added yet. Click "Add Member" to get started.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>

          <div className="flex justify-end pt-4">
            <Button onClick={saveMemberAllocations} disabled={saving || remainingShares < 0}>
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Save Allocations
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}