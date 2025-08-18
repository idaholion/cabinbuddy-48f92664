import { useState } from 'react';
import { AlertTriangle, Shield, RefreshCw } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useSecurityMonitoring } from '@/hooks/useSecurityMonitoring';

interface SecurityAlertProps {
  error?: string;
  onRetry?: () => void;
  showEmergencyAccess?: boolean;
}

export const SecurityAlert = ({ error, onRetry, showEmergencyAccess = true }: SecurityAlertProps) => {
  const { emergencyAccessRequest, clearSecurityEvents } = useSecurityMonitoring();
  const [showEmergencyDialog, setShowEmergencyDialog] = useState(false);
  const [emergencyReason, setEmergencyReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleEmergencyRequest = async () => {
    if (!emergencyReason.trim()) return;

    setIsSubmitting(true);
    const success = await emergencyAccessRequest(emergencyReason);
    
    if (success) {
      setShowEmergencyDialog(false);
      setEmergencyReason('');
      clearSecurityEvents();
    }
    
    setIsSubmitting(false);
  };

  const getAlertVariant = () => {
    if (error?.includes('authentication') || error?.includes('permission')) {
      return 'destructive';
    }
    return 'default';
  };

  const getIcon = () => {
    if (error?.includes('authentication') || error?.includes('permission')) {
      return <Shield className="h-4 w-4" />;
    }
    return <AlertTriangle className="h-4 w-4" />;
  };

  if (!error) return null;

  return (
    <>
      <Alert variant={getAlertVariant()} className="mb-4">
        {getIcon()}
        <AlertTitle>Security Notice</AlertTitle>
        <AlertDescription className="mt-2">
          <p>{error}</p>
          <div className="flex gap-2 mt-3">
            {onRetry && (
              <Button variant="outline" size="sm" onClick={onRetry}>
                <RefreshCw className="h-3 w-3 mr-1" />
                Retry
              </Button>
            )}
            {showEmergencyAccess && (
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => setShowEmergencyDialog(true)}
              >
                Request Emergency Access
              </Button>
            )}
          </div>
        </AlertDescription>
      </Alert>

      <Dialog open={showEmergencyDialog} onOpenChange={setShowEmergencyDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Request Emergency Access</DialogTitle>
            <DialogDescription>
              Please explain why you need emergency access. This request will be logged and reviewed by administrators.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="reason">Reason for Emergency Access</Label>
              <Textarea
                id="reason"
                placeholder="Describe why you need access and any relevant context..."
                value={emergencyReason}
                onChange={(e) => setEmergencyReason(e.target.value)}
                className="mt-1"
                rows={4}
              />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button 
              variant="outline" 
              onClick={() => setShowEmergencyDialog(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button 
              onClick={handleEmergencyRequest}
              disabled={!emergencyReason.trim() || isSubmitting}
            >
              {isSubmitting ? 'Submitting...' : 'Submit Request'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};