import { AlertTriangle, Eye, LogIn } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { useGuestAccess } from '@/contexts/GuestAccessContext';

export const GuestAccessBanner = () => {
  const { isGuestMode, guestOrganization, exitGuestMode } = useGuestAccess();

  if (!isGuestMode) return null;

  return (
    <Alert className="border-primary bg-primary/5 mb-4">
      <Eye className="h-4 w-4" />
      <AlertDescription className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="font-medium">Preview Mode</span>
          <span className="text-muted-foreground">
            You're viewing {guestOrganization?.name} in read-only mode. 
            Data cannot be modified.
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => window.open('/auth', '_blank')}
            className="h-8 px-3"
          >
            <LogIn className="h-3 w-3 mr-1" />
            Sign Up for Full Access
          </Button>
          <Button 
            variant="secondary" 
            size="sm" 
            onClick={exitGuestMode}
            className="h-8 px-3"
          >
            Exit Preview
          </Button>
        </div>
      </AlertDescription>
    </Alert>
  );
};