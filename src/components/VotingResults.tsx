import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useOrganization } from '@/hooks/useOrganization';
import { CheckCircle, XCircle, Clock } from 'lucide-react';
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

export const VotingResults = () => {
  const { organization } = useOrganization();
  const { toast } = useToast();
  const [proposals, setProposals] = useState<VotingProposal[]>([]);
  const [loading, setLoading] = useState(true);

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

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active':
        return <Clock className="h-4 w-4 text-blue-500" />;
      case 'passed':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return <Clock className="h-4 w-4" />;
    }
  };

  const getVotePercentage = (shares: number, total: number) => {
    return total > 0 ? Math.round((shares / total) * 100) : 0;
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="space-y-4">
      {proposals.length === 0 ? (
        <p className="text-muted-foreground text-center py-8">
          No voting results available yet.
        </p>
      ) : (
        proposals.map((proposal) => (
          <Card key={proposal.id}>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    {getStatusIcon(proposal.status)}
                    <CardTitle className="text-lg">{proposal.title}</CardTitle>
                    <Badge variant={proposal.status === 'active' ? 'default' : 'secondary'}>
                      {proposal.status}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {proposal.description}
                  </p>
                  <div className="flex items-center gap-4 text-xs text-muted-foreground mt-2">
                    <span>Proposed by {proposal.created_by_family_group}</span>
                    <span>{format(new Date(proposal.created_at), 'MMM dd, yyyy')}</span>
                    {proposal.voting_deadline && (
                      <span>Deadline: {format(new Date(proposal.voting_deadline), 'MMM dd, yyyy HH:mm')}</span>
                    )}
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <div className="text-2xl font-bold text-green-600">{proposal.shares_for}</div>
                    <div className="text-sm text-muted-foreground">For</div>
                    <div className="text-xs text-muted-foreground">
                      {getVotePercentage(proposal.shares_for, proposal.total_shares_voted)}%
                    </div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-red-600">{proposal.shares_against}</div>
                    <div className="text-sm text-muted-foreground">Against</div>
                    <div className="text-xs text-muted-foreground">
                      {getVotePercentage(proposal.shares_against, proposal.total_shares_voted)}%
                    </div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold">{proposal.total_shares_voted}</div>
                    <div className="text-sm text-muted-foreground">Total Votes</div>
                  </div>
                </div>

                {proposal.total_shares_voted > 0 && (
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>For ({proposal.shares_for} shares)</span>
                      <span>{getVotePercentage(proposal.shares_for, proposal.total_shares_voted)}%</span>
                    </div>
                    <Progress 
                      value={getVotePercentage(proposal.shares_for, proposal.total_shares_voted)} 
                      className="h-2"
                    />
                    
                    <div className="flex justify-between text-sm">
                      <span>Against ({proposal.shares_against} shares)</span>
                      <span>{getVotePercentage(proposal.shares_against, proposal.total_shares_voted)}%</span>
                    </div>
                    <Progress 
                      value={getVotePercentage(proposal.shares_against, proposal.total_shares_voted)} 
                      className="h-2"
                    />
                  </div>
                )}

                {proposal.total_shares_voted === 0 && (
                  <p className="text-center text-muted-foreground text-sm py-4">
                    No votes cast yet
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );
};