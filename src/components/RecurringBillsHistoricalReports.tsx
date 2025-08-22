import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/hooks/useOrganization";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { EmptyState } from "@/components/ui/empty-state";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, Minus, Calendar, DollarSign } from "lucide-react";
import { format } from "date-fns";

interface HistoricalValue {
  date: string;
  amount: number;
  notes?: string;
}

interface RecurringBill {
  id: string;
  name: string;
  provider_name?: string | null;
  amount: number | null;
  category: string;
  frequency: string;
  historical_values?: HistoricalValue[] | null;
  historical_tracking_type?: string | null;
}

interface BillTrend {
  billName: string;
  provider: string;
  category: string;
  currentAmount: number;
  previousAmount: number;
  change: number;
  changePercent: number;
  trend: 'up' | 'down' | 'stable';
  lastUpdated: string;
  totalEntries: number;
}

export const RecurringBillsHistoricalReports = () => {
  const { organization } = useOrganization();
  const [bills, setBills] = useState<RecurringBill[]>([]);
  const [loading, setLoading] = useState(true);
  const [trends, setTrends] = useState<BillTrend[]>([]);

  useEffect(() => {
    if (organization?.id) {
      fetchBillsWithHistory();
    }
  }, [organization?.id]);

  // Add real-time subscription to refresh when recurring_bills data changes
  useEffect(() => {
    if (!organization?.id) return;

    const channel = supabase
      .channel('historical-reports-updates')
      .on(
        'postgres_changes',
        {
          event: '*', // Listen to all changes (INSERT, UPDATE, DELETE)
          schema: 'public',
          table: 'recurring_bills',
          filter: `organization_id=eq.${organization.id}`
        },
        () => {
          // Refresh data when any recurring bill changes
          fetchBillsWithHistory();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [organization?.id]);

  const fetchBillsWithHistory = async () => {
    if (!organization?.id) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('recurring_bills')
        .select('*')
        .eq('organization_id', organization.id)
        .order('name');

      if (error) throw error;
      
      // Parse historical_values JSON and filter bills with historical data
      const parsedBills = (data || [])
        .map(bill => ({
          ...bill,
          historical_values: bill.historical_values 
            ? (Array.isArray(bill.historical_values) 
              ? bill.historical_values 
              : typeof bill.historical_values === 'string'
                ? JSON.parse(bill.historical_values)
                : bill.historical_values) as HistoricalValue[]
            : [] as HistoricalValue[]
        }))
        .filter(bill => bill.historical_values && bill.historical_values.length > 0);
      
      setBills(parsedBills);
      calculateTrends(parsedBills);
    } catch (error) {
      console.error('Error fetching bills with history:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateTrends = (billsData: RecurringBill[]) => {
    const trendsData: BillTrend[] = [];

    billsData.forEach(bill => {
      if (!bill.historical_values || bill.historical_values.length < 2) return;

      // Sort historical values by date
      const sortedHistory = [...bill.historical_values].sort((a, b) => 
        new Date(b.date).getTime() - new Date(a.date).getTime()
      );

      const currentAmount = sortedHistory[0].amount;
      const previousAmount = sortedHistory[1].amount;
      const change = currentAmount - previousAmount;
      const changePercent = previousAmount !== 0 ? (change / previousAmount) * 100 : 0;

      let trend: 'up' | 'down' | 'stable' = 'stable';
      if (Math.abs(changePercent) > 1) { // Only consider significant changes (>1%)
        trend = change > 0 ? 'up' : 'down';
      }

      trendsData.push({
        billName: bill.name,
        provider: bill.provider_name || 'N/A',
        category: bill.category,
        currentAmount,
        previousAmount,
        change,
        changePercent,
        trend,
        lastUpdated: sortedHistory[0].date,
        totalEntries: bill.historical_values.length
      });
    });

    // Sort by absolute change percentage (most significant changes first)
    trendsData.sort((a, b) => Math.abs(b.changePercent) - Math.abs(a.changePercent));
    setTrends(trendsData);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const getTrendIcon = (trend: 'up' | 'down' | 'stable') => {
    switch (trend) {
      case 'up': return <TrendingUp className="h-4 w-4 text-red-600" />;
      case 'down': return <TrendingDown className="h-4 w-4 text-green-600" />;
      default: return <Minus className="h-4 w-4 text-gray-600" />;
    }
  };

  const getTrendColor = (trend: 'up' | 'down' | 'stable') => {
    switch (trend) {
      case 'up': return 'text-red-600';
      case 'down': return 'text-green-600';
      default: return 'text-gray-600';
    }
  };

  const getCategoryColor = (category: string) => {
    const colors: Record<string, string> = {
      'Utilities': 'bg-blue-100 text-blue-700',
      'Insurance': 'bg-purple-100 text-purple-700',
      'Maintenance': 'bg-orange-100 text-orange-700',
      'Property Management': 'bg-teal-100 text-teal-700',
      'Internet': 'bg-cyan-100 text-cyan-700',
      'Security': 'bg-red-100 text-red-700',
      'Landscaping': 'bg-green-100 text-green-700',
      'Cleaning': 'bg-pink-100 text-pink-700',
      'Forest Service Lease': 'bg-amber-100 text-amber-700',
      'Other': 'bg-gray-100 text-gray-700'
    };
    return colors[category] || 'bg-gray-100 text-gray-700';
  };

  const totalHistoricalEntries = bills.reduce((total, bill) => 
    total + (bill.historical_values?.length || 0), 0);

  const billsWithIncreases = trends.filter(trend => trend.trend === 'up').length;
  const billsWithDecreases = trends.filter(trend => trend.trend === 'down').length;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (bills.length === 0) {
    return (
      <EmptyState
        icon={<Calendar className="h-12 w-12" />}
        title="No Historical Data"
        description="No recurring bills have historical data yet. Add historical entries to bills to see trends and reports here."
      />
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold mb-2">Historical Reports</h2>
        <p className="text-muted-foreground text-base">
          Track cost changes and trends across all your recurring bills
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">Bills Tracked</p>
                <p className="text-2xl font-bold">{bills.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">Total Entries</p>
                <p className="text-2xl font-bold">{totalHistoricalEntries}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-red-600" />
              <div>
                <p className="text-sm text-muted-foreground">Increases</p>
                <p className="text-2xl font-bold text-red-600">{billsWithIncreases}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <TrendingDown className="h-4 w-4 text-green-600" />
              <div>
                <p className="text-sm text-muted-foreground">Decreases</p>
                <p className="text-2xl font-bold text-green-600">{billsWithDecreases}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Trends List */}
      <Card>
        <CardHeader>
          <CardTitle>Bill Trends</CardTitle>
          <CardDescription>
            Recent changes in your recurring bills (sorted by significance)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {trends.map((trend, index) => (
              <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    {getTrendIcon(trend.trend)}
                    <div>
                      <h4 className="font-medium">{trend.billName}</h4>
                      <p className="text-sm text-muted-foreground">
                        {trend.provider} • {trend.totalEntries} entries
                      </p>
                    </div>
                  </div>
                  <Badge className={getCategoryColor(trend.category)}>
                    {trend.category}
                  </Badge>
                </div>

                <div className="text-right">
                  <div className="flex items-center gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Previous</p>
                      <p className="font-mono">{formatCurrency(trend.previousAmount)}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Current</p>
                      <p className="font-mono font-medium">{formatCurrency(trend.currentAmount)}</p>
                    </div>
                    <div className="min-w-24">
                      <p className="text-sm text-muted-foreground">Change</p>
                      <div className={`font-medium ${getTrendColor(trend.trend)}`}>
                        <div className="flex items-center gap-1">
                          <span>{trend.change >= 0 ? '+' : ''}{formatCurrency(trend.change)}</span>
                        </div>
                        <div className="text-xs">
                          ({trend.changePercent >= 0 ? '+' : ''}{trend.changePercent.toFixed(1)}%)
                        </div>
                      </div>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Last updated: {format(new Date(trend.lastUpdated), 'MMM dd, yyyy')}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Detailed History for Each Bill */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Detailed History</h3>
        {bills.map((bill) => (
          <Card key={bill.id}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base">{bill.name}</CardTitle>
                  <CardDescription>
                    {bill.provider_name && `${bill.provider_name} • `}
                    {bill.historical_values?.length || 0} historical entries
                  </CardDescription>
                </div>
                <Badge className={getCategoryColor(bill.category)}>
                  {bill.category}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {bill.historical_values
                  ?.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                  .map((entry, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                      <div className="flex items-center gap-4">
                        <span className="text-sm font-medium">
                          {format(new Date(entry.date), 'MMM dd, yyyy')}
                        </span>
                        {entry.notes && (
                          <span className="text-sm text-muted-foreground">
                            {entry.notes}
                          </span>
                        )}
                      </div>
                      <span className="font-mono font-medium">
                        {formatCurrency(entry.amount)}
                      </span>
                    </div>
                  ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};