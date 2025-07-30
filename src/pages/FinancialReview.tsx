import { useState } from "react";
import { useFinancialData } from "@/hooks/useFinancialData";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { EmptyState } from "@/components/ui/empty-state";
import { DataTable } from "@/components/ui/data-table";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Download, Receipt, DollarSign, Calendar, Users } from "lucide-react";
import { format } from "date-fns";
import { EnhancedBillingDashboard } from "@/components/EnhancedBillingDashboard";
import { RecurringBills } from "@/components/RecurringBills";
import { EnhancedFinancialRecords } from "@/components/EnhancedFinancialRecords";

const FinancialReview = () => {
  const {
    records,
    loading,
    selectedYear,
    setSelectedYear,
    availableYears,
    totalAmount,
    accessLevel,
    userFamilyGroup,
  } = useFinancialData();

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const getAccessLevelDisplay = () => {
    switch (accessLevel) {
      case 'admin':
        return { label: 'Administrator', color: 'bg-purple-100 text-purple-700' };
      case 'group_lead':
        return { label: 'Group Lead', color: 'bg-blue-100 text-blue-700' };
      default:
        return { label: 'Host', color: 'bg-green-100 text-green-700' };
    }
  };

  const accessDisplay = getAccessLevelDisplay();

  const columns = [
    {
      key: 'date',
      title: 'Date',
      render: (record: any) => format(new Date(record.date), 'MMM d, yyyy'),
    },
    {
      key: 'description',
      title: 'Description',
    },
    {
      key: 'family_group',
      title: 'Family Group',
      render: (record: any) => record.family_group || 'N/A',
    },
    {
      key: 'amount',
      title: 'Amount',
      render: (record: any) => formatCurrency(Number(record.amount)),
      className: 'text-right font-mono',
    },
    {
      key: 'image_url',
      title: 'Receipt',
      render: (record: any) => (
        record.image_url ? (
          <Button
            variant="outline"
            size="sm"
            onClick={() => window.open(record.image_url, '_blank')}
          >
            <Receipt className="h-4 w-4" />
          </Button>
        ) : (
          <span className="text-muted-foreground text-sm">No image</span>
        )
      ),
    },
  ];

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="flex items-center justify-center py-12">
            <LoadingSpinner size="lg" />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Financial Review</h1>
          <p className="text-muted-foreground">
            Review financial data and receipts
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Badge className={accessDisplay.color}>
            {accessDisplay.label}
          </Badge>
          {userFamilyGroup && (
            <Badge variant="outline">
              <Users className="h-3 w-3 mr-1" />
              {userFamilyGroup}
            </Badge>
          )}
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="billing" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="billing">Billing Dashboard</TabsTrigger>
          <TabsTrigger value="records">Financial Records</TabsTrigger>
          <TabsTrigger value="recurring">Recurring Bills</TabsTrigger>
        </TabsList>

        <TabsContent value="records" className="space-y-6">
          <EnhancedFinancialRecords />
        </TabsContent>

        <TabsContent value="billing">
          <EnhancedBillingDashboard />
        </TabsContent>

        <TabsContent value="recurring">
          <RecurringBills />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default FinancialReview;