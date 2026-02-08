import { UserPlus } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';

interface ProfileClaimBannerProps {
  onClaimClick: () => void;
}

export const ProfileClaimBanner = ({ onClaimClick }: ProfileClaimBannerProps) => {
  return (
    <Alert className="border-warning bg-warning/10 mb-4">
      <UserPlus className="h-4 w-4" />
      <AlertDescription className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <span className="font-medium">Profile Not Linked</span>
          <span className="text-muted-foreground">
            Link your account to a family member profile to access all features.
          </span>
        </div>
        <Button 
          variant="default" 
          size="sm" 
          onClick={onClaimClick}
          className="h-8 px-3"
        >
          <UserPlus className="h-3 w-3 mr-1" />
          Claim Profile
        </Button>
      </AlertDescription>
    </Alert>
  );
};
