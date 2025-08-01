import { useState } from "react";
import { useFinancialData } from "@/hooks/useFinancialData";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { EmptyState } from "@/components/ui/empty-state";
import { DataTable } from "@/components/ui/data-table";
import { Button } from "@/components/ui/button";
import { Download, Receipt, DollarSign, Calendar, Users } from "lucide-react";
import { format } from "date-fns";

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
          <h1 className="text-6xl mb-4 font-kaushan text-primary drop-shadow-lg text-center">Financial Review</h1>
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

      {/* Year Selector and Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Year
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Select value={selectedYear.toString()} onValueChange={(value) => setSelectedYear(parseInt(value))}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {availableYears.map((year) => (
                  <SelectItem key={year} value={year.toString()}>
                    {year}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Receipt className="h-4 w-4" />
              Total Records
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{records.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              Total Amount
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalAmount)}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">
              Export Data
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Button 
              variant="outline" 
              className="w-full"
              onClick={() => {
                // Simple CSV export
                const csvContent = [
                  ['Date', 'Description', 'Family Group', 'Amount'],
                  ...records.map(record => [
                    record.date,
                    record.description,
                    record.family_group || '',
                    record.amount.toString()
                  ])
                ].map(row => row.join(',')).join('\n');
                
                const blob = new Blob([csvContent], { type: 'text/csv' });
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `financial-data-${selectedYear}.csv`;
                a.click();
                window.URL.revokeObjectURL(url);
              }}
            >
              <Download className="h-4 w-4 mr-2" />
              CSV
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Data Table */}
      <Card>
        <CardHeader>
          <CardTitle>Financial Records - {selectedYear}</CardTitle>
          <CardDescription>
            {accessLevel === 'admin' && 'Showing all financial records for the organization'}
            {accessLevel === 'group_lead' && `Showing financial records for ${userFamilyGroup}`}
            {accessLevel === 'host' && 'Showing your financial records'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {records.length === 0 ? (
            <EmptyState
              icon={<Receipt className="h-12 w-12" />}
              title="No financial records found"
              description={`No financial data available for ${selectedYear}.`}
            />
          ) : (
            <DataTable
              data={records}
              columns={columns}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default FinancialReview;