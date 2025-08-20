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
import { useAuth } from '@/contexts/AuthContext';

interface VotingProposal {
  id: string;
  title: string;
  status: string;
}

interface UserAllocation {
  allocated_shares: number;
  family_group_name: string;
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
  const [hasVoted, setHasVoted] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (organization?.id && user?.id) {
      fetchActiveProposals();
      fetchUserAllocation();
    }
  }, [organization?.id, user?.id]);

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
        .from('user_share_allocations')
        .select('*')
        .eq('organization_id', organization?.id)
        .eq('user_id', user?.id)
        .single();

      if (error && error.code !== 'PGRST116') throw error;

      if (data) {
        setUserAllocation({
          allocated_shares: data.allocated_shares,
          family_group_name: data.family_group_name
        });
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to fetch your share allocation",
        variant: "destructive",
      });
    }
  };

  const checkExistingVotes = async () => {
    if (!selectedProposal || !user?.id) return;
    
    const { data, error } = await supabase
      .from('votes')
      .select('proposal_id')
      .eq('proposal_id', selectedProposal)
      .eq('user_id', user.id)
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('Error checking existing vote:', error);
      return;
    }

    setHasVoted(prev => ({ ...prev, [selectedProposal]: !!data }));
  };

  useEffect(() => {
    if (selectedProposal) {
      checkExistingVotes();
    }
  }, [selectedProposal, user?.id]);

  const castVote = async () => {
    try {
      if (!selectedProposal || !voteChoice || votingShares <= 0 || !user?.id || !userAllocation) {
        toast({
          title: "Error",
          description: "Please fill in all fields",
          variant: "destructive",
        });
        return;
      }

      if (votingShares > userAllocation.allocated_shares) {
        toast({
          title: "Error",
          description: `Cannot vote with more shares than allocated (${userAllocation.allocated_shares})`,
          variant: "destructive",
        });
        return;
      }

      if (hasVoted[selectedProposal]) {
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
          user_id: user.id,
          family_group_name: userAllocation.family_group_name,
          shares_used: votingShares,
          vote_choice: voteChoice,
        });

      if (voteError) throw voteError;

      // Update proposal vote counts
      const { data: currentProposal, error: fetchError } = await supabase
        .from('voting_proposals')
        .select('total_shares_voted, shares_for, shares_against')
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

      const { error: updateError } = await supabase
        .from('voting_proposals')
        .update({
          total_shares_voted: newTotalVoted,
          shares_for: newSharesFor,
          shares_against: newSharesAgainst
        })
        .eq('id', selectedProposal);

      if (updateError) throw updateError;

      toast({
        title: "Success",
        description: "Vote cast successfully",
      });

      // Update local state and reset form
      setHasVoted(prev => ({ ...prev, [selectedProposal]: true }));
      setSelectedProposal('');
      setVotingShares(0);
      setVoteChoice('');

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
      <div className="text-center p-4">
        <p className="text-muted-foreground">
          No share allocation found. Contact your family group lead or organization admin to get voting shares allocated.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="bg-muted/50 p-3 rounded-lg">
        <div className="text-sm font-medium">Your Voting Allocation</div>
        <div className="text-lg font-bold">{userAllocation.allocated_shares} shares</div>
        <div className="text-xs text-muted-foreground">Family Group: {userAllocation.family_group_name}</div>
      </div>

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
                {hasVoted[proposal.id] && (
                  <span className="ml-2 text-green-600">✓ Voted</span>
                )}
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
          max={userAllocation.allocated_shares}
          placeholder="Enter number of shares"
        />
        <p className="text-xs text-muted-foreground mt-1">
          Available: {userAllocation.allocated_shares} shares
        </p>
      </div>

      <div>
        <Label htmlFor="choice">Vote Choice</Label>
        <Select value={voteChoice} onValueChange={setVoteChoice}>
          <SelectTrigger>
            <SelectValue placeholder="Select your vote" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="for">For</SelectItem>
            <SelectItem value="against">Against</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {selectedProposal && hasVoted[selectedProposal] && (
        <div className="bg-yellow-50 border border-yellow-200 p-3 rounded-lg">
          <p className="text-sm text-yellow-800">
            You have already voted on this proposal.
          </p>
        </div>
      )}

      <Button 
        onClick={castVote} 
        disabled={loading || !selectedProposal || !voteChoice || votingShares <= 0 || hasVoted[selectedProposal]}
        className="w-full"
      >
        {loading ? "Casting Vote..." : hasVoted[selectedProposal] ? "Already Voted" : "Cast Vote"}
      </Button>
    </div>
  );
};