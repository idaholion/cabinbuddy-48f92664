import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Copy, Eye, Shield, Users, Calendar, RotateCcw } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { useGuestAccessManagement } from '@/hooks/useGuestAccess';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface GuestAccessSettingsProps {
  organizationId: string;
}

export const GuestAccessSettings = ({ organizationId }: GuestAccessSettingsProps) => {
  const [accessType, setAccessType] = useState<'private' | 'public_readonly' | 'demo'>('private');
  const [guestToken, setGuestToken] = useState<string | null>(null);
  const [tokenExpiry, setTokenExpiry] = useState<string | null>(null);
  const [expiresHours, setExpiresHours] = useState<number>(168); // 1 week default
  const [noExpiration, setNoExpiration] = useState<boolean>(false);
  const [loading, setLoading] = useState(true);

  const {
    generateGuestToken,
    revokeGuestAccess,
    updateOrganizationAccessType,
    getGuestAccessUrl,
    loading: managementLoading,
  } = useGuestAccessManagement();

  useEffect(() => {
    fetchOrganizationSettings();
  }, [organizationId]);

  const fetchOrganizationSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('organizations')
        .select('access_type, guest_access_token, guest_token_expires_at')
        .eq('id', organizationId)
        .single();

      if (error) throw error;

      setAccessType((data.access_type as 'private' | 'public_readonly' | 'demo') || 'private');
      setGuestToken(data.guest_access_token);
      setTokenExpiry(data.guest_token_expires_at);
    } catch (error) {
      console.error('Error fetching organization settings:', error);
      toast.error('Failed to load guest access settings');
    } finally {
      setLoading(false);
    }
  };

  const handleAccessTypeChange = async (newAccessType: string) => {
    const validAccessType = newAccessType as 'private' | 'public_readonly' | 'demo';
    const success = await updateOrganizationAccessType(organizationId, validAccessType);
    if (success) {
      setAccessType(validAccessType);
      if (validAccessType === 'private') {
        // Auto-revoke guest access when switching to private
        await handleRevokeAccess();
      }
    }
  };

  const handleGenerateToken = async () => {
    const hours = noExpiration ? 8760 * 10 : expiresHours; // 10 years for "no expiration"
    const token = await generateGuestToken(organizationId, hours);
    if (token) {
      await fetchOrganizationSettings(); // Refresh to get new token data
    }
  };

  const handleRevokeAccess = async () => {
    const success = await revokeGuestAccess(organizationId);
    if (success) {
      setGuestToken(null);
      setTokenExpiry(null);
    }
  };

  const copyGuestUrl = () => {
    if (guestToken) {
      const url = getGuestAccessUrl(organizationId, guestToken);
      navigator.clipboard.writeText(url);
      toast.success('Guest access URL copied to clipboard');
    }
  };

  const isTokenExpired = tokenExpiry ? new Date(tokenExpiry) < new Date() : false;
  const hasValidToken = guestToken && !isTokenExpired;

  if (loading) {
    return <Card><CardContent className="p-6">Loading guest access settings...</CardContent></Card>;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Eye className="h-5 w-5" />
          Guest Access Settings
        </CardTitle>
        <CardDescription>
          Control how external users can access your organization's data for preview purposes.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Access Type Selection */}
        <div className="space-y-2">
          <Label htmlFor="access-type">Organization Access Type</Label>
          <Select value={accessType} onValueChange={handleAccessTypeChange}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="private">
                <div className="flex items-center gap-2">
                  <Shield className="h-4 w-4" />
                  <div>
                    <div className="font-medium">Private</div>
                    <div className="text-sm text-muted-foreground">Members only</div>
                  </div>
                </div>
              </SelectItem>
              <SelectItem value="public_readonly">
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  <div>
                    <div className="font-medium">Public Read-Only</div>
                    <div className="text-sm text-muted-foreground">Guest access with tokens</div>
                  </div>
                </div>
              </SelectItem>
              <SelectItem value="demo">
                <div className="flex items-center gap-2">
                  <Eye className="h-4 w-4" />
                  <div>
                    <div className="font-medium">Demo</div>
                    <div className="text-sm text-muted-foreground">For showcasing features</div>
                  </div>
                </div>
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Guest Token Management */}
        {accessType !== 'private' && (
          <div className="space-y-4 border-t pt-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-medium">Guest Access Token</h4>
                <p className="text-sm text-muted-foreground">
                  Generate secure links for temporary access
                </p>
              </div>
              {hasValidToken && (
                <Badge variant="outline" className="text-green-600 border-green-600">
                  Active
                </Badge>
              )}
              {isTokenExpired && (
                <Badge variant="outline" className="text-orange-600 border-orange-600">
                  Expired
                </Badge>
              )}
            </div>

            {/* Token Generation */}
            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="no-expiration"
                  checked={noExpiration}
                  onCheckedChange={(checked) => setNoExpiration(checked as boolean)}
                />
                <Label htmlFor="no-expiration" className="text-sm font-medium">
                  No expiration
                </Label>
              </div>
              
              <div className="flex items-end gap-2">
                <div className="flex-1">
                  <Label htmlFor="expires-hours">Token Expires In (Hours)</Label>
                  <Input
                    id="expires-hours"
                    type="number"
                    value={expiresHours}
                    onChange={(e) => setExpiresHours(Number(e.target.value))}
                    min={1}
                    max={8760} // 1 year
                    disabled={noExpiration}
                    className={noExpiration ? 'opacity-50' : ''}
                  />
                </div>
                <Button 
                  onClick={handleGenerateToken}
                  disabled={managementLoading}
                  className="px-6"
                >
                  <Calendar className="h-4 w-4 mr-2" />
                  {hasValidToken ? 'Regenerate' : 'Generate'} Token
                </Button>
              </div>
            </div>

            {/* Current Token Display */}
            {hasValidToken && (
              <div className="space-y-3 p-4 bg-muted/50 rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Guest Access URL</p>
                    <p className="text-sm text-muted-foreground">
                      Expires: {new Date(tokenExpiry!).toLocaleString()}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={copyGuestUrl}>
                      <Copy className="h-4 w-4 mr-1" />
                      Copy URL
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={handleRevokeAccess}
                      disabled={managementLoading}
                    >
                      <RotateCcw className="h-4 w-4 mr-1" />
                      Revoke
                    </Button>
                  </div>
                </div>
                <div className="font-mono text-xs bg-background p-2 rounded border break-all">
                  {getGuestAccessUrl(organizationId, guestToken)}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Security Notice */}
        <div className="p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-800">
          <h4 className="font-medium text-blue-900 dark:text-blue-100 mb-2">Security Information</h4>
          <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-1">
            <li>• Guest access is read-only - no data can be modified</li>
            <li>• Sensitive information like contact details are hidden</li>
            <li>• Tokens can be revoked at any time</li>
            <li>• All guest activity is logged for security</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
};