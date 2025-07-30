import { useState, useMemo } from "react";
import { useFinancialData } from "@/hooks/useFinancialData";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { DataTable } from "@/components/ui/data-table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Download, Receipt, DollarSign, Calendar, Users, Search, Filter, TrendingUp, PieChart } from "lucide-react";
import { format, parseISO, startOfMonth, endOfMonth } from "date-fns";
import { useFamilyGroups } from "@/hooks/useFamilyGroups";

export const EnhancedFinancialRecords = () => {
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

  const { familyGroups } = useFamilyGroups();
  
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedFamilyGroup, setSelectedFamilyGroup] = useState<string>("all");
  const [selectedMonth, setSelectedMonth] = useState<string>("all");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [dateRange, setDateRange] = useState({ start: "", end: "" });

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  // Enhanced filtering
  const filteredRecords = useMemo(() => {
    let filtered = records;

    if (searchTerm) {
      filtered = filtered.filter(record =>
        record.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        record.family_group?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (selectedFamilyGroup !== "all") {
      filtered = filtered.filter(record => record.family_group === selectedFamilyGroup);
    }

    if (selectedMonth !== "all") {
      filtered = filtered.filter(record => {
        const recordMonth = format(parseISO(record.date), 'MM');
        return recordMonth === selectedMonth;
      });
    }

    if (dateRange.start) {
      filtered = filtered.filter(record => record.date >= dateRange.start);
    }

    if (dateRange.end) {
      filtered = filtered.filter(record => record.date <= dateRange.end);
    }

    return filtered;
  }, [records, searchTerm, selectedFamilyGroup, selectedMonth, dateRange]);

  // Calculate statistics
  const stats = useMemo(() => {
    const monthlyTotals: Record<string, number> = {};
    const familyGroupTotals: Record<string, number> = {};
    
    filteredRecords.forEach(record => {
      const month = format(parseISO(record.date), 'yyyy-MM');
      monthlyTotals[month] = (monthlyTotals[month] || 0) + Number(record.amount);
      
      if (record.family_group) {
        familyGroupTotals[record.family_group] = (familyGroupTotals[record.family_group] || 0) + Number(record.amount);
      }
    });

    const averageAmount = filteredRecords.length > 0 
      ? filteredRecords.reduce((sum, record) => sum + Number(record.amount), 0) / filteredRecords.length 
      : 0;

    return {
      totalRecords: filteredRecords.length,
      totalAmount: filteredRecords.reduce((sum, record) => sum + Number(record.amount), 0),
      averageAmount,
      monthlyTotals,
      familyGroupTotals,
      highestExpense: Math.max(...filteredRecords.map(r => Number(r.amount)), 0),
      lowestExpense: filteredRecords.length > 0 ? Math.min(...filteredRecords.map(r => Number(r.amount))) : 0,
    };
  }, [filteredRecords]);

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

  const exportToCSV = () => {
    const csvContent = [
      ['Date', 'Description', 'Family Group', 'Amount'],
      ...filteredRecords.map(record => [
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
    a.download = `financial-records-${selectedYear}-filtered.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const monthOptions = Array.from({ length: 12 }, (_, i) => {
    const month = (i + 1).toString().padStart(2, '0');
    return {
      value: month,
      label: format(new Date(2023, i, 1), 'MMMM')
    };
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold">Financial Records</h2>
          <p className="text-muted-foreground">
            Advanced filtering and analysis of financial data
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

      {/* Advanced Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Advanced Filters
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
            <div>
              <Label>Year</Label>
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
            </div>

            <div>
              <Label>Month</Label>
              <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                <SelectTrigger>
                  <SelectValue placeholder="All Months" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Months</SelectItem>
                  {monthOptions.map(({ value, label }) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Family Group</Label>
              <Select value={selectedFamilyGroup} onValueChange={setSelectedFamilyGroup}>
                <SelectTrigger>
                  <SelectValue placeholder="All Groups" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Groups</SelectItem>
                  {familyGroups.map((group) => (
                    <SelectItem key={group.id} value={group.name}>
                      {group.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Start Date</Label>
              <Input
                type="date"
                value={dateRange.start}
                onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
              />
            </div>

            <div>
              <Label>End Date</Label>
              <Input
                type="date"
                value={dateRange.end}
                onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
              />
            </div>

            <div>
              <Label>Search</Label>
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search descriptions..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span>
              Showing {stats.totalRecords} of {records.length} records
            </span>
            <Button variant="outline" size="sm" onClick={exportToCSV}>
              <Download className="h-4 w-4 mr-2" />
              Export Filtered Data
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Receipt className="h-4 w-4" />
              Records
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalRecords}</div>
            <p className="text-xs text-muted-foreground">
              of {records.length} total
            </p>
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
            <div className="text-2xl font-bold">{formatCurrency(stats.totalAmount)}</div>
            <p className="text-xs text-muted-foreground">
              filtered data
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Average
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(stats.averageAmount)}</div>
            <p className="text-xs text-muted-foreground">
              per record
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">
              Highest
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(stats.highestExpense)}</div>
            <p className="text-xs text-muted-foreground">
              single expense
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">
              Lowest
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(stats.lowestExpense)}</div>
            <p className="text-xs text-muted-foreground">
              single expense
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Family Group Breakdown */}
      {Object.keys(stats.familyGroupTotals).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PieChart className="h-5 w-5" />
              Family Group Breakdown
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {Object.entries(stats.familyGroupTotals).map(([group, amount]) => (
                <div key={group} className="p-4 border rounded-lg">
                  <div className="flex justify-between items-center">
                    <span className="font-medium">{group}</span>
                    <span className="text-lg font-bold">{formatCurrency(amount)}</span>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {((amount / stats.totalAmount) * 100).toFixed(1)}% of total
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

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
          {filteredRecords.length === 0 ? (
            <EmptyState
              icon={<Receipt className="h-12 w-12" />}
              title="No records found"
              description="Try adjusting your filters to see more results."
            />
          ) : (
            <DataTable
              data={filteredRecords}
              columns={columns}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
};