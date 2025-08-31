import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { UserPlus, UserX, Mail, Shield, ShieldOff } from 'lucide-react';
import { useSupervisor } from '@/hooks/useSupervisor';

interface Supervisor {
  id: string;
  email: string;
  name?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface SupervisorManagementProps {
  supervisors: Supervisor[];
}

export const SupervisorManagement = ({ supervisors }: SupervisorManagementProps) => {
  const { addSupervisor, updateSupervisorStatus } = useSupervisor();
  const [isAddingOpen, setIsAddingOpen] = useState(false);
  const [newSupervisorEmail, setNewSupervisorEmail] = useState('');
  const [newSupervisorName, setNewSupervisorName] = useState('');
  const [loading, setLoading] = useState(false);

  const handleAddSupervisor = async () => {
    if (!newSupervisorEmail.trim()) return;

    setLoading(true);
    const result = await addSupervisor(
      newSupervisorEmail.trim(), 
      newSupervisorName.trim() || undefined
    );
    
    if (!result.error) {
      setNewSupervisorEmail('');
      setNewSupervisorName('');
      setIsAddingOpen(false);
    }
    setLoading(false);
  };

  const handleToggleStatus = async (supervisorId: string, currentStatus: boolean) => {
    await updateSupervisorStatus(supervisorId, !currentStatus);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Supervisor Management</h2>
          <p className="text-muted-foreground text-base">Manage system supervisors and their permissions</p>
        </div>
        
        <Dialog open={isAddingOpen} onOpenChange={setIsAddingOpen}>
          <DialogTrigger asChild>
            <Button className="text-base">
              <UserPlus className="h-4 w-4 mr-2" />
              Add Supervisor
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Supervisor</DialogTitle>
              <DialogDescription>
                Add a new supervisor who will have access to all organization data.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="email" className="text-right text-base">
                  Email *
                </Label>
                <Input
                  id="email"
                  value={newSupervisorEmail}
                  onChange={(e) => setNewSupervisorEmail(e.target.value)}
                  placeholder="supervisor@example.com"
                  type="email"
                  className="col-span-3 text-base placeholder:text-base"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="name" className="text-right text-base">
                  Name
                </Label>
                <Input
                  id="name"
                  value={newSupervisorName}
                  onChange={(e) => setNewSupervisorName(e.target.value)}
                  placeholder="Optional display name"
                  className="col-span-3 text-base placeholder:text-base"
                />
              </div>
            </div>
            <DialogFooter>
              <Button 
                type="submit" 
                onClick={handleAddSupervisor}
                disabled={!newSupervisorEmail.trim() || loading}
                className="text-base"
              >
                {loading ? 'Adding...' : 'Add Supervisor'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Supervisors Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Current Supervisors
          </CardTitle>
          <CardDescription className="text-base">
            All users with supervisor privileges
          </CardDescription>
        </CardHeader>
        <CardContent>
          {supervisors.length === 0 ? (
            <div className="text-center py-8">
              <Shield className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">No supervisors found</h3>
              <p className="text-muted-foreground text-base">Add your first supervisor to get started.</p>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Email</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Added</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {supervisors.map((supervisor) => (
                    <TableRow key={supervisor.id}>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          <Mail className="h-4 w-4 text-muted-foreground" />
                          {supervisor.email}
                        </div>
                      </TableCell>
                      <TableCell>
                        {supervisor.name || (
                          <span className="text-muted-foreground italic">No name provided</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge 
                          variant={supervisor.is_active ? "default" : "secondary"}
                          className="flex items-center gap-1 w-fit"
                        >
                          {supervisor.is_active ? (
                            <Shield className="h-3 w-3" />
                          ) : (
                            <ShieldOff className="h-3 w-3" />
                          )}
                          {supervisor.is_active ? 'Active' : 'Inactive'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {new Date(supervisor.created_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          size="sm"
                          variant={supervisor.is_active ? "destructive" : "default"}
                          onClick={() => handleToggleStatus(supervisor.id, supervisor.is_active)}
                          className="text-base"
                        >
                          {supervisor.is_active ? (
                            <>
                              <UserX className="h-4 w-4 mr-1" />
                              Deactivate
                            </>
                          ) : (
                            <>
                              <UserPlus className="h-4 w-4 mr-1" />
                              Activate
                            </>
                          )}
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Info Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Important Notes</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-base text-muted-foreground">
          <div>• Supervisors have full access to all organization data across the system</div>
          <div>• Deactivated supervisors lose all supervisor privileges immediately</div>
          <div>• Organizations can also have alternate supervisors set individually</div>
          <div>• All supervisor actions are logged for security and audit purposes</div>
        </CardContent>
      </Card>

      {/* Supabase Access Card */}
      <Card className="border-amber-200 bg-amber-50/30 dark:bg-amber-950/20 dark:border-amber-800">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2 text-amber-800 dark:text-amber-200">
            <Shield className="h-5 w-5" />
            Supabase Database Access
          </CardTitle>
          <CardDescription className="text-amber-700 dark:text-amber-300">
            Direct access to manage user authentication data
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-base text-amber-800 dark:text-amber-200">
            <p className="mb-3">
              To clear out sign-in data and manage user accounts directly, supervisors can access the Supabase Auth Users dashboard:
            </p>
            <div className="bg-white dark:bg-gray-900 rounded-lg p-4 border border-amber-200 dark:border-amber-800">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <div className="font-medium text-sm text-gray-900 dark:text-gray-100 mb-1">
                    Supabase Auth Users
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    Manage user accounts, reset passwords, and view authentication data
                  </div>
                </div>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => window.open('https://supabase.com/dashboard/project/ftaxzdnrnhktzbcsejoy/auth/users', '_blank')}
                  className="shrink-0 border-amber-300 text-amber-800 hover:bg-amber-100 dark:border-amber-700 dark:text-amber-200 dark:hover:bg-amber-950/50"
                >
                  Open Auth Users
                </Button>
              </div>
            </div>
          </div>
          <div className="text-sm text-amber-700 dark:text-amber-400 space-y-1">
            <div>• View all user accounts and their authentication status</div>
            <div>• Delete user accounts to remove sign-in access</div>
            <div>• Reset passwords and manage user verification status</div>
            <div>• Monitor authentication logs and security events</div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};