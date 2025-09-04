import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Home, CheckSquare, Calendar, Wrench } from 'lucide-react';
import { SeasonalChecklistViewer } from '@/components/SeasonalChecklistViewer';
import { useCustomChecklists } from '@/hooks/useChecklistData';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { PageHeader } from '@/components/ui/page-header';

const SeasonalChecklistView = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { checklists, loading, refetch } = useCustomChecklists();

  const checklist = checklists?.find(c => c.id === id);

  const getChecklistIcon = (type: string) => {
    switch (type) {
      case 'closing':
      case 'opening':
        return Calendar;
      case 'maintenance':
        return Wrench;
      default:
        return CheckSquare;
    }
  };

  const getChecklistTypeLabel = (type: string) => {
    switch (type) {
      case 'closing':
        return 'Cabin Closing';
      case 'opening':
        return 'Cabin Opening';
      case 'seasonal':
        return 'Seasonal Tasks';
      case 'maintenance':
        return 'Maintenance';
      default:
        return type;
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6 flex justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  if (!checklist) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="p-6 text-center">
            <p className="text-muted-foreground mb-4">Checklist not found.</p>
            <Button onClick={() => navigate('/')}>
              <Home className="h-4 w-4 mr-2" />
              Home
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const Icon = getChecklistIcon(checklist.checklist_type);

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center gap-4">
        <Button 
          variant="outline" 
          onClick={() => navigate('/')}
          className="flex items-center gap-2"
        >
          <Home className="h-4 w-4" />
          Home
        </Button>
        <PageHeader
          title={getChecklistTypeLabel(checklist.checklist_type)}
          subtitle="Complete your seasonal tasks and track progress"
          icon={Icon}
        />
      </div>
      
      <SeasonalChecklistViewer 
        checklist={checklist} 
        onUpdate={refetch}
      />
    </div>
  );
};

export default SeasonalChecklistView;