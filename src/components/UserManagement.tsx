import { useState, useEffect } from "react";
import { User, Trash2, UserMinus, AlertTriangle, CheckCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useOrganization } from "@/hooks/useOrganization";
import { useToast } from "@/hooks/use-toast";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface OrganizationUser {
  user_id: string;
  role: string;
  joined_at: string;
  is_primary: boolean;
  email: string;
  display_name?: string;
  first_name?: string;
  last_name?: string;
}

export const UserManagement = () => {
  const [users, setUsers] = useState<OrganizationUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [removingUser, setRemovingUser] = useState<string | null>(null);
  const [confirmationText, setConfirmationText] = useState("");
  const [selectedUser, setSelectedUser] = useState<OrganizationUser | null>(null);
  
  const { user: currentUser } = useAuth();
  const { organization } = useOrganization();
  const { toast } = useToast();

  const fetchUsers = async () => {
    if (!organization?.id) return;

    console.log('🔍 Debug: Fetching users for organization:', {
      orgId: organization.id,
      orgName: organization.name,
      orgCode: organization.code
    });

    try {
      // Get users in the organization
      const { data: orgUsers, error: orgError } = await supabase
        .from('user_organizations')
        .select(`
          user_id,
          role,
          joined_at,
          is_primary
        `)
        .eq('organization_id', organization.id);

      console.log('🔍 Debug: Organization users query result:', { 
        orgUsers, 
        orgError,
        userCount: orgUsers?.length || 0 
      });

      if (orgError) throw orgError;

      // Get user details including emails using our secure function
      const { data: userDetails, error: detailsError } = await supabase
        .rpc('get_organization_user_emails', { org_id: organization.id }) as { 
          data: Array<{user_id: string, email: string, first_name: string, last_name: string, display_name: string}> | null, 
          error: any 
        };

      if (detailsError) throw detailsError;

      // Combine the data
      const enrichedUsers = orgUsers?.map(orgUser => {
        const details = userDetails?.find((detail) => detail.user_id === orgUser.user_id);
        
        return {
          user_id: orgUser.user_id,
          role: orgUser.role,
          joined_at: orgUser.joined_at,
          is_primary: orgUser.is_primary,
          email: details?.email || 'Unknown',
          display_name: details?.display_name,
          first_name: details?.first_name,
          last_name: details?.last_name
        };
      }) || [];

      setUsers(enrichedUsers);
    } catch (error: any) {
      console.error('Error fetching users:', error);
      toast({
        title: "Error",
        description: "Failed to load organization users",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [organization?.id]);

  const handleRemoveUser = async () => {
    if (!selectedUser || !organization?.id || confirmationText !== 'CONFIRM_REMOVE_USER') {
      return;
    }

    setRemovingUser(selectedUser.user_id);

    try {
      const { data, error } = await supabase.rpc('supervisor_remove_user_from_organization', {
        p_user_email: selectedUser.email,
        p_organization_id: organization.id,
        p_confirmation_code: 'CONFIRM_REMOVE_USER'
      }) as { data: { success: boolean; error?: string; message?: string } | null, error: any };

      if (error) throw error;

      const result = data;
      
      if (result?.success) {
        toast({
          title: "User Removed",
          description: `${selectedUser.email} has been removed from the organization`,
        });
        
        // Refresh the users list
        await fetchUsers();
        
        // Reset state
        setSelectedUser(null);
        setConfirmationText("");
      } else {
        throw new Error(result?.error || 'Failed to remove user');
      }
    } catch (error: any) {
      console.error('Error removing user:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to remove user from organization",
        variant: "destructive",
      });
    } finally {
      setRemovingUser(null);
    }
  };

  const isConfirmationValid = confirmationText === 'CONFIRM_REMOVE_USER';
  const canRemoveUser = (user: OrganizationUser) => {
    // Can't remove yourself
    if (user.user_id === currentUser?.id) return false;
    // Can't remove other admins (only supervisors can do that)
    if (user.role === 'admin') return false;
    return true;
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Organization Users
          </CardTitle>
          <CardDescription>Loading users...</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <User className="h-5 w-5" />
          Organization Users
        </CardTitle>
        <CardDescription>
          Manage users in your organization. You can remove members but not other administrators.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>User</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Joined</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-[100px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.map((user) => (
              <TableRow key={user.user_id}>
                <TableCell>
                  <div>
                    <div className="font-medium">{user.display_name || 'Unknown'}</div>
                    <div className="text-sm text-muted-foreground">{user.email}</div>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant={user.role === 'admin' ? 'default' : 'secondary'}>
                    {user.role}
                  </Badge>
                </TableCell>
                <TableCell>
                  {new Date(user.joined_at).toLocaleDateString()}
                </TableCell>
                <TableCell>
                  {user.is_primary && (
                    <Badge variant="outline">Primary Org</Badge>
                  )}
                </TableCell>
                <TableCell>
                  {canRemoveUser(user) ? (
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-destructive hover:text-destructive"
                          onClick={() => setSelectedUser(user)}
                        >
                          <UserMinus className="h-4 w-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle className="flex items-center gap-2">
                            <AlertTriangle className="h-5 w-5 text-destructive" />
                            Remove User from Organization
                          </AlertDialogTitle>
                          <AlertDialogDescription className="space-y-4">
                            <p>
                              You are about to remove <strong>{user.display_name || user.email}</strong> from your organization.
                            </p>
                            <p className="text-sm text-muted-foreground">
                              This will remove their access to the organization and any profile claims they have made.
                              They can rejoin the organization if invited again.
                            </p>
                            
                            <div className="space-y-2">
                              <Label htmlFor="confirmation" className="text-sm font-medium">
                                Type <code className="px-1 py-0.5 bg-muted rounded text-xs">CONFIRM_REMOVE_USER</code> to confirm:
                              </Label>
                              <Input
                                id="confirmation"
                                value={confirmationText}
                                onChange={(e) => setConfirmationText(e.target.value)}
                                placeholder="Type confirmation text"
                                className="font-mono"
                              />
                            </div>
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel onClick={() => {
                            setSelectedUser(null);
                            setConfirmationText("");
                          }}>
                            Cancel
                          </AlertDialogCancel>
                          <AlertDialogAction
                            onClick={handleRemoveUser}
                            disabled={!isConfirmationValid || removingUser === user.user_id}
                            className="bg-destructive hover:bg-destructive/90"
                          >
                            {removingUser === user.user_id ? (
                              "Removing..."
                            ) : (
                              <>
                                <CheckCircle className="h-4 w-4 mr-2" />
                                Remove User
                              </>
                            )}
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  ) : (
                    <span className="text-xs text-muted-foreground">
                      {user.user_id === currentUser?.id ? 'You' : 'Protected'}
                    </span>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>

        {users.length === 0 && (
          <div className="text-center py-6 text-muted-foreground">
            No users found in this organization.
          </div>
        )}
      </CardContent>
    </Card>
  );
};