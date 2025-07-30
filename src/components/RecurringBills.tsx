import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useOrganization } from "@/hooks/useOrganization";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { EmptyState } from "@/components/ui/empty-state";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Plus, Calendar, Phone, CreditCard, Trash2, Edit, Save, X } from "lucide-react";

interface RecurringBill {
  id: string;
  name: string;
  category: string;
  due_date?: string;
  account_number?: string;
  phone_number?: string;
  website?: string;
  amount?: number;
  frequency: 'monthly' | 'quarterly' | 'annually' | 'custom';
  notes?: string;
  organization_id: string;
  created_at: string;
  updated_at: string;
}

const defaultBills = [
  { name: "Property Taxes", category: "taxes", frequency: "annually" as const },
  { name: "Propane Tank Filling", category: "utilities", frequency: "custom" as const },
  { name: "Property Insurance", category: "insurance", frequency: "annually" as const },
  { name: "Cabin Property Lease", category: "property", frequency: "monthly" as const },
  { name: "Telephone Bill", category: "utilities", frequency: "monthly" as const },
  { name: "Electric Bill", category: "utilities", frequency: "monthly" as const },
  { name: "Internet Service", category: "utilities", frequency: "monthly" as const },
  { name: "Water/Sewer", category: "utilities", frequency: "monthly" as const },
  { name: "Trash Collection", category: "utilities", frequency: "monthly" as const },
  { name: "Home Security", category: "security", frequency: "monthly" as const },
];

export const RecurringBills = () => {
  const { user } = useAuth();
  const { organization } = useOrganization();
  const { toast } = useToast();
  const [bills, setBills] = useState<RecurringBill[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);

  const [formData, setFormData] = useState({
    name: "",
    category: "",
    due_date: "",
    account_number: "",
    phone_number: "",
    website: "",
    amount: "",
    frequency: "monthly" as const,
    notes: "",
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
        .order('category', { ascending: true });

      if (error) throw error;
      setBills((data || []) as RecurringBill[]);
    } catch (error) {
      console.error('Error fetching recurring bills:', error);
      toast({
        title: "Error",
        description: "Failed to load recurring bills",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (billData: any, isNew = false) => {
    if (!organization?.id) return;

    try {
      const dataToSave = {
        name: billData.name,
        category: billData.category,
        due_date: billData.due_date || null,
        account_number: billData.account_number || null,
        phone_number: billData.phone_number || null,
        website: billData.website || null,
        amount: billData.amount ? parseFloat(billData.amount.toString()) : null,
        frequency: billData.frequency,
        notes: billData.notes || null,
        organization_id: organization.id,
      };

      if (isNew) {
        const { error } = await supabase
          .from('recurring_bills')
          .insert([dataToSave]);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('recurring_bills')
          .update(dataToSave)
          .eq('id', billData.id);
        if (error) throw error;
      }

      toast({
        title: "Success",
        description: `Recurring bill ${isNew ? 'added' : 'updated'} successfully`,
      });

      fetchBills();
      setEditingId(null);
      setShowAddForm(false);
      resetForm();
    } catch (error) {
      console.error('Error saving recurring bill:', error);
      toast({
        title: "Error",
        description: "Failed to save recurring bill",
        variant: "destructive",
      });
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase
        .from('recurring_bills')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Recurring bill deleted successfully",
      });

      fetchBills();
    } catch (error) {
      console.error('Error deleting recurring bill:', error);
      toast({
        title: "Error",
        description: "Failed to delete recurring bill",
        variant: "destructive",
      });
    }
  };

  const resetForm = () => {
    setFormData({
      name: "",
      category: "",
      due_date: "",
      account_number: "",
      phone_number: "",
      website: "",
      amount: "",
      frequency: "monthly",
      notes: "",
    });
  };

  const addDefaultBills = async () => {
    if (!organization?.id) return;

    try {
      const billsToAdd = defaultBills.map(bill => ({
        ...bill,
        organization_id: organization.id,
        due_date: "",
        account_number: "",
        phone_number: "",
        website: "",
        amount: null,
        notes: "",
      }));

      const { error } = await supabase
        .from('recurring_bills')
        .insert(billsToAdd);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Default recurring bills added successfully",
      });

      fetchBills();
    } catch (error) {
      console.error('Error adding default bills:', error);
      toast({
        title: "Error",
        description: "Failed to add default bills",
        variant: "destructive",
      });
    }
  };

  const getCategoryColor = (category: string) => {
    const colors: Record<string, string> = {
      taxes: "bg-red-100 text-red-700",
      utilities: "bg-blue-100 text-blue-700",
      insurance: "bg-green-100 text-green-700",
      property: "bg-purple-100 text-purple-700",
      security: "bg-orange-100 text-orange-700",
    };
    return colors[category] || "bg-gray-100 text-gray-700";
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <LoadingSpinner size="lg" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Recurring Bills</h2>
          <p className="text-muted-foreground">
            Manage recurring bills and important account information
          </p>
        </div>
        <div className="flex gap-2">
          {bills.length === 0 && (
            <Button onClick={addDefaultBills} variant="outline">
              Add Default Bills
            </Button>
          )}
          <Button onClick={() => setShowAddForm(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Bill
          </Button>
        </div>
      </div>

      {bills.length === 0 && !showAddForm ? (
        <EmptyState
          icon={<Calendar className="h-12 w-12" />}
          title="No recurring bills found"
          description="Add your recurring bills to track important account information and due dates."
        />
      ) : (
        <div className="grid gap-4">
          {showAddForm && (
            <BillForm
              data={formData}
              onChange={setFormData}
              onSave={() => handleSave(formData, true)}
              onCancel={() => {
                setShowAddForm(false);
                resetForm();
              }}
              isNew
            />
          )}
          
          {bills.map((bill) => (
            <BillCard
              key={bill.id}
              bill={bill}
              isEditing={editingId === bill.id}
              onEdit={() => setEditingId(bill.id)}
              onSave={(data) => handleSave({ ...bill, ...data })}
              onCancel={() => setEditingId(null)}
              onDelete={() => handleDelete(bill.id)}
              getCategoryColor={getCategoryColor}
            />
          ))}
        </div>
      )}
    </div>
  );
};

interface BillFormProps {
  data: any;
  onChange: (data: any) => void;
  onSave: () => void;
  onCancel: () => void;
  isNew?: boolean;
}

const BillForm = ({ data, onChange, onSave, onCancel, isNew = false }: BillFormProps) => {
  return (
    <Card className="border-dashed">
      <CardHeader>
        <CardTitle className="text-lg">
          {isNew ? "Add New Recurring Bill" : "Edit Recurring Bill"}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="name">Bill Name</Label>
            <Input
              id="name"
              value={data.name}
              onChange={(e) => onChange({ ...data, name: e.target.value })}
              placeholder="e.g., Electric Bill"
            />
          </div>
          <div>
            <Label htmlFor="category">Category</Label>
            <Select
              value={data.category}
              onValueChange={(value) => onChange({ ...data, category: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="utilities">Utilities</SelectItem>
                <SelectItem value="taxes">Taxes</SelectItem>
                <SelectItem value="insurance">Insurance</SelectItem>
                <SelectItem value="property">Property</SelectItem>
                <SelectItem value="security">Security</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="due_date">Due Date</Label>
            <Input
              id="due_date"
              value={data.due_date}
              onChange={(e) => onChange({ ...data, due_date: e.target.value })}
              placeholder="e.g., 15th of month or 12/31"
            />
          </div>
          <div>
            <Label htmlFor="frequency">Frequency</Label>
            <Select
              value={data.frequency}
              onValueChange={(value) => onChange({ ...data, frequency: value })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="monthly">Monthly</SelectItem>
                <SelectItem value="quarterly">Quarterly</SelectItem>
                <SelectItem value="annually">Annually</SelectItem>
                <SelectItem value="custom">Custom</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="account_number">Account Number</Label>
            <Input
              id="account_number"
              value={data.account_number}
              onChange={(e) => onChange({ ...data, account_number: e.target.value })}
              placeholder="Account number"
            />
          </div>
          <div>
            <Label htmlFor="phone_number">Phone Number</Label>
            <Input
              id="phone_number"
              value={data.phone_number}
              onChange={(e) => onChange({ ...data, phone_number: e.target.value })}
              placeholder="Customer service phone"
            />
          </div>
          <div>
            <Label htmlFor="website">Website</Label>
            <Input
              id="website"
              value={data.website}
              onChange={(e) => onChange({ ...data, website: e.target.value })}
              placeholder="Company website"
            />
          </div>
          <div>
            <Label htmlFor="amount">Typical Amount</Label>
            <Input
              id="amount"
              type="number"
              step="0.01"
              value={data.amount}
              onChange={(e) => onChange({ ...data, amount: e.target.value })}
              placeholder="Monthly/yearly amount"
            />
          </div>
        </div>
        <div>
          <Label htmlFor="notes">Notes</Label>
          <Textarea
            id="notes"
            value={data.notes}
            onChange={(e) => onChange({ ...data, notes: e.target.value })}
            placeholder="Additional notes or reminders..."
            rows={3}
          />
        </div>
        <div className="flex gap-2">
          <Button onClick={onSave}>
            <Save className="h-4 w-4 mr-2" />
            Save
          </Button>
          <Button onClick={onCancel} variant="outline">
            <X className="h-4 w-4 mr-2" />
            Cancel
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

interface BillCardProps {
  bill: RecurringBill;
  isEditing: boolean;
  onEdit: () => void;
  onSave: (data: any) => void;
  onCancel: () => void;
  onDelete: () => void;
  getCategoryColor: (category: string) => string;
}

const BillCard = ({ 
  bill, 
  isEditing, 
  onEdit, 
  onSave, 
  onCancel, 
  onDelete, 
  getCategoryColor 
}: BillCardProps) => {
  const [editData, setEditData] = useState(bill);

  if (isEditing) {
    return (
      <BillForm
        data={editData}
        onChange={setEditData}
        onSave={() => onSave(editData)}
        onCancel={onCancel}
      />
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <CardTitle className="text-lg">{bill.name}</CardTitle>
            <Badge className={getCategoryColor(bill.category)}>
              {bill.category}
            </Badge>
            <Badge variant="outline">
              {bill.frequency}
            </Badge>
          </div>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={onEdit}>
              <Edit className="h-4 w-4" />
            </Button>
            <Button size="sm" variant="outline" onClick={onDelete}>
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-2">
            {bill.due_date && (
              <div className="flex items-center gap-2 text-sm">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span>Due: {bill.due_date}</span>
              </div>
            )}
            {bill.amount && (
              <div className="flex items-center gap-2 text-sm">
                <span className="font-medium">
                  ${Number(bill.amount).toLocaleString()}
                </span>
                <span className="text-muted-foreground">/ {bill.frequency}</span>
              </div>
            )}
          </div>
          <div className="space-y-2">
            {bill.account_number && (
              <div className="flex items-center gap-2 text-sm">
                <CreditCard className="h-4 w-4 text-muted-foreground" />
                <span className="font-mono">{bill.account_number}</span>
              </div>
            )}
            {bill.phone_number && (
              <div className="flex items-center gap-2 text-sm">
                <Phone className="h-4 w-4 text-muted-foreground" />
                <span>{bill.phone_number}</span>
              </div>
            )}
          </div>
          <div className="space-y-2">
            {bill.website && (
              <div className="text-sm">
                <a
                  href={bill.website.startsWith('http') ? bill.website : `https://${bill.website}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline"
                >
                  {bill.website}
                </a>
              </div>
            )}
            {bill.notes && (
              <div className="text-sm text-muted-foreground">
                {bill.notes}
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};