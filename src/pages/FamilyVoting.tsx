import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { VotingSettings } from '@/components/VotingSettings';
import { ShareAllocation } from '@/components/ShareAllocation';
import { AdminShareOverview } from '@/components/AdminShareOverview';
import { VotingProposals } from '@/components/VotingProposals';
import { VoteForm } from '@/components/VoteForm';
import { VotingResults } from '@/components/VotingResults';
import { Vote, Users, Settings, BarChart3, Shield } from 'lucide-react';
import { useUserRole } from '@/hooks/useUserRole';
import { useOrgAdmin } from '@/hooks/useOrgAdmin';

export default function FamilyVoting() {
  const { isGroupLead } = useUserRole();
  const { isAdmin } = useOrgAdmin();
  const [activeTab, setActiveTab] = useState('proposals');

  return (
    <div className="min-h-screen bg-cover bg-center bg-no-repeat" style={{backgroundImage: 'url(/lovable-uploads/45c3083f-46c5-4e30-a2f0-31a24ab454f4.png)'}}>
      <main className="container mx-auto px-4 py-8">
        <div className="space-y-6">
          <div className="text-center mb-8">
            <h1 className="text-6xl mb-4 font-kaushan text-primary drop-shadow-lg text-center flex items-center justify-center">
              <Vote className="h-10 w-10 mr-3" />
              Family Voting
            </h1>
            <p className="text-2xl text-primary text-center font-medium">
              Participate in organizational decisions using your allocated shares
            </p>
          </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className={`grid w-full ${isAdmin ? 'grid-cols-5' : isGroupLead ? 'grid-cols-4' : 'grid-cols-2'}`}>
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
              <TabsTrigger value="admin-overview" className="flex items-center gap-2">
                <Shield className="h-4 w-4" />
                Admin Overview
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
            <TabsContent value="admin-overview" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Organization Share Overview</CardTitle>
                  <CardDescription>
                    View all family group share allocations and member distributions across your organization
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <AdminShareOverview />
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
      </main>
    </div>
  );
}