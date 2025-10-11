import { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { 
  DollarSign, 
  TrendingUp, 
  AlertTriangle, 
  CheckCircle, 
  Plus, 
  Eye,
  Calendar,
  CreditCard,
  ArrowUpDown,
  ArrowUp,
  ArrowDown
} from 'lucide-react';
import { usePayments, Payment, PaymentType, PaymentMethod } from '@/hooks/usePayments';
import { format } from 'date-fns';
import { parseDateOnly } from '@/lib/date-utils';
import { useUserRole } from '@/hooks/useUserRole';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Info } from 'lucide-react';

const PaymentTracker = () => {
  const { 
    payments, 
    loading, 
    pagination,
    createPayment, 
    recordPayment, 
    fetchPayments,
    getPaymentsSummary, 
    getOverduePayments 
  } = usePayments();
  
  const { isAdmin, isTreasurer, isGroupLead, userFamilyGroup } = useUserRole();
  
  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showRecordDialog, setShowRecordDialog] = useState(false);
  const [recordAmount, setRecordAmount] = useState('');
  const [recordMethod, setRecordMethod] = useState<PaymentMethod | ''>('');
  const [recordReference, setRecordReference] = useState('');
  const [sortColumn, setSortColumn] = useState<keyof Payment | 'reservation'>('created_at');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [selectedYear, setSelectedYear] = useState<string>('all');

  const summary = getPaymentsSummary();
  const overduePayments = getOverduePayments();

  // Get available years from payments
  const availableYears = useMemo(() => {
    const years = new Set<number>();
    payments.forEach(payment => {
      const year = new Date(payment.created_at).getFullYear();
      years.add(year);
    });
    return Array.from(years).sort((a, b) => b - a);
  }, [payments]);

  // Sort payments
  const sortedPayments = useMemo(() => {
    const sorted = [...payments].sort((a, b) => {
      let aValue: any;
      let bValue: any;

      if (sortColumn === 'reservation') {
        aValue = a.reservation?.start_date || '';
        bValue = b.reservation?.start_date || '';
      } else {
        aValue = a[sortColumn];
        bValue = b[sortColumn];
      }

      // Handle null/undefined values
      if (aValue === null || aValue === undefined) return 1;
      if (bValue === null || bValue === undefined) return -1;

      // Compare values
      if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
    return sorted;
  }, [payments, sortColumn, sortDirection]);

  const handleSort = (column: keyof Payment | 'reservation') => {
    console.log('Sorting by column:', column);
    if (sortColumn === column) {
      const newDirection = sortDirection === 'asc' ? 'desc' : 'asc';
      console.log('Toggling direction to:', newDirection);
      setSortDirection(newDirection);
    } else {
      console.log('Setting new sort column:', column);
      setSortColumn(column);
      setSortDirection('asc');
    }
  };

  const handleYearChange = (year: string) => {
    console.log('Changing year filter to:', year);
    setSelectedYear(year);
    const yearNum = year === 'all' ? undefined : parseInt(year);
    console.log('Fetching payments for year:', yearNum);
    fetchPayments(1, pagination.limit, yearNum);
  };

  const SortableHeader = ({ column, label }: { column: keyof Payment | 'reservation'; label: string }) => (
    <TableHead 
      className="cursor-pointer select-none hover:bg-muted/50" 
      onClick={() => handleSort(column)}
    >
      <div className="flex items-center gap-1">
        {label}
        {sortColumn === column ? (
          sortDirection === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />
        ) : (
          <ArrowUpDown className="h-3 w-3 opacity-50" />
        )}
      </div>
    </TableHead>
  );

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid':
        return 'bg-success text-success-foreground';
      case 'pending':
        return 'bg-warning text-warning-foreground';
      case 'overdue':
        return 'bg-destructive text-destructive-foreground';
      case 'partial':
        return 'bg-info text-info-foreground';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  const handleRecordPayment = async () => {
    if (!selectedPayment || !recordAmount) return;

    const amount = parseFloat(recordAmount);
    if (isNaN(amount) || amount <= 0) {
      alert('Please enter a valid amount greater than zero');
      return;
    }

    await recordPayment(
      selectedPayment.id, 
      amount, 
      recordMethod || undefined, 
      recordReference || undefined
    );

    setShowRecordDialog(false);
    setRecordAmount('');
    setRecordMethod('');
    setRecordReference('');
    setSelectedPayment(null);
  };

  const CreatePaymentForm = () => {
    const [formData, setFormData] = useState({
      family_group: '',
      payment_type: 'full_payment' as PaymentType,
      amount: '',
      description: '',
      due_date: '',
    });

    const handleSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      
      const amount = parseFloat(formData.amount);
      if (isNaN(amount) || amount <= 0) {
        alert('Please enter a valid amount greater than zero');
        return;
      }

      await createPayment({
        family_group: formData.family_group,
        payment_type: formData.payment_type,
        amount,
        description: formData.description,
        due_date: formData.due_date || undefined,
      });

      setShowCreateDialog(false);
      setFormData({
        family_group: '',
        payment_type: 'full_payment' as PaymentType,
        amount: '',
        description: '',
        due_date: '',
      });
    };

    return (
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <Label htmlFor="family_group" className="text-base">Family Group</Label>
          <Input
            id="family_group"
            value={formData.family_group}
            onChange={(e) => setFormData({ ...formData, family_group: e.target.value })}
            required
            className="text-base placeholder:text-base"
          />
        </div>
        
        <div>
          <Label htmlFor="payment_type" className="text-base">Payment Type</Label>
          <Select 
            value={formData.payment_type} 
            onValueChange={(value) => setFormData({ ...formData, payment_type: value as PaymentType })}
          >
            <SelectTrigger className="text-base">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="full_payment" className="text-base">Full Payment</SelectItem>
              <SelectItem value="reservation_deposit" className="text-base">Reservation Deposit</SelectItem>
              <SelectItem value="reservation_balance" className="text-base">Reservation Balance</SelectItem>
              <SelectItem value="cleaning_fee" className="text-base">Cleaning Fee</SelectItem>
              <SelectItem value="damage_deposit" className="text-base">Damage Deposit</SelectItem>
              <SelectItem value="pet_fee" className="text-base">Pet Fee</SelectItem>
              <SelectItem value="late_fee" className="text-base">Late Fee</SelectItem>
              <SelectItem value="other" className="text-base">Other</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label htmlFor="amount" className="text-base">Amount</Label>
          <Input
            id="amount"
            type="number"
            step="0.01"
            value={formData.amount}
            onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
            required
            className="text-base placeholder:text-base"
          />
        </div>

        <div>
          <Label htmlFor="description" className="text-base">Description</Label>
          <Textarea
            id="description"
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            className="text-base placeholder:text-base"
          />
        </div>

        <div>
          <Label htmlFor="due_date" className="text-base">Due Date (Optional)</Label>
          <Input
            id="due_date"
            type="date"
            value={formData.due_date}
            onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
            className="text-base"
          />
        </div>

        <Button type="submit" className="w-full text-base">Create Payment</Button>
      </form>
    );
  };

  // Determine viewing context
  const getViewingContext = () => {
    if (isAdmin || isTreasurer) {
      return { role: 'Admin/Treasurer', description: 'Viewing all organization payments' };
    } else if (isGroupLead && userFamilyGroup) {
      return { role: 'Family Group Lead', description: `Viewing payments for ${userFamilyGroup.name}` };
    } else {
      return { role: 'Member', description: 'Viewing your personal payment records' };
    }
  };

  const viewingContext = getViewingContext();
  const canCreatePayments = isAdmin || isTreasurer;

  if (loading) {
    return <div className="p-6 text-base">Loading payments...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Role Context Alert */}
      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          <strong>{viewingContext.role}:</strong> {viewingContext.description}
        </AlertDescription>
      </Alert>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-base font-medium">Total Outstanding</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${summary.totalOutstanding.toFixed(2)}</div>
            <p className="text-base text-muted-foreground">
              {summary.pending + summary.partial + summary.overdue} payments pending
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-base font-medium">Total Collected</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${summary.totalPaid.toFixed(2)}</div>
            <p className="text-base text-muted-foreground">
              {summary.paid} payments completed
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-base font-medium">Overdue</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{summary.overdue}</div>
            <p className="text-base text-muted-foreground">
              Payments past due date
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-base font-medium">Collection Rate</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {summary.totalAmount > 0 ? ((summary.totalPaid / summary.totalAmount) * 100).toFixed(1) : 0}%
            </div>
            <p className="text-base text-muted-foreground">
              Of total amount due
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Actions and Filters */}
      <div className="flex gap-2 items-center justify-between">
        {canCreatePayments && (
          <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
            <DialogTrigger asChild>
              <Button className="text-base">
                <Plus className="h-4 w-4 mr-2" />
                Add Payment
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New Payment</DialogTitle>
              </DialogHeader>
              <CreatePaymentForm />
            </DialogContent>
          </Dialog>
        )}
        {!canCreatePayments && <div />}

        {availableYears.length > 0 && (
          <div className="flex items-center gap-2">
            <Label htmlFor="year-filter" className="text-base whitespace-nowrap">Filter by Year:</Label>
            <Select value={selectedYear} onValueChange={handleYearChange}>
              <SelectTrigger id="year-filter" className="w-[150px] text-base">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all" className="text-base">All Years</SelectItem>
                {availableYears.map(year => (
                  <SelectItem key={year} value={year.toString()} className="text-base">
                    {year}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      {/* Payments Table */}
      <Card>
        <CardHeader>
          <CardTitle>Payment Records</CardTitle>
          <CardDescription className="text-base">
            Track and manage all payments for your organization
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <SortableHeader column="family_group" label="Family Group" />
                <SortableHeader column="reservation" label="Reservation Period" />
                <SortableHeader column="payment_type" label="Type" />
                <SortableHeader column="amount" label="Amount" />
                <SortableHeader column="amount_paid" label="Paid" />
                <SortableHeader column="balance_due" label="Balance" />
                <SortableHeader column="status" label="Status" />
                <SortableHeader column="due_date" label="Due Date" />
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedPayments.map((payment) => (
                <TableRow key={payment.id}>
                  <TableCell className="font-medium">
                    {payment.family_group}
                  </TableCell>
                  <TableCell>
                    {payment.reservation?.start_date && payment.reservation?.end_date ? (
                      <div className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {format(parseDateOnly(payment.reservation.start_date), 'MMM dd')} - {format(parseDateOnly(payment.reservation.end_date), 'MMM dd, yyyy')}
                      </div>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {payment.payment_type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                  </TableCell>
                  <TableCell>${payment.amount.toFixed(2)}</TableCell>
                  <TableCell>${(payment.amount_paid || 0).toFixed(2)}</TableCell>
                  <TableCell>${payment.balance_due.toFixed(2)}</TableCell>
                  <TableCell>
                    <Badge className={getStatusColor(payment.status)}>
                      {payment.status.toUpperCase()}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {payment.due_date ? (
                      <div className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {format(parseDateOnly(payment.due_date), 'MMM dd, yyyy')}
                      </div>
                    ) : (
                      '-'
                    )}
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        console.log('Recording payment for:', payment.family_group);
                        setSelectedPayment(payment);
                        setShowRecordDialog(true);
                      }}
                      className="text-sm"
                    >
                      <CreditCard className="h-3 w-3 mr-1" />
                      Record
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {payments.length === 0 && (
            <div className="text-center py-8 text-muted-foreground text-base">
              {canCreatePayments ? (
                <>No payment records found. Create your first payment record to get started.</>
              ) : isGroupLead ? (
                <>No payment records found for your family group.</>
              ) : (
                <>No payment records found linked to your reservations.</>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pagination */}
      {pagination.total > pagination.limit && (
        <div className="flex items-center justify-between">
          <p className="text-base text-muted-foreground">
            Showing {((pagination.page - 1) * pagination.limit) + 1} to {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total} payments
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                const yearNum = selectedYear === 'all' ? undefined : parseInt(selectedYear);
                fetchPayments(pagination.page - 1, pagination.limit, yearNum);
              }}
              disabled={pagination.page <= 1}
              className="text-base"
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                const yearNum = selectedYear === 'all' ? undefined : parseInt(selectedYear);
                fetchPayments(pagination.page + 1, pagination.limit, yearNum);
              }}
              disabled={pagination.page * pagination.limit >= pagination.total}
              className="text-base"
            >
              Next
            </Button>
          </div>
        </div>
      )}

      {/* Record Payment Dialog */}
      <Dialog open={showRecordDialog} onOpenChange={setShowRecordDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Record Payment</DialogTitle>
          </DialogHeader>
          {selectedPayment && (
            <div className="space-y-4">
              <div className="bg-muted p-4 rounded-lg">
                <p><strong>Family Group:</strong> {selectedPayment.family_group}</p>
                <p><strong>Amount Due:</strong> ${selectedPayment.balance_due.toFixed(2)}</p>
                <p><strong>Description:</strong> {selectedPayment.description}</p>
              </div>

              <div>
                <Label htmlFor="record_amount" className="text-base">Payment Amount</Label>
                <Input
                  id="record_amount"
                  type="number"
                  step="0.01"
                  value={recordAmount}
                  onChange={(e) => setRecordAmount(e.target.value)}
                  placeholder="0.00"
                  className="text-base placeholder:text-base"
                />
              </div>

              <div>
                <Label htmlFor="record_method" className="text-base">Payment Method</Label>
                <Select value={recordMethod} onValueChange={(value) => setRecordMethod(value as PaymentMethod)}>
                  <SelectTrigger className="text-base">
                    <SelectValue placeholder="Select method" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cash" className="text-base">Cash</SelectItem>
                    <SelectItem value="check" className="text-base">Check</SelectItem>
                    <SelectItem value="venmo" className="text-base">Venmo</SelectItem>
                    <SelectItem value="paypal" className="text-base">PayPal</SelectItem>
                    <SelectItem value="bank_transfer" className="text-base">Bank Transfer</SelectItem>
                    <SelectItem value="stripe" className="text-base">Stripe</SelectItem>
                    <SelectItem value="other" className="text-base">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="record_reference" className="text-base">Reference/Transaction ID</Label>
                <Input
                  id="record_reference"
                  value={recordReference}
                  onChange={(e) => setRecordReference(e.target.value)}
                  placeholder="Check #, Transaction ID, etc."
                  className="text-base placeholder:text-base"
                />
              </div>

              <div className="flex gap-2">
                <Button onClick={handleRecordPayment} className="flex-1 text-base">
                  Record Payment
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => setShowRecordDialog(false)}
                  className="text-base"
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PaymentTracker;