import { useState } from 'react';
import { Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useMultiOrganization } from '@/hooks/useMultiOrganization';

interface JoinOrganizationDialogProps {
  children: React.ReactNode;
}

export const JoinOrganizationDialog = ({ children }: JoinOrganizationDialogProps) => {
  const { joinOrganization } = useMultiOrganization();
  const [joinCode, setJoinCode] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [joiningLoading, setJoiningLoading] = useState(false);

  const handleJoinOrganization = async () => {
    if (!joinCode.trim()) return;
    
    setJoiningLoading(true);
    const success = await joinOrganization(joinCode.trim());
    setJoiningLoading(false);
    
    if (success) {
      setJoinCode('');
      setDialogOpen(false);
    }
  };

  return (
    <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Join Organization</DialogTitle>
          <DialogDescription>
            Enter the organization code to join an additional organization. You'll remain a member of your current organizations.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label htmlFor="joinCode">Organization Code</Label>
            <Input
              id="joinCode"
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
              placeholder="Enter 6-character code"
              maxLength={6}
            />
          </div>
          <Button 
            onClick={handleJoinOrganization}
            disabled={!joinCode.trim() || joiningLoading}
            className="w-full"
          >
            {joiningLoading ? 'Joining...' : 'Join Organization'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};