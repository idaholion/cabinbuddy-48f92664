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

interface MemberAllocation {
  member_name: string;
  member_email: string;
  allocated_shares: number;
}

export const VoteForm = () => {
  const { organization } = useOrganization();
  const { userFamilyGroup } = useUserRole();
  const { user } = useAuth();
  const { toast } = useToast();
  const [proposals, setProposals] = useState<VotingProposal[]>([]);
  const [memberAllocations, setMemberAllocations] = useState<MemberAllocation[]>([]);
  const [selectedProposal, setSelectedProposal] = useState('');
  const [selectedMember, setSelectedMember] = useState('');
  const [votingShares, setVotingShares] = useState(0);
  const [voteChoice, setVoteChoice] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (organization?.id) {
      fetchActiveProposals();
      fetchMemberAllocations();
    }
  }, [organization?.id, userFamilyGroup]);

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

  const fetchMemberAllocations = async () => {
    try {
      const { data, error } = await supabase
        .from('member_share_allocations')
        .select('*')
        .eq('organization_id', organization?.id)
        .eq('family_group_name', userFamilyGroup);

      if (error) throw error;

      setMemberAllocations(data?.map(item => ({
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
    }
  };

  const getSelectedMemberShares = () => {
    const member = memberAllocations.find(m => m.member_name === selectedMember);
    return member?.allocated_shares || 0;
  };

  const castVote = async () => {
    try {
      if (!selectedProposal || !selectedMember || !voteChoice || votingShares <= 0) {
        toast({
          title: "Error",
          description: "Please fill in all fields",
          variant: "destructive",
        });
        return;
      }

      const maxShares = getSelectedMemberShares();
      if (votingShares > maxShares) {
        toast({
          title: "Error",
          description: `Cannot vote with more shares than allocated (${maxShares})`,
          variant: "destructive",
        });
        return;
      }

      setLoading(true);

      // Check if this member has already voted on this proposal
      const { data: existingVote, error: checkError } = await supabase
        .from('votes')
        .select('*')
        .eq('proposal_id', selectedProposal)
        .eq('organization_id', organization?.id)
        .eq('family_group_name', userFamilyGroup)
        .eq('voter_name', selectedMember)
        .single();

      if (checkError && checkError.code !== 'PGRST116') {
        throw checkError;
      }

      if (existingVote) {
        toast({
          title: "Error",
          description: "This member has already voted on this proposal",
          variant: "destructive",
        });
        return;
      }

      const selectedMemberData = memberAllocations.find(m => m.member_name === selectedMember);

      // Insert the vote
      const { error: voteError } = await supabase
        .from('votes')
        .insert({
          proposal_id: selectedProposal,
          organization_id: organization?.id,
          family_group_name: userFamilyGroup,
          voter_name: selectedMember,
          voter_email: selectedMemberData?.member_email || null,
          shares_used: votingShares,
          vote_choice: voteChoice,
          voted_by_user_id: user?.id
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

      // Reset form
      setSelectedProposal('');
      setSelectedMember('');
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

  return (
    <div className="space-y-4">
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
        <Label htmlFor="member">Voting Member</Label>
        <Select value={selectedMember} onValueChange={setSelectedMember}>
          <SelectTrigger>
            <SelectValue placeholder="Choose member to vote as" />
          </SelectTrigger>
          <SelectContent>
            {memberAllocations.map((member) => (
              <SelectItem key={member.member_name} value={member.member_name}>
                {member.member_name} ({member.allocated_shares} shares)
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
          max={getSelectedMemberShares()}
          placeholder="Enter number of shares"
        />
        {selectedMember && (
          <p className="text-xs text-muted-foreground mt-1">
            Available: {getSelectedMemberShares()} shares
          </p>
        )}
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

      <Button 
        onClick={castVote} 
        disabled={loading || !selectedProposal || !selectedMember || !voteChoice || votingShares <= 0}
        className="w-full"
      >
        {loading ? "Casting Vote..." : "Cast Vote"}
      </Button>
    </div>
  );
};