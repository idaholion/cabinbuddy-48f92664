
import React, { useState } from "react";
import { CreditCard, AlertCircle, CheckCircle, Clock, Send } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

export const BillingDashboard = () => {
  const [selectedPeriod, setSelectedPeriod] = useState("current");

  const users = [
    {
      id: 1,
      name: "Sarah Martinez",
      email: "sarah.martinez@email.com",
      avatar: "SM",
      balance: -150,
      status: "overdue",
      lastPayment: "2024-11-15"
    },
    {
      id: 2,
      name: "Mike Rodriguez",
      email: "mike.rodriguez@email.com",
      avatar: "MR",
      balance: 0,
      status: "current",
      lastPayment: "2024-12-01"
    },
    {
      id: 3,
      name: "Lisa Kim",
      email: "lisa.kim@email.com",
      avatar: "LK",
      balance: -75,
      status: "pending",
      lastPayment: "2024-11-28"
    },
    {
      id: 4,
      name: "Tom Brown",
      email: "tom.brown@email.com",
      avatar: "TB",
      balance: 0,
      status: "current",
      lastPayment: "2024-12-03"
    }
  ];

  const bills = [
    {
      id: 1,
      description: "December Property Expenses",
      amount: 1250,
      dueDate: "2024-12-15",
      status: "sent",
      recipients: 4,
      paid: 2
    },
    {
      id: 2,
      description: "Lake House Maintenance",
      amount: 450,
      dueDate: "2024-12-20",
      status: "draft",
      recipients: 3,
      paid: 0
    },
    {
      id: 3,
      description: "November Utilities",
      amount: 380,
      dueDate: "2024-12-01",
      status: "completed",
      recipients: 4,
      paid: 4
    }
  ];

  const totalOutstanding = users.reduce((sum, user) => sum + Math.abs(Math.min(0, user.balance)), 0);
  const overdueUsers = users.filter(user => user.status === 'overdue').length;
  const currentUsers = users.filter(user => user.status === 'current').length;

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

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Outstanding</p>
                <p className="text-2xl font-bold text-red-600">${totalOutstanding}</p>
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
                <p className="text-2xl font-bold text-orange-600">{overdueUsers}</p>
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
                <p className="text-2xl font-bold text-green-600">{currentUsers}</p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* User Balances */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <CreditCard className="h-5 w-5 mr-2 text-blue-600" />
            User Balances
          </CardTitle>
          <CardDescription>Track payment status for each property co-owner</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 sm:space-y-4">
            {users.map((user) => (
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
                    <div className="text-xs text-muted-foreground">Last payment: {user.lastPayment}</div>
                  </div>
                </div>
                
                <div className="flex items-center justify-between sm:justify-end space-x-3 sm:space-x-4">
                  <div className="text-right">
                    <div className={`font-bold text-sm sm:text-base ${user.balance < 0 ? 'text-red-600' : 'text-green-600'}`}>
                      {user.balance < 0 ? `-$${Math.abs(user.balance)}` : '$0.00'}
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
                      <Button size="sm" variant="outline" className="text-xs sm:text-sm">
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
              <CardTitle>Recent Bills</CardTitle>
              <CardDescription>Generated bills and payment status</CardDescription>
            </div>
            <Button>
              <Send className="h-4 w-4 mr-2" />
              Create Bill
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 sm:space-y-4">
            {bills.map((bill) => (
              <div key={bill.id} className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-3 sm:p-4 border rounded-lg space-y-3 sm:space-y-0">
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm sm:text-base">{bill.description}</div>
                  <div className="text-xs sm:text-sm text-muted-foreground">
                    Due: {bill.dueDate} • {bill.recipients} recipients
                  </div>
                  <div className="mt-2">
                    <div className="flex items-center justify-between text-xs sm:text-sm mb-1">
                      <span>Payment Progress</span>
                      <span>{bill.paid}/{bill.recipients} paid</span>
                    </div>
                    <Progress value={(bill.paid / bill.recipients) * 100} className="h-2" />
                  </div>
                </div>
                
                <div className="flex items-center justify-between sm:justify-end space-x-3 sm:space-x-4 sm:ml-4">
                  <div className="text-right">
                    <div className="font-bold text-base sm:text-lg">${bill.amount}</div>
                    <div className="text-xs sm:text-sm text-muted-foreground">
                      ${(bill.amount / bill.recipients).toFixed(2)} per person
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
        </CardContent>
      </Card>
    </div>
  );
};
