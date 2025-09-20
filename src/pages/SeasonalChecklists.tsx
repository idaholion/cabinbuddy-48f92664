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
  const [selectedChecklistType, setSelectedChecklistType] = useState<string>('seasonal');
  
  const { checklists, loading, deleteChecklist, refetch } = useCustomChecklists();
  const { isAdmin } = useOrgAdmin();

  const predefinedTypes = [
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
    },
    { 
      key: 'arrival', 
      label: 'Arrival Tasks', 
      icon: CheckSquare, 
      description: 'Tasks to complete upon cabin arrival',
      color: 'bg-teal-100 text-teal-800 dark:bg-teal-900 dark:text-teal-200'
    },
    { 
      key: 'daily', 
      label: 'Daily Tasks', 
      icon: CheckSquare, 
      description: 'Daily cabin maintenance and operations',
      color: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200'
    }
  ] as const;

  const getChecklistTypes = () => {
    // Get all unique checklist types from existing checklists
    const existingTypes = [...new Set(checklists.map(c => c.checklist_type))];
    
    // Create type objects for all types (predefined + custom)
    const allTypes = existingTypes.map(type => {
      const predefined = predefinedTypes.find(p => p.key === type);
      if (predefined) {
        return predefined;
      } else {
        // Custom type
        return {
          key: type,
          label: type.charAt(0).toUpperCase() + type.slice(1).replace(/[_-]/g, ' '),
          icon: CheckSquare,
          description: `Custom checklist type: ${type}`,
          color: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200'
        };
      }
    });

    // Also include predefined types that don't exist yet (for display purposes)
    predefinedTypes.forEach(predefined => {
      if (!allTypes.find(t => t.key === predefined.key)) {
        allTypes.push(predefined);
      }
    });

    return allTypes;
  };

  const getChecklistStats = () => {
    const checklistTypes = getChecklistTypes();
    
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
    }
    // If no checklists exist, do nothing - just show info
  };

  const checklistStats = getChecklistStats();

  return (
    <div className="min-h-screen bg-cover bg-center bg-no-repeat" style={{backgroundImage: 'url(/lovable-uploads/45c3083f-46c5-4e30-a2f0-31a24ab454f4.png)'}}>
      <main className="container mx-auto p-6 space-y-6">
      <div className="text-center mb-8">
        <h1 className="text-6xl mb-4 font-kaushan text-primary drop-shadow-lg">Seasonal Checklists</h1>
        <p className="text-muted-foreground">Manage your seasonal cabin tasks, maintenance schedules, and operational procedures</p>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {checklistStats.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.key} className={`hover:shadow-lg transition-all duration-200 ${stat.exists ? 'cursor-pointer hover:scale-105' : 'cursor-default'}`} onClick={stat.exists ? () => handleCardClick(stat.key) : undefined}>
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
                      <Badge variant="secondary">Not created yet</Badge>
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

      {/* Refresh Button */}
      <div className="flex justify-center">
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
            <h3 className="text-lg font-semibold">Seasonal Checklists Overview</h3>
            <p className="text-muted-foreground">
              Click on any available checklist above to view and use it for your seasonal cabin tasks and maintenance.
            </p>
          </div>
        </CardContent>
      </Card>
      </main>
    </div>
  );
};

export default SeasonalChecklists;