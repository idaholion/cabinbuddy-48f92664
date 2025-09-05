import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Home } from 'lucide-react';
import { SeasonalChecklistViewer } from '@/components/SeasonalChecklistViewer';
import { useCustomChecklists } from '@/hooks/useChecklistData';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { useOrgAdmin } from '@/hooks/useOrgAdmin';

const SeasonalChecklistView = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { checklists, loading, refetch } = useCustomChecklists();
  const { isAdmin } = useOrgAdmin();

  const checklist = checklists?.find(c => c.id === id);

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

  return (
    <div className="container mx-auto">
      {/* Override the default header with everything in one line */}
      <div className="flex items-center justify-between -mt-10 mb-6 relative z-10">
        <Button 
          variant="outline" 
          onClick={() => navigate('/')}
          className="flex items-center gap-2"
        >
          <Home className="h-4 w-4" />
          Home
        </Button>
        
        {/* Center title */}
        <h1 className="text-6xl font-kaushan text-primary drop-shadow-lg capitalize">
          {checklist.checklist_type.replace('_', ' ')} Checklist
        </h1>
        
        {/* Right side buttons */}
        <div className="flex items-center gap-2">
          {isAdmin && (
            <Button 
              variant="outline" 
              onClick={() => {
                const viewer = document.querySelector('[data-checklist-viewer]');
                if (viewer) {
                  const editButton = viewer.querySelector('[data-edit-button]');
                  if (editButton) {
                    (editButton as HTMLButtonElement).click();
                  }
                }
              }}
            >
              Edit
            </Button>
          )}
          {/* The ? button will still be in its original position */}
        </div>
      </div>

      {/* Subtitle */}
      <div className="text-center mb-6 -mt-2">
        <p className="text-xl font-kaushan text-primary">Complete your seasonal tasks and track progress</p>
      </div>
      
      <SeasonalChecklistViewer 
        checklist={checklist} 
        onUpdate={refetch}
      />
    </div>
  );
};

export default SeasonalChecklistView;