import { useState } from "react";
import { useAdminSeasonSummary } from "@/hooks/useAdminSeasonSummary";
import { format } from "date-fns";
import { Link, useSearchParams } from "react-router-dom";
import { 
  Calendar, 
  DollarSign, 
  Users, 
  Moon, 
  ArrowLeft,
  Download,
  Send,
  FileText,
  AlertCircle,
  CheckCircle2,
  RefreshCw
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { SeasonInvoiceDialog } from "@/components/SeasonInvoiceDialog";
import { ExportSeasonDataDialog } from "@/components/ExportSeasonDataDialog";
import { useToast } from "@/hooks/use-toast";
import { useOrganization } from "@/hooks/useOrganization";
import { supabase } from "@/integrations/supabase/client";

export default function AdminSeasonSummary() {
  const { toast } = useToast();
  const [searchParams] = useSearchParams();
  const year = parseInt(searchParams.get('year') || new Date().getFullYear().toString());
  const { summary, loading, refetch } = useAdminSeasonSummary(year);
  const { organization } = useOrganization();

  const [selectedFamilies, setSelectedFamilies] = useState<Set<string>>(new Set());
  const [sendingReminders, setSendingReminders] = useState(false);
  const [exportDialogOpen, setExportDialogOpen] = useState(false);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const toggleFamilySelection = (familyGroup: string) => {
    const newSelection = new Set(selectedFamilies);
    if (newSelection.has(familyGroup)) {
      newSelection.delete(familyGroup);
    } else {
      newSelection.add(familyGroup);
    }
    setSelectedFamilies(newSelection);
  };

  const toggleSelectAll = () => {
    if (!summary) return;
    
    if (selectedFamilies.size === summary.familySummaries.length) {
      setSelectedFamilies(new Set());
    } else {
      setSelectedFamilies(new Set(summary.familySummaries.map(f => f.familyGroup)));
    }
  };

  const handleSendBulkReminders = async () => {
    if (selectedFamilies.size === 0) {
      toast({
        title: "No families selected",
        description: "Please select at least one family to send reminders.",
        variant: "destructive",
      });
      return;
    }

    setSendingReminders(true);
    try {
      const { data, error } = await supabase.functions.invoke('send-bulk-payment-reminders', {
        body: {
          organizationId: organization?.id,
          familyGroups: Array.from(selectedFamilies),
          year,
        },
      });

      if (error) throw error;

      toast({
        title: "Reminders sent",
        description: `Payment reminders sent to ${selectedFamilies.size} families.`,
      });

      setSelectedFamilies(new Set());
    } catch (error) {
      console.error('Error sending bulk reminders:', error);
      toast({
        title: "Error",
        description: "Failed to send payment reminders. Please try again.",
        variant: "destructive",
      });
    } finally {
      setSendingReminders(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (!summary) {
    return (
      <div className="container mx-auto p-6">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>Failed to load season summary data.</AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <Button variant="ghost" size="sm" asChild className="mb-2">
            <Link to="/finance-reports">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Financial Dashboard
            </Link>
          </Button>
          <h1 className="text-4xl font-kaushan text-primary">Admin Season Summary</h1>
          <p className="text-muted-foreground mt-2">
            Complete financial overview for all families - {summary.config.seasonName}
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => {
              // Generate CSV export of all family data
              const csvContent = [
                ['Family Group', 'Stays', 'Nights', 'Charged', 'Paid', 'Balance', 'Status'],
                ...summary.familySummaries.map(f => [
                  f.familyGroup,
                  f.totalStays.toString(),
                  f.totalNights.toString(),
                  f.totalCharged.toFixed(2),
                  f.totalPaid.toFixed(2),
                  f.outstandingBalance.toFixed(2),
                  f.outstandingBalance === 0 ? 'Paid' : f.totalPaid > 0 ? 'Partial' : 'Unpaid'
                ])
              ].map(row => row.join(',')).join('\n');
              
              const blob = new Blob([csvContent], { type: 'text/csv' });
              const url = window.URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = `all-families-season-${year}.csv`;
              a.click();
              window.URL.revokeObjectURL(url);
            }}
          >
            <Download className="h-4 w-4 mr-2" />
            Export All Data
          </Button>
          <Button onClick={refetch}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Users className="h-4 w-4" />
              Families
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary.totals.totalFamilies}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Total Stays
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary.totals.totalStays}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Moon className="h-4 w-4" />
              Total Nights
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary.totals.totalNights}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              Total Charged
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(summary.totals.totalCharged)}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-destructive" />
              Outstanding
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">
              {formatCurrency(summary.totals.totalOutstanding)}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Season Configuration */}
      <Alert>
        <Calendar className="h-4 w-4" />
        <AlertTitle>Season Configuration</AlertTitle>
        <AlertDescription>
          Season: {format(summary.config.startDate, 'MMM d, yyyy')} - {format(summary.config.endDate, 'MMM d, yyyy')}
          {' • '}
          Payment Deadline: {format(summary.config.paymentDeadline, 'MMM d, yyyy')}
        </AlertDescription>
      </Alert>

      {/* Bulk Actions */}
      {selectedFamilies.size > 0 && (
        <Card className="border-primary">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Badge variant="secondary">{selectedFamilies.size} families selected</Badge>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedFamilies(new Set())}
                >
                  Clear selection
                </Button>
              </div>
              <Button
                onClick={handleSendBulkReminders}
                disabled={sendingReminders}
              >
                {sendingReminders ? (
                  <>
                    <LoadingSpinner size="sm" className="mr-2" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4 mr-2" />
                    Send Payment Reminders
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Family Groups Table */}
      <Card>
        <CardHeader>
          <CardTitle>Family Groups Financial Summary</CardTitle>
          <CardDescription>
            Detailed breakdown by family group with payment status and outstanding balances
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">
                  <Checkbox
                    checked={selectedFamilies.size === summary.familySummaries.length}
                    onCheckedChange={toggleSelectAll}
                  />
                </TableHead>
                <TableHead>Family Group</TableHead>
                <TableHead className="text-right">Stays</TableHead>
                <TableHead className="text-right">Nights</TableHead>
                <TableHead className="text-right">Charged</TableHead>
                <TableHead className="text-right">Paid</TableHead>
                <TableHead className="text-right">Balance</TableHead>
                <TableHead className="text-center">Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {summary.familySummaries.map((family) => (
                <TableRow key={family.familyGroup}>
                  <TableCell>
                    <Checkbox
                      checked={selectedFamilies.has(family.familyGroup)}
                      onCheckedChange={() => toggleFamilySelection(family.familyGroup)}
                    />
                  </TableCell>
                  <TableCell className="font-medium">{family.familyGroup}</TableCell>
                  <TableCell className="text-right">{family.totalStays}</TableCell>
                  <TableCell className="text-right">{family.totalNights}</TableCell>
                  <TableCell className="text-right font-mono">
                    {formatCurrency(family.totalCharged)}
                  </TableCell>
                  <TableCell className="text-right font-mono">
                    {formatCurrency(family.totalPaid)}
                  </TableCell>
                  <TableCell className="text-right font-mono">
                    {formatCurrency(family.outstandingBalance)}
                  </TableCell>
                  <TableCell className="text-center">
                    {family.outstandingBalance === 0 ? (
                      <Badge variant="default" className="bg-green-500">
                        <CheckCircle2 className="h-3 w-3 mr-1" />
                        Paid
                      </Badge>
                    ) : family.totalPaid > 0 ? (
                      <Badge variant="secondary">
                        Partial
                      </Badge>
                    ) : (
                      <Badge variant="destructive">
                        <AlertCircle className="h-3 w-3 mr-1" />
                        Unpaid
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      asChild
                    >
                      <Link to={`/season-summary?year=${year}&family=${encodeURIComponent(family.familyGroup)}&admin=true`}>
                        <FileText className="h-4 w-4" />
                      </Link>
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Dialogs - Note: These dialogs expect seasonData which we don't have in admin view */}
      {/* For now, admin features use direct links to individual family season summaries */}
      {/* Future enhancement: Create admin-specific invoice/export dialogs */}
    </div>
  );
}
