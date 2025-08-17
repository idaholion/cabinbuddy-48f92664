import { useState } from 'react';
import { useUserRole } from '@/hooks/useUserRole';
import { useOrgAdmin } from '@/hooks/useOrgAdmin';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Vote, Users, Settings, BarChart } from 'lucide-react';
import { VotingSettings } from '@/components/VotingSettings';
import { ShareAllocations } from '@/components/ShareAllocations';
import { VotingProposals } from '@/components/VotingProposals';
import { VotingResults } from '@/components/VotingResults';

export default function FamilyVoting() {
  const { isGroupLead, isAdmin } = useUserRole();
  const { isAdmin: isOrgAdmin } = useOrgAdmin();
  const [activeTab, setActiveTab] = useState('proposals');

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center gap-3">
        <Vote className="h-8 w-8 text-primary" />
        <div>
          <h1 className="text-3xl font-bold">Family Voting</h1>
          <p className="text-muted-foreground">
            Participate in organizational decisions through share-based voting
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Your Role</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="flex gap-2">
              {isOrgAdmin && <Badge variant="default">Admin</Badge>}
              {isGroupLead && <Badge variant="secondary">Group Lead</Badge>}
              {!isOrgAdmin && !isGroupLead && <Badge variant="outline">Member</Badge>}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Proposals</CardTitle>
            <Vote className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">0</div>
            <p className="text-xs text-muted-foreground">
              Awaiting your vote
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Shares</CardTitle>
            <BarChart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">100</div>
            <p className="text-xs text-muted-foreground">
              Organization total
            </p>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="proposals">Proposals</TabsTrigger>
          <TabsTrigger value="results">Results</TabsTrigger>
          {isGroupLead && <TabsTrigger value="shares">My Shares</TabsTrigger>}
          {isOrgAdmin && <TabsTrigger value="settings">Settings</TabsTrigger>}
        </TabsList>

        <TabsContent value="proposals" className="space-y-6">
          <VotingProposals />
        </TabsContent>

        <TabsContent value="results" className="space-y-6">
          <VotingResults />
        </TabsContent>

        {isGroupLead && (
          <TabsContent value="shares" className="space-y-6">
            <ShareAllocations />
          </TabsContent>
        )}

        {isOrgAdmin && (
          <TabsContent value="settings" className="space-y-6">
            <VotingSettings />
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}