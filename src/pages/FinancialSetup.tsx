import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DollarSign, Receipt, TrendingUp, Settings } from "lucide-react";
import { Link } from "react-router-dom";
import { ExpenseTracker } from "@/components/ExpenseTracker";

const FinancialSetup = () => {
  return (
    <div className="min-h-screen bg-cover bg-center bg-no-repeat p-4" style={{backgroundImage: 'url(/lovable-uploads/45c3083f-46c5-4e30-a2f0-31a24ab454f4.png)'}}>
      <div className="max-w-6xl mx-auto relative">
        <Button className="absolute top-0 right-0" asChild>
          <Link to="/reservation-setup">Go to Reservation Setup</Link>
        </Button>
        <div className="mb-8">
          <Button variant="outline" asChild className="mb-4">
            <Link to="/setup">← Back to Setup</Link>
          </Button>
          <h1 className="text-6xl mb-4 font-kaushan text-primary drop-shadow-lg text-center">Financial Setup</h1>
          <p className="text-2xl text-primary text-center font-medium">View cabin expenses, billing, and financial tracking</p>
        </div>

        <div className="grid gap-6 md:grid-cols-2 mb-8">

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

        </div>

        <div className="grid gap-8">
          <ExpenseTracker />
        </div>
        
        <div className="mt-12 text-center">
          <Button asChild size="lg" className="text-lg px-8 py-6">
            <Link to="/reservation-setup">Save settings and go to Reservation Setup</Link>
          </Button>
        </div>
      </div>
    </div>
  );
};

export default FinancialSetup;