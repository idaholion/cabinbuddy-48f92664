import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Download, Database, Calendar, FileText, Trash2, RefreshCw, Upload, AlertTriangle, Info, ChevronDown, ChevronUp } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { NavigationHeader } from "@/components/ui/navigation-header";
import { format } from "date-fns";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useRole } from "@/contexts/RoleContext";
import { useOrganization } from "@/hooks/useOrganization";

interface BackupMetadata {
  id: string;
  organization_id: string;
  backup_type: string;
  file_path: string;
  file_size: number;
  created_at: string;
  status: string;
  organization_name?: string;
  data_summary?: {
    family_groups: number;
    reservations: number;
    receipts: number;
    rotation_orders: number;
    checkin_sessions: number;
    profiles: number;
  };
}

export default function DataBackup() {
  const [backups, setBackups] = useState<BackupMetadata[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [checking, setChecking] = useState(true);
  const [restoreDialog, setRestoreDialog] = useState<{open: boolean, backup?: BackupMetadata, preview?: any}>({open: false});
  const [restoring, setRestoring] = useState(false);
  const [expandedBackups, setExpandedBackups] = useState<Set<string>>(new Set());
  const [orgFilter, setOrgFilter] = useState<string>('all');
  const [organizations, setOrganizations] = useState<{id: string, name: string}[]>([]);
  const { toast } = useToast();
  const { canAccessSupervisorFeatures } = useRole();
  const { organization } = useOrganization();

  const checkAdminStatus = async () => {
    try {
      const { data, error } = await supabase.rpc('is_organization_admin');
      if (error) throw error;
      setIsAdmin(data || false);
    } catch (error) {
      console.error('Error checking admin status:', error);
      setIsAdmin(false);
    } finally {
      setChecking(false);
    }
  };

  const fetchBackups = async () => {
    try {
      const { data: backupsData, error } = await supabase
        .from('backup_metadata')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Fetch organization names
      if (backupsData && backupsData.length > 0) {
        const orgIds = [...new Set(backupsData.map(b => b.organization_id))];
        const { data: orgsData } = await supabase
          .from('organizations')
          .select('id, name')
          .in('id', orgIds);

        const orgMap = new Map(orgsData?.map(o => [o.id, o.name]) || []);
        setOrganizations(orgsData || []);

        // Fetch data summaries for each backup
        const enrichedBackups = await Promise.all(
          backupsData.map(async (backup) => {
            try {
              // Download backup file to get data summary
              const { data: fileData } = await supabase.storage
                .from('organization-backups')
                .download(backup.file_path);

              if (fileData) {
                const text = await fileData.text();
                const backupContent = JSON.parse(text);
                
                return {
                  ...backup,
                  organization_name: orgMap.get(backup.organization_id) || 'Unknown',
                  data_summary: backupContent.data_summary
                };
              }
            } catch (err) {
              console.error('Error loading backup summary:', err);
            }
            
            return {
              ...backup,
              organization_name: orgMap.get(backup.organization_id) || 'Unknown'
            };
          })
        );

        // Filter to only user's organization if not in supervisor mode
        if (!canAccessSupervisorFeatures && organization?.id) {
          const filteredBackups = enrichedBackups.filter(
            backup => backup.organization_id === organization.id
          );
          setBackups(filteredBackups);
          // Also filter organizations dropdown
          setOrganizations(orgsData?.filter(o => o.id === organization.id) || []);
        } else {
          setBackups(enrichedBackups);
        }
      } else {
        setBackups([]);
      }
    } catch (error) {
      console.error('Error fetching backups:', error);
      toast({
        title: "Error",
        description: "Failed to load backup history",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkAdminStatus();
  }, []);

  useEffect(() => {
    if (isAdmin) {
      fetchBackups();
    }
  }, [isAdmin, canAccessSupervisorFeatures, organization?.id]);

  const createManualBackup = async () => {
    setCreating(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data: userOrg } = await supabase
        .from('user_organizations')
        .select('organization_id')
        .eq('user_id', user.id)
        .eq('is_primary', true)
        .single();

      if (!userOrg) throw new Error('No organization found');

      const { data, error } = await supabase.functions.invoke('create-organization-backup', {
        body: {
          organization_id: userOrg.organization_id,
          backup_type: 'manual'
        }
      });

      if (error) throw error;

      toast({
        title: "Backup Created",
        description: "Manual backup has been created successfully",
      });

      // Refresh the backup list
      fetchBackups();
    } catch (error) {
      console.error('Error creating backup:', error);
      toast({
        title: "Backup Failed",
        description: "Failed to create backup. Please try again.",
        variant: "destructive"
      });
    } finally {
      setCreating(false);
    }
  };

  const downloadBackup = async (backup: BackupMetadata) => {
    try {
      const { data, error } = await supabase.storage
        .from('organization-backups')
        .download(backup.file_path);

      if (error) throw error;

      // Create download link
      const url = URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url;
      a.download = backup.file_path.split('/').pop() || 'backup.json';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast({
        title: "Download Started",
        description: "Backup file is being downloaded",
      });
    } catch (error) {
      console.error('Error downloading backup:', error);
      toast({
        title: "Download Failed",
        description: "Failed to download backup file",
        variant: "destructive"
      });
    }
  };

  const previewRestore = async (backup: BackupMetadata) => {
    try {
      const { data, error } = await supabase.functions.invoke('restore-organization-backup', {
        body: {
          backup_file_path: backup.file_path,
          confirm_restore: false
        }
      });

      if (error) throw error;

      setRestoreDialog({
        open: true,
        backup,
        preview: data.data
      });
    } catch (error) {
      console.error('Error previewing restore:', error);
      toast({
        title: "Preview Failed",
        description: "Failed to preview backup data",
        variant: "destructive"
      });
    }
  };

  const confirmRestore = async () => {
    if (!restoreDialog.backup) return;
    
    setRestoring(true);
    try {
      const { data, error } = await supabase.functions.invoke('restore-organization-backup', {
        body: {
          backup_file_path: restoreDialog.backup.file_path,
          confirm_restore: true
        }
      });

      if (error) throw error;

      toast({
        title: "Restore Completed",
        description: `Data restored from ${restoreDialog.preview?.backup_date ? format(new Date(restoreDialog.preview.backup_date), 'MMM d, yyyy') : 'backup'}`,
      });

      setRestoreDialog({open: false});
      fetchBackups(); // Refresh to show any new backup records
    } catch (error) {
      console.error('Error restoring backup:', error);
      toast({
        title: "Restore Failed",
        description: "Failed to restore data. Please try again.",
        variant: "destructive"
      });
    } finally {
      setRestoring(false);
    }
  };

  const deleteBackup = async (backup: BackupMetadata) => {
    try {
      // Delete from storage
      const { error: storageError } = await supabase.storage
        .from('organization-backups')
        .remove([backup.file_path]);

      if (storageError) throw storageError;

      // Delete metadata
      const { error: metadataError } = await supabase
        .from('backup_metadata')
        .delete()
        .eq('id', backup.id);

      if (metadataError) throw metadataError;

      toast({
        title: "Backup Deleted",
        description: "Backup has been removed successfully",
      });

      // Refresh the backup list
      fetchBackups();
    } catch (error) {
      console.error('Error deleting backup:', error);
      toast({
        title: "Delete Failed",
        description: "Failed to delete backup",
        variant: "destructive"
      });
    }
  };

  const formatFileSize = (bytes: number) => {
    const units = ['B', 'KB', 'MB', 'GB'];
    let size = bytes;
    let unitIndex = 0;
    
    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }
    
    return `${size.toFixed(1)} ${units[unitIndex]}`;
  };

  // Show loading while checking admin status
  if (checking) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/5">
        <div className="container mx-auto px-4 py-8">
          <PageHeader 
            title="Data Restore & Recovery"
            subtitle="Access data backups and restore functionality"
            icon={Database}
          >
            <NavigationHeader />
          </PageHeader>
          <div className="text-center py-12">
            <RefreshCw className="h-16 w-16 mx-auto mb-4 text-muted-foreground animate-spin" />
            <p className="text-muted-foreground text-base">Checking permissions...</p>
          </div>
        </div>
      </div>
    );
  }

  // Show access denied for non-admin users
  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/5">
        <div className="container mx-auto px-4 py-8">
          <PageHeader 
            title="Data Restore & Recovery"
            subtitle="Access data backups and restore functionality"
            icon={Database}
          >
            <NavigationHeader />
          </PageHeader>
          <Card>
            <CardContent className="text-center py-12">
              <Database className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-medium mb-2">Administrator Access Required</h3>
              <p className="text-muted-foreground mb-4 text-base">
                Data backup and recovery features are restricted to organization administrators only.
              </p>
              <p className="text-base text-muted-foreground">
                Contact your organization administrator if you need access to backup data.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/5">
      <div className="container mx-auto px-4 py-8">
        <PageHeader 
          title="Data Restore & Recovery"
          subtitle="Manage organization data backups and restore capabilities"
          icon={Database}
        >
          <NavigationHeader />
        </PageHeader>

        <div className="space-y-6">
          {/* Role Info Card */}
          {canAccessSupervisorFeatures && (
            <Card className="border-amber-500/20 bg-amber-500/5">
              <CardContent className="pt-6">
                <div className="flex items-start gap-3">
                  <Info className="h-5 w-5 text-amber-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <h4 className="font-medium mb-1">Supervisor Mode Active</h4>
                    <p className="text-sm text-muted-foreground">
                      You're in <strong>supervisor mode</strong> and can see backups for all organizations. 
                      Exit supervisor mode to view only your organization's backups.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Info Card - What's Included in Backups */}
          <Card className="border-primary/20 bg-primary/5">
            <CardContent className="pt-6">
              <div className="flex items-start gap-3">
                <Info className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                <div>
                  <h4 className="font-medium mb-2">What's Included in Backups</h4>
                  <p className="text-sm text-muted-foreground mb-2">
                    Each backup contains a complete snapshot of {canAccessSupervisorFeatures ? 'an' : 'your'} organization's data:
                  </p>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-x-4 gap-y-1 text-sm text-muted-foreground">
                    <span>• Organization Settings</span>
                    <span>• Family Groups</span>
                    <span>• Reservations</span>
                    <span>• Receipts & Payments</span>
                    <span>• Rotation Orders</span>
                    <span>• Time Period Usage</span>
                    <span>• Reservation Settings</span>
                    <span>• Recurring Bills</span>
                    <span>• Check-in Sessions</span>
                    <span>• Survey Responses</span>
                    <span>• Notification Logs</span>
                    <span>• User Profiles</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Backup Actions */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="h-5 w-5" />
                Backup Management
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-col sm:flex-row gap-4">
                <Button 
                  onClick={createManualBackup}
                  disabled={creating}
                  className="flex items-center gap-2 text-base"
                >
                  {creating ? (
                    <RefreshCw className="h-4 w-4 animate-spin" />
                  ) : (
                    <Database className="h-4 w-4" />
                  )}
                  {creating ? 'Creating Backup...' : 'Create Manual Backup'}
                </Button>
                
                <Button 
                  variant="outline"
                  onClick={fetchBackups}
                  disabled={loading}
                  className="flex items-center gap-2 text-base"
                >
                  <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                  Refresh List
                </Button>
              </div>
              
              <div className="text-base text-muted-foreground">
                <p>• Automatic backups are created daily at 2 AM Mountain Time</p>
                <p>• Only the 3 most recent backups are kept per organization</p>
                <p>• Manual backups can be created anytime</p>
                <p>• Download backups locally for extra safety</p>
              </div>
            </CardContent>
          </Card>

          {/* Backup History */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Backup History
                  {!canAccessSupervisorFeatures && <Badge variant="outline" className="text-xs ml-2">Your Organization Only</Badge>}
                </CardTitle>
                {canAccessSupervisorFeatures && organizations.length > 1 && (
                  <select
                    value={orgFilter}
                    onChange={(e) => setOrgFilter(e.target.value)}
                    className="px-3 py-1 text-sm border rounded-md bg-background"
                  >
                    <option value="all">All Organizations ({organizations.length})</option>
                    {organizations.map(org => (
                      <option key={org.id} value={org.id}>{org.name}</option>
                    ))}
                  </select>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-center py-8">
                  <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4 text-muted-foreground" />
                  <p className="text-muted-foreground text-base">Loading backups...</p>
                </div>
              ) : backups.length === 0 ? (
                <div className="text-center py-8">
                  <Database className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
                  <h3 className="text-lg font-medium mb-2">No Backups Available</h3>
                  <p className="text-muted-foreground mb-4 text-base">Create your first backup to get started</p>
                  <Button onClick={createManualBackup} disabled={creating} className="text-base">
                    Create First Backup
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  {backups
                    .filter(backup => orgFilter === 'all' || backup.organization_id === orgFilter)
                    .map((backup) => {
                      const isExpanded = expandedBackups.has(backup.id);
                      return (
                        <div
                          key={backup.id}
                          className="border rounded-lg hover:bg-muted/50"
                        >
                          <div className="flex items-center justify-between p-4">
                            <div className="flex items-center space-x-4 flex-1">
                              <div className="flex-shrink-0">
                                <FileText className="h-8 w-8 text-primary" />
                              </div>
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1 flex-wrap">
                                  <h4 className="font-medium">
                                    {backup.organization_name}
                                  </h4>
                                  <Badge variant={backup.backup_type === 'manual' ? 'default' : 'secondary'} className="text-xs">
                                    {backup.backup_type}
                                  </Badge>
                                  {backup.data_summary && (
                                    <TooltipProvider>
                                      <Tooltip>
                                        <TooltipTrigger asChild>
                                          <Button
                                            variant="ghost"
                                            size="sm"
                                            className="h-6 px-2"
                                            onClick={() => {
                                              const newExpanded = new Set(expandedBackups);
                                              if (isExpanded) {
                                                newExpanded.delete(backup.id);
                                              } else {
                                                newExpanded.add(backup.id);
                                              }
                                              setExpandedBackups(newExpanded);
                                            }}
                                          >
                                            <Info className="h-3 w-3 text-muted-foreground" />
                                            {isExpanded ? (
                                              <ChevronUp className="h-3 w-3 ml-1" />
                                            ) : (
                                              <ChevronDown className="h-3 w-3 ml-1" />
                                            )}
                                          </Button>
                                        </TooltipTrigger>
                                        <TooltipContent>
                                          <p>View data summary</p>
                                        </TooltipContent>
                                      </Tooltip>
                                    </TooltipProvider>
                                  )}
                                </div>
                                <div className="flex items-center gap-4 text-sm text-muted-foreground flex-wrap">
                                  <span className="flex items-center gap-1">
                                    <Calendar className="h-3 w-3" />
                                    {format(new Date(backup.created_at), 'MMM d, yyyy h:mm a')}
                                  </span>
                                  <span>{formatFileSize(backup.file_size || 0)}</span>
                                </div>
                              </div>
                            </div>
                            
                            <div className="flex items-center gap-2 ml-4">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => previewRestore(backup)}
                                className="flex items-center gap-1 text-sm"
                              >
                                <Upload className="h-4 w-4" />
                                Restore
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => downloadBackup(backup)}
                                className="flex items-center gap-1 text-sm"
                              >
                                <Download className="h-4 w-4" />
                                Download
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => deleteBackup(backup)}
                                className="text-destructive hover:text-destructive hover:bg-destructive/10"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                          
                          {/* Expandable Data Summary */}
                          {isExpanded && backup.data_summary && (
                            <div className="px-4 pb-4 pt-0 border-t">
                              <div className="bg-muted/50 rounded-md p-3 mt-3">
                                <h5 className="text-sm font-medium mb-2">Backup Contents</h5>
                                <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-sm">
                                  <div className="flex justify-between">
                                    <span className="text-muted-foreground">Family Groups:</span>
                                    <span className="font-medium">{backup.data_summary.family_groups}</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-muted-foreground">Reservations:</span>
                                    <span className="font-medium">{backup.data_summary.reservations}</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-muted-foreground">Receipts:</span>
                                    <span className="font-medium">{backup.data_summary.receipts}</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-muted-foreground">Rotation Orders:</span>
                                    <span className="font-medium">{backup.data_summary.rotation_orders}</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-muted-foreground">Check-ins:</span>
                                    <span className="font-medium">{backup.data_summary.checkin_sessions}</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-muted-foreground">User Profiles:</span>
                                    <span className="font-medium">{backup.data_summary.profiles}</span>
                                  </div>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Restore Confirmation Dialog */}
        <Dialog open={restoreDialog.open} onOpenChange={(open) => setRestoreDialog({open})}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-amber-500" />
                Confirm Data Restore
              </DialogTitle>
              <DialogDescription>
                This will restore your organization data from the selected backup. All current data will be replaced.
              </DialogDescription>
            </DialogHeader>
            
            {restoreDialog.preview && (
              <div className="space-y-4">
                <div className="bg-muted/50 p-4 rounded-lg">
                  <h4 className="font-medium mb-2">Backup Information</h4>
                  <div className="grid grid-cols-2 gap-4 text-base">
                    <div>
                      <span className="text-muted-foreground">Backup Date:</span>
                      <p className="font-medium">
                        {format(new Date(restoreDialog.preview.backup_date), 'MMM d, yyyy h:mm a')}
                      </p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Backup Type:</span>
                      <p className="font-medium capitalize">{restoreDialog.preview.backup_type}</p>
                    </div>
                  </div>
                </div>

                <div className="bg-amber-50 border border-amber-200 p-4 rounded-lg">
                  <h4 className="font-medium mb-2 text-amber-800">⚠️ Important Notice</h4>
                  <ul className="text-base text-amber-700 space-y-1">
                    <li>• A backup of your current data will be created before restore</li>
                    <li>• All current organization data will be replaced with backup data</li>
                    <li>• This action cannot be undone (except by restoring another backup)</li>
                    <li>• Any data added since this backup will be lost</li>
                  </ul>
                </div>

                <div className="bg-muted/50 p-4 rounded-lg">
                  <h4 className="font-medium mb-2">Data to be Restored</h4>
                  <div className="grid grid-cols-2 gap-2 text-base">
                    <div className="flex justify-between">
                      <span>Family Groups:</span>
                      <span className="font-medium">{restoreDialog.preview.data_summary.family_groups}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Reservations:</span>
                      <span className="font-medium">{restoreDialog.preview.data_summary.reservations}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Receipts:</span>
                      <span className="font-medium">{restoreDialog.preview.data_summary.receipts}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Rotation Orders:</span>
                      <span className="font-medium">{restoreDialog.preview.data_summary.rotation_orders}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Check-in Sessions:</span>
                      <span className="font-medium">{restoreDialog.preview.data_summary.checkin_sessions}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>User Profiles:</span>
                      <span className="font-medium">{restoreDialog.preview.data_summary.profiles}</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            <DialogFooter>
              <Button 
                variant="outline" 
                onClick={() => setRestoreDialog({open: false})}
                disabled={restoring}
                className="text-base"
              >
                Cancel
              </Button>
              <Button 
                variant="destructive" 
                onClick={confirmRestore}
                disabled={restoring}
                className="flex items-center gap-2 text-base"
              >
                {restoring ? (
                  <RefreshCw className="h-4 w-4 animate-spin" />
                ) : (
                  <Upload className="h-4 w-4" />
                )}
                {restoring ? 'Restoring...' : 'Confirm Restore'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}