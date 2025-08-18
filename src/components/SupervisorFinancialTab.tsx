import { useState, useEffect } from "react";
import { DollarSign, Plus, Receipt, Users, Calendar, Trash2 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

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

interface SupervisorFinancialTabProps {
  organizationId: string;
}

export const SupervisorFinancialTab = ({ organizationId }: SupervisorFinancialTabProps) => {
  const { toast } = useToast();
  
  const [receipts, setReceipts] = useState<ReceiptData[]>([]);
  const [familyGroups, setFamilyGroups] = useState<FamilyGroup[]>([]);
  const [loading, setLoading] = useState(false);
  const [showAddExpense, setShowAddExpense] = useState(false);
  
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [familyGroup, setFamilyGroup] = useState("");

  const fetchData = async () => {
    if (!organizationId) return;

    try {
      const [receiptsResponse, familyGroupsResponse] = await Promise.all([
        supabase
          .from('receipts')
          .select('*')
          .eq('organization_id', organizationId)
          .order('created_at', { ascending: false }),
        supabase
          .from('family_groups')
          .select('id, name')
          .eq('organization_id', organizationId)
          .order('name')
      ]);

      if (receiptsResponse.error) throw receiptsResponse.error;
      if (familyGroupsResponse.error) throw familyGroupsResponse.error;

      setReceipts(receiptsResponse.data || []);
      setFamilyGroups(familyGroupsResponse.data || []);
    } catch (error) {
      console.error('Error fetching financial data:', error);
      toast({
        title: "Error",
        description: "Failed to fetch financial data.",
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    fetchData();
  }, [organizationId]);

  const createReceipt = async () => {
    if (!description || !amount) {
      toast({
        title: "Error",
        description: "Please fill in description and amount.",
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
          description,
          amount: parseFloat(amount),
          date,
          family_group: familyGroup || undefined,
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
      setFamilyGroup("");
      setShowAddExpense(false);
      
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
    }
  };

  const totalExpenses = receipts.reduce((sum, receipt) => sum + receipt.amount, 0);

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Expenses</p>
                <p className="text-2xl font-bold">${totalExpenses.toFixed(2)}</p>
              </div>
              <DollarSign className="h-8 w-8 text-primary" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Receipts</p>
                <p className="text-2xl font-bold">{receipts.length}</p>
              </div>
              <Receipt className="h-8 w-8 text-primary" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Family Groups</p>
                <p className="text-2xl font-bold">{familyGroups.length}</p>
              </div>
              <Users className="h-8 w-8 text-primary" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Add Expense Form */}
      {showAddExpense && (
        <Card>
          <CardHeader>
            <CardTitle>Add New Receipt</CardTitle>
            <CardDescription>Record a new expense for this organization</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Input 
                  id="description" 
                  placeholder="Enter expense description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="text-base"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="amount">Amount</Label>
                <Input 
                  id="amount" 
                  type="number" 
                  placeholder="0.00"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="text-base"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="date">Date</Label>
                <Input 
                  id="date" 
                  type="date" 
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="text-base"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="familyGroup">Family Group (Optional)</Label>
                <Select value={familyGroup} onValueChange={setFamilyGroup}>
                  <SelectTrigger className="text-base">
                    <SelectValue placeholder="Select family group" />
                  </SelectTrigger>
                  <SelectContent>
                    {familyGroups.map((group) => (
                      <SelectItem key={group.id} value={group.name} className="text-base">
                        {group.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex justify-end space-x-2 mt-4">
              <Button variant="outline" onClick={() => setShowAddExpense(false)} className="text-base">
                Cancel
              </Button>
              <Button onClick={createReceipt} disabled={loading} className="text-base">
                {loading ? "Adding..." : "Add Receipt"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Receipts List */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center">
                <Receipt className="h-5 w-5 mr-2 text-primary" />
                Recent Receipts
              </CardTitle>
              <CardDescription className="text-base">Financial records for this organization</CardDescription>
            </div>
            <Button onClick={() => setShowAddExpense(true)} className="text-base">
              <Plus className="h-4 w-4 mr-2" />
              Add Receipt
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {receipts.map((receipt) => (
              <div key={receipt.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                <div className="flex-1">
                  <div className="flex items-center space-x-3">
                    <div className="h-10 w-10 bg-primary rounded-full flex items-center justify-center">
                      <Receipt className="h-5 w-5 text-primary-foreground" />
                    </div>
                    <div>
                      <div className="font-medium text-base">{receipt.description}</div>
                      <div className="text-sm text-muted-foreground flex items-center space-x-4">
                        <span className="flex items-center">
                          <Calendar className="h-3 w-3 mr-1" />
                          {receipt.date}
                        </span>
                        {receipt.family_group && <span>{receipt.family_group}</span>}
                      </div>
                    </div>
                  </div>
                </div>
                <div className="flex items-center space-x-4">
                  <div className="text-right">
                    <div className="text-lg font-bold">${receipt.amount.toFixed(2)}</div>
                  </div>
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
                        <AlertDialogCancel className="text-base">Cancel</AlertDialogCancel>
                        <AlertDialogAction 
                          onClick={() => deleteReceipt(receipt.id)}
                          className="text-base"
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
          {receipts.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              <Receipt className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="text-base">No receipts found for this organization</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};