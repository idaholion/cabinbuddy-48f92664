import { useState, useEffect } from 'react';
import { useOrganization } from '@/hooks/useOrganization';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Loader2, TrendingUp, TrendingDown, Calendar, User } from 'lucide-react';
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

export function VotingResults() {
  const { organization } = useOrganization();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [proposals, setProposals] = useState<VotingProposal[]>([]);

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
        description: "Failed to fetch voting results",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (proposal: VotingProposal) => {
    if (proposal.status === 'closed') {
      return <Badge variant="secondary">Closed</Badge>;
    }
    
    if (proposal.voting_deadline && new Date(proposal.voting_deadline) < new Date()) {
      return <Badge variant="destructive">Expired</Badge>;
    }
    
    return <Badge variant="default">Active</Badge>;
  };

  const getResultBadge = (proposal: VotingProposal) => {
    if (proposal.shares_for > proposal.shares_against) {
      return (
        <Badge variant="default" className="bg-green-100 text-green-800 border-green-200">
          <TrendingUp className="h-3 w-3 mr-1" />
          Passing
        </Badge>
      );
    } else if (proposal.shares_against > proposal.shares_for) {
      return (
        <Badge variant="destructive" className="bg-red-100 text-red-800 border-red-200">
          <TrendingDown className="h-3 w-3 mr-1" />
          Failing
        </Badge>
      );
    } else {
      return (
        <Badge variant="outline">
          Tied
        </Badge>
      );
    }
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
      <div>
        <h2 className="text-2xl font-bold">Voting Results</h2>
        <p className="text-muted-foreground">
          View results of all voting proposals in your organization
        </p>
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
                    <div className="flex items-center gap-1">
                      <Calendar className="h-4 w-4" />
                      Created: {format(new Date(proposal.created_at), 'MMM d, yyyy')}
                    </div>
                    {proposal.voting_deadline && (
                      <div className="flex items-center gap-1">
                        <Calendar className="h-4 w-4" />
                        Deadline: {format(new Date(proposal.voting_deadline), 'MMM d, yyyy h:mm a')}
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex gap-2">
                  {getStatusBadge(proposal)}
                  {proposal.total_shares_voted > 0 && getResultBadge(proposal)}
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {proposal.description && (
                <p className="text-muted-foreground">{proposal.description}</p>
              )}
              
              <div className="space-y-4">
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div className="space-y-1">
                    <div className="text-2xl font-bold text-green-600">{proposal.shares_for}</div>
                    <div className="text-sm text-muted-foreground">Shares For</div>
                  </div>
                  <div className="space-y-1">
                    <div className="text-2xl font-bold text-red-600">{proposal.shares_against}</div>
                    <div className="text-sm text-muted-foreground">Shares Against</div>
                  </div>
                  <div className="space-y-1">
                    <div className="text-2xl font-bold">{proposal.total_shares_voted}</div>
                    <div className="text-sm text-muted-foreground">Total Voted</div>
                  </div>
                </div>

                {proposal.total_shares_voted > 0 && (
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>For</span>
                      <span>{calculateProgress(proposal).toFixed(1)}%</span>
                    </div>
                    <Progress value={calculateProgress(proposal)} className="h-3" />
                    <div className="flex justify-between text-sm text-muted-foreground">
                      <span>{proposal.shares_for} shares</span>
                      <span>{proposal.shares_against} shares</span>
                    </div>
                  </div>
                )}

                {proposal.total_shares_voted === 0 && (
                  <div className="text-center py-4 text-muted-foreground">
                    No votes cast yet
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ))}

        {proposals.length === 0 && (
          <Card>
            <CardContent className="text-center py-8">
              <TrendingUp className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">No Voting Results</h3>
              <p className="text-muted-foreground">
                No voting proposals have been created yet.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}