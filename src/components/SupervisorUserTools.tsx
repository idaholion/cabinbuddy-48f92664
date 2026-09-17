import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { KeyRound, AlertTriangle, Search, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';

interface PreviewLocation {
  location: string;
  count: number;
}

interface PreviewResult {
  success: boolean;
  error?: string;
  email: string;
  login_account_found: boolean;
  member_entries: number;
  locations: PreviewLocation[];
}

const CONFIRM_CODE = 'CONFIRM_EMAIL_CHANGE';

export const SupervisorUserTools = () => {
  const [oldEmail, setOldEmail] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [confirmationCode, setConfirmationCode] = useState('');
  const [preview, setPreview] = useState<PreviewResult | null>(null);
  const [isPreviewing, setIsPreviewing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [doneMessage, setDoneMessage] = useState<string | null>(null);

  const resetFlow = () => {
    setPreview(null);
    setConfirmationCode('');
  };

  const handlePreview = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsPreviewing(true);
    setDoneMessage(null);
    try {
      const { data, error } = await (supabase as any).rpc('supervisor_preview_email_change', {
        p_email: oldEmail.trim().toLowerCase(),
      });
      if (error) throw error;
      const result = data as PreviewResult;
      if (!result?.success) {
        toast.error(result?.error || 'Could not look up that address');
        return;
      }
      setPreview(result);
      if (!result.login_account_found && result.locations.length === 0 && result.member_entries === 0) {
        toast.info('That address was not found anywhere in the system');
      }
    } catch (err: any) {
      console.error('Email preview error:', err);
      toast.error(err.message || 'Could not look up that address');
    } finally {
      setIsPreviewing(false);
    }
  };

  const handleConfirm = async () => {
    setIsSubmitting(true);
    try {
      const { data, error } = await (supabase as any).rpc('supervisor_change_member_email', {
        p_old_email: oldEmail.trim().toLowerCase(),
        p_new_email: newEmail.trim().toLowerCase(),
        p_confirmation_code: confirmationCode,
      });
      if (error) throw error;
      const result = data as any;
      if (result?.success) {
        toast.success(`Email changed to ${result.new_email}`);
        setDoneMessage(
          `${result.records_affected} record(s) updated. ${result.next_steps || ''}`
        );
        setOldEmail('');
        setNewEmail('');
        resetFlow();
      } else {
        toast.error(result?.error || 'Failed to change email');
      }
    } catch (err: any) {
      console.error('Email change error:', err);
      toast.error(err.message || 'Failed to change email');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <KeyRound className="h-5 w-5" />
          Change a Person's Email
        </CardTitle>
        <CardDescription className="text-base">
          Changes the sign-in email and every contact address used for notifications, in one step.
          Most people can do this themselves on their Profile page — use this only when someone is stuck.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription className="text-sm">
            The old address stops working immediately. Make sure the person knows to sign in with the new one.
          </AlertDescription>
        </Alert>

        {doneMessage && (
          <Alert>
            <CheckCircle2 className="h-4 w-4" />
            <AlertDescription className="text-sm">{doneMessage}</AlertDescription>
          </Alert>
        )}

        <form onSubmit={handlePreview} className="space-y-4 max-w-md">
          <div className="space-y-2">
            <Label htmlFor="old-email" className="text-base">Current Email</Label>
            <Input
              id="old-email"
              type="email"
              placeholder="person@old-email.com"
              value={oldEmail}
              onChange={(e) => { setOldEmail(e.target.value); resetFlow(); }}
              required
              className="text-base"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="new-email" className="text-base">New Email</Label>
            <Input
              id="new-email"
              type="email"
              placeholder="person@new-email.com"
              value={newEmail}
              onChange={(e) => { setNewEmail(e.target.value); resetFlow(); }}
              required
              className="text-base"
            />
          </div>

          <Button type="submit" variant="outline" disabled={isPreviewing || !oldEmail || !newEmail} className="text-base">
            <Search className="h-4 w-4 mr-2" />
            {isPreviewing ? 'Checking...' : 'Preview Changes'}
          </Button>
        </form>

        {preview && (
          <div className="space-y-4 max-w-md">
            <div className="rounded-md border p-4 space-y-2">
              <p className="text-sm font-medium">
                {preview.login_account_found
                  ? 'A sign-in account uses this address.'
                  : 'No sign-in account uses this address.'}
              </p>
              {preview.locations.length === 0 ? (
                <p className="text-sm text-muted-foreground">No other records reference this address.</p>
              ) : (
                <ul className="text-sm text-muted-foreground space-y-1">
                  {preview.locations.map((loc) => (
                    <li key={loc.location} className="flex justify-between gap-4">
                      <span>{loc.location}</span>
                      <span className="font-mono">{loc.count}</span>
                    </li>
                  ))}
                </ul>
              )}
              <p className="text-sm pt-2">
                All of the above will change to <strong>{newEmail.trim().toLowerCase()}</strong>, and any
                duplicate member entry for the same person will be removed.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirm-code" className="text-base">Confirmation Code</Label>
              <Input
                id="confirm-code"
                placeholder={`Type ${CONFIRM_CODE}`}
                value={confirmationCode}
                onChange={(e) => setConfirmationCode(e.target.value)}
                className="text-base font-mono"
              />
              <p className="text-xs text-muted-foreground">
                Type <code className="bg-muted px-1 rounded">{CONFIRM_CODE}</code> to confirm this action
              </p>
            </div>

            <Button
              onClick={handleConfirm}
              disabled={isSubmitting || confirmationCode !== CONFIRM_CODE}
              className="text-base"
            >
              {isSubmitting ? 'Updating...' : 'Apply Email Change'}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
