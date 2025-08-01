import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { NavigationHeader } from "@/components/ui/navigation-header";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { WorkWeekendProposalForm } from "@/components/WorkWeekendProposalForm";
import { WorkWeekendApprovals } from "@/components/WorkWeekendApprovals";
import { Hammer, Plus, CheckSquare } from 'lucide-react';

const WorkWeekends = () => {
  const [activeTab, setActiveTab] = useState('overview');
  const [showProposalForm, setShowProposalForm] = useState(false);

  const handleProposalSuccess = () => {
    setShowProposalForm(false);
    setActiveTab('overview');
  };

  return (
    <div className="min-h-screen bg-cover bg-center bg-no-repeat p-4" style={{backgroundImage: 'url(/lovable-uploads/45c3083f-46c5-4e30-a2f0-31a24ab454f4.png)'}}>
      <div className="max-w-7xl mx-auto">
        <PageHeader 
          title="Work Weekends"
          subtitle="Propose and manage cabin work weekends for joint projects"
          icon={Hammer}
          backgroundImage={true}
        >
          <NavigationHeader />
        </PageHeader>

        <div className="flex justify-end mb-4">
          <Button 
            onClick={() => setShowProposalForm(!showProposalForm)}
            className="flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            {showProposalForm ? 'Cancel' : 'Propose Work Weekend'}
          </Button>
        </div>

        {showProposalForm && (
          <div className="mb-6 flex justify-center">
            <WorkWeekendProposalForm onSuccess={handleProposalSuccess} />
          </div>
        )}

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2 bg-background/90 backdrop-blur-sm">
            <TabsTrigger value="overview" className="flex items-center gap-2">
              <CheckSquare className="h-4 w-4" />
              Approvals & Overview
            </TabsTrigger>
            <TabsTrigger value="calendar" className="flex items-center gap-2">
              <Hammer className="h-4 w-4" />
              Calendar View
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="mt-6">
            <WorkWeekendApprovals />
          </TabsContent>

          <TabsContent value="calendar" className="mt-6">
            <div className="bg-background/90 backdrop-blur-sm rounded-lg p-6 border border-border">
              <p className="text-center text-muted-foreground">
                Calendar integration coming soon - work weekends will appear on the main cabin calendar
              </p>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default WorkWeekends;