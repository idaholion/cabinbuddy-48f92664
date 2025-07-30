import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Plus, Receipt, Trash2 } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";

interface ReceiptData {
  id: string;
  description: string;
  amount: number;
  date: string;
  family_group?: string;
  image_url?: string;
  created_at: string;
}

interface FamilyGroup {
  id: string;
  name: string;
}

const SupervisorOrganizationFinancial = () => {
  const { organizationId } = useParams<{ organizationId: string }>();
  const { toast } = useToast();
  const navigate = useNavigate();
  
  const [receipts, setReceipts] = useState<ReceiptData[]>([]);
  const [familyGroups, setFamilyGroups] = useState<FamilyGroup[]>([]);
  const [loading, setLoading] = useState(false);
  
  // New receipt form
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedFamilyGroup, setSelectedFamilyGroup] = useState("");

  const fetchData = async () => {
    if (!organizationId) return;

    try {
      const [receiptsRes, familyGroupsRes] = await Promise.all([
        supabase
          .from('receipts')
          .select('*')
          .eq('organization_id', organizationId)
          .order('date', { ascending: false }),
        supabase
          .from('family_groups')
          .select('id, name')
          .eq('organization_id', organizationId)
          .order('name')
      ]);

      if (receiptsRes.error) throw receiptsRes.error;
      if (familyGroupsRes.error) throw familyGroupsRes.error;

      setReceipts(receiptsRes.data || []);
      setFamilyGroups(familyGroupsRes.data || []);
    } catch (error) {
      console.error('Error fetching data:', error);
    }
  };

  useEffect(() => {
    fetchData();
  }, [organizationId]);

  const createReceipt = async () => {
    if (!organizationId || !description.trim() || !amount) {
      toast({
        title: "Error",
        description: "Please fill in all required fields.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from('receipts')
        .insert({
          organization_id: organizationId,
          description: description.trim(),
          amount: parseFloat(amount),
          date,
          family_group: selectedFamilyGroup === "none" ? undefined : selectedFamilyGroup || undefined,
        });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Receipt added successfully!",
      });

      // Reset form
      setDescription("");
      setAmount("");
      setDate(new Date().toISOString().split('T')[0]);
      setSelectedFamilyGroup("");
      fetchData();
    } catch (error) {
      console.error('Error creating receipt:', error);
      toast({
        title: "Error",
        description: "Failed to add receipt.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const deleteReceipt = async (receiptId: string) => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from('receipts')
        .delete()
        .eq('id', receiptId)
        .eq('organization_id', organizationId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Receipt deleted successfully!",
      });

      fetchData();
    } catch (error) {
      console.error('Error deleting receipt:', error);
      toast({
        title: "Error",
        description: "Failed to delete receipt.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const totalExpenses = receipts.reduce((sum, receipt) => sum + receipt.amount, 0);

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => navigate('/supervisor')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Organizations
          </Button>
        </div>

        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold">Financial Management</h1>
          <p className="text-muted-foreground">Manage receipts and expenses for this organization</p>
        </div>

        {/* Summary Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Receipt className="h-5 w-5" />
              Financial Summary
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="text-center p-4 border rounded-lg">
                <div className="text-2xl font-bold">{receipts.length}</div>
                <div className="text-sm text-muted-foreground">Total Receipts</div>
              </div>
              <div className="text-center p-4 border rounded-lg">
                <div className="text-2xl font-bold">${totalExpenses.toFixed(2)}</div>
                <div className="text-sm text-muted-foreground">Total Expenses</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Add New Receipt */}
        <Card>
          <CardHeader>
            <CardTitle>Add New Receipt</CardTitle>
            <CardDescription>Record a new expense for this organization</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Input
                  id="description"
                  placeholder="Enter expense description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="amount">Amount ($)</Label>
                <Input
                  id="amount"
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="date">Date</Label>
                <Input
                  id="date"
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="familyGroup">Family Group (Optional)</Label>
                <Select value={selectedFamilyGroup} onValueChange={setSelectedFamilyGroup}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select family group" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No family group</SelectItem>
                    {familyGroups.map((group) => (
                      <SelectItem key={group.id} value={group.name}>
                        {group.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <Button onClick={createReceipt} disabled={loading} className="w-full">
              <Plus className="h-4 w-4 mr-2" />
              {loading ? "Adding..." : "Add Receipt"}
            </Button>
          </CardContent>
        </Card>

        {/* Receipts List */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Receipts ({receipts.length})</CardTitle>
            <CardDescription>All receipts and expenses for this organization</CardDescription>
          </CardHeader>
          <CardContent>
            {receipts.length > 0 ? (
              <div className="space-y-3">
                {receipts.map((receipt) => (
                  <div key={receipt.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex-1">
                      <div className="font-medium">{receipt.description}</div>
                      <div className="text-sm text-muted-foreground">
                        {new Date(receipt.date).toLocaleDateString()}
                        {receipt.family_group && ` • ${receipt.family_group}`}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="font-bold">${receipt.amount.toFixed(2)}</div>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete Receipt</AlertDialogTitle>
                            <AlertDialogDescription>
                              Are you sure you want to delete this receipt? This action cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => deleteReceipt(receipt.id)}
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            >
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground text-center py-4">
                No receipts found. Add one above to get started.
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default SupervisorOrganizationFinancial;