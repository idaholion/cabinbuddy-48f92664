import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DollarSign, Receipt, TrendingUp, Settings } from "lucide-react";
import { Link } from "react-router-dom";
import { BillingDashboard } from "@/components/BillingDashboard";
import { ExpenseTracker } from "@/components/ExpenseTracker";
import { FinancialSetupSheet } from "@/components/FinancialSetupSheet";

const FinancialSetup = () => {
  return (
    <div className="min-h-screen bg-cover bg-center bg-no-repeat p-4" style={{backgroundImage: 'url(/lovable-uploads/45c3083f-46c5-4e30-a2f0-31a24ab454f4.png)'}}>
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <Button variant="outline" asChild className="mb-4">
            <Link to="/home">← Back to Home</Link>
          </Button>
          <h1 className="text-4xl font-bold text-primary-foreground mb-2">Financial Setup</h1>
          <p className="text-lg text-primary-foreground/80">Manage cabin expenses, billing, and financial tracking</p>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 mb-8">
          <Card className="bg-card/95">
            <CardHeader>
              <CardTitle className="flex items-center">
                <DollarSign className="h-5 w-5 mr-2" />
                Billing Setup
              </CardTitle>
              <CardDescription>Configure billing rates and methods</CardDescription>
            </CardHeader>
            <CardContent>
              <FinancialSetupSheet />
            </CardContent>
          </Card>

          <Card className="bg-card/95">
            <CardHeader>
              <CardTitle className="flex items-center">
                <Receipt className="h-5 w-5 mr-2" />
                Expense Categories
              </CardTitle>
              <CardDescription>Manage expense types and categories</CardDescription>
            </CardHeader>
            <CardContent>
              <Button className="w-full" variant="outline">Manage Categories</Button>
            </CardContent>
          </Card>

          <Card className="bg-card/95">
            <CardHeader>
              <CardTitle className="flex items-center">
                <TrendingUp className="h-5 w-5 mr-2" />
                Financial Reports
              </CardTitle>
              <CardDescription>View spending and income reports</CardDescription>
            </CardHeader>
            <CardContent>
              <Button className="w-full" variant="secondary">View Reports</Button>
            </CardContent>
          </Card>

          <Card className="bg-card/95">
            <CardHeader>
              <CardTitle className="flex items-center">
                <Settings className="h-5 w-5 mr-2" />
                Payment Settings
              </CardTitle>
              <CardDescription>Configure payment methods and schedules</CardDescription>
            </CardHeader>
            <CardContent>
              <Button className="w-full" variant="secondary">Settings</Button>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-8 lg:grid-cols-2">
          <BillingDashboard />
          <ExpenseTracker />
        </div>
      </div>
    </div>
  );
};

export default FinancialSetup;