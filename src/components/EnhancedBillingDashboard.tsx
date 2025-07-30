import { useState, useEffect } from "react";
import { useBillingData } from "@/hooks/useBillingData";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { EmptyState } from "@/components/ui/empty-state";
import { useToast } from "@/hooks/use-toast";
import { 
  DollarSign, 
  Users, 
  Clock, 
  AlertCircle, 
  Send, 
  Plus, 
  TrendingUp,
  Calendar,
  Mail,
  FileText,
  Download,
  CreditCard,
  BarChart3
} from "lucide-react";
import { format, addDays, parseISO } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/hooks/useOrganization";

interface PaymentRecord {
  id: string;
  bill_id: string;
  family_group: string;
  amount: number;
  payment_date: string;
  payment_method: string;
  notes?: string;
  organization_id: string;
  created_at: string;
}

interface BillGeneration {
  id: string;
  organization_id: string;
  title: string;
  description: string;
  amount: number;
  due_date: string;
  status: 'draft' | 'sent' | 'paid' | 'overdue';
  recipients: string[];
  created_at: string;
  updated_at: string;
}

export const EnhancedBillingDashboard = () => {
  const { billingUsers, billingSummary, bills, organization, isLoading, error, refetch } = useBillingData();
  const { toast } = useToast();
  const [selectedPeriod, setSelectedPeriod] = useState("current");
  const [paymentRecords, setPaymentRecords] = useState<PaymentRecord[]>([]);
  const [generatedBills, setGeneratedBills] = useState<BillGeneration[]>([]);
  const [showCreateBill, setShowCreateBill] = useState(false);
  const [showPaymentForm, setShowPaymentForm] = useState<string | null>(null);

  const [billForm, setBillForm] = useState({
    title: "",
    description: "",
    amount: "",
    dueDate: "",
    recipients: [] as string[],
  });

  const [paymentForm, setPaymentForm] = useState({
    amount: "",
    paymentMethod: "check",
    notes: "",
  });

  useEffect(() => {
    if (organization?.id) {
      fetchPaymentRecords();
      fetchGeneratedBills();
    }
  }, [organization?.id]);

  const fetchPaymentRecords = async () => {
    if (!organization?.id) return;
    
    try {
      const { data, error } = await supabase
        .from('payment_records')
        .select('*')
        .eq('organization_id', organization.id)
        .order('payment_date', { ascending: false });

      if (error) throw error;
      setPaymentRecords(data || []);
    } catch (error) {
      console.error('Error fetching payment records:', error);
    }
  };

  const fetchGeneratedBills = async () => {
    if (!organization?.id) return;
    
    try {
      const { data, error } = await supabase
        .from('generated_bills')
        .select('*')
        .eq('organization_id', organization.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setGeneratedBills(data || []);
    } catch (error) {
      console.error('Error fetching generated bills:', error);
    }
  };

  const handleCreateBill = async () => {
    if (!organization?.id) return;

    try {
      const billData = {
        organization_id: organization.id,
        title: billForm.title,
        description: billForm.description,
        amount: parseFloat(billForm.amount),
        due_date: billForm.dueDate,
        status: 'draft' as const,
        recipients: billForm.recipients,
      };

      const { error } = await supabase
        .from('generated_bills')
        .insert([billData]);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Bill created successfully",
      });

      setBillForm({
        title: "",
        description: "",
        amount: "",
        dueDate: "",
        recipients: [],
      });
      setShowCreateBill(false);
      fetchGeneratedBills();
    } catch (error) {
      console.error('Error creating bill:', error);
      toast({
        title: "Error",
        description: "Failed to create bill",
        variant: "destructive",
      });
    }
  };

  const handleRecordPayment = async (familyGroup: string) => {
    if (!organization?.id) return;

    try {
      const paymentData = {
        organization_id: organization.id,
        family_group: familyGroup,
        amount: parseFloat(paymentForm.amount),
        payment_date: new Date().toISOString().split('T')[0],
        payment_method: paymentForm.paymentMethod,
        notes: paymentForm.notes,
      };

      const { error } = await supabase
        .from('payment_records')
        .insert([paymentData]);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Payment recorded successfully",
      });

      setPaymentForm({
        amount: "",
        paymentMethod: "check",
        notes: "",
      });
      setShowPaymentForm(null);
      fetchPaymentRecords();
      refetch();
    } catch (error) {
      console.error('Error recording payment:', error);
      toast({
        title: "Error",
        description: "Failed to record payment",
        variant: "destructive",
      });
    }
  };

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
          <Button onClick={() => setShowCreateBill(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Create Bill
          </Button>
          <Button variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Export Report
          </Button>
        </div>
      </div>

      {/* Enhanced Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
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
              {paymentRecords.filter(p => 
                new Date(p.payment_date) >= new Date(new Date().getFullYear(), new Date().getMonth(), 1)
              ).length} payments
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
              <BarChart3 className="h-4 w-4" />
              Avg Payment
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {paymentRecords.length > 0 
                ? formatCurrency(paymentRecords.reduce((sum, p) => sum + p.amount, 0) / paymentRecords.length)
                : '$0'}
            </div>
            <p className="text-xs text-muted-foreground">
              per transaction
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
                      onClick={() => setShowPaymentForm(user.familyGroup)}
                    >
                      <DollarSign className="h-4 w-4 mr-1" />
                      Record Payment
                    </Button>
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

      {/* Recent Payment History */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Recent Payment History
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {paymentRecords.slice(0, 10).map((payment) => (
              <div key={payment.id} className="flex items-center justify-between p-3 border rounded">
                <div>
                  <div className="font-medium">{payment.family_group}</div>
                  <div className="text-sm text-muted-foreground">
                    {format(parseISO(payment.payment_date), 'MMM d, yyyy')} • {payment.payment_method}
                  </div>
                  {payment.notes && (
                    <div className="text-sm text-muted-foreground">{payment.notes}</div>
                  )}
                </div>
                <div className="font-bold">
                  {formatCurrency(payment.amount)}
                </div>
              </div>
            ))}
            {paymentRecords.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                No payment records found
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Payment Form Modal */}
      {showPaymentForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle>Record Payment - {showPaymentForm}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Amount</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={paymentForm.amount}
                  onChange={(e) => setPaymentForm(prev => ({ ...prev, amount: e.target.value }))}
                  placeholder="0.00"
                />
              </div>
              <div>
                <Label>Payment Method</Label>
                <Select
                  value={paymentForm.paymentMethod}
                  onValueChange={(value) => setPaymentForm(prev => ({ ...prev, paymentMethod: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="check">Check</SelectItem>
                    <SelectItem value="cash">Cash</SelectItem>
                    <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                    <SelectItem value="credit_card">Credit Card</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Notes</Label>
                <Textarea
                  value={paymentForm.notes}
                  onChange={(e) => setPaymentForm(prev => ({ ...prev, notes: e.target.value }))}
                  placeholder="Optional notes..."
                />
              </div>
              <div className="flex gap-2">
                <Button onClick={() => handleRecordPayment(showPaymentForm)}>
                  Record Payment
                </Button>
                <Button variant="outline" onClick={() => setShowPaymentForm(null)}>
                  Cancel
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Create Bill Modal */}
      {showCreateBill && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle>Create New Bill</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Title</Label>
                <Input
                  value={billForm.title}
                  onChange={(e) => setBillForm(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="Bill title"
                />
              </div>
              <div>
                <Label>Description</Label>
                <Textarea
                  value={billForm.description}
                  onChange={(e) => setBillForm(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Bill description"
                />
              </div>
              <div>
                <Label>Amount</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={billForm.amount}
                  onChange={(e) => setBillForm(prev => ({ ...prev, amount: e.target.value }))}
                  placeholder="0.00"
                />
              </div>
              <div>
                <Label>Due Date</Label>
                <Input
                  type="date"
                  value={billForm.dueDate}
                  onChange={(e) => setBillForm(prev => ({ ...prev, dueDate: e.target.value }))}
                />
              </div>
              <div className="flex gap-2">
                <Button onClick={handleCreateBill}>
                  Create Bill
                </Button>
                <Button variant="outline" onClick={() => setShowCreateBill(false)}>
                  Cancel
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};