import { useState } from 'react';
import { ArrowRightLeft, X } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { useTradeRequests } from '@/hooks/useTradeRequests';
import { useFamilyGroups } from '@/hooks/useFamilyGroups';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { useOrgAdmin } from '@/hooks/useOrgAdmin';

export const PendingTradeRequestBanner = () => {
  const { user } = useAuth();
  const { tradeRequests } = useTradeRequests();
  const { familyGroups } = useFamilyGroups();
  const { isAdmin } = useOrgAdmin();
  const navigate = useNavigate();
  const [sessionDismissed, setSessionDismissed] = useState(false);

  const userFamilyGroup = familyGroups.find(fg =>
    fg.host_members?.some((member: any) => member.email?.toLowerCase() === user?.email?.toLowerCase())
  )?.name;

  // All pending trade requests (for admin view)
  const allPendingCount = tradeRequests.filter(tr => tr.status === 'pending').length;

  // Pending requests targeting the current user's family group
  const userPendingCount = tradeRequests.filter(
    tr => tr.target_family_group === userFamilyGroup && tr.status === 'pending'
  ).length;

  // Check permanent dismissal for admin (keyed by pending request IDs so it reappears for new requests)
  const pendingIds = tradeRequests
    .filter(tr => tr.status === 'pending')
    .map(tr => tr.id)
    .sort()
    .join(',');
  const dismissKey = `admin_trade_banner_dismissed_${pendingIds}`;
  const permanentlyDismissed = isAdmin && localStorage.getItem(dismissKey) === 'true';

  const showUserBanner = userPendingCount > 0;
  const showAdminBanner = isAdmin && allPendingCount > 0 && !sessionDismissed && !permanentlyDismissed;

  if (!showUserBanner && !showAdminBanner) return null;

  const handleDismiss = () => {
    setSessionDismissed(true);
  };

  const handlePermanentDismiss = () => {
    localStorage.setItem(dismissKey, 'true');
    setSessionDismissed(true);
  };

  return (
    <>
      {/* User-targeted banner (cannot be dismissed) */}
      {showUserBanner && (
        <Alert className="border-orange-300 bg-orange-50 dark:bg-orange-950/20 dark:border-orange-800 mb-0 rounded-none">
          <ArrowRightLeft className="h-4 w-4 text-orange-600 dark:text-orange-400" />
          <AlertDescription className="flex items-center justify-between">
            <span className="font-medium text-orange-800 dark:text-orange-200">
              You have {userPendingCount} pending trade request{userPendingCount > 1 ? 's' : ''} to review
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => { navigate('/calendar'); setTimeout(() => document.getElementById('trade-requests-section')?.scrollIntoView({ behavior: 'smooth' }), 500); }}
              className="h-8 px-3 border-orange-300 text-orange-700 hover:bg-orange-100 dark:border-orange-700 dark:text-orange-300 dark:hover:bg-orange-900/30"
            >
              Review
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* Admin banner (dismissible) — only show if admin has pending requests beyond their own */}
      {showAdminBanner && !showUserBanner && (
        <Alert className="border-blue-300 bg-blue-50 dark:bg-blue-950/20 dark:border-blue-800 mb-0 rounded-none">
          <ArrowRightLeft className="h-4 w-4 text-blue-600 dark:text-blue-400" />
          <AlertDescription className="flex items-center justify-between">
            <span className="font-medium text-blue-800 dark:text-blue-200">
              {allPendingCount} pending trade request{allPendingCount > 1 ? 's' : ''} in your organization
            </span>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate('/calendar')}
                className="h-8 px-3 border-blue-300 text-blue-700 hover:bg-blue-100 dark:border-blue-700 dark:text-blue-300 dark:hover:bg-blue-900/30"
              >
                Review
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleDismiss}
                className="h-8 px-2 text-blue-600 hover:text-blue-800 hover:bg-blue-100 dark:text-blue-400 dark:hover:bg-blue-900/30"
                title="Dismiss for this session"
              >
                <X className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={handlePermanentDismiss}
                className="h-8 px-2 text-xs text-blue-500 hover:text-blue-700 hover:bg-blue-100 dark:text-blue-400 dark:hover:bg-blue-900/30"
                title="Don't show again for these requests"
              >
                Don't show again
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Admin banner when they ALSO have user-targeted requests */}
      {showAdminBanner && showUserBanner && allPendingCount > userPendingCount && (
        <Alert className="border-blue-300 bg-blue-50 dark:bg-blue-950/20 dark:border-blue-800 mb-0 rounded-none">
          <ArrowRightLeft className="h-4 w-4 text-blue-600 dark:text-blue-400" />
          <AlertDescription className="flex items-center justify-between">
            <span className="font-medium text-blue-800 dark:text-blue-200">
              {allPendingCount - userPendingCount} additional pending trade request{allPendingCount - userPendingCount > 1 ? 's' : ''} in your organization
            </span>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate('/calendar')}
                className="h-8 px-3 border-blue-300 text-blue-700 hover:bg-blue-100 dark:border-blue-700 dark:text-blue-300 dark:hover:bg-blue-900/30"
              >
                Review
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleDismiss}
                className="h-8 px-2 text-blue-600 hover:text-blue-800 hover:bg-blue-100 dark:text-blue-400 dark:hover:bg-blue-900/30"
                title="Dismiss for this session"
              >
                <X className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={handlePermanentDismiss}
                className="h-8 px-2 text-xs text-blue-500 hover:text-blue-700 hover:bg-blue-100 dark:text-blue-400 dark:hover:bg-blue-900/30"
                title="Don't show again for these requests"
              >
                Don't show again
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      )}
    </>
  );
};
