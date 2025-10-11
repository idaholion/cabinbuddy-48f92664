import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { FileText, Calendar, CreditCard, Settings } from "lucide-react";
import { BillingCyclesManager } from "./BillingCyclesManager";
import { InvoicesList } from "./InvoicesList";
import { useInvoices } from "@/hooks/useInvoices";
import { Link } from "react-router-dom";

export const BillingDashboard = () => {
  const { invoices } = useInvoices();
  
  const totalOutstanding = invoices
    .filter(inv => inv.status !== 'paid' && inv.status !== 'cancelled')
    .reduce((sum, inv) => sum + inv.balance_due, 0);
  
  const overdueInvoices = invoices.filter(inv => 
    inv.status === 'overdue' && inv.balance_due > 0
  ).length;
  
  const paidInvoices = invoices.filter(inv => inv.status === 'paid').length;

  return (
    <div className="space-y-6">
      {/* Header with Settings Button */}
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Billing Overview</h2>
        <Button variant="outline" asChild>
          <Link to="/invoice-settings">
            <Settings className="h-4 w-4 mr-2" />
            Invoice Settings
          </Link>
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Outstanding</p>
                <p className="text-2xl font-bold text-destructive">${totalOutstanding.toFixed(2)}</p>
              </div>
              <FileText className="h-8 w-8 text-destructive" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Overdue Invoices</p>
                <p className="text-2xl font-bold text-warning">{overdueInvoices}</p>
              </div>
              <Calendar className="h-8 w-8 text-warning" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Paid Invoices</p>
                <p className="text-2xl font-bold text-success">{paidInvoices}</p>
              </div>
              <CreditCard className="h-8 w-8 text-success" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="invoices" className="space-y-4">
        <TabsList>
          <TabsTrigger value="invoices">Invoices</TabsTrigger>
          <TabsTrigger value="cycles">Billing Cycles</TabsTrigger>
        </TabsList>
        
        <TabsContent value="invoices">
          <InvoicesList />
        </TabsContent>
        
        <TabsContent value="cycles">
          <BillingCyclesManager />
        </TabsContent>
      </Tabs>
    </div>
  );
};
