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
import { ExpenseTracker } from "@/components/ExpenseTracker";
import PaymentTracker from "@/components/PaymentTracker";
import { RecurringBills } from "@/components/RecurringBills";
import { RecurringBillsHistoricalReports } from "@/components/RecurringBillsHistoricalReports";
import { Download, Receipt, DollarSign, Calendar, Users, TrendingUp, Settings, CreditCard, RotateCcw, History, FileBarChart } from "lucide-react";
import { format } from "date-fns";
import { Link } from "react-router-dom";
import { useConversationReminders } from "@/hooks/useConversationReminders";
import { useEffect } from "react";

const FinancialDashboard = () => {
  const [activeTab, setActiveTab] = useState("manage");
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
  
  const { addReminder } = useConversationReminders();

  // Add Wave access token reminder on component mount
  useEffect(() => {
    const reminderText = "Get Wave access token: Visit Wave Accounting settings, create API credentials, and add the access token to integrate financial data export/import functionality.";
    addReminder(reminderText, '/finance-reports');
  }, [addReminder]);

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
      case 'treasurer':
        return { label: 'Treasurer', color: 'bg-orange-100 text-orange-700' };
      case 'group_lead':
        return { label: 'Group Lead', color: 'bg-blue-100 text-blue-700' };
      default:
        return { label: 'Host', color: 'bg-green-100 text-green-700' };
    }
  };

  const accessDisplay = getAccessLevelDisplay();

  const reportColumns = [
    {
      key: 'date',
      title: 'Date',
      render: (record: any) => {
        if (!record.date) return 'N/A';
        const date = new Date(record.date);
        return isNaN(date.getTime()) ? 'Invalid Date' : format(date, 'MMM d, yyyy');
      },
    },
    {
      key: 'description',
      title: 'Description',
    },
    {
      key: 'family_group',
      title: 'Family Group',
      render: (record: any) => record?.family_group || 'N/A',
    },
    {
      key: 'amount',
      title: 'Amount',
      render: (record: any) => record ? formatCurrency(Number(record.amount)) : 'N/A',
      className: 'text-right font-mono',
    },
    {
      key: 'image_url',
      title: 'Receipt',
      render: (record: any) => (
        record?.image_url ? (
          <Button
            variant="outline"
            size="sm"
            onClick={() => window.open(record.image_url, '_blank')}
            className="text-base"
          >
            <Receipt className="h-4 w-4" />
          </Button>
        ) : (
          <span className="text-muted-foreground text-base">No image</span>
        )
      ),
    },
  ];

  return (
    <div className="min-h-screen bg-cover bg-center bg-no-repeat p-4" style={{backgroundImage: 'url(/lovable-uploads/45c3083f-46c5-4e30-a2f0-31a24ab454f4.png)'}}>
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <Button variant="outline" asChild className="mb-4 text-base">
            <Link to="/setup">← Back to Setup</Link>
          </Button>
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-6xl mb-4 font-kaushan text-primary drop-shadow-lg text-center">Financial Dashboard</h1>
              <p className="text-2xl text-primary text-center font-medium">Manage expenses and view financial reports</p>
            </div>
            <div className="flex items-center gap-3">
              <Badge className={`${accessDisplay.color} text-base`}>
                {accessDisplay.label}
              </Badge>
              {userFamilyGroup && (
                <Badge variant="outline" className="text-base">
                  <Users className="h-3 w-3 mr-1" />
                  {userFamilyGroup}
                </Badge>
              )}
            </div>
          </div>
        </div>

        {/* Main Content */}
        <Card className="bg-card/95">
          <CardContent className="p-0">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-6 m-4 mb-0">
                <TabsTrigger value="manage" className="flex items-center gap-2 text-base">
                  <Settings className="h-4 w-4" />
                  Manage Expenses
                </TabsTrigger>
                <TabsTrigger value="recurring" className="flex items-center gap-2 text-base">
                  <RotateCcw className="h-4 w-4" />
                  Recurring Bills
                </TabsTrigger>
                <TabsTrigger value="historical" className="flex items-center gap-2 text-base">
                  <History className="h-4 w-4" />
                  Historical Reports
                </TabsTrigger>
                <TabsTrigger value="payments" className="flex items-center gap-2 text-base">
                  <CreditCard className="h-4 w-4" />
                  Payment Tracking
                </TabsTrigger>
                <TabsTrigger value="reports" className="flex items-center gap-2 text-base">
                  <TrendingUp className="h-4 w-4" />
                  Financial Reports
                </TabsTrigger>
                <TabsTrigger value="survey" className="flex items-center gap-2 text-base">
                  <FileBarChart className="h-4 w-4" />
                  Survey Data
                </TabsTrigger>
              </TabsList>

              {/* Manage Expenses Tab */}
              <TabsContent value="manage" className="p-6 pt-4">
                <div className="space-y-6">
                  <div>
                    <h2 className="text-xl font-semibold mb-2">Expense Management</h2>
                    <p className="text-muted-foreground text-base">Add and manage cabin-related expenses</p>
                  </div>
                  <ExpenseTracker />
                </div>
              </TabsContent>

              {/* Recurring Bills Tab */}
              <TabsContent value="recurring" className="p-6 pt-4">
                <RecurringBills />
              </TabsContent>

              {/* Historical Reports Tab */}
              <TabsContent value="historical" className="p-6 pt-4">
                <RecurringBillsHistoricalReports />
              </TabsContent>

              {/* Payment Tracking Tab */}
              <TabsContent value="payments" className="p-6 pt-4">
                <div className="space-y-6">
                  <div>
                    <h2 className="text-xl font-semibold mb-2">Payment Tracking</h2>
                    <p className="text-muted-foreground text-base">Monitor and manage all cabin-related payments</p>
                  </div>
                  <PaymentTracker />
                </div>
              </TabsContent>

              {/* Reports Tab */}
              <TabsContent value="reports" className="p-6 pt-4">
                {loading ? (
                  <div className="flex items-center justify-center py-12">
                    <LoadingSpinner size="lg" />
                  </div>
                ) : (
                  <div className="space-y-6">
                    <div>
                      <h2 className="text-xl font-semibold mb-2">Financial Reports</h2>
                      <p className="text-muted-foreground text-base">Complete financial overview including expenses and payment collections</p>
                    </div>

                    {/* Year Selector and Summary */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                      <Card>
                        <CardHeader className="pb-3">
                          <CardTitle className="text-base font-medium flex items-center gap-2">
                            <Calendar className="h-4 w-4" />
                            Year
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <Select value={selectedYear.toString()} onValueChange={(value) => setSelectedYear(parseInt(value))}>
                            <SelectTrigger className="text-base">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {availableYears.map((year) => (
                                <SelectItem key={year} value={year.toString()} className="text-base">
                                  {year}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </CardContent>
                      </Card>

                      <Card>
                        <CardHeader className="pb-3">
                          <CardTitle className="text-base font-medium flex items-center gap-2">
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
                          <CardTitle className="text-base font-medium flex items-center gap-2">
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
                          <CardTitle className="text-base font-medium">
                            Export Data
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <Button 
                            variant="outline" 
                            className="w-full text-base"
                            onClick={() => {
                              // Simple CSV export
                              const csvContent = [
                                ['Date', 'Description', 'Family Group', 'Amount'],
                                ...records.filter(record => record).map(record => [
                                  record.date || '',
                                  record.description || '',
                                  record.family_group || '',
                                  (record.amount || 0).toString()
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
                        <CardDescription className="text-base">
                          {accessLevel === 'admin' && 'Showing all financial records for the organization'}
                          {accessLevel === 'treasurer' && 'Showing all financial records for the organization'}
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
                            columns={reportColumns}
                          />
                        )}
                      </CardContent>
                    </Card>
                  </div>
                )}
              </TabsContent>

              {/* Survey Data Tab */}
              <TabsContent value="survey" className="p-6 pt-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Economic Survey Data</CardTitle>
                    <CardDescription>
                      View detailed survey responses on the dedicated page
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground mb-4">
                      Survey data from checkout processes is available for review, showing economic impact in the local area.
                    </p>
                    <Button asChild>
                      <Link to="/survey-responses">
                        <FileBarChart className="h-4 w-4 mr-2" />
                        View Survey Responses
                      </Link>
                    </Button>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        {/* Admin Quick Links */}
        <div className="mt-8 flex flex-col items-center gap-4">
          <Button asChild size="lg" variant="outline">
            <Link to="/admin-season-summary">
              <Users className="h-4 w-4 mr-2" />
              View All Families Season Summary (Admin)
            </Link>
          </Button>
          <Button asChild size="lg" className="text-lg px-8 py-6 text-base">
            <Link to="/reservation-setup">Continue to Reservation Setup</Link>
          </Button>
        </div>
      </div>
    </div>
  );
};

export default FinancialDashboard;