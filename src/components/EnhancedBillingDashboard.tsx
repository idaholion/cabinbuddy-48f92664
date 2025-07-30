import { useBillingData } from "@/hooks/useBillingData";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { 
  DollarSign, 
  Users, 
  Clock, 
  AlertCircle, 
  Send, 
  TrendingUp,
  Download,
  CreditCard,
  BarChart3
} from "lucide-react";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { EmptyState } from "@/components/ui/empty-state";

export const EnhancedBillingDashboard = () => {
  const { billingUsers, billingSummary, organization, isLoading, error, refetch } = useBillingData();
  const { toast } = useToast();

  const sendReminder = async (familyGroup: string) => {
    toast({
      title: "Reminder Sent",
      description: `Payment reminder sent to ${familyGroup}`,
    });
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'paid': return <DollarSign className="h-4 w-4 text-green-600" />;
      case 'overdue': return <AlertCircle className="h-4 w-4 text-red-600" />;
      case 'current': return <Clock className="h-4 w-4 text-blue-600" />;
      default: return <Users className="h-4 w-4 text-gray-600" />;
    }
  };

  const getStatusColor = (status: string): "default" | "secondary" | "destructive" | "outline" => {
    switch (status) {
      case 'paid': return 'default';
      case 'overdue': return 'destructive';
      case 'current': return 'secondary';
      default: return 'outline';
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <LoadingSpinner size="lg" />
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <div className="text-center">
            <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Error loading billing data</h3>
            <Button onClick={() => refetch()}>Try Again</Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!organization) {
    return (
      <EmptyState
        icon={<Users className="h-12 w-12" />}
        title="No organization found"
        description="Please select an organization to view billing information."
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Enhanced Billing Dashboard</h2>
          <p className="text-muted-foreground">
            Complete billing management for {organization.name}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Export Report
          </Button>
        </div>
      </div>

      {/* Enhanced Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              Outstanding
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(billingSummary?.totalOutstanding || 0)}
            </div>
            <p className="text-xs text-muted-foreground">
              {billingSummary?.overdueUsers || 0} overdue
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              This Month
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(billingSummary?.monthlyTotal || 0)}
            </div>
            <p className="text-xs text-muted-foreground">
              0 payments
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Users className="h-4 w-4" />
              Active Users
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {billingSummary?.currentUsers || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              family groups
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Collection Rate
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {billingSummary?.currentUsers ? 
                Math.round(((billingSummary.currentUsers - (billingSummary.overdueUsers || 0)) / billingSummary.currentUsers) * 100) 
                : 0}%
            </div>
            <p className="text-xs text-muted-foreground">
              on-time payments
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Enhanced Family Groups with Payment Tracking */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Family Group Payment Status
          </CardTitle>
          <CardDescription>
            Track payments and manage family group billing
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {billingUsers.map((user) => (
              <div key={user.id} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                    {getStatusIcon(user.status)}
                  </div>
                  <div>
                    <div className="font-medium">{user.name}</div>
                    <div className="text-sm text-muted-foreground">{user.email}</div>
                    <div className="text-sm text-muted-foreground">
                      Last payment: {user.lastPayment || 'Never'}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <div className="font-bold text-lg">
                      {formatCurrency(user.balance)}
                    </div>
                    <Badge variant={getStatusColor(user.status)}>
                      {user.status}
                    </Badge>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => sendReminder(user.familyGroup)}
                    >
                      <Send className="h-4 w-4 mr-1" />
                      Remind
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};