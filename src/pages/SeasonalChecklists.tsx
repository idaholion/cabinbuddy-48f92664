import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useCustomChecklists } from '@/hooks/useChecklistData';
import { useOrgAdmin } from '@/hooks/useOrgAdmin';
import { PageHeader } from '@/components/ui/page-header';
import { CheckSquare, Settings, Calendar, Wrench, Trash2, Eye } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

const SeasonalChecklists = () => {
  const navigate = useNavigate();
  const [selectedChecklistType, setSelectedChecklistType] = useState<'closing' | 'opening' | 'seasonal' | 'maintenance'>('seasonal');
  
  const { checklists, loading, deleteChecklist, refetch } = useCustomChecklists();
  const { isAdmin } = useOrgAdmin();

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
      const typeChecklists = checklists.filter(c => c.checklist_type === type.key);
      const totalItems = typeChecklists.reduce((total, checklist) => {
        return total + (checklist.items?.length || 0);
      }, 0);
      
      return {
        ...type,
        exists: typeChecklists.length > 0,
        itemCount: totalItems,
        checklistCount: typeChecklists.length,
        lastUpdated: typeChecklists.length > 0 ? new Date().toLocaleDateString() : null
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
                      <div className="flex flex-col gap-1">
                        <Badge className={stat.color}>
                          {stat.itemCount} items
                        </Badge>
                        {stat.checklistCount > 1 && (
                          <Badge variant="outline" className="text-xs">
                            {stat.checklistCount} checklists
                          </Badge>
                        )}
                      </div>
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
      <div className="flex justify-center">
        {/* Actions Card */}
        <div className="w-full max-w-md">
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
                          {checklists.filter(c => c.checklist_type === type.key).length > 0 
                            ? `${checklists.filter(c => c.checklist_type === type.key).length} checklist(s)` 
                            : 'Not created'}
                        </div>
                      </div>
                    </Button>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default SeasonalChecklists;