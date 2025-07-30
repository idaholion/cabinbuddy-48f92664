
import { useState } from "react";
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
        return <AlertCircle className="h-4 w-4 text-destructive" />;
      case 'pending':
        return <Clock className="h-4 w-4 text-warning" />;
      case 'current':
        return <CheckCircle className="h-4 w-4 text-success" />;
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
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-caption text-muted-foreground">Outstanding</p>
                <p className="text-heading-3 text-destructive">${totalOutstanding}</p>
              </div>
              <AlertCircle className="h-8 w-8 text-destructive" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-caption text-muted-foreground">Overdue Users</p>
                <p className="text-heading-3 text-warning">{overdueUsers}</p>
              </div>
              <Clock className="h-8 w-8 text-warning" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-caption text-muted-foreground">Current Users</p>
                <p className="text-heading-3 text-success">{currentUsers}</p>
              </div>
              <CheckCircle className="h-8 w-8 text-success" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* User Balances */}
      <Card>
        <CardHeader>
          <CardTitle className="text-heading-4 flex items-center">
            <CreditCard className="h-5 w-5 mr-2 text-primary" />
            User Balances
          </CardTitle>
          <CardDescription>Track payment status for each property co-owner</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {users.map((user) => (
              <div key={user.id} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center space-x-4">
                  <Avatar>
                    <AvatarFallback className="bg-gradient-mountain text-primary-foreground">
                      {user.avatar}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <div className="text-body font-medium">{user.name}</div>
                    <div className="text-body-small text-muted-foreground">{user.email}</div>
                    <div className="text-caption text-muted-foreground">Last payment: {user.lastPayment}</div>
                  </div>
                </div>
                <div className="flex items-center space-x-4">
                  <div className="text-right">
                    <div className={`text-body font-bold ${user.balance < 0 ? 'text-destructive' : 'text-success'}`}>
                      {user.balance < 0 ? `-$${Math.abs(user.balance)}` : '$0.00'}
                    </div>
                    <div className="text-caption text-muted-foreground">Balance</div>
                  </div>
                  <div className="flex items-center space-x-2">
                    {getStatusIcon(user.status)}
                    <Badge variant={getStatusColor(user.status) as any}>
                      {user.status}
                    </Badge>
                  </div>
                  {user.balance < 0 && (
                    <Button size="sm" variant="outline">
                      <Send className="h-3 w-3 mr-1" />
                      Remind
                    </Button>
                  )}
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
              <CardTitle className="text-heading-4">Recent Bills</CardTitle>
              <CardDescription>Generated bills and payment status</CardDescription>
            </div>
            <Button>
              <Send className="h-4 w-4 mr-2" />
              Create Bill
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {bills.map((bill) => (
              <div key={bill.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex-1">
                  <div className="text-body font-medium">{bill.description}</div>
                  <div className="text-body-small text-muted-foreground">
                    Due: {bill.dueDate} • {bill.recipients} recipients
                  </div>
                  <div className="mt-2">
                    <div className="flex items-center justify-between text-caption mb-1">
                      <span>Payment Progress</span>
                      <span>{bill.paid}/{bill.recipients} paid</span>
                    </div>
                    <Progress value={(bill.paid / bill.recipients) * 100} className="h-2" />
                  </div>
                </div>
                <div className="flex items-center space-x-4 ml-4">
                  <div className="text-right">
                    <div className="text-heading-4">${bill.amount}</div>
                    <div className="text-caption text-muted-foreground">
                      ${(bill.amount / bill.recipients).toFixed(2)} per person
                    </div>
                  </div>
                  <Badge variant={
                    bill.status === 'completed' ? 'default' : 
                    bill.status === 'sent' ? 'secondary' : 
                    'outline'
                  }>
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
