import PaymentTracker from '@/components/PaymentTracker';
import { PageHeader } from '@/components/ui/page-header';
import { NavigationHeader } from '@/components/ui/navigation-header';
import { DollarSign } from 'lucide-react';

const PaymentTracking = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted/20">
      <div className="container mx-auto p-4 space-y-6">
        <PageHeader
          title="Payment Tracking"
          subtitle="Monitor and manage all cabin-related payments"
          icon={DollarSign}
        >
          <NavigationHeader backLabel="Home" />
        </PageHeader>
        
        <PaymentTracker />
      </div>
    </div>
  );
};

export default PaymentTracking;