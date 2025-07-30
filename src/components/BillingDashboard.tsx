
import React, { useState } from "react";
import { CreditCard, AlertCircle, CheckCircle, Clock, Send, FileText, Users } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { BillingDashboardSkeleton } from "@/components/ui/billing-skeleton";
import { QueryError, EmptyState } from "@/components/ui/error-states";
import { useBillingData } from "@/hooks/useBillingData";
import { useToast } from "@/hooks/use-toast";

export const BillingDashboard = () => {
  const [selectedPeriod, setSelectedPeriod] = useState("current");
  const { toast } = useToast();
  
  const { 
    billingUsers, 
    billingSummary, 
    bills, 
    organization,
    isLoading, 
    error, 
    refetch 
  } = useBillingData();

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'overdue':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      case 'pending':
        return <Clock className="h-4 w-4 text-yellow-500" />;
      case 'current':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      default:
        return null;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'overdue':
        return 'destructive';
      case 'pending':
        return 'secondary';
      case 'current':
        return 'default';
      default:
        return 'secondary';
    }
  };

  const handleRemindUser = (user: any) => {
    toast({
      title: "Reminder Sent",
      description: `Payment reminder sent to ${user.name}`,
    });
  };

  const handleCreateBill = () => {
    toast({
      title: "Feature Coming Soon",
      description: "Bill creation functionality will be available soon.",
    });
  };

  // Loading state
  if (isLoading) {
    return <BillingDashboardSkeleton />;
  }

  // Error state
  if (error) {
    return (
      <QueryError 
        error={error as Error}
        onRetry={refetch}
        title="Failed to load billing data"
        description="There was an error loading billing information. Please try again."
      />
    );
  }

  // Empty state - no organization
  if (!organization) {
    return (
      <EmptyState
        icon={<Users className="h-12 w-12 text-muted-foreground" />}
        title="No Organization Found"
        description="You need to join or create an organization to view billing information."
        action={
          <Button onClick={() => window.location.href = '/select-organization'}>
            Manage Organizations
          </Button>
        }
      />
    );
  }

  // Empty state - no family groups
  if (billingUsers.length === 0) {
    return (
      <EmptyState
        icon={<FileText className="h-12 w-12 text-muted-foreground" />}
        title="No Family Groups Found"
        description="Set up family groups to start tracking expenses and billing."
        action={
          <Button onClick={() => window.location.href = '/family-group-setup'}>
            Set Up Family Groups
          </Button>
        }
      />
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Organization Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold">{organization.name} - Billing Dashboard</h1>
        <p className="text-muted-foreground">Track expenses and payments across all family groups</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Outstanding</p>
                <p className="text-2xl font-bold text-red-600">${billingSummary.totalOutstanding}</p>
              </div>
              <AlertCircle className="h-8 w-8 text-red-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Overdue Users</p>
                <p className="text-2xl font-bold text-orange-600">{billingSummary.overdueUsers}</p>
              </div>
              <Clock className="h-8 w-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Current Users</p>
                <p className="text-2xl font-bold text-green-600">{billingSummary.currentUsers}</p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Monthly Total</p>
                <p className="text-2xl font-bold text-blue-600">${billingSummary.monthlyTotal}</p>
              </div>
              <FileText className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* User Balances */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <CreditCard className="h-5 w-5 mr-2 text-blue-600" />
            Family Group Balances
          </CardTitle>
          <CardDescription>Track payment status for each family group in {organization.name}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 sm:space-y-4">
            {billingUsers.map((user) => (
              <div key={user.id} className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-3 sm:p-4 border rounded-lg space-y-3 sm:space-y-0">
                <div className="flex items-center space-x-3 sm:space-x-4">
                  <Avatar className="h-8 w-8 sm:h-10 sm:w-10">
                    <AvatarFallback className="bg-gradient-to-r from-blue-500 to-green-500 text-white text-xs sm:text-sm">
                      {user.avatar}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <div className="font-medium text-sm sm:text-base truncate">{user.name}</div>
                    <div className="text-xs sm:text-sm text-muted-foreground truncate">{user.email}</div>
                    <div className="text-xs text-muted-foreground">
                      Family Group: {user.familyGroup}
                    </div>
                    {user.lastPayment && (
                      <div className="text-xs text-muted-foreground">Last activity: {user.lastPayment}</div>
                    )}
                  </div>
                </div>
                
                <div className="flex items-center justify-between sm:justify-end space-x-3 sm:space-x-4">
                  <div className="text-right">
                    <div className={`font-bold text-sm sm:text-base ${user.balance < 0 ? 'text-red-600' : 'text-green-600'}`}>
                      {user.balance < 0 ? `-$${Math.abs(user.balance)}` : user.balance > 0 ? `+$${user.balance}` : '$0.00'}
                    </div>
                    <div className="text-xs sm:text-sm text-muted-foreground">Balance</div>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <div className="flex items-center space-x-1 sm:space-x-2">
                      {getStatusIcon(user.status)}
                      <Badge variant={getStatusColor(user.status) as any} className="text-xs">
                        {user.status}
                      </Badge>
                    </div>
                    {user.balance < 0 && (
                      <Button 
                        size="sm" 
                        variant="outline" 
                        className="text-xs sm:text-sm"
                        onClick={() => handleRemindUser(user)}
                      >
                        <Send className="h-3 w-3 mr-1" />
                        <span className="hidden sm:inline">Remind</span>
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Recent Bills */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Bills & Expenses</CardTitle>
              <CardDescription>Generated bills and payment tracking</CardDescription>
            </div>
            <Button onClick={handleCreateBill}>
              <Send className="h-4 w-4 mr-2" />
              Create Bill
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {bills.length === 0 ? (
            <EmptyState
              icon={<FileText className="h-8 w-8 text-muted-foreground" />}
              title="No Bills Generated"
              description="No bills have been generated yet. Add some receipts to get started."
              action={
                <Button onClick={() => window.location.href = '/add-receipt'} variant="outline">
                  Add Receipt
                </Button>
              }
            />
          ) : (
            <div className="space-y-3 sm:space-y-4">
              {bills.map((bill) => (
                <div key={bill.id} className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-3 sm:p-4 border rounded-lg space-y-3 sm:space-y-0">
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm sm:text-base">{bill.description}</div>
                    <div className="text-xs sm:text-sm text-muted-foreground">
                      Due: {bill.dueDate} • {bill.recipients} family groups
                    </div>
                    <div className="mt-2">
                      <div className="flex items-center justify-between text-xs sm:text-sm mb-1">
                        <span>Payment Progress</span>
                        <span>{bill.paid}/{bill.recipients} up to date</span>
                      </div>
                      <Progress 
                        value={bill.recipients > 0 ? (bill.paid / bill.recipients) * 100 : 0} 
                        className="h-2" 
                      />
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between sm:justify-end space-x-3 sm:space-x-4 sm:ml-4">
                    <div className="text-right">
                      <div className="font-bold text-base sm:text-lg">${bill.amount}</div>
                      <div className="text-xs sm:text-sm text-muted-foreground">
                        {bill.recipients > 0 ? `$${(bill.amount / bill.recipients).toFixed(2)} per group` : 'No groups'}
                      </div>
                    </div>
                    <Badge 
                      variant={
                        bill.status === 'completed' ? 'default' : 
                        bill.status === 'sent' ? 'secondary' : 
                        'outline'
                      }
                      className="text-xs"
                    >
                      {bill.status}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
