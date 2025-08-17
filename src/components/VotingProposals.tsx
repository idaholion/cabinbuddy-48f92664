import { useState, useEffect } from 'react';
import { useOrganization } from '@/hooks/useOrganization';
import { useUserRole } from '@/hooks/useUserRole';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Loader2, Plus, Vote, Calendar, User } from 'lucide-react';
import { format } from 'date-fns';

interface VotingProposal {
  id: string;
  title: string;
  description: string | null;
  created_by_name: string | null;
  created_by_family_group: string | null;
  voting_deadline: string | null;
  status: string;
  total_shares_voted: number;
  shares_for: number;
  shares_against: number;
  created_at: string;
}

export function VotingProposals() {
  const { organization } = useOrganization();
  const { userFamilyGroup, isGroupLead } = useUserRole();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [proposals, setProposals] = useState<VotingProposal[]>([]);
  const [showCreateProposal, setShowCreateProposal] = useState(false);
  const [newProposal, setNewProposal] = useState({
    title: '',
    description: '',
    deadline: '',
  });

  useEffect(() => {
    if (organization?.id) {
      fetchProposals();
    }
  }, [organization?.id]);

  const fetchProposals = async () => {
    if (!organization?.id) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('voting_proposals')
        .select('*')
        .eq('organization_id', organization.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      setProposals(data || []);
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to fetch proposals",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const createProposal = async () => {
    if (!organization?.id || !userFamilyGroup) return;

    setSubmitting(true);
    try {
      const user = (await supabase.auth.getUser()).data.user;
      const deadline = newProposal.deadline ? new Date(newProposal.deadline).toISOString() : null;

      const { error } = await supabase
        .from('voting_proposals')
        .insert({
          organization_id: organization.id,
          title: newProposal.title,
          description: newProposal.description || null,
          created_by_user_id: user?.id,
          created_by_name: user?.user_metadata?.display_name || user?.email,
          created_by_family_group: userFamilyGroup,
          voting_deadline: deadline,
          status: 'active',
        });

      if (error) throw error;

      setNewProposal({ title: '', description: '', deadline: '' });
      setShowCreateProposal(false);
      fetchProposals();

      toast({
        title: "Success",
        description: "Proposal created successfully",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to create proposal",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusBadge = (status: string, deadline: string | null) => {
    if (status === 'closed') {
      return <Badge variant="secondary">Closed</Badge>;
    }
    
    if (deadline && new Date(deadline) < new Date()) {
      return <Badge variant="destructive">Expired</Badge>;
    }
    
    return <Badge variant="default">Active</Badge>;
  };

  const calculateProgress = (proposal: VotingProposal) => {
    const total = proposal.shares_for + proposal.shares_against;
    if (total === 0) return 0;
    return (proposal.shares_for / total) * 100;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Voting Proposals</h2>
          <p className="text-muted-foreground">
            View active proposals and cast your votes
          </p>
        </div>
        {isGroupLead && (
          <Dialog open={showCreateProposal} onOpenChange={setShowCreateProposal}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Create Proposal
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>Create New Proposal</DialogTitle>
                <DialogDescription>
                  Create a new proposal for the organization to vote on.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="proposal-title">Title</Label>
                  <Input
                    id="proposal-title"
                    value={newProposal.title}
                    onChange={(e) => setNewProposal(prev => ({ ...prev, title: e.target.value }))}
                    placeholder="Enter proposal title"
                  />
                </div>
                <div>
                  <Label htmlFor="proposal-description">Description</Label>
                  <Textarea
                    id="proposal-description"
                    value={newProposal.description}
                    onChange={(e) => setNewProposal(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Describe the proposal in detail"
                    rows={4}
                  />
                </div>
                <div>
                  <Label htmlFor="proposal-deadline">Voting Deadline (Optional)</Label>
                  <Input
                    id="proposal-deadline"
                    type="datetime-local"
                    value={newProposal.deadline}
                    onChange={(e) => setNewProposal(prev => ({ ...prev, deadline: e.target.value }))}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setShowCreateProposal(false)}>
                  Cancel
                </Button>
                <Button onClick={createProposal} disabled={!newProposal.title.trim() || submitting}>
                  {submitting ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    'Create Proposal'
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <div className="grid gap-6">
        {proposals.map((proposal) => (
          <Card key={proposal.id}>
            <CardHeader>
              <div className="flex justify-between items-start">
                <div className="space-y-1">
                  <CardTitle className="text-lg">{proposal.title}</CardTitle>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <User className="h-4 w-4" />
                      {proposal.created_by_name} ({proposal.created_by_family_group})
                    </div>
                    {proposal.voting_deadline && (
                      <div className="flex items-center gap-1">
                        <Calendar className="h-4 w-4" />
                        Deadline: {format(new Date(proposal.voting_deadline), 'MMM d, yyyy h:mm a')}
                      </div>
                    )}
                  </div>
                </div>
                {getStatusBadge(proposal.status, proposal.voting_deadline)}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {proposal.description && (
                <p className="text-muted-foreground">{proposal.description}</p>
              )}
              
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Voting Progress</span>
                  <span>{proposal.total_shares_voted} shares voted</span>
                </div>
                <Progress value={calculateProgress(proposal)} className="h-2" />
                <div className="flex justify-between text-sm text-muted-foreground">
                  <span>For: {proposal.shares_for} shares</span>
                  <span>Against: {proposal.shares_against} shares</span>
                </div>
              </div>

              {proposal.status === 'active' && (!proposal.voting_deadline || new Date(proposal.voting_deadline) > new Date()) && (
                <div className="flex gap-2 pt-2">
                  <Button variant="default" size="sm" className="flex-1">
                    <Vote className="h-4 w-4 mr-2" />
                    Vote For
                  </Button>
                  <Button variant="outline" size="sm" className="flex-1">
                    <Vote className="h-4 w-4 mr-2" />
                    Vote Against
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        ))}

        {proposals.length === 0 && (
          <Card>
            <CardContent className="text-center py-8">
              <Vote className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">No Proposals Yet</h3>
              <p className="text-muted-foreground mb-4">
                There are no voting proposals at this time.
              </p>
              {isGroupLead && (
                <Button onClick={() => setShowCreateProposal(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create First Proposal
                </Button>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}