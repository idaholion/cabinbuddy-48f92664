import { useState } from 'react';
import { Building, Plus, Users, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useMultiOrganization } from '@/hooks/useMultiOrganization';
import { useNavigate } from 'react-router-dom';

interface OrganizationSelectorProps {
  onOrganizationSelected?: () => void;
  showBackButton?: boolean;
  onBack?: () => void;
}

export const OrganizationSelector = ({ 
  onOrganizationSelected, 
  showBackButton = false, 
  onBack 
}: OrganizationSelectorProps) => {
  const navigate = useNavigate();
  const { 
    organizations, 
    activeOrganization, 
    loading, 
    switchToOrganization, 
    joinOrganization, 
    leaveOrganization 
  } = useMultiOrganization();
  
  const [joinCode, setJoinCode] = useState('');
  const [joinDialogOpen, setJoinDialogOpen] = useState(false);
  const [joiningLoading, setJoiningLoading] = useState(false);

  const handleCreateOrganization = () => {
    navigate('/setup');
  };

  const handleSelectOrganization = async (orgId: string) => {
    await switchToOrganization(orgId);
    onOrganizationSelected?.();
  };

  const handleJoinOrganization = async () => {
    if (!joinCode.trim()) return;
    
    setJoiningLoading(true);
    const success = await joinOrganization(joinCode.trim());
    setJoiningLoading(false);
    
    if (success) {
      setJoinCode('');
      setJoinDialogOpen(false);
    }
  };

  const handleLeaveOrganization = async (orgId: string, orgName: string) => {
    if (confirm(`Are you sure you want to leave ${orgName}?`)) {
      await leaveOrganization(orgId);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="container max-w-4xl mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Select Organization</h1>
          <p className="text-muted-foreground">
            Choose which organization you'd like to work with
          </p>
        </div>
        {showBackButton && (
          <Button variant="outline" onClick={onBack}>
            Back
          </Button>
        )}
      </div>

      {organizations.length === 0 ? (
        <Card>
          <CardHeader className="text-center">
            <Building className="h-12 w-12 mx-auto text-muted-foreground" />
            <CardTitle>No Organizations Found</CardTitle>
            <CardDescription>
              You're not a member of any organizations yet. Join an existing one or create a new one.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex gap-4 justify-center">
            <Dialog open={joinDialogOpen} onOpenChange={setJoinDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline">
                  <Users className="h-4 w-4 mr-2" />
                  Join Organization
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Join Organization</DialogTitle>
                  <DialogDescription>
                    Enter the organization code to join an existing organization.
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

            <Button onClick={handleCreateOrganization}>
              <Plus className="h-4 w-4 mr-2" />
              Create Organization
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {organizations.map((org) => (
              <Card 
                key={org.organization_id} 
                className={`cursor-pointer transition-all ${
                  org.organization_id === activeOrganization?.organization_id 
                    ? 'ring-2 ring-primary' 
                    : 'hover:shadow-md'
                }`}
                onClick={() => handleSelectOrganization(org.organization_id)}
              >
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-lg">{org.organization_name}</CardTitle>
                      <CardDescription>Code: {org.organization_code}</CardDescription>
                    </div>
                    <div className="flex flex-col gap-2">
                      {org.is_primary && (
                        <Badge variant="default" className="text-xs">Primary</Badge>
                      )}
                      <Badge variant="outline" className="text-xs capitalize">
                        {org.role}
                      </Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-muted-foreground">
                      Joined {new Date(org.joined_at).toLocaleDateString()}
                    </p>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleLeaveOrganization(org.organization_id, org.organization_name);
                      }}
                      className="text-destructive hover:text-destructive"
                    >
                      <LogOut className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <Separator />

          <div className="flex gap-4 justify-center">
            <Dialog open={joinDialogOpen} onOpenChange={setJoinDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline">
                  <Users className="h-4 w-4 mr-2" />
                  Join Another Organization
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Join Organization</DialogTitle>
                  <DialogDescription>
                    Enter the organization code to join an existing organization.
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

            <Button onClick={handleCreateOrganization}>
              <Plus className="h-4 w-4 mr-2" />
              Create New Organization
            </Button>
          </div>
        </>
      )}
    </div>
  );
};