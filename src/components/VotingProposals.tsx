import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useOrganization } from '@/hooks/useOrganization';
import { useUserRole } from '@/hooks/useUserRole';
import { useAuth } from '@/contexts/AuthContext';
import { ProposalComments } from './ProposalComments';
import { Plus, Clock, CheckCircle, XCircle, MessageCircle } from 'lucide-react';
import { format } from 'date-fns';

interface VotingProposal {
  id: string;
  title: string;
  description: string;
  created_by_name: string;
  created_by_family_group: string;
  voting_deadline: string;
  status: string;
  total_shares_voted: number;
  shares_for: number;
  shares_against: number;
  created_at: string;
}

export const VotingProposals = () => {
  const { organization } = useOrganization();
  const { userFamilyGroup } = useUserRole();
  const { user } = useAuth();
  const { toast } = useToast();
  const [proposals, setProposals] = useState<VotingProposal[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [selectedProposal, setSelectedProposal] = useState<VotingProposal | null>(null);
  const [newProposal, setNewProposal] = useState({
    title: '',
    description: '',
    voting_deadline: ''
  });

  useEffect(() => {
    if (organization?.id) {
      fetchProposals();
    }
  }, [organization?.id]);

  const fetchProposals = async () => {
    try {
      const { data, error } = await supabase
        .from('voting_proposals')
        .select('*')
        .eq('organization_id', organization?.id)
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
    try {
      if (!newProposal.title.trim() || !newProposal.description.trim()) {
        toast({
          title: "Error",
          description: "Title and description are required",
          variant: "destructive",
        });
        return;
      }

      const { error } = await supabase
        .from('voting_proposals')
        .insert({
          organization_id: organization?.id,
          title: newProposal.title,
          description: newProposal.description,
          created_by_user_id: user?.id,
          created_by_name: user?.email?.split('@')[0] || 'Unknown',
          created_by_family_group: userFamilyGroup,
          voting_deadline: newProposal.voting_deadline ? new Date(newProposal.voting_deadline).toISOString() : null,
          status: 'active'
        });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Proposal created successfully",
      });

      setNewProposal({ title: '', description: '', voting_deadline: '' });
      setShowCreateForm(false);
      fetchProposals();
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to create proposal",
        variant: "destructive",
      });
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active':
        return <Clock className="h-4 w-4" />;
      case 'passed':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return <Clock className="h-4 w-4" />;
    }
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Voting Proposals</h3>
        <Button onClick={() => setShowCreateForm(!showCreateForm)} size="sm">
          <Plus className="h-4 w-4 mr-2" />
          New Proposal
        </Button>
      </div>

      {showCreateForm && (
        <Card>
          <CardHeader>
            <CardTitle>Create New Proposal</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                value={newProposal.title}
                onChange={(e) => setNewProposal({ ...newProposal, title: e.target.value })}
                placeholder="Proposal title"
              />
            </div>
            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={newProposal.description}
                onChange={(e) => setNewProposal({ ...newProposal, description: e.target.value })}
                placeholder="Detailed description of the proposal"
                rows={4}
              />
            </div>
            <div>
              <Label htmlFor="deadline">Voting Deadline (optional)</Label>
              <Input
                id="deadline"
                type="datetime-local"
                value={newProposal.voting_deadline}
                onChange={(e) => setNewProposal({ ...newProposal, voting_deadline: e.target.value })}
              />
            </div>
            <div className="flex gap-2">
              <Button onClick={createProposal}>Create Proposal</Button>
              <Button variant="outline" onClick={() => setShowCreateForm(false)}>
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="space-y-3">
        {proposals.length === 0 ? (
          <p className="text-muted-foreground text-center py-4">
            No proposals found. Create the first one!
          </p>
        ) : (
          proposals.map((proposal) => (
            <Card key={proposal.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      {getStatusIcon(proposal.status)}
                      <h4 className="font-semibold">{proposal.title}</h4>
                      <Badge variant={proposal.status === 'active' ? 'default' : 'secondary'}>
                        {proposal.status}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mb-2">
                      {proposal.description}
                    </p>
                    <div className="flex items-center gap-4 text-xs text-muted-foreground mb-3">
                      <span>By {proposal.created_by_family_group}</span>
                      <span>{format(new Date(proposal.created_at), 'MMM dd, yyyy')}</span>
                      {proposal.voting_deadline && (
                        <span>Deadline: {format(new Date(proposal.voting_deadline), 'MMM dd, yyyy HH:mm')}</span>
                      )}
                    </div>
                    
                    <div className="flex gap-2">
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button variant="outline" size="sm" onClick={() => setSelectedProposal(proposal)}>
                            <MessageCircle className="h-4 w-4 mr-2" />
                            Discuss
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                          <DialogHeader>
                            <DialogTitle>Proposal Discussion</DialogTitle>
                          </DialogHeader>
                          {selectedProposal && (
                            <ProposalComments 
                              proposalId={selectedProposal.id} 
                              proposalTitle={selectedProposal.title}
                            />
                          )}
                        </DialogContent>
                      </Dialog>
                    </div>
                  </div>
                  <div className="text-right text-sm">
                    <div className="text-muted-foreground">Votes Cast</div>
                    <div className="font-semibold">{proposal.total_shares_voted} shares</div>
                    <div className="text-xs text-muted-foreground">
                      For: {proposal.shares_for} | Against: {proposal.shares_against}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
};