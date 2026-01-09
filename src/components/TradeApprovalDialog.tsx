import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Calendar, MessageSquare, Users, Clock, ArrowRight, CheckCircle2, AlertTriangle } from 'lucide-react';
import { format } from 'date-fns';
import { useForm } from 'react-hook-form';
import { parseDateOnly } from '@/lib/date-utils';
import { useToast } from '@/hooks/use-toast';
import { useTradeRequests } from '@/hooks/useTradeRequests';
import { supabase } from '@/integrations/supabase/client';

interface TradeApprovalDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tradeRequest: any;
  onApprovalComplete?: () => void;
}

interface ApprovalFormData {
  message: string;
}

export function TradeApprovalDialog({ open, onOpenChange, tradeRequest, onApprovalComplete }: TradeApprovalDialogProps) {
  const { toast } = useToast();
  const { updateTradeRequest } = useTradeRequests();
  const [submitting, setSubmitting] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);

  const form = useForm<ApprovalFormData>({
    defaultValues: {
      message: ''
    }
  });

  const handleApproval = async (approved: boolean) => {
    // If approving and not yet confirmed, show confirmation first
    if (approved && !showConfirmation) {
      setShowConfirmation(true);
      return;
    }

    setSubmitting(true);
    try {
      const data = form.getValues();
      const status = approved ? 'approved' : 'rejected';
      
      const result = await updateTradeRequest(tradeRequest.id, {
        status,
        approver_message: data.message || undefined
      });

      if (result) {
        // If approved, execute the trade (update calendar)
        if (approved) {
          const { data: executeResult, error: executeError } = await supabase.functions.invoke('execute-trade', {
            body: { tradeRequestId: tradeRequest.id }
          });

          if (executeError) {
            console.error('Trade execution error:', executeError);
            toast({
              title: "Trade Approved",
              description: "Trade was approved but calendar update failed. Please update manually.",
              variant: "destructive",
            });
          } else {
            toast({
              title: "Trade Complete!",
              description: "The calendar has been updated with the new reservation.",
            });
          }
        }

        // Send notification email
        await supabase.functions.invoke('send-trade-notification', {
          body: {
            tradeRequestId: tradeRequest.id,
            notificationType: approved ? 'request_approved' : 'request_rejected'
          }
        });

        form.reset();
        setShowConfirmation(false);
        onOpenChange(false);
        onApprovalComplete?.();
      }
    } catch (error) {
      console.error('Trade approval error:', error);
      toast({
        title: "Approval Failed",
        description: "An unexpected error occurred. Please try again.",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (!tradeRequest) return null;

  const isTradeOffer = tradeRequest.request_type === 'trade_offer' && tradeRequest.offered_start_date;

  return (
    <Dialog open={open} onOpenChange={(open) => {
      if (!open) setShowConfirmation(false);
      onOpenChange(open);
    }}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Users className="h-5 w-5" />
            <span>Trade Request from {tradeRequest.requester_family_group}</span>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Confirmation Step */}
          {showConfirmation ? (
            <div className="space-y-4">
              <Alert className="border-primary bg-primary/10">
                <CheckCircle2 className="h-4 w-4 text-primary" />
                <AlertDescription className="text-sm">
                  <p className="font-medium mb-3">You are about to approve this trade. The calendar will be updated automatically:</p>
                  
                  <div className="space-y-2 ml-4">
                    <div className="flex items-center gap-2">
                      <ArrowRight className="h-4 w-4 text-primary" />
                      <span>
                        Give your <strong>{format(parseDateOnly(tradeRequest.requested_start_date), "MMM d")} - {format(parseDateOnly(tradeRequest.requested_end_date), "MMM d")}</strong> reservation to <strong>{tradeRequest.requester_family_group}</strong>
                      </span>
                    </div>
                    
                    {isTradeOffer && (
                      <div className="flex items-center gap-2">
                        <ArrowRight className="h-4 w-4 text-primary" />
                        <span>
                          Receive their <strong>{format(parseDateOnly(tradeRequest.offered_start_date), "MMM d")} - {format(parseDateOnly(tradeRequest.offered_end_date), "MMM d")}</strong> reservation
                        </span>
                      </div>
                    )}
                  </div>
                </AlertDescription>
              </Alert>

              <div className="flex justify-end space-x-2">
                <Button 
                  variant="outline" 
                  onClick={() => setShowConfirmation(false)}
                  disabled={submitting}
                >
                  Back
                </Button>
                <Button 
                  onClick={() => handleApproval(true)}
                  disabled={submitting}
                >
                  {submitting ? "Updating Calendar..." : "Confirm & Update Calendar"}
                </Button>
              </div>
            </div>
          ) : (
            <>
              {/* Trade Request Details */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-medium">Request Details</h3>
                  <Badge variant={isTradeOffer ? 'default' : 'secondary'}>
                    {isTradeOffer ? 'Trade Offer' : 'Request Only'}
                  </Badge>
                </div>
                
                {/* Requested Time */}
                <div className="p-4 border rounded-lg bg-muted/50">
                  <div className="flex items-center space-x-2 mb-2">
                    <Calendar className="h-4 w-4 text-primary" />
                    <span className="font-medium">They want this time:</span>
                  </div>
                  <p className="text-sm">
                    {format(parseDateOnly(tradeRequest.requested_start_date), "PPP")} to {format(parseDateOnly(tradeRequest.requested_end_date), "PPP")}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Duration: {Math.ceil((parseDateOnly(tradeRequest.requested_end_date).getTime() - parseDateOnly(tradeRequest.requested_start_date).getTime()) / (1000 * 60 * 60 * 24))} days
                  </p>
                </div>

                {/* Offered Time (if trade offer) */}
                {isTradeOffer && (
                  <div className="p-4 border rounded-lg bg-primary/10">
                    <div className="flex items-center space-x-2 mb-2">
                      <Clock className="h-4 w-4 text-primary" />
                      <span className="font-medium">They're offering in return:</span>
                    </div>
                    <p className="text-sm">
                      {format(parseDateOnly(tradeRequest.offered_start_date), "PPP")} to {format(parseDateOnly(tradeRequest.offered_end_date), "PPP")}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Duration: {Math.ceil((parseDateOnly(tradeRequest.offered_end_date).getTime() - parseDateOnly(tradeRequest.offered_start_date).getTime()) / (1000 * 60 * 60 * 24))} days
                    </p>
                  </div>
                )}

                {/* Requester Message */}
                {tradeRequest.requester_message && (
                  <div className="p-4 border rounded-lg">
                    <div className="flex items-center space-x-2 mb-2">
                      <MessageSquare className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">Message from {tradeRequest.requester_family_group}:</span>
                    </div>
                    <p className="text-sm text-muted-foreground italic">"{tradeRequest.requester_message}"</p>
                  </div>
                )}

                {/* Request Date */}
                <div className="text-xs text-muted-foreground">
                  Requested on: {format(new Date(tradeRequest.created_at), "PPP 'at' p")}
                </div>
              </div>

              <Form {...form}>
                <form className="space-y-4">
                  {/* Response Message */}
                  <FormField
                    control={form.control}
                    name="message"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Response Message (Optional)</FormLabel>
                        <FormControl>
                          <Textarea 
                            placeholder="Add a message with your response..."
                            className="resize-none"
                            rows={3}
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Action Buttons */}
                  <div className="flex justify-end space-x-2 pt-4">
                    <Button 
                      type="button" 
                      variant="outline" 
                      onClick={() => onOpenChange(false)}
                      disabled={submitting}
                    >
                      Cancel
                    </Button>
                    <Button 
                      type="button"
                      variant="destructive"
                      onClick={() => handleApproval(false)}
                      disabled={submitting}
                    >
                      {submitting ? "Processing..." : "Reject"}
                    </Button>
                    <Button 
                      type="button"
                      onClick={() => handleApproval(true)}
                      disabled={submitting}
                    >
                      {submitting ? "Processing..." : "Approve Trade"}
                    </Button>
                  </div>
                </form>
              </Form>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}