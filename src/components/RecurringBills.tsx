import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/hooks/useOrganization";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { EmptyState } from "@/components/ui/empty-state";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Edit, Trash2, Calendar, DollarSign, Phone, Globe, FileText, Building2, Snowflake, History, TrendingUp } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
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
  due_date: string | null;
  hibernation_start_date?: string | null;
  hibernation_end_date?: string | null;
  account_number: string | null;
  phone_number: string | null;
  website: string | null;
  notes: string | null;
  historical_values?: HistoricalValue[] | null;
  historical_tracking_type?: string | null;
  created_at: string;
  updated_at: string;
}

const CATEGORIES = [
  "Utilities",
  "Insurance", 
  "Maintenance",
  "Property Management",
  "Internet",
  "Security",
  "Landscaping",
  "Cleaning",
  "Forest Service Lease",
  "Other"
];

const FREQUENCIES = [
  "monthly",
  "quarterly",
  "semi-annually",
  "annually"
];

const TRACKING_TYPES = [
  "monthly",
  "annually"
];

export const RecurringBills = () => {
  const { organization } = useOrganization();
  const [bills, setBills] = useState<RecurringBill[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [historyDialogOpen, setHistoryDialogOpen] = useState(false);
  const [editingBill, setEditingBill] = useState<RecurringBill | null>(null);
  const [viewingHistoryBill, setViewingHistoryBill] = useState<RecurringBill | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    provider_name: "",
    amount: "",
    category: "",
    frequency: "monthly",
    due_date: "",
    hibernation_start_date: "",
    hibernation_end_date: "",
    account_number: "",
    phone_number: "",
    website: "",
    notes: "",
    historical_tracking_type: "monthly"
  });
  const [newHistoricalEntry, setNewHistoricalEntry] = useState({
    date: "",
    amount: "",
    notes: ""
  });

  useEffect(() => {
    if (organization?.id) {
      fetchBills();
    }
  }, [organization?.id]);

  const fetchBills = async () => {
    if (!organization?.id) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('recurring_bills')
        .select('*')
        .eq('organization_id', organization.id)
        .order('name');

      if (error) throw error;
      
      // Parse historical_values JSON and ensure proper typing
      const parsedBills = (data || []).map(bill => ({
        ...bill,
        historical_values: bill.historical_values 
          ? (Array.isArray(bill.historical_values) 
            ? bill.historical_values 
            : typeof bill.historical_values === 'string'
              ? JSON.parse(bill.historical_values)
              : bill.historical_values) as HistoricalValue[]
          : [] as HistoricalValue[]
      }));
      
      setBills(parsedBills);
    } catch (error) {
      console.error('Error fetching recurring bills:', error);
      toast.error('Failed to fetch recurring bills');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      name: "",
      provider_name: "",
      amount: "",
      category: "",
      frequency: "monthly",
      due_date: "",
      hibernation_start_date: "",
      hibernation_end_date: "",
      account_number: "",
      phone_number: "",
      website: "",
      notes: "",
      historical_tracking_type: "monthly"
    });
    setNewHistoricalEntry({
      date: "",
      amount: "",
      notes: ""
    });
    setEditingBill(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!organization?.id) return;

    try {
      const billData = {
        name: formData.name,
        provider_name: formData.provider_name || null,
        amount: formData.amount ? parseFloat(formData.amount) : null,
        category: formData.category,
        frequency: formData.frequency,
        due_date: formData.due_date || null,
        hibernation_start_date: formData.hibernation_start_date || null,
        hibernation_end_date: formData.hibernation_end_date || null,
        account_number: formData.account_number || null,
        phone_number: formData.phone_number || null,
        website: formData.website || null,
        notes: formData.notes || null,
        historical_tracking_type: formData.historical_tracking_type || 'monthly',
        historical_values: JSON.stringify(editingBill?.historical_values || []),
        organization_id: organization.id
      };

      if (editingBill) {
        const { error } = await supabase
          .from('recurring_bills')
          .update(billData)
          .eq('id', editingBill.id);

        if (error) throw error;
        toast.success('Recurring bill updated successfully');
      } else {
        const { error } = await supabase
          .from('recurring_bills')
          .insert([billData]);

        if (error) throw error;
        toast.success('Recurring bill created successfully');
      }

      setDialogOpen(false);
      resetForm();
      fetchBills();
    } catch (error) {
      console.error('Error saving recurring bill:', error);
      toast.error('Failed to save recurring bill');
    }
  };

  const handleEdit = (bill: RecurringBill) => {
    setEditingBill(bill);
    setFormData({
      name: bill.name,
      provider_name: bill.provider_name || "",
      amount: bill.amount?.toString() || "",
      category: bill.category,
      frequency: bill.frequency,
      due_date: bill.due_date || "",
      hibernation_start_date: bill.hibernation_start_date || "",
      hibernation_end_date: bill.hibernation_end_date || "",
      account_number: bill.account_number || "",
      phone_number: bill.phone_number || "",
      website: bill.website || "",
      notes: bill.notes || "",
      historical_tracking_type: bill.historical_tracking_type || "monthly"
    });
    setDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this recurring bill?')) return;

    try {
      const { error } = await supabase
        .from('recurring_bills')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast.success('Recurring bill deleted successfully');
      fetchBills();
    } catch (error) {
      console.error('Error deleting recurring bill:', error);
      toast.error('Failed to delete recurring bill');
    }
  };

  const handleViewHistory = (bill: RecurringBill) => {
    setViewingHistoryBill(bill);
    setHistoryDialogOpen(true);
  };

  const addHistoricalEntry = async () => {
    if (!editingBill || !newHistoricalEntry.date || !newHistoricalEntry.amount) return;

    const entry: HistoricalValue = {
      date: newHistoricalEntry.date,
      amount: parseFloat(newHistoricalEntry.amount),
      notes: newHistoricalEntry.notes || undefined
    };

    const updatedHistorical = [...(editingBill.historical_values || []), entry]
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    try {
      const { error } = await supabase
        .from('recurring_bills')
        .update({ historical_values: JSON.stringify(updatedHistorical) })
        .eq('id', editingBill.id);

      if (error) throw error;
      
      setEditingBill({ ...editingBill, historical_values: updatedHistorical });
      setNewHistoricalEntry({ date: "", amount: "", notes: "" });
      toast.success('Historical entry added');
      fetchBills();
    } catch (error) {
      console.error('Error adding historical entry:', error);
      toast.error('Failed to add historical entry');
    }
  };

  const removeHistoricalEntry = async (index: number) => {
    if (!editingBill) return;

    const updatedHistorical = [...(editingBill.historical_values || [])];
    updatedHistorical.splice(index, 1);

    try {
      const { error } = await supabase
        .from('recurring_bills')
        .update({ historical_values: JSON.stringify(updatedHistorical) })
        .eq('id', editingBill.id);

      if (error) throw error;
      
      setEditingBill({ ...editingBill, historical_values: updatedHistorical });
      toast.success('Historical entry removed');
      fetchBills();
    } catch (error) {
      console.error('Error removing historical entry:', error);
      toast.error('Failed to remove historical entry');
    }
  };

  const formatCurrency = (amount: number | null) => {
    if (!amount) return 'N/A';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const getFrequencyBadgeColor = (frequency: string) => {
    switch (frequency) {
      case 'monthly': return 'bg-blue-100 text-blue-700';
      case 'quarterly': return 'bg-green-100 text-green-700';
      case 'annually': return 'bg-purple-100 text-purple-700';
      case 'semi-annually': return 'bg-orange-100 text-orange-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const isInHibernation = (bill: RecurringBill) => {
    if (!bill.hibernation_start_date || !bill.hibernation_end_date) return false;
    const now = new Date();
    const start = new Date(bill.hibernation_start_date);
    const end = new Date(bill.hibernation_end_date);
    return now >= start && now <= end;
  };

  const totalMonthlyEstimate = bills.reduce((total, bill) => {
    if (!bill.amount || isInHibernation(bill)) return total;
    switch (bill.frequency) {
      case 'monthly': return total + bill.amount;
      case 'quarterly': return total + (bill.amount / 3);
      case 'annually': return total + (bill.amount / 12);
      case 'semi-annually': return total + (bill.amount / 6);
      default: return total;
    }
  }, 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold mb-2">Recurring Bills</h2>
          <p className="text-muted-foreground text-base">Manage recurring expenses and bills for your property</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) resetForm();
        }}>
          <DialogTrigger asChild>
            <Button className="text-base">
              <Plus className="h-4 w-4 mr-2" />
              Add Bill
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-base">
                {editingBill ? 'Edit Recurring Bill' : 'Add New Recurring Bill'}
              </DialogTitle>
              <DialogDescription className="text-base">
                Enter the details for this recurring bill or expense.
              </DialogDescription>
            </DialogHeader>
            
            <Tabs defaultValue="basic" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="basic">Basic Info</TabsTrigger>
                <TabsTrigger value="provider">Provider Details</TabsTrigger>
                <TabsTrigger value="historical">Historical Data</TabsTrigger>
              </TabsList>
              
              <form onSubmit={handleSubmit}>
                <TabsContent value="basic" className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="name" className="text-base">Bill Name *</Label>
                      <Input
                        id="name"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        placeholder="e.g., Electric Bill"
                        required
                        className="text-base placeholder:text-base"
                      />
                    </div>
                    <div>
                      <Label htmlFor="provider_name" className="text-base">Provider Name</Label>
                      <Input
                        id="provider_name"
                        value={formData.provider_name}
                        onChange={(e) => setFormData({ ...formData, provider_name: e.target.value })}
                        placeholder="e.g., Rocky Mountain Power"
                        className="text-base placeholder:text-base"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="amount" className="text-base">Amount</Label>
                      <Input
                        id="amount"
                        type="number"
                        step="0.01"
                        value={formData.amount}
                        onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                        placeholder="0.00"
                        className="text-base placeholder:text-base"
                      />
                    </div>
                    <div>
                      <Label htmlFor="due_date" className="text-base">Due Date (day of month)</Label>
                      <Input
                        id="due_date"
                        value={formData.due_date}
                        onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                        placeholder="e.g., 15th of month"
                        className="text-base placeholder:text-base"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="category" className="text-base">Category *</Label>
                      <Select
                        value={formData.category}
                        onValueChange={(value) => setFormData({ ...formData, category: value })}
                        required
                      >
                        <SelectTrigger className="text-base">
                          <SelectValue placeholder="Select category" />
                        </SelectTrigger>
                        <SelectContent>
                          {CATEGORIES.map((category) => (
                            <SelectItem key={category} value={category} className="text-base">
                              {category}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="frequency" className="text-base">Frequency</Label>
                      <Select
                        value={formData.frequency}
                        onValueChange={(value) => setFormData({ ...formData, frequency: value })}
                      >
                        <SelectTrigger className="text-base">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {FREQUENCIES.map((frequency) => (
                            <SelectItem key={frequency} value={frequency} className="text-base">
                              {frequency.charAt(0).toUpperCase() + frequency.slice(1)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="hibernation_start_date" className="text-base">Hibernation Start Date</Label>
                      <Input
                        id="hibernation_start_date"
                        type="date"
                        value={formData.hibernation_start_date}
                        onChange={(e) => setFormData({ ...formData, hibernation_start_date: e.target.value })}
                        className="text-base"
                      />
                    </div>
                    <div>
                      <Label htmlFor="hibernation_end_date" className="text-base">Hibernation End Date</Label>
                      <Input
                        id="hibernation_end_date"
                        type="date"
                        value={formData.hibernation_end_date}
                        onChange={(e) => setFormData({ ...formData, hibernation_end_date: e.target.value })}
                        className="text-base"
                      />
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="provider" className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="account_number" className="text-base">Account Number</Label>
                      <Input
                        id="account_number"
                        value={formData.account_number}
                        onChange={(e) => setFormData({ ...formData, account_number: e.target.value })}
                        placeholder="Account or reference number"
                        className="text-base placeholder:text-base"
                      />
                    </div>
                    <div>
                      <Label htmlFor="phone_number" className="text-base">Phone Number</Label>
                      <Input
                        id="phone_number"
                        value={formData.phone_number}
                        onChange={(e) => setFormData({ ...formData, phone_number: e.target.value })}
                        placeholder="Customer service phone"
                        className="text-base placeholder:text-base"
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="website" className="text-base">Website</Label>
                    <Input
                      id="website"
                      value={formData.website}
                      onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                      placeholder="https://example.com"
                      className="text-base placeholder:text-base"
                    />
                  </div>

                  <div>
                    <Label htmlFor="notes" className="text-base">Notes</Label>
                    <Textarea
                      id="notes"
                      value={formData.notes}
                      onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                      placeholder="Additional notes or instructions"
                      className="text-base placeholder:text-base"
                    />
                  </div>
                </TabsContent>

                <TabsContent value="historical" className="space-y-4">
                  <div>
                    <Label htmlFor="historical_tracking_type" className="text-base">Tracking Type</Label>
                    <Select
                      value={formData.historical_tracking_type}
                      onValueChange={(value) => setFormData({ ...formData, historical_tracking_type: value })}
                    >
                      <SelectTrigger className="text-base">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {TRACKING_TYPES.map((type) => (
                          <SelectItem key={type} value={type} className="text-base">
                            {type.charAt(0).toUpperCase() + type.slice(1)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {editingBill && (
                    <div className="space-y-4">
                      <div className="border rounded-lg p-4">
                        <h4 className="text-base font-medium mb-3">Add Historical Entry</h4>
                        <div className="grid grid-cols-3 gap-3">
                          <div>
                            <Label htmlFor="historical_date" className="text-sm">Date</Label>
                            <Input
                              id="historical_date"
                              type="date"
                              value={newHistoricalEntry.date}
                              onChange={(e) => setNewHistoricalEntry({ ...newHistoricalEntry, date: e.target.value })}
                              className="text-sm"
                            />
                          </div>
                          <div>
                            <Label htmlFor="historical_amount" className="text-sm">Amount</Label>
                            <Input
                              id="historical_amount"
                              type="number"
                              step="0.01"
                              value={newHistoricalEntry.amount}
                              onChange={(e) => setNewHistoricalEntry({ ...newHistoricalEntry, amount: e.target.value })}
                              placeholder="0.00"
                              className="text-sm"
                            />
                          </div>
                          <div>
                            <Label htmlFor="historical_notes" className="text-sm">Notes</Label>
                            <Input
                              id="historical_notes"
                              value={newHistoricalEntry.notes}
                              onChange={(e) => setNewHistoricalEntry({ ...newHistoricalEntry, notes: e.target.value })}
                              placeholder="Optional notes"
                              className="text-sm"
                            />
                          </div>
                        </div>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={addHistoricalEntry}
                          disabled={!newHistoricalEntry.date || !newHistoricalEntry.amount}
                          className="mt-3"
                        >
                          Add Entry
                        </Button>
                      </div>

                      {editingBill.historical_values && editingBill.historical_values.length > 0 && (
                        <div className="border rounded-lg p-4">
                          <h4 className="text-base font-medium mb-3">Historical Values</h4>
                          <div className="space-y-2 max-h-40 overflow-y-auto">
                            {editingBill.historical_values.map((entry, index) => (
                              <div key={index} className="flex items-center justify-between p-2 bg-muted rounded text-sm">
                                <div className="flex gap-4">
                                  <span>{format(new Date(entry.date), 'MMM dd, yyyy')}</span>
                                  <span className="font-medium">{formatCurrency(entry.amount)}</span>
                                  {entry.notes && <span className="text-muted-foreground">{entry.notes}</span>}
                                </div>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => removeHistoricalEntry(index)}
                                  className="h-6 w-6 p-0"
                                >
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </TabsContent>

                <div className="flex justify-end gap-2 mt-6">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setDialogOpen(false)}
                    className="text-base"
                  >
                    Cancel
                  </Button>
                  <Button type="submit" className="text-base">
                    {editingBill ? 'Update Bill' : 'Add Bill'}
                  </Button>
                </div>
              </form>
            </Tabs>
          </DialogContent>
        </Dialog>
      </div>

      {/* Summary Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base font-medium flex items-center gap-2">
            <DollarSign className="h-4 w-4" />
            Monthly Estimate
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{formatCurrency(totalMonthlyEstimate)}</div>
          <p className="text-muted-foreground text-base mt-1">
            Estimated monthly recurring expenses (excluding hibernated bills)
          </p>
        </CardContent>
      </Card>

      {/* Bills List */}
      {bills.length === 0 ? (
        <EmptyState
          icon={<Calendar className="h-12 w-12" />}
          title="No recurring bills found"
          description="Add your first recurring bill to start tracking expenses."
        />
      ) : (
        <div className="grid gap-4">
          {bills.map((bill) => (
            <Card key={bill.id} className={isInHibernation(bill) ? "border-orange-200 bg-orange-50/50" : ""}>
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-semibold">{bill.name}</h3>
                      {bill.provider_name && (
                        <div className="flex items-center gap-1 text-muted-foreground text-sm">
                          <Building2 className="h-3 w-3" />
                          {bill.provider_name}
                        </div>
                      )}
                      <Badge className={`${getFrequencyBadgeColor(bill.frequency)} text-base`}>
                        {bill.frequency}
                      </Badge>
                      {isInHibernation(bill) && (
                        <Badge variant="outline" className="text-orange-700 border-orange-300 bg-orange-100">
                          <Snowflake className="h-3 w-3 mr-1" />
                          Hibernating
                        </Badge>
                      )}
                    </div>
                    
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-base">
                      <div>
                        <p className="text-muted-foreground">Amount</p>
                        <p className="font-medium">{formatCurrency(bill.amount)}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Category</p>
                        <p className="font-medium">{bill.category}</p>
                      </div>
                      {bill.due_date && (
                        <div>
                          <p className="text-muted-foreground">Due Date</p>
                          <p className="font-medium">{bill.due_date}</p>
                        </div>
                      )}
                      {bill.account_number && (
                        <div>
                          <p className="text-muted-foreground">Account</p>
                          <p className="font-medium font-mono">{bill.account_number}</p>
                        </div>
                      )}
                    </div>

                    {(bill.hibernation_start_date || bill.hibernation_end_date) && (
                      <div className="mt-3 p-2 bg-orange-50 rounded text-sm">
                        <div className="flex items-center gap-1 text-orange-700">
                          <Snowflake className="h-3 w-3" />
                          <span className="font-medium">Hibernation Period:</span>
                        </div>
                        <div className="text-orange-600 mt-1">
                          {bill.hibernation_start_date && format(new Date(bill.hibernation_start_date), 'MMM dd')} - {bill.hibernation_end_date && format(new Date(bill.hibernation_end_date), 'MMM dd, yyyy')}
                        </div>
                      </div>
                    )}

                    {bill.historical_values && bill.historical_values.length > 0 && (
                      <div className="mt-3 p-2 bg-blue-50 rounded text-sm">
                        <div className="flex items-center gap-1 text-blue-700">
                          <TrendingUp className="h-3 w-3" />
                          <span className="font-medium">Historical Data:</span>
                          <span>{bill.historical_values.length} entries ({bill.historical_tracking_type})</span>
                        </div>
                      </div>
                    )}

                    <div className="flex gap-4 mt-3">
                      {bill.phone_number && (
                        <a href={`tel:${bill.phone_number}`} className="flex items-center gap-1 text-primary hover:underline text-base">
                          <Phone className="h-3 w-3" />
                          {bill.phone_number}
                        </a>
                      )}
                      {bill.website && (
                        <a 
                          href={bill.website.startsWith('http') ? bill.website : `https://${bill.website}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 text-primary hover:underline text-base"
                        >
                          <Globe className="h-3 w-3" />
                          Website
                        </a>
                      )}
                      {bill.notes && (
                        <div className="flex items-center gap-1 text-muted-foreground text-base">
                          <FileText className="h-3 w-3" />
                          <span className="truncate max-w-[200px]">{bill.notes}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex gap-2 ml-4">
                    {bill.historical_values && bill.historical_values.length > 0 && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleViewHistory(bill)}
                        className="text-base"
                        title="View Historical Data"
                      >
                        <History className="h-3 w-3" />
                      </Button>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEdit(bill)}
                      className="text-base"
                    >
                      <Edit className="h-3 w-3" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDelete(bill.id)}
                      className="text-base text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Read-only Historical Data Dialog */}
      <Dialog open={historyDialogOpen} onOpenChange={setHistoryDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-base">
              Historical Data - {viewingHistoryBill?.name}
            </DialogTitle>
            <DialogDescription className="text-base">
              View historical cost changes for this recurring bill
            </DialogDescription>
          </DialogHeader>
          
          {viewingHistoryBill && (
            <div className="space-y-4">
              {/* Bill Summary */}
              <div className="p-4 bg-muted rounded-lg">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">Bill Name</p>
                    <p className="font-medium">{viewingHistoryBill.name}</p>
                  </div>
                  {viewingHistoryBill.provider_name && (
                    <div>
                      <p className="text-muted-foreground">Provider</p>
                      <p className="font-medium">{viewingHistoryBill.provider_name}</p>
                    </div>
                  )}
                  <div>
                    <p className="text-muted-foreground">Category</p>
                    <p className="font-medium">{viewingHistoryBill.category}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Tracking Type</p>
                    <p className="font-medium">{viewingHistoryBill.historical_tracking_type || 'monthly'}</p>
                  </div>
                </div>
              </div>

              {/* Historical Entries */}
              {viewingHistoryBill.historical_values && viewingHistoryBill.historical_values.length > 0 ? (
                <div className="space-y-3">
                  <h4 className="text-base font-medium">Historical Entries ({viewingHistoryBill.historical_values.length} total)</h4>
                  <div className="space-y-2 max-h-80 overflow-y-auto">
                    {viewingHistoryBill.historical_values
                      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                      .map((entry, index) => (
                        <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                          <div className="flex items-center gap-4">
                            <div>
                              <p className="font-medium">{format(new Date(entry.date), 'MMM dd, yyyy')}</p>
                              <p className="text-sm text-muted-foreground">
                                {format(new Date(entry.date), 'EEEE')}
                              </p>
                            </div>
                            {entry.notes && (
                              <div className="text-sm text-muted-foreground max-w-xs">
                                <p className="truncate">{entry.notes}</p>
                              </div>
                            )}
                          </div>
                          <div className="text-right">
                            <p className="font-mono font-medium text-lg">
                              {formatCurrency(entry.amount)}
                            </p>
                            {index < viewingHistoryBill.historical_values.length - 1 && (
                              <p className="text-xs text-muted-foreground">
                                {(() => {
                                  const current = entry.amount;
                                  const previous = viewingHistoryBill.historical_values[index + 1].amount;
                                  const change = current - previous;
                                  const changePercent = previous !== 0 ? (change / previous) * 100 : 0;
                                  
                                  if (Math.abs(changePercent) < 0.01) return "No change";
                                  
                                  return `${change >= 0 ? '+' : ''}${formatCurrency(change)} (${change >= 0 ? '+' : ''}${changePercent.toFixed(1)}%)`;
                                })()}
                              </p>
                            )}
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <History className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p>No historical data available for this bill</p>
                </div>
              )}

              <div className="flex justify-end">
                <Button
                  variant="outline"
                  onClick={() => setHistoryDialogOpen(false)}
                  className="text-base"
                >
                  Close
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};