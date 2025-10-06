import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { EmptyState } from "@/components/ui/empty-state";
import { DataTable } from "@/components/ui/data-table";
import { useSurveyResponses } from "@/hooks/useChecklistData";
import { FileBarChart, Calendar, Users } from "lucide-react";
import { format } from "date-fns";

const SurveyResponses = () => {
  const { responses, loading } = useSurveyResponses();
  const [selectedYear, setSelectedYear] = useState<string>(new Date().getFullYear().toString());

  // Get unique years from responses
  const availableYears = Array.from(
    new Set(
      responses.map(r => r.created_at ? new Date(r.created_at).getFullYear().toString() : new Date().getFullYear().toString())
    )
  ).sort((a, b) => Number(b) - Number(a));

  // Filter responses by selected year
  const filteredResponses = responses.filter(r => {
    if (!r.created_at) return false;
    return new Date(r.created_at).getFullYear().toString() === selectedYear;
  });

  // Calculate totals for all survey categories
  const surveyTotals = filteredResponses.reduce((acc, response) => {
    if (response.responses) {
      Object.entries(response.responses).forEach(([key, value]) => {
        const numValue = typeof value === 'string' ? parseInt(value) || 0 : 0;
        acc[key] = (acc[key] || 0) + numValue;
      });
    }
    return acc;
  }, {} as Record<string, number>);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const columns = [
    {
      key: 'created_at',
      title: 'Date',
      render: (_: any, row: any) => {
        if (!row.created_at) return 'N/A';
        const date = new Date(row.created_at);
        return isNaN(date.getTime()) ? 'Invalid Date' : format(date, 'MMM d, yyyy');
      },
    },
    {
      key: 'family_group',
      title: 'Family Group',
    },
    {
      key: 'shopped',
      title: 'Groceries/Shopping',
      render: (_: any, row: any) => {
        const amount = row.responses?.shopped;
        return amount ? formatCurrency(parseInt(amount)) : '-';
      },
    },
    {
      key: 'homeRepair',
      title: 'Home Repair',
      render: (_: any, row: any) => {
        const amount = row.responses?.homeRepair;
        return amount ? formatCurrency(parseInt(amount)) : '-';
      },
    },
    {
      key: 'dinedOut',
      title: 'Dining',
      render: (_: any, row: any) => {
        const amount = row.responses?.dinedOut;
        return amount ? formatCurrency(parseInt(amount)) : '-';
      },
    },
    {
      key: 'hiredGuide',
      title: 'Guide Services',
      render: (_: any, row: any) => {
        const amount = row.responses?.hiredGuide;
        return amount ? formatCurrency(parseInt(amount)) : '-';
      },
    },
    {
      key: 'tickets',
      title: 'Entertainment',
      render: (_: any, row: any) => {
        const amount = row.responses?.tickets;
        return amount ? formatCurrency(parseInt(amount)) : '-';
      },
    },
    {
      key: 'yellowstone',
      title: 'Yellowstone',
      render: (_: any, row: any) => {
        const amount = row.responses?.yellowstone;
        return amount ? formatCurrency(parseInt(amount)) : '-';
      },
    },
    {
      key: 'fishingLicense',
      title: 'Licenses',
      render: (_: any, row: any) => {
        const amount = row.responses?.fishingLicense;
        return amount ? formatCurrency(parseInt(amount)) : '-';
      },
    },
    {
      key: 'other',
      title: 'Other',
      render: (_: any, row: any) => {
        const amount = row.responses?.other;
        return amount ? formatCurrency(parseInt(amount)) : '-';
      },
    },
  ];

  const categoryLabels: Record<string, string> = {
    shopped: "Groceries/Shopping",
    homeRepair: "Home Repair",
    dinedOut: "Dining",
    hiredGuide: "Guide Services",
    tickets: "Entertainment",
    yellowstone: "Yellowstone Park",
    fishingLicense: "Fishing/Hunting Licenses",
    other: "Other"
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <div className="space-y-8 p-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Economic Survey Responses</h1>
          <p className="text-muted-foreground">
            View accumulated survey data from cabin checkouts
          </p>
        </div>
        
        <Select value={selectedYear} onValueChange={setSelectedYear}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Select Year" />
          </SelectTrigger>
          <SelectContent>
            {availableYears.length > 0 ? (
              availableYears.map((year) => (
                <SelectItem key={year} value={year}>
                  {year}
                </SelectItem>
              ))
            ) : (
              <SelectItem value={new Date().getFullYear().toString()}>
                {new Date().getFullYear()}
              </SelectItem>
            )}
          </SelectContent>
        </Select>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Responses</CardTitle>
            <FileBarChart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{filteredResponses.length}</div>
            <p className="text-xs text-muted-foreground">
              Survey submissions in {selectedYear}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Economic Impact</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(
                Object.values(surveyTotals).reduce((sum, val) => sum + val, 0)
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              Combined spending in area
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Participating Groups</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {new Set(filteredResponses.map(r => r.family_group)).size}
            </div>
            <p className="text-xs text-muted-foreground">
              Unique family groups
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Category Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle>Spending by Category</CardTitle>
          <CardDescription>
            Total amounts reported across all survey categories
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {Object.entries(surveyTotals).map(([key, value]) => (
              <div key={key} className="space-y-1">
                <p className="text-sm font-medium text-muted-foreground">
                  {categoryLabels[key] || key}
                </p>
                <p className="text-2xl font-bold">{formatCurrency(value)}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Detailed Responses Table */}
      <Card>
        <CardHeader>
          <CardTitle>Detailed Survey Responses</CardTitle>
          <CardDescription>
            Individual responses from family groups
          </CardDescription>
        </CardHeader>
        <CardContent>
          <DataTable
            data={filteredResponses}
            columns={columns}
            loading={loading}
            emptyState={{
              title: "No survey responses",
              description: "Survey responses will appear here when families complete checkout surveys.",
              icon: <FileBarChart className="h-12 w-12 text-muted-foreground" />,
            }}
          />
        </CardContent>
      </Card>
    </div>
  );
};

export default SurveyResponses;
