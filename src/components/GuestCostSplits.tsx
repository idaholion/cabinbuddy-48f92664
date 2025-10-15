import { useState } from "react";
import { usePaymentSplits } from "@/hooks/usePaymentSplits";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { format } from "date-fns";
import { DollarSign, Users, Calendar, Info } from "lucide-react";

export const GuestCostSplits = () => {
  const { splits, loading, recordSplitPayment } = usePaymentSplits();
  const [selectedSplit, setSelectedSplit] = useState<string | null>(null);
  const [recordDialogOpen, setRecordDialogOpen] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<string>("check");
  const [paymentReference, setPaymentReference] = useState("");
  const [notes, setNotes] = useState("");
  const [recording, setRecording] = useState(false);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'paid':
        return <Badge className="bg-green-500">Paid</Badge>;
      case 'partial':
        return <Badge variant="secondary">Partial</Badge>;
      case 'pending':
        return <Badge variant="outline">Pending</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const handleRecordPayment = async () => {
    if (!selectedSplit) return;

    const split = splits.find(s => s.id === selectedSplit);
    if (!split?.split_payment) return;

    const amount = parseFloat(paymentAmount);
    if (isNaN(amount) || amount <= 0) return;

    setRecording(true);
    const success = await recordSplitPayment(
      split.split_payment.id,
      amount,
      paymentMethod,
      paymentReference || undefined,
      notes || undefined
    );

    if (success) {
      setRecordDialogOpen(false);
      setPaymentAmount("");
      setPaymentMethod("check");
      setPaymentReference("");
      setNotes("");
      setSelectedSplit(null);
    }
    setRecording(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (splits.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Guest Cost Splits
          </CardTitle>
          <CardDescription>
            Guest costs that have been split with you by other families
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              No guest cost splits found. When another family shares their guest costs with you, they will appear here.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  const totalOwed = splits.reduce((sum, split) => {
    return sum + (split.split_payment?.balance_due || 0);
  }, 0);

  const totalPaid = splits.reduce((sum, split) => {
    return sum + (split.split_payment?.amount_paid || 0);
  }, 0);

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              Total Splits
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{splits.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-green-500" />
              Total Paid
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-500">{formatCurrency(totalPaid)}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-destructive" />
              Balance Due
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{formatCurrency(totalOwed)}</div>
          </CardContent>
        </Card>
      </div>

      {/* Splits Table */}
      <Card>
        <CardHeader>
          <CardTitle>Your Guest Cost Splits</CardTitle>
          <CardDescription>
            Guest costs that have been shared with you - click "Record" to mark payments
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>From Family</TableHead>
                <TableHead>Description</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead className="text-right">Paid</TableHead>
                <TableHead className="text-right">Balance</TableHead>
                <TableHead>Due Date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {splits.map((split) => (
                <TableRow key={split.id}>
                  <TableCell className="font-medium">{split.source_family_group}</TableCell>
                  <TableCell className="max-w-xs truncate">
                    {split.split_payment?.description || 'Guest cost split'}
                  </TableCell>
                  <TableCell className="text-right font-mono">
                    {formatCurrency(split.split_payment?.amount || 0)}
                  </TableCell>
                  <TableCell className="text-right font-mono text-green-600">
                    {formatCurrency(split.split_payment?.amount_paid || 0)}
                  </TableCell>
                  <TableCell className="text-right font-mono text-destructive">
                    {formatCurrency(split.split_payment?.balance_due || 0)}
                  </TableCell>
                  <TableCell>
                    {split.split_payment?.due_date 
                      ? format(new Date(split.split_payment.due_date), 'MMM d, yyyy')
                      : '-'
                    }
                  </TableCell>
                  <TableCell>
                    {getStatusBadge(split.split_payment?.status || 'pending')}
                  </TableCell>
                  <TableCell className="text-right">
                    {(split.split_payment?.balance_due || 0) > 0 && (
                      <Dialog open={recordDialogOpen && selectedSplit === split.id} onOpenChange={(open) => {
                        setRecordDialogOpen(open);
                        if (!open) setSelectedSplit(null);
                      }}>
                        <DialogTrigger asChild>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setSelectedSplit(split.id);
                              setPaymentAmount((split.split_payment?.balance_due || 0).toString());
                            }}
                          >
                            Record
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Record Payment</DialogTitle>
                          </DialogHeader>
                          <div className="space-y-4 py-4">
                            <div className="space-y-2">
                              <Label htmlFor="amount">Amount Paid</Label>
                              <Input
                                id="amount"
                                type="number"
                                step="0.01"
                                value={paymentAmount}
                                onChange={(e) => setPaymentAmount(e.target.value)}
                                placeholder="0.00"
                              />
                            </div>

                            <div className="space-y-2">
                              <Label htmlFor="method">Payment Method</Label>
                              <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="check">Check</SelectItem>
                                  <SelectItem value="cash">Cash</SelectItem>
                                  <SelectItem value="venmo">Venmo</SelectItem>
                                  <SelectItem value="zelle">Zelle</SelectItem>
                                  <SelectItem value="paypal">PayPal</SelectItem>
                                  <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                                  <SelectItem value="other">Other</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>

                            <div className="space-y-2">
                              <Label htmlFor="reference">Payment Reference (Optional)</Label>
                              <Input
                                id="reference"
                                value={paymentReference}
                                onChange={(e) => setPaymentReference(e.target.value)}
                                placeholder="Check #, Transaction ID, etc."
                              />
                            </div>

                            <div className="space-y-2">
                              <Label htmlFor="notes">Notes (Optional)</Label>
                              <Textarea
                                id="notes"
                                value={notes}
                                onChange={(e) => setNotes(e.target.value)}
                                placeholder="Additional notes about this payment"
                                rows={3}
                              />
                            </div>
                          </div>
                          <DialogFooter>
                            <Button
                              variant="outline"
                              onClick={() => {
                                setRecordDialogOpen(false);
                                setSelectedSplit(null);
                              }}
                            >
                              Cancel
                            </Button>
                            <Button onClick={handleRecordPayment} disabled={recording}>
                              {recording ? <LoadingSpinner size="sm" className="mr-2" /> : null}
                              Record Payment
                            </Button>
                          </DialogFooter>
                        </DialogContent>
                      </Dialog>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};
