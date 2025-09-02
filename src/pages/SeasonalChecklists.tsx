import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { DocumentToChecklistConverter } from '@/components/DocumentToChecklistConverter';
import { SeasonalChecklistViewer } from '@/components/SeasonalChecklistViewer';
import { useCustomChecklists } from '@/hooks/useChecklistData';
import { PageHeader } from '@/components/ui/page-header';
import { CheckSquare, FileText, Plus, Settings, Calendar, Wrench, Trash2 } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

const SeasonalChecklists = () => {
  const [selectedChecklistType, setSelectedChecklistType] = useState<'closing' | 'opening' | 'seasonal' | 'maintenance'>('closing');
  const [isConverterOpen, setIsConverterOpen] = useState(false);
  const { checklists, loading, deleteChecklist, refetch } = useCustomChecklists();

  const checklistTypes = [
    { 
      key: 'closing', 
      label: 'Cabin Closing', 
      icon: Calendar, 
      description: 'End-of-season cabin winterization tasks',
      color: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200'
    },
    { 
      key: 'opening', 
      label: 'Cabin Opening', 
      icon: Calendar, 
      description: 'Start-of-season cabin preparation tasks',
      color: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
    },
    { 
      key: 'seasonal', 
      label: 'Seasonal Tasks', 
      icon: CheckSquare, 
      description: 'Regular seasonal maintenance and preparation',
      color: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
    },
    { 
      key: 'maintenance', 
      label: 'Maintenance', 
      icon: Wrench, 
      description: 'General maintenance and repair checklists',
      color: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200'
    }
  ] as const;

  const getChecklistStats = () => {
    const stats = checklistTypes.map(type => {
      const checklist = checklists[type.key];
      const itemCount = checklist?.items?.reduce((acc: number, section: any) => {
        return acc + (section.items?.length || 0);
      }, 0) || 0;
      
      return {
        ...type,
        exists: !!checklist,
        itemCount,
        lastUpdated: checklist ? new Date().toLocaleDateString() : null
      };
    });
    
    return stats;
  };

  const checklistStats = getChecklistStats();

  return (
    <div className="container mx-auto p-6 space-y-6">
      <PageHeader
        title="Seasonal Checklists"
        subtitle="Manage your seasonal cabin tasks, maintenance schedules, and operational procedures"
      />

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {checklistStats.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.key} className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => setSelectedChecklistType(stat.key)}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{stat.label}</CardTitle>
                <Icon className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    {stat.exists ? (
                      <Badge className={stat.color}>
                        {stat.itemCount} items
                      </Badge>
                    ) : (
                      <Badge variant="outline">Not created</Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {stat.description}
                  </p>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Actions */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Quick Actions
            </CardTitle>
            <CardDescription>
              Create and manage your seasonal checklists
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Dialog open={isConverterOpen} onOpenChange={setIsConverterOpen}>
              <DialogTrigger asChild>
                <Button className="w-full justify-start" variant="default">
                  <FileText className="h-4 w-4 mr-2" />
                  Convert Document to Checklist
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Document to Checklist Converter</DialogTitle>
                  <DialogDescription>
                    Paste your bulleted document text and convert it into an interactive checklist
                  </DialogDescription>
                </DialogHeader>
                <DocumentToChecklistConverter 
                  onChecklistCreated={(checklist) => {
                    // Close the converter dialog
                    setIsConverterOpen(false);
                    // Refresh the checklists data
                    refetch();
                    // Switch to the newly created checklist type
                    setSelectedChecklistType(checklist.checklist_type);
                    // Show success message
                    toast({
                      title: "Checklist Created!",
                      description: `Your ${checklist.checklist_type} checklist has been created successfully.`
                    });
                  }}
                />
              </DialogContent>
            </Dialog>

            <Button className="w-full justify-start" variant="outline" onClick={() => refetch()}>
              <CheckSquare className="h-4 w-4 mr-2" />
              Refresh Checklists
            </Button>

            {/* Checklist Type Selector */}
            <div className="space-y-2">
              <label className="text-sm font-medium">View Checklist:</label>
              <div className="grid grid-cols-1 gap-2">
                {checklistTypes.map((type) => (
                  <Button
                    key={type.key}
                    variant={selectedChecklistType === type.key ? "default" : "ghost"}
                    className="justify-start h-auto p-3"
                    onClick={() => setSelectedChecklistType(type.key)}
                  >
                    <type.icon className="h-4 w-4 mr-2" />
                    <div className="text-left">
                      <div className="font-medium">{type.label}</div>
                      <div className="text-xs opacity-70">
                        {checklists[type.key] ? `${checklists[type.key].items?.length || 0} sections` : 'Not created'}
                      </div>
                    </div>
                  </Button>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Right Column - Checklist Viewer */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    {React.createElement(checklistTypes.find(t => t.key === selectedChecklistType)?.icon || CheckSquare, { className: "h-5 w-5" })}
                    {checklistTypes.find(t => t.key === selectedChecklistType)?.label} Checklist
                  </CardTitle>
                  <CardDescription>
                    {checklistTypes.find(t => t.key === selectedChecklistType)?.description}
                  </CardDescription>
                </div>
                {checklists[selectedChecklistType] && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={async () => {
                      if (confirm(`Are you sure you want to delete the ${selectedChecklistType} checklist? This action cannot be undone.`)) {
                        await deleteChecklist(selectedChecklistType);
                      }
                    }}
                    className="text-destructive hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
              ) : checklists[selectedChecklistType] ? (
                <SeasonalChecklistViewer 
                  checklist={checklists[selectedChecklistType]} 
                  onUpdate={refetch}
                />
              ) : (
                <div className="text-center py-8 space-y-4">
                  <div className="text-muted-foreground">
                    <CheckSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <h3 className="text-lg font-medium">No {selectedChecklistType} checklist found</h3>
                    <p>Create your first {selectedChecklistType} checklist by converting a document above.</p>
                  </div>
                  <Button onClick={() => setIsConverterOpen(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Create {selectedChecklistType} Checklist
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default SeasonalChecklists;