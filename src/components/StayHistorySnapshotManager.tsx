import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
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
import { useStayHistorySnapshots } from '@/hooks/useStayHistorySnapshots';
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
  DollarSign
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
    snapshot?: any;
    preview?: SnapshotPreviewData;
  }>({ open: false });
  const [restoreScope, setRestoreScope] = useState<'full' | 'payments_only' | 'reservations_only'>('full');

  const {
    snapshots,
    loading,
    creating,
    restoring,
    fetchSnapshots,
    createSnapshot,
    previewRestore,
    restoreSnapshot,
    downloadSnapshot,
    deleteSnapshot
  } = useStayHistorySnapshots();

  useEffect(() => {
    fetchSnapshots();
  }, [fetchSnapshots]);

  const handleCreateSnapshot = async () => {
    await createSnapshot(selectedYear);
  };

  const handlePreviewRestore = async (snapshot: any) => {
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

  return (
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
            {creating ? 'Creating...' : 'Create Snapshot'}
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
            <strong>Tip:</strong> Create a snapshot before making bulk changes or if you notice any data issues.
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
                Create a snapshot to save the current state
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
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm font-medium">
                        {format(new Date(snapshot.created_at), 'MMM d, yyyy h:mm a')}
                      </span>
                      <Badge variant="outline" className="text-xs">
                        {snapshot.backup_type.replace('stay_history_', '')}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Size: {formatFileSize(snapshot.file_size || 0)}
                    </p>
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
                      onClick={() => deleteSnapshot(snapshot)}
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
    </Card>
  );
}
