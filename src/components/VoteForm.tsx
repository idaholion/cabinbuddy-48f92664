import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useOrganization } from '@/hooks/useOrganization';
import { useUserRole } from '@/hooks/useUserRole';
import { useAuth } from '@/contexts/AuthContext';

interface VotingProposal {
  id: string;
  title: string;
  status: string;
}

interface UserAllocation {
  allocated_shares: number;
}

interface ExistingVote {
  id: string;
  proposal_id: string;
  shares_used: number;
  vote_choice: string;
  voted_by_user_id: string;
}

export const VoteForm = () => {
  const { organization } = useOrganization();
  const { userFamilyGroup } = useUserRole();
  const { user } = useAuth();
  const { toast } = useToast();
  const [proposals, setProposals] = useState<VotingProposal[]>([]);
  const [userAllocation, setUserAllocation] = useState<UserAllocation | null>(null);
  const [selectedProposal, setSelectedProposal] = useState('');
  const [votingShares, setVotingShares] = useState(0);
  const [voteChoice, setVoteChoice] = useState('');
  const [loading, setLoading] = useState(false);
  const [existingVote, setExistingVote] = useState<ExistingVote | null>(null);

  useEffect(() => {
    if (organization?.id && user?.id) {
      fetchActiveProposals();
      fetchUserAllocation();
    }
  }, [organization?.id, user?.id]);

  useEffect(() => {
    if (selectedProposal && user?.id) {
      checkExistingVote();
    }
  }, [selectedProposal, user?.id]);

  const fetchActiveProposals = async () => {
    try {
      const { data, error } = await supabase
        .from('voting_proposals')
        .select('id, title, status')
        .eq('organization_id', organization?.id)
        .eq('status', 'active');

      if (error) throw error;

      setProposals(data || []);
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to fetch proposals",
        variant: "destructive",
      });
    }
  };

  const fetchUserAllocation = async () => {
    try {
      const { data, error } = await supabase
        .from('member_share_allocations')
        .select('allocated_shares')
        .eq('organization_id', organization?.id)
        .eq('member_email', user?.email)
        .single();

      if (error && error.code !== 'PGRST116') throw error;

      setUserAllocation(data ? { allocated_shares: data.allocated_shares } : null);
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to fetch your share allocation",
        variant: "destructive",
      });
    }
  };

  const checkExistingVote = async () => {
    try {
      const { data, error } = await supabase
        .from('votes')
        .select('id, proposal_id, shares_used, vote_choice, voted_by_user_id')
        .eq('proposal_id', selectedProposal)
        .eq('voted_by_user_id', user?.id)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') throw error;

      setExistingVote(data);
    } catch (error: any) {
      console.error('Error checking existing vote:', error);
    }
  };

  const getUserShares = () => {
    return userAllocation?.allocated_shares || 0;
  };

  const castVote = async () => {
    try {
      if (!selectedProposal || !voteChoice || votingShares <= 0) {
        toast({
          title: "Error",
          description: "Please fill in all fields",
          variant: "destructive",
        });
        return;
      }

      if (!userAllocation) {
        toast({
          title: "Error", 
          description: "You don't have any voting shares allocated",
          variant: "destructive",
        });
        return;
      }

      const maxShares = getUserShares();
      if (votingShares > maxShares) {
        toast({
          title: "Error",
          description: `Cannot vote with more shares than allocated (${maxShares})`,
          variant: "destructive",
        });
        return;
      }

      if (existingVote) {
        toast({
          title: "Error",
          description: "You have already voted on this proposal",
          variant: "destructive",
        });
        return;
      }

      setLoading(true);

      // Insert the vote
      const { error: voteError } = await supabase
        .from('votes')
        .insert({
          proposal_id: selectedProposal,
          organization_id: organization?.id,
          voter_name: user?.email || 'Unknown',
          voter_email: user?.email,
          family_group_name: typeof userFamilyGroup === 'string' ? userFamilyGroup : userFamilyGroup?.name || 'Unknown',
          shares_used: votingShares,
          vote_choice: voteChoice,
          voted_by_user_id: user?.id
        });

      if (voteError) throw voteError;

      // Update proposal vote counts
      const { data: currentProposal, error: fetchError } = await supabase
        .from('voting_proposals')
        .select('total_shares_voted, shares_for, shares_against, shares_abstain')
        .eq('id', selectedProposal)
        .single();

      if (fetchError) throw fetchError;

      const newTotalVoted = currentProposal.total_shares_voted + votingShares;
      const newSharesFor = voteChoice === 'for' 
        ? currentProposal.shares_for + votingShares 
        : currentProposal.shares_for;
      const newSharesAgainst = voteChoice === 'against' 
        ? currentProposal.shares_against + votingShares 
        : currentProposal.shares_against;
      const newSharesAbstain = voteChoice === 'abstain'
        ? (currentProposal.shares_abstain || 0) + votingShares
        : (currentProposal.shares_abstain || 0);

      const { error: updateError } = await supabase
        .from('voting_proposals')
        .update({
          total_shares_voted: newTotalVoted,
          shares_for: newSharesFor,
          shares_against: newSharesAgainst,
          shares_abstain: newSharesAbstain
        })
        .eq('id', selectedProposal);

      if (updateError) throw updateError;

      toast({
        title: "Success",
        description: "Vote cast successfully",
      });

      // Reset form
      setSelectedProposal('');
      setVotingShares(0);
      setVoteChoice('');
      setExistingVote(null);

    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to cast vote",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (!userAllocation) {
    return (
      <div className="space-y-4">
        <p className="text-muted-foreground text-center py-4">
          You don't have any voting shares allocated. Contact your family group lead or organization admin.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {proposals.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-muted-foreground mb-2">No active proposals available</p>
          <p className="text-sm text-muted-foreground">
            Check back later or create a new proposal to get started.
          </p>
        </div>
      ) : (
        <>
          {existingVote && (
            <div className="p-3 bg-muted rounded-lg">
              <p className="text-sm text-muted-foreground">
                You have already voted on this proposal with {existingVote.shares_used} shares ({existingVote.vote_choice}).
              </p>
            </div>
          )}

          <div>
            <Label htmlFor="proposal">Select Proposal</Label>
            <Select value={selectedProposal} onValueChange={setSelectedProposal}>
              <SelectTrigger>
                <SelectValue placeholder="Choose a proposal to vote on" />
              </SelectTrigger>
              <SelectContent>
                {proposals.map((proposal) => (
                  <SelectItem key={proposal.id} value={proposal.id}>
                    {proposal.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="shares">Number of Shares to Use</Label>
            <Input
              id="shares"
              type="number"
              value={votingShares}
              onChange={(e) => setVotingShares(parseInt(e.target.value) || 0)}
              min="1"
              max={getUserShares()}
              placeholder="Enter number of shares"
              disabled={!!existingVote}
            />
            <p className="text-xs text-muted-foreground mt-1">
              Available: {getUserShares()} shares
            </p>
          </div>

          <div>
            <Label htmlFor="choice">Vote Choice</Label>
            <Select value={voteChoice} onValueChange={setVoteChoice} disabled={!!existingVote}>
              <SelectTrigger>
                <SelectValue placeholder="Select your vote" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="for">For</SelectItem>
                <SelectItem value="against">Against</SelectItem>
                <SelectItem value="abstain">Abstain</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Button 
            onClick={castVote} 
            disabled={loading || !selectedProposal || !voteChoice || votingShares <= 0 || !!existingVote}
            className="w-full"
          >
            {loading ? "Casting Vote..." : existingVote ? "Already Voted" : "Cast Vote"}
          </Button>
        </>
      )}
    </div>
  );
};