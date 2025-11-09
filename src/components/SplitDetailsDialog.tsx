import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { usePaymentSplitDetails } from "@/hooks/usePaymentSplitDetails";
import { format } from "date-fns";
import { Calendar, Users, DollarSign, Info, ArrowRight } from "lucide-react";

interface SplitDetailsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  splitId: string | null;
}

export const SplitDetailsDialog = ({ open, onOpenChange, splitId }: SplitDetailsDialogProps) => {
  const { splitDetails, loading } = usePaymentSplitDetails(splitId);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  if (!splitId || !open) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Guest Cost Split Details
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center p-8">
            <LoadingSpinner size="lg" />
          </div>
        ) : !splitDetails ? (
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>Split details not found.</AlertDescription>
          </Alert>
        ) : (
          <div className="space-y-6">
            {/* Split Overview */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium">Source Family</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-lg font-semibold">{splitDetails.source_family_group}</div>
                  <div className="text-sm text-muted-foreground mt-1">
                    {splitDetails.sourceUserEmail || 'Unknown user'}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <ArrowRight className="h-4 w-4" />
                    Recipient Family
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-lg font-semibold">{splitDetails.split_to_family_group}</div>
                  <div className="text-sm text-muted-foreground mt-1">
                    {splitDetails.recipientUserEmail || 'Unknown user'}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Payment Information */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <DollarSign className="h-4 w-4" />
                  Payment Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <div className="text-sm text-muted-foreground">Total Amount</div>
                    <div className="text-lg font-semibold">{formatCurrency(splitDetails.split_payment?.amount || 0)}</div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground">Amount Paid</div>
                    <div className="text-lg font-semibold text-green-600">
                      {formatCurrency(splitDetails.split_payment?.amount_paid || 0)}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground">Balance Due</div>
                    <div className="text-lg font-semibold text-destructive">
                      {formatCurrency(splitDetails.split_payment?.balance_due || 0)}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-4 pt-2 border-t">
                  <div>
                    <span className="text-sm text-muted-foreground">Status: </span>
                    <Badge variant={
                      splitDetails.split_payment?.status === 'paid' ? 'default' :
                      splitDetails.split_payment?.status === 'partial' ? 'secondary' : 'outline'
                    }>
                      {splitDetails.split_payment?.status}
                    </Badge>
                  </div>
                  {splitDetails.split_payment?.due_date && (
                    <div>
                      <span className="text-sm text-muted-foreground">Due Date: </span>
                      <span className="font-medium">
                        {format(new Date(splitDetails.split_payment.due_date), 'MMM d, yyyy')}
                      </span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Daily Occupancy Breakdown */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Daily Occupancy Breakdown
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead className="text-right">Source Guests</TableHead>
                      <TableHead className="text-right">Recipient Guests</TableHead>
                      <TableHead className="text-right">Total Guests</TableHead>
                      <TableHead className="text-right">Per Diem Rate</TableHead>
                      <TableHead className="text-right">Recipient Cost</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {splitDetails.daily_occupancy_split?.map((day: any) => (
                      <TableRow key={day.date}>
                        <TableCell className="font-medium">
                          {format(new Date(day.date), 'MMM d, yyyy')}
                        </TableCell>
                        <TableCell className="text-right">{day.sourceGuests || 0}</TableCell>
                        <TableCell className="text-right">{day.recipientGuests || 0}</TableCell>
                        <TableCell className="text-right font-semibold">
                          {(day.sourceGuests || 0) + (day.recipientGuests || 0)}
                        </TableCell>
                        <TableCell className="text-right font-mono">
                          {formatCurrency(day.perDiem || 0)}
                        </TableCell>
                        <TableCell className="text-right font-mono font-semibold">
                          {formatCurrency(day.recipientCost || 0)}
                        </TableCell>
                      </TableRow>
                    ))}
                    <TableRow className="font-semibold bg-muted/50">
                      <TableCell>Total</TableCell>
                      <TableCell className="text-right">
                        {splitDetails.daily_occupancy_split?.reduce((sum: number, day: any) => 
                          sum + (day.sourceGuests || 0), 0
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        {splitDetails.daily_occupancy_split?.reduce((sum: number, day: any) => 
                          sum + (day.recipientGuests || 0), 0
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        {splitDetails.daily_occupancy_split?.reduce((sum: number, day: any) => 
                          sum + (day.sourceGuests || 0) + (day.recipientGuests || 0), 0
                        )}
                      </TableCell>
                      <TableCell></TableCell>
                      <TableCell className="text-right font-mono">
                        {formatCurrency(splitDetails.split_payment?.amount || 0)}
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            {/* Metadata */}
            <div className="text-sm text-muted-foreground space-y-1">
              <div>Created: {format(new Date(splitDetails.created_at), 'MMM d, yyyy h:mm a')}</div>
              {splitDetails.createdByUserEmail && (
                <div>Created by: {splitDetails.createdByUserEmail}</div>
              )}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
