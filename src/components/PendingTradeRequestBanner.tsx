import { ArrowRightLeft } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { useTradeRequests } from '@/hooks/useTradeRequests';
import { useFamilyGroups } from '@/hooks/useFamilyGroups';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

export const PendingTradeRequestBanner = () => {
  const { user } = useAuth();
  const { tradeRequests } = useTradeRequests();
  const { familyGroups } = useFamilyGroups();
  const navigate = useNavigate();

  const userFamilyGroup = familyGroups.find(fg =>
    fg.host_members?.some((member: any) => member.email?.toLowerCase() === user?.email?.toLowerCase())
  )?.name;

  const pendingCount = tradeRequests.filter(
    tr => tr.target_family_group === userFamilyGroup && tr.status === 'pending'
  ).length;

  if (!pendingCount) return null;

  return (
    <Alert className="border-orange-300 bg-orange-50 dark:bg-orange-950/20 dark:border-orange-800 mb-0 rounded-none">
      <ArrowRightLeft className="h-4 w-4 text-orange-600 dark:text-orange-400" />
      <AlertDescription className="flex items-center justify-between">
        <span className="font-medium text-orange-800 dark:text-orange-200">
          You have {pendingCount} pending trade request{pendingCount > 1 ? 's' : ''} to review
        </span>
        <Button
          variant="outline"
          size="sm"
          onClick={() => navigate('/calendar')}
          className="h-8 px-3 border-orange-300 text-orange-700 hover:bg-orange-100 dark:border-orange-700 dark:text-orange-300 dark:hover:bg-orange-900/30"
        >
          Review
        </Button>
      </AlertDescription>
    </Alert>
  );
};
