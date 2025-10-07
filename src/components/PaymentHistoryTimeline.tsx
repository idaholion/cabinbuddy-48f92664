import { format } from "date-fns";
import { DollarSign, Calendar, CreditCard, FileText } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface Payment {
  id: string;
  amount: number;
  paidDate: string;
  paymentMethod: string;
  paymentReference?: string;
  notes?: string;
}

interface PaymentHistoryTimelineProps {
  payments: Payment[];
}

export const PaymentHistoryTimeline = ({ payments }: PaymentHistoryTimelineProps) => {
  if (payments.length === 0) {
    return (
      <Card>
        <CardContent className="p-6 text-center text-muted-foreground">
          No payments recorded yet
        </CardContent>
      </Card>
    );
  }

  const sortedPayments = [...payments].sort(
    (a, b) => new Date(b.paidDate).getTime() - new Date(a.paidDate).getTime()
  );

  const getPaymentMethodColor = (method: string) => {
    const colors: Record<string, string> = {
      check: "bg-blue-500",
      cash: "bg-green-500",
      venmo: "bg-purple-500",
      zelle: "bg-pink-500",
      paypal: "bg-blue-600",
      bank_transfer: "bg-gray-500",
      credit_card: "bg-orange-500",
    };
    return colors[method] || "bg-gray-400";
  };

  return (
    <div className="space-y-3">
      {sortedPayments.map((payment, index) => (
        <Card key={payment.id}>
          <CardContent className="p-4">
            <div className="flex items-start gap-4">
              <div className={`w-10 h-10 rounded-full ${getPaymentMethodColor(payment.paymentMethod)} flex items-center justify-center text-white flex-shrink-0`}>
                <DollarSign className="w-5 h-5" />
              </div>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-lg">
                      ${payment.amount.toFixed(2)}
                    </span>
                    <Badge variant="outline" className="capitalize">
                      {payment.paymentMethod.replace('_', ' ')}
                    </Badge>
                  </div>
                </div>

                <div className="space-y-1 text-sm text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    <span>{format(new Date(payment.paidDate), 'MMM d, yyyy')}</span>
                  </div>

                  {payment.paymentReference && (
                    <div className="flex items-center gap-2">
                      <CreditCard className="w-4 h-4" />
                      <span>{payment.paymentReference}</span>
                    </div>
                  )}

                  {payment.notes && (
                    <div className="flex items-start gap-2">
                      <FileText className="w-4 h-4 mt-0.5" />
                      <span className="flex-1">{payment.notes}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};
