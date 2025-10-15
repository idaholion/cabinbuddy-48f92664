import { useState, useMemo } from "react";
import { usePaymentSplits } from "@/hooks/usePaymentSplits";
import { useUserRole } from "@/hooks/useUserRole";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { DollarSign, Users, Calendar, Info, ArrowRight, ArrowLeft } from "lucide-react";

export const GuestCostSplits = () => {
  const { splits, loading, recordSplitPayment } = usePaymentSplits();
  const { isAdmin } = useUserRole();
  const [selectedSplit, setSelectedSplit] = useState<string | null>(null);
  const [recordDialogOpen, setRecordDialogOpen] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<string>("check");
  const [paymentReference, setPaymentReference] = useState("");
  const [notes, setNotes] = useState("");
  const [recording, setRecording] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  // Get current user ID
  useMemo(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setCurrentUserId(user?.id || null);
    });
  }, []);

  // Categorize splits
  const receivedSplits = useMemo(() => 
    splits.filter(s => s.split_to_user_id === currentUserId),
    [splits, currentUserId]
  );

  const sentSplits = useMemo(() => 
    splits.filter(s => s.source_user_id === currentUserId),
    [splits, currentUserId]
  );

  const allSplits = splits;

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

  const renderSplitsTable = (splitsToShow: typeof splits, title: string, description: string, showDirection: 'received' | 'sent' | 'all') => {
    if (splitsToShow.length === 0) {
      return (
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            {showDirection === 'received' && "No guest cost splits received yet."}
            {showDirection === 'sent' && "No guest cost splits sent yet."}
            {showDirection === 'all' && "No guest cost splits found in this organization."}
          </AlertDescription>
        </Alert>
      );
    }

    return (
      <Card>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                {showDirection === 'all' && <TableHead>Direction</TableHead>}
                <TableHead>{showDirection === 'sent' ? 'To Family' : 'From Family'}</TableHead>
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
              {splitsToShow.map((split) => {
                const isSent = split.source_user_id === currentUserId;
                return (
                  <TableRow key={split.id}>
                    {showDirection === 'all' && (
                      <TableCell>
                        {isSent ? (
                          <Badge variant="outline" className="gap-1">
                            <ArrowRight className="h-3 w-3" />
                            Sent
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="gap-1">
                            <ArrowLeft className="h-3 w-3" />
                            Received
                          </Badge>
                        )}
                      </TableCell>
                    )}
                    <TableCell className="font-medium">
                      {isSent ? split.split_to_family_group : split.source_family_group}
                    </TableCell>
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
                      {!isSent && (split.split_payment?.balance_due || 0) > 0 && (
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
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    );
  };

  if (splits.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Guest Cost Splits
          </CardTitle>
          <CardDescription>
            Guest costs that have been split {isAdmin ? 'in this organization' : 'with you'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              No guest cost splits found.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  const totalOwedReceived = receivedSplits.reduce((sum, split) => 
    sum + (split.split_payment?.balance_due || 0), 0
  );
  const totalPaidReceived = receivedSplits.reduce((sum, split) => 
    sum + (split.split_payment?.amount_paid || 0), 0
  );

  const totalOwedSent = sentSplits.reduce((sum, split) => 
    sum + (split.split_payment?.balance_due || 0), 0
  );
  const totalPaidSent = sentSplits.reduce((sum, split) => 
    sum + (split.split_payment?.amount_paid || 0), 0
  );

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              {isAdmin ? 'Total Splits' : 'Received Splits'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{isAdmin ? allSplits.length : receivedSplits.length}</div>
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
            <div className="text-2xl font-bold text-green-500">
              {formatCurrency(isAdmin ? (totalPaidReceived + totalPaidSent) : totalPaidReceived)}
            </div>
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
            <div className="text-2xl font-bold text-destructive">
              {formatCurrency(isAdmin ? (totalOwedReceived + totalOwedSent) : totalOwedReceived)}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Splits Table - with tabs for non-admin users */}
      {isAdmin ? (
        renderSplitsTable(allSplits, 'All Guest Cost Splits', 'All guest cost splits in this organization', 'all')
      ) : (
        <Tabs defaultValue="received" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="received" className="gap-2">
              <ArrowLeft className="h-4 w-4" />
              Received ({receivedSplits.length})
            </TabsTrigger>
            <TabsTrigger value="sent" className="gap-2">
              <ArrowRight className="h-4 w-4" />
              Sent ({sentSplits.length})
            </TabsTrigger>
          </TabsList>
          <TabsContent value="received" className="mt-6">
            {renderSplitsTable(
              receivedSplits,
              'Received Guest Cost Splits',
              'Guest costs that have been shared with you - click "Record" to mark payments',
              'received'
            )}
          </TabsContent>
          <TabsContent value="sent" className="mt-6">
            {renderSplitsTable(
              sentSplits,
              'Sent Guest Cost Splits',
              'Guest costs you have shared with other families',
              'sent'
            )}
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
};
