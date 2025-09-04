import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useCustomChecklists } from '@/hooks/useChecklistData';
import { useOrgAdmin } from '@/hooks/useOrgAdmin';
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
      
      return {
        ...type,
        exists: typeChecklists.length > 0,
        checklistCount: typeChecklists.length,
        lastUpdated: typeChecklists.length > 0 ? new Date().toLocaleDateString() : null
      };
    });
    
    return stats;
  };

  const handleCardClick = (type: string) => {
    const typeChecklists = checklists.filter(c => c.checklist_type === type);
    if (typeChecklists.length === 1) {
      // If only one checklist, navigate directly to it
      navigate(`/seasonal-checklist/${typeChecklists[0].id}`);
    } else if (typeChecklists.length > 1) {
      // TODO: Navigate to a list view or show selection dialog
      // For now, navigate to the first one
      navigate(`/seasonal-checklist/${typeChecklists[0].id}`);
    } else {
      // No checklists exist, redirect to creator
      navigate(`/checklist-creator`);
    }
  };

  const checklistStats = getChecklistStats();

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="text-center mb-8">
        <h1 className="text-6xl mb-4 font-kaushan text-primary drop-shadow-lg">Seasonal Checklists</h1>
        <p className="text-muted-foreground">Manage your seasonal cabin tasks, maintenance schedules, and operational procedures</p>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {checklistStats.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.key} className="hover:shadow-lg transition-all duration-200 cursor-pointer hover:scale-105" onClick={() => handleCardClick(stat.key)}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{stat.label}</CardTitle>
                <Icon className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    {stat.exists ? (
                      <Badge className={stat.color}>
                        {stat.checklistCount} checklist{stat.checklistCount !== 1 ? 's' : ''}
                      </Badge>
                    ) : (
                      <Badge variant="outline">Click to create</Badge>
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

      {/* Action Buttons */}
      <div className="flex justify-center gap-4">
        <Button 
          size="lg" 
          onClick={() => navigate('/checklist-creator')}
          className="flex items-center gap-2"
        >
          <CheckSquare className="h-5 w-5" />
          Create New Checklist
        </Button>
        <Button 
          variant="outline" 
          size="lg"
          onClick={() => refetch()}
          className="flex items-center gap-2"
        >
          <Settings className="h-5 w-5" />
          Refresh Checklists
        </Button>
      </div>

      {/* Instructions */}
      <Card className="max-w-2xl mx-auto">
        <CardContent className="pt-6">
          <div className="text-center space-y-2">
            <h3 className="text-lg font-semibold">Getting Started</h3>
            <p className="text-muted-foreground">
              Click on any checklist type above to view existing checklists or create new ones. 
              Use the "Create New Checklist" button to build custom seasonal checklists from documents or templates.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default SeasonalChecklists;