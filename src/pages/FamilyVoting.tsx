import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { VotingSettings } from '@/components/VotingSettings';
import { ShareAllocation } from '@/components/ShareAllocation';
import { VotingProposals } from '@/components/VotingProposals';
import { VoteForm } from '@/components/VoteForm';
import { VotingResults } from '@/components/VotingResults';
import { Vote, Users, Settings, BarChart3 } from 'lucide-react';
import { useUserRole } from '@/hooks/useUserRole';
import { useOrgAdmin } from '@/hooks/useOrgAdmin';

export default function FamilyVoting() {
  const { isGroupLead } = useUserRole();
  const { isAdmin } = useOrgAdmin();
  const [activeTab, setActiveTab] = useState('proposals');

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Vote className="h-8 w-8 text-primary" />
          <div>
            <h1 className="text-3xl font-bold">Family Voting</h1>
            <p className="text-muted-foreground">
              Participate in organizational decisions using your allocated shares
            </p>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="proposals" className="flex items-center gap-2">
              <Vote className="h-4 w-4" />
              Proposals
            </TabsTrigger>
            <TabsTrigger value="results" className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Results
            </TabsTrigger>
            {isGroupLead && (
              <TabsTrigger value="shares" className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                Share Allocation
              </TabsTrigger>
            )}
            {isAdmin && (
              <TabsTrigger value="settings" className="flex items-center gap-2">
                <Settings className="h-4 w-4" />
                Settings
              </TabsTrigger>
            )}
          </TabsList>

          <TabsContent value="proposals" className="space-y-6">
            <div className="grid gap-6 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Active Proposals</CardTitle>
                  <CardDescription>
                    View and vote on current organizational proposals
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <VotingProposals />
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Cast Your Vote</CardTitle>
                  <CardDescription>
                    Use your allocated shares to vote on proposals
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <VoteForm />
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="results" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Voting Results</CardTitle>
                <CardDescription>
                  View results of completed and ongoing votes
                </CardDescription>
              </CardHeader>
              <CardContent>
                <VotingResults />
              </CardContent>
            </Card>
          </TabsContent>

          {isGroupLead && (
            <TabsContent value="shares" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Share Allocation</CardTitle>
                  <CardDescription>
                    Distribute your family group's shares among members
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ShareAllocation />
                </CardContent>
              </Card>
            </TabsContent>
          )}

          {isAdmin && (
            <TabsContent value="settings" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Voting Settings</CardTitle>
                  <CardDescription>
                    Configure organization voting settings and share allocations
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <VotingSettings />
                </CardContent>
              </Card>
            </TabsContent>
          )}
        </Tabs>
      </div>
    </div>
  );
}