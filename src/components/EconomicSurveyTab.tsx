import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DataTable } from "@/components/ui/data-table";
import { useSurveyResponses } from "@/hooks/useChecklistData";
import { FileBarChart, Calendar, Users, DollarSign } from "lucide-react";
import { format } from "date-fns";
import { LoadingSpinner } from "@/components/ui/loading-spinner";

// The single dollar-valued answer at the bottom of the survey. Everything
// else is a count of how many times an activity happened.
const AMOUNT_KEY = "amountSpent";

// Internal bookkeeping keys stored alongside the answers
const INTERNAL_KEYS = new Set(["_stayKey"]);

const categoryLabels: Record<string, string> = {
  shopped: "Groceries/Shopping",
  homeRepair: "Home Repair",
  dinedOut: "Dining",
  hiredGuide: "Guide Services",
  tickets: "Entertainment",
  yellowstone: "Yellowstone Park",
  fishingLicense: "Fishing/Hunting Licenses",
  other: "Other",
  [AMOUNT_KEY]: "Approximate $ Spent in Area",
};

// Custom survey items are stored under generated ids like "custom_1712345678".
// Fall back to a readable version of the key rather than showing the raw id.
const prettifyKey = (key: string) => {
  const cleaned = key.replace(/^custom_/, "").replace(/[_-]+/g, " ");
  const spaced = cleaned.replace(/([a-z0-9])([A-Z])/g, "$1 $2");
  const trimmed = spaced.trim();
  if (!trimmed || /^\d+$/.test(trimmed)) return "Custom Item";
  return trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
};

const labelFor = (key: string) => categoryLabels[key] || prettifyKey(key);

const toNumber = (value: unknown) => {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  if (typeof value === "string") return parseInt(value, 10) || 0;
  return 0;
};

const EconomicSurveyTab = () => {
  const { responses, loading } = useSurveyResponses();
  const [selectedYear, setSelectedYear] = useState<string>(new Date().getFullYear().toString());

  const availableYears = Array.from(
    new Set(
      responses.map(r => r.created_at ? new Date(r.created_at).getFullYear().toString() : new Date().getFullYear().toString())
    )
  ).sort((a, b) => Number(b) - Number(a));

  const filteredResponses = responses.filter(r => {
    if (!r.created_at) return false;
    return new Date(r.created_at).getFullYear().toString() === selectedYear;
  });

  // Activity counts (everything except the dollar field and internal keys)
  const activityTotals = filteredResponses.reduce((acc, response) => {
    if (response.responses) {
      Object.entries(response.responses).forEach(([key, value]) => {
        if (key === AMOUNT_KEY || INTERNAL_KEYS.has(key)) return;
        acc[key] = (acc[key] || 0) + toNumber(value);
      });
    }
    return acc;
  }, {} as Record<string, number>);

  const totalActivities = Object.values(activityTotals).reduce((sum, val) => sum + val, 0);

  const totalSpent = filteredResponses.reduce(
    (sum, r) => sum + toNumber(r.responses?.[AMOUNT_KEY]),
    0
  );

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(amount);

  const formatCount = (value: number) => new Intl.NumberFormat('en-US').format(value);

  // Columns: the eight known activity items plus any custom keys that appear,
  // then the dollar column last.
  const activityKeys = Array.from(
    new Set([
      'shopped', 'homeRepair', 'dinedOut', 'hiredGuide', 'tickets', 'yellowstone', 'fishingLicense', 'other',
      ...Object.keys(activityTotals),
    ])
  );

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
    { key: 'family_group', title: 'Family Group' },
    ...activityKeys.map(key => ({
      key,
      title: labelFor(key),
      render: (_: any, row: any) => {
        const count = toNumber(row.responses?.[key]);
        return count ? formatCount(count) : '-';
      },
    })),
    {
      key: AMOUNT_KEY,
      title: labelFor(AMOUNT_KEY),
      render: (_: any, row: any) => {
        const amount = toNumber(row.responses?.[AMOUNT_KEY]);
        return amount ? formatCurrency(amount) : '-';
      },
    },
  ];

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Economic Impact Survey</h2>
          <p className="text-muted-foreground">
            Accumulated survey data from departure checklists — activity counts and spending in the local area
          </p>
        </div>
        <Select value={selectedYear} onValueChange={setSelectedYear}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Select Year" />
          </SelectTrigger>
          <SelectContent>
            {availableYears.length > 0 ? (
              availableYears.map((year) => (
                <SelectItem key={year} value={year}>{year}</SelectItem>
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
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Responses</CardTitle>
            <FileBarChart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{filteredResponses.length}</div>
            <p className="text-xs text-muted-foreground">Survey submissions in {selectedYear}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Activities Reported</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCount(totalActivities)}</div>
            <p className="text-xs text-muted-foreground">Times activities occurred within 50 miles</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total $ Spent in Area</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalSpent)}</div>
            <p className="text-xs text-muted-foreground">Reported approximate spending</p>
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
            <p className="text-xs text-muted-foreground">Unique family groups</p>
          </CardContent>
        </Card>
      </div>

      {/* Category Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle>Activity Breakdown</CardTitle>
          <CardDescription>Number of times each activity was reported</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {Object.entries(activityTotals).map(([key, value]) => (
              <div key={key} className="space-y-1">
                <p className="text-sm font-medium text-muted-foreground">{labelFor(key)}</p>
                <p className="text-2xl font-bold">{formatCount(value)}</p>
              </div>
            ))}
            <div className="space-y-1">
              <p className="text-sm font-medium text-muted-foreground">{labelFor(AMOUNT_KEY)}</p>
              <p className="text-2xl font-bold">{formatCurrency(totalSpent)}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Detailed Responses Table */}
      <Card>
        <CardHeader>
          <CardTitle>Detailed Survey Responses</CardTitle>
          <CardDescription>Individual responses from family groups</CardDescription>
        </CardHeader>
        <CardContent>
          <DataTable
            data={filteredResponses}
            columns={columns}
            loading={loading}
            emptyState={{
              title: "No survey responses",
              description: "Survey responses will appear here when families complete departure checklists.",
              icon: <FileBarChart className="h-12 w-12 text-muted-foreground" />,
            }}
          />
        </CardContent>
      </Card>
    </div>
  );
};

export default EconomicSurveyTab;
