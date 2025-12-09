import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { useStayHistorySnapshots, SnapshotFrequency, SnapshotMetadata } from '@/hooks/useStayHistorySnapshots';
import { format } from 'date-fns';
import { 
  Camera, 
  Download, 
  Trash2, 
  RotateCcw, 
  RefreshCw, 
  AlertTriangle,
  FileText,
  Calendar,
  DollarSign,
  Settings,
  Shield,
  Clock,
  Save
} from 'lucide-react';

interface StayHistorySnapshotManagerProps {
  currentYear?: number;
}

interface SnapshotPreviewData {
  organization: string;
  season_year: number;
  snapshot_date: string;
  snapshot_type: string;
  summary: {
    total_reservations: number;
    total_payments: number;
    total_payment_splits: number;
    total_checkin_sessions: number;
    total_receipts: number;
    total_amount_billed: number;
    total_amount_paid: number;
  };
}

export function StayHistorySnapshotManager({ currentYear }: StayHistorySnapshotManagerProps) {
  const [selectedYear, setSelectedYear] = useState<number>(currentYear || new Date().getFullYear());
  const [restoreDialog, setRestoreDialog] = useState<{
    open: boolean;
    snapshot?: SnapshotMetadata;
    preview?: SnapshotPreviewData;
  }>({ open: false });
  const [deleteDialog, setDeleteDialog] = useState<{
    open: boolean;
    snapshot?: SnapshotMetadata;
    confirmText: string;
  }>({ open: false, confirmText: '' });
  const [restoreScope, setRestoreScope] = useState<'full' | 'payments_only' | 'reservations_only'>('full');
  
  // Settings state
  const [editedFrequency, setEditedFrequency] = useState<SnapshotFrequency>('off');
  const [editedRetention, setEditedRetention] = useState<number>(4);

  const {
    snapshots,
    settings,
    loading,
    creating,
    restoring,
    savingSettings,
    fetchSnapshots,
    fetchSettings,
    updateSettings,
    createSnapshot,
    previewRestore,
    restoreSnapshot,
    downloadSnapshot,
    deleteSnapshot,
    getDefaultRetention
  } = useStayHistorySnapshots();

  useEffect(() => {
    fetchSnapshots();
    fetchSettings();
  }, [fetchSnapshots, fetchSettings]);

  useEffect(() => {
    setEditedFrequency(settings.frequency);
    setEditedRetention(settings.retention);
  }, [settings]);

  const handleCreateSnapshot = async () => {
    await createSnapshot(selectedYear);
  };

  const handlePreviewRestore = async (snapshot: SnapshotMetadata) => {
    const preview = await previewRestore(snapshot.file_path);
    if (preview) {
      setRestoreDialog({
        open: true,
        snapshot,
        preview
      });
    }
  };

  const handleConfirmRestore = async () => {
    if (!restoreDialog.snapshot) return;
    
    await restoreSnapshot(restoreDialog.snapshot.file_path, restoreScope);
    setRestoreDialog({ open: false });
    setRestoreScope('full');
  };

  const handleDeleteClick = (snapshot: SnapshotMetadata) => {
    setDeleteDialog({
      open: true,
      snapshot,
      confirmText: ''
    });
  };

  const handleConfirmDelete = async () => {
    if (!deleteDialog.snapshot || deleteDialog.confirmText !== 'DELETE') return;
    
    await deleteSnapshot(deleteDialog.snapshot);
    setDeleteDialog({ open: false, confirmText: '' });
  };

  const handleFrequencyChange = (freq: SnapshotFrequency) => {
    setEditedFrequency(freq);
    // Update retention to default for new frequency
    setEditedRetention(getDefaultRetention(freq));
  };

  const handleSaveSettings = async () => {
    await updateSettings({
      frequency: editedFrequency,
      retention: editedRetention
    });
  };

  const hasSettingsChanged = editedFrequency !== settings.frequency || editedRetention !== settings.retention;

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

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  // Generate year options (current year and 5 years back)
  const currentYearNum = new Date().getFullYear();
  const yearOptions = Array.from({ length: 6 }, (_, i) => currentYearNum - i);

  // Filter snapshots by selected year
  const filteredSnapshots = snapshots.filter(s => s.season_year === selectedYear);

  const frequencyLabels: Record<SnapshotFrequency, string> = {
    off: 'Off (Manual Only)',
    daily: 'Daily',
    weekly: 'Weekly',
    biweekly: 'Bi-weekly',
    monthly: 'Monthly'
  };

  return (
    <div className="space-y-6">
      {/* Settings Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Settings className="h-5 w-5" />
            Automatic Snapshot Settings
          </CardTitle>
          <CardDescription>
            Configure automatic snapshots to protect your stay history data
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="frequency">Snapshot Frequency</Label>
              <Select 
                value={editedFrequency} 
                onValueChange={(val) => handleFrequencyChange(val as SnapshotFrequency)}
              >
                <SelectTrigger id="frequency">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(frequencyLabels).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                {editedFrequency === 'off' 
                  ? 'You must create snapshots manually'
                  : `Snapshots will be created automatically ${editedFrequency}`}
              </p>
            </div>
            
            {editedFrequency !== 'off' && (
              <div className="space-y-2">
                <Label htmlFor="retention">Auto Snapshots to Keep</Label>
                <Input 
                  id="retention"
                  type="number"
                  min={1}
                  max={30}
                  value={editedRetention}
                  onChange={(e) => setEditedRetention(parseInt(e.target.value) || 1)}
                  className="w-full"
                />
                <p className="text-xs text-muted-foreground">
                  Older auto snapshots will be deleted. Manual snapshots are never auto-deleted.
                </p>
              </div>
            )}
          </div>

          {hasSettingsChanged && (
            <Button 
              onClick={handleSaveSettings}
              disabled={savingSettings}
              className="flex items-center gap-2"
            >
              {savingSettings ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              Save Settings
            </Button>
          )}

          {editedFrequency !== 'off' && (
            <div className="bg-muted/50 p-3 rounded-md text-sm flex items-start gap-2">
              <Shield className="h-4 w-4 mt-0.5 text-primary shrink-0" />
              <p>
                <strong>Manual snapshots are protected.</strong> They will never be automatically deleted, 
                only through explicit deletion with confirmation.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Snapshots Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Camera className="h-5 w-5" />
            Stay History Snapshots
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Create Snapshot Section */}
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
            <div className="flex items-center gap-2">
              <Label>Season Year:</Label>
              <Select 
                value={selectedYear.toString()} 
                onValueChange={(val) => setSelectedYear(parseInt(val, 10))}
              >
                <SelectTrigger className="w-[120px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {yearOptions.map(year => (
                    <SelectItem key={year} value={year.toString()}>
                      {year}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <Button 
              onClick={handleCreateSnapshot}
              disabled={creating}
              className="flex items-center gap-2"
            >
              {creating ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : (
                <Camera className="h-4 w-4" />
              )}
              {creating ? 'Creating...' : 'Create Manual Snapshot'}
            </Button>

            <Button 
              variant="outline"
              onClick={() => fetchSnapshots()}
              disabled={loading}
              className="flex items-center gap-2"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>

          {/* Info about snapshots */}
          <div className="text-sm text-muted-foreground bg-muted/50 p-3 rounded-md">
            <p className="font-medium mb-1">What's in a Stay History Snapshot:</p>
            <ul className="list-disc list-inside space-y-0.5">
              <li>All reservations for the selected year</li>
              <li>All payments and payment splits (billing data)</li>
              <li>Check-in/Check-out sessions</li>
              <li>Receipts and expenses</li>
            </ul>
            <p className="mt-2 text-xs">
              <strong>Tip:</strong> Create a manual snapshot before making bulk changes or if you notice any data issues.
            </p>
          </div>

          {/* Snapshots List */}
          <div className="space-y-3">
            <h4 className="text-sm font-medium">
              Snapshots for {selectedYear} ({filteredSnapshots.length})
            </h4>
            
            {loading ? (
              <div className="text-center py-4">
                <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">Loading snapshots...</p>
              </div>
            ) : filteredSnapshots.length === 0 ? (
              <div className="text-center py-6 bg-muted/30 rounded-md">
                <Camera className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">No snapshots for {selectedYear}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Create a manual snapshot to save the current state
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {filteredSnapshots.map(snapshot => (
                  <div 
                    key={snapshot.id}
                    className="flex flex-col sm:flex-row sm:items-center justify-between p-3 border rounded-md gap-3"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <FileText className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm font-medium">
                          {format(new Date(snapshot.created_at), 'MMM d, yyyy h:mm a')}
                        </span>
                        
                        {/* Source Badge */}
                        {snapshot.snapshot_source === 'manual' ? (
                          <Badge variant="default" className="text-xs flex items-center gap-1">
                            <Shield className="h-3 w-3" />
                            Manual
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="text-xs flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            Auto
                          </Badge>
                        )}
                        
                        <Badge variant="outline" className="text-xs">
                          {snapshot.backup_type.replace('stay_history_', '')}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                        <span>Size: {formatFileSize(snapshot.file_size || 0)}</span>
                        {snapshot.snapshot_source === 'manual' && (
                          <span className="text-primary font-medium">Protected from auto-cleanup</span>
                        )}
                        {snapshot.snapshot_source === 'auto' && (
                          <span>Subject to retention limit</span>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handlePreviewRestore(snapshot)}
                        className="flex items-center gap-1"
                      >
                        <RotateCcw className="h-3 w-3" />
                        Restore
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => downloadSnapshot(snapshot)}
                        className="flex items-center gap-1"
                      >
                        <Download className="h-3 w-3" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDeleteClick(snapshot)}
                        className="flex items-center gap-1 text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialog.open} onOpenChange={(open) => !open && setDeleteDialog({ open: false, confirmText: '' })}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Delete Snapshot
            </DialogTitle>
            <DialogDescription>
              This action cannot be undone. The snapshot will be permanently deleted.
            </DialogDescription>
          </DialogHeader>

          {deleteDialog.snapshot && (
            <div className="space-y-4">
              <div className="bg-muted/50 p-3 rounded-md space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span>Season: {deleteDialog.snapshot.season_year}</span>
                </div>
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-muted-foreground" />
                  <span>
                    Created: {format(new Date(deleteDialog.snapshot.created_at), 'MMM d, yyyy h:mm a')}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  {deleteDialog.snapshot.snapshot_source === 'manual' ? (
                    <Badge variant="default" className="text-xs flex items-center gap-1">
                      <Shield className="h-3 w-3" />
                      Manual Snapshot
                    </Badge>
                  ) : (
                    <Badge variant="secondary" className="text-xs flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      Auto Snapshot
                    </Badge>
                  )}
                </div>
              </div>

              {deleteDialog.snapshot.snapshot_source === 'manual' && (
                <div className="bg-amber-500/10 border border-amber-500/20 p-3 rounded-md text-sm">
                  <p className="text-amber-700 dark:text-amber-400">
                    <strong>Warning:</strong> This is a manually created snapshot. 
                    It will not be recreated automatically.
                  </p>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="delete-confirm">
                  Type <strong>DELETE</strong> to confirm
                </Label>
                <Input
                  id="delete-confirm"
                  value={deleteDialog.confirmText}
                  onChange={(e) => setDeleteDialog(prev => ({ ...prev, confirmText: e.target.value }))}
                  placeholder="Type DELETE"
                  className="font-mono"
                />
              </div>
            </div>
          )}

          <DialogFooter className="gap-2">
            <Button 
              variant="outline" 
              onClick={() => setDeleteDialog({ open: false, confirmText: '' })}
            >
              Cancel
            </Button>
            <Button 
              onClick={handleConfirmDelete}
              disabled={deleteDialog.confirmText !== 'DELETE'}
              variant="destructive"
              className="flex items-center gap-2"
            >
              <Trash2 className="h-4 w-4" />
              Delete Snapshot
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Restore Confirmation Dialog */}
      <Dialog open={restoreDialog.open} onOpenChange={(open) => !open && setRestoreDialog({ open: false })}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              Restore Stay History
            </DialogTitle>
            <DialogDescription>
              This will replace current data with the snapshot data.
            </DialogDescription>
          </DialogHeader>

          {restoreDialog.preview && (
            <div className="space-y-4">
              {/* Snapshot Info */}
              <div className="bg-muted/50 p-3 rounded-md space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span>Season: {restoreDialog.preview.season_year}</span>
                </div>
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-muted-foreground" />
                  <span>
                    Snapshot from: {format(new Date(restoreDialog.preview.snapshot_date), 'MMM d, yyyy h:mm a')}
                  </span>
                </div>
              </div>

              {/* Summary */}
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="p-2 bg-muted/30 rounded">
                  <span className="text-muted-foreground">Reservations:</span>
                  <span className="ml-2 font-medium">{restoreDialog.preview.summary.total_reservations}</span>
                </div>
                <div className="p-2 bg-muted/30 rounded">
                  <span className="text-muted-foreground">Payments:</span>
                  <span className="ml-2 font-medium">{restoreDialog.preview.summary.total_payments}</span>
                </div>
                <div className="p-2 bg-muted/30 rounded">
                  <span className="text-muted-foreground">Payment Splits:</span>
                  <span className="ml-2 font-medium">{restoreDialog.preview.summary.total_payment_splits}</span>
                </div>
                <div className="p-2 bg-muted/30 rounded">
                  <span className="text-muted-foreground">Check-ins:</span>
                  <span className="ml-2 font-medium">{restoreDialog.preview.summary.total_checkin_sessions}</span>
                </div>
                <div className="p-2 bg-muted/30 rounded col-span-2">
                  <div className="flex items-center gap-1">
                    <DollarSign className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">Total Billed:</span>
                    <span className="ml-1 font-medium">
                      {formatCurrency(restoreDialog.preview.summary.total_amount_billed)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Restore Scope Selection */}
              <div className="space-y-3">
                <Label className="text-sm font-medium">What to restore:</Label>
                <RadioGroup 
                  value={restoreScope} 
                  onValueChange={(val) => setRestoreScope(val as typeof restoreScope)}
                  className="space-y-2"
                >
                  <div className="flex items-start space-x-2">
                    <RadioGroupItem value="full" id="full" />
                    <div>
                      <Label htmlFor="full" className="cursor-pointer">Full Restore</Label>
                      <p className="text-xs text-muted-foreground">
                        All reservations, payments, splits, check-ins, and receipts
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start space-x-2">
                    <RadioGroupItem value="payments_only" id="payments_only" />
                    <div>
                      <Label htmlFor="payments_only" className="cursor-pointer">Payments Only</Label>
                      <p className="text-xs text-muted-foreground">
                        Only restore payments and payment splits (recommended for billing issues)
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start space-x-2">
                    <RadioGroupItem value="reservations_only" id="reservations_only" />
                    <div>
                      <Label htmlFor="reservations_only" className="cursor-pointer">Reservations Only</Label>
                      <p className="text-xs text-muted-foreground">
                        Only restore reservation records
                      </p>
                    </div>
                  </div>
                </RadioGroup>
              </div>

              {/* Warning */}
              <div className="bg-amber-500/10 border border-amber-500/20 p-3 rounded-md text-sm">
                <p className="text-amber-700 dark:text-amber-400">
                  <strong>Warning:</strong> A backup of your current data will be created automatically 
                  before restoring. You can use it to undo this restore if needed.
                </p>
              </div>
            </div>
          )}

          <DialogFooter className="gap-2">
            <Button 
              variant="outline" 
              onClick={() => setRestoreDialog({ open: false })}
              disabled={restoring}
            >
              Cancel
            </Button>
            <Button 
              onClick={handleConfirmRestore}
              disabled={restoring}
              variant="destructive"
              className="flex items-center gap-2"
            >
              {restoring ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : (
                <RotateCcw className="h-4 w-4" />
              )}
              {restoring ? 'Restoring...' : 'Confirm Restore'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
