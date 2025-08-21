import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Edit, UserCheck, Shield } from 'lucide-react';
import { useRole } from '@/contexts/RoleContext';
import { useAuth } from '@/contexts/AuthContext';
import { useRoleAwareFamilyGroups } from '@/hooks/useRoleAwareFamilyGroups';

interface FamilyGroupRenameDialogProps {
  groupName: string;
  groupLeadEmail?: string;
  alternateLeadId?: string;
  onRename: (oldName: string, newName: string) => Promise<void>;
  children?: React.ReactNode;
}

export const FamilyGroupRenameDialog = ({ 
  groupName, 
  groupLeadEmail,
  alternateLeadId,
  onRename,
  children 
}: FamilyGroupRenameDialogProps) => {
  const [open, setOpen] = useState(false);
  const [newName, setNewName] = useState(groupName);
  const [loading, setLoading] = useState(false);
  const { canAccessSupervisorFeatures, isOrgAdmin } = useRole();
  const { user } = useAuth();

  // Check if current user can rename this group
  const canRename = () => {
    if (canAccessSupervisorFeatures) return true;
    if (isOrgAdmin) return true;
    if (user?.email && (groupLeadEmail === user.email || alternateLeadId === user.email)) return true;
    return false;
  };

  const handleRename = async () => {
    if (!newName.trim() || newName === groupName) return;
    
    setLoading(true);
    try {
      await onRename(groupName, newName.trim());
      setOpen(false);
      setNewName(groupName); // Reset to original name
    } catch (error) {
      console.error('Error renaming group:', error);
    } finally {
      setLoading(false);
    }
  };

  const getPermissionLevel = () => {
    if (canAccessSupervisorFeatures) return { label: 'Supervisor', icon: Shield, variant: 'default' as const };
    if (isOrgAdmin) return { label: 'Administrator', icon: UserCheck, variant: 'secondary' as const };
    if (user?.email && (groupLeadEmail === user.email || alternateLeadId === user.email)) {
      return { label: 'Group Lead', icon: UserCheck, variant: 'outline' as const };
    }
    return null;
  };

  if (!canRename()) {
    return null;
  }

  const permission = getPermissionLevel();

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children || (
          <Button variant="ghost" size="sm" className="flex items-center gap-2">
            <Edit className="h-4 w-4" />
            Rename Group
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Edit className="h-4 w-4" />
            Rename Family Group
          </DialogTitle>
          <DialogDescription className="space-y-2">
            <p>Change the name of this family group. All historical data will be preserved.</p>
            {permission && (
              <div className="flex items-center gap-2">
                <Badge variant={permission.variant} className="flex items-center gap-1">
                  <permission.icon className="h-3 w-3" />
                  {permission.label}
                </Badge>
                <span className="text-xs text-muted-foreground">
                  You can rename this group
                </span>
              </div>
            )}
          </DialogDescription>
        </DialogHeader>
        
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="current-name" className="text-right">
              Current
            </Label>
            <Input
              id="current-name"
              value={groupName}
              disabled
              className="col-span-3 bg-muted"
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="new-name" className="text-right">
              New Name
            </Label>
            <Input
              id="new-name"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              className="col-span-3"
              placeholder="Enter new group name"
            />
          </div>
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button 
            onClick={handleRename} 
            disabled={loading || !newName.trim() || newName === groupName}
          >
            {loading ? 'Renaming...' : 'Rename Group'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};