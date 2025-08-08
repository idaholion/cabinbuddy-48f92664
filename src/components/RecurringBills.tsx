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
import { Plus, Edit, Trash2, Calendar, DollarSign, Phone, Globe, FileText } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import { format } from "date-fns";

interface RecurringBill {
  id: string;
  name: string;
  amount: number | null;
  category: string;
  frequency: string;
  due_date: string | null;
  account_number: string | null;
  phone_number: string | null;
  website: string | null;
  notes: string | null;
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
  "Other"
];

const FREQUENCIES = [
  "monthly",
  "quarterly",
  "annually",
  "bi-annually"
];

export const RecurringBills = () => {
  const { organization } = useOrganization();
  const [bills, setBills] = useState<RecurringBill[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingBill, setEditingBill] = useState<RecurringBill | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    amount: "",
    category: "",
    frequency: "monthly",
    due_date: "",
    account_number: "",
    phone_number: "",
    website: "",
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
      setBills(data || []);
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
      amount: "",
      category: "",
      frequency: "monthly",
      due_date: "",
      account_number: "",
      phone_number: "",
      website: "",
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
        amount: formData.amount ? parseFloat(formData.amount) : null,
        category: formData.category,
        frequency: formData.frequency,
        due_date: formData.due_date || null,
        account_number: formData.account_number || null,
        phone_number: formData.phone_number || null,
        website: formData.website || null,
        notes: formData.notes || null,
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
      amount: bill.amount?.toString() || "",
      category: bill.category,
      frequency: bill.frequency,
      due_date: bill.due_date || "",
      account_number: bill.account_number || "",
      phone_number: bill.phone_number || "",
      website: bill.website || "",
      notes: bill.notes || ""
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
      case 'bi-annually': return 'bg-orange-100 text-orange-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const totalMonthlyEstimate = bills.reduce((total, bill) => {
    if (!bill.amount) return total;
    switch (bill.frequency) {
      case 'monthly': return total + bill.amount;
      case 'quarterly': return total + (bill.amount / 3);
      case 'annually': return total + (bill.amount / 12);
      case 'bi-annually': return total + (bill.amount / 6);
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
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle className="text-base">
                {editingBill ? 'Edit Recurring Bill' : 'Add New Recurring Bill'}
              </DialogTitle>
              <DialogDescription className="text-base">
                Enter the details for this recurring bill or expense.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="name" className="text-base">Bill Name *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g., Electricity Bill"
                    required
                    className="text-base placeholder:text-base"
                  />
                </div>
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
                  <Label htmlFor="due_date" className="text-base">Due Date (day of month)</Label>
                  <Input
                    id="due_date"
                    value={formData.due_date}
                    onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                    placeholder="e.g., 15th of month"
                    className="text-base placeholder:text-base"
                  />
                </div>
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
              </div>

              <div className="grid grid-cols-2 gap-4">
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

              <div className="flex justify-end gap-2">
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
            Estimated monthly recurring expenses
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
            <Card key={bill.id}>
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-semibold">{bill.name}</h3>
                      <Badge className={`${getFrequencyBadgeColor(bill.frequency)} text-base`}>
                        {bill.frequency}
                      </Badge>
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
    </div>
  );
};