import { Calendar, DollarSign, Users, Home, Plus, Receipt, CreditCard } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PropertyCalendar } from "@/components/PropertyCalendar";
import { ExpenseTracker } from "@/components/ExpenseTracker";
import { BillingDashboard } from "@/components/BillingDashboard";
import { FamilyGroups } from "@/components/FamilyGroups";
import { useState } from "react";

const Index = () => {
  const [activeTab, setActiveTab] = useState("calendar");

  const stats = [
    {
      title: "Total Properties",
      value: "3",
      icon: Home,
      description: "Active shared properties"
    },
    {
      title: "This Month's Expenses",
      value: "$2,450",
      icon: DollarSign,
      description: "Across all properties"
    },
    {
      title: "Active Users",
      value: "12",
      icon: Users,
      description: "Property co-owners"
    },
    {
      title: "Pending Payments",
      value: "$380",
      icon: CreditCard,
      description: "Outstanding balances"
    }
  ];

  const recentBookings = [
    { property: "Lake House", user: "Sarah M.", dates: "Dec 15-17", status: "confirmed" },
    { property: "City Apartment", user: "Mike R.", dates: "Dec 20-22", status: "pending" },
    { property: "Beach Condo", user: "Lisa K.", dates: "Dec 25-30", status: "confirmed" }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-green-50">
      {/* Header */}
      <header className="bg-white border-b shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <Home className="h-8 w-8 text-blue-600 mr-3" />
              <h1 className="text-2xl font-bold text-gray-900">Cabin Buddy</h1>
            </div>
            <div className="flex items-center space-x-4">
              <Button variant="outline" size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Add Property
              </Button>
              <div className="h-8 w-8 bg-gradient-to-r from-blue-500 to-green-500 rounded-full"></div>
            </div>
          </div>
        </div>
      </header>

      {/* Navigation Tabs */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex space-x-8">
            {[
              { id: "calendar", label: "Calendar", icon: Calendar },
              { id: "expenses", label: "Expenses", icon: Receipt },
              { id: "billing", label: "Billing", icon: CreditCard },
              { id: "family", label: "Family", icon: Users }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === tab.id
                    ? "border-blue-500 text-blue-600"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                }`}
              >
                <tab.icon className="h-4 w-4 mr-2" />
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {stats.map((stat, index) => (
            <Card key={index} className="hover:shadow-md transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">
                  {stat.title}
                </CardTitle>
                <stat.icon className="h-4 w-4 text-blue-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-gray-900">{stat.value}</div>
                <p className="text-xs text-gray-500 mt-1">{stat.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Tab Content */}
          <div className="lg:col-span-2">
            {activeTab === "calendar" && <PropertyCalendar />}
            {activeTab === "expenses" && <ExpenseTracker />}
            {activeTab === "billing" && <BillingDashboard />}
            {activeTab === "family" && <FamilyGroups />}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Recent Bookings */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Recent Bookings</CardTitle>
                <CardDescription>Latest property reservations</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {recentBookings.map((booking, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex-1">
                      <div className="font-medium text-sm">{booking.property}</div>
                      <div className="text-sm text-gray-500">{booking.user}</div>
                      <div className="text-xs text-gray-400">{booking.dates}</div>
                    </div>
                    <Badge variant={booking.status === "confirmed" ? "default" : "secondary"}>
                      {booking.status}
                    </Badge>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button className="w-full justify-start" variant="outline">
                  <Plus className="h-4 w-4 mr-2" />
                  Add New Expense
                </Button>
                <Button className="w-full justify-start" variant="outline">
                  <Calendar className="h-4 w-4 mr-2" />
                  Book Property
                </Button>
                <Button className="w-full justify-start" variant="outline">
                  <Receipt className="h-4 w-4 mr-2" />
                  Generate Report
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Index;
