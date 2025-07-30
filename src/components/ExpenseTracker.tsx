
import { useState } from "react";
import { DollarSign, Plus, Receipt, Users, Calendar, Trash2 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useReceipts } from "@/hooks/useReceipts";
import { useFamilyGroups } from "@/hooks/useFamilyGroups";

export const ExpenseTracker = () => {
  const [showAddExpense, setShowAddExpense] = useState(false);
  const { receipts, createReceipt, deleteReceipt, loading } = useReceipts();
  const { familyGroups } = useFamilyGroups();
  
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("");
  const [familyGroup, setFamilyGroup] = useState("");

  const totalExpenses = receipts.reduce((sum, receipt) => sum + receipt.amount, 0);
  const pendingExpenses = totalExpenses; // All receipts are pending for now

  const categories = ["Maintenance", "Utilities", "Cleaning", "Insurance", "Other"];

  const handleAddExpense = async () => {
    if (!description || !amount) return;

    await createReceipt({
      description,
      amount: parseFloat(amount),
      date: new Date().toISOString().split('T')[0],
      family_group: familyGroup || undefined,
    });

    // Reset form
    setDescription("");
    setAmount("");
    setCategory("");
    setFamilyGroup("");
    setShowAddExpense(false);
  };

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-caption text-muted-foreground">Total Expenses</p>
                <p className="text-heading-3 text-foreground">${totalExpenses}</p>
              </div>
              <DollarSign className="h-8 w-8 text-primary" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-caption text-muted-foreground">Pending</p>
                <p className="text-heading-3 text-warning">${pendingExpenses}</p>
              </div>
              <Receipt className="h-8 w-8 text-warning" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-caption text-muted-foreground">Settled</p>
                <p className="text-heading-3 text-success">${totalExpenses - pendingExpenses}</p>
              </div>
              <Users className="h-8 w-8 text-success" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Add Expense Form */}
      {showAddExpense && (
        <Card>
          <CardHeader>
            <CardTitle className="text-heading-4">Add New Expense</CardTitle>
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
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="category">Category</Label>
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((cat) => (
                      <SelectItem key={cat} value={cat.toLowerCase()}>
                        {cat}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="familyGroup">Family Group</Label>
                <Select value={familyGroup} onValueChange={setFamilyGroup}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select family group" />
                  </SelectTrigger>
                  <SelectContent>
                    {familyGroups.map((group) => (
                      <SelectItem key={group.id} value={group.name}>
                        {group.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex justify-end space-x-2 mt-4">
              <Button variant="outline" onClick={() => setShowAddExpense(false)}>
                Cancel
              </Button>
              <Button onClick={handleAddExpense} disabled={loading}>
                {loading ? "Adding..." : "Add Expense"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Expenses List */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-heading-4 flex items-center">
                <Receipt className="h-5 w-5 mr-2 text-primary" />
                Recent Expenses
              </CardTitle>
              <CardDescription>Track and split property expenses</CardDescription>
            </div>
            <Button onClick={() => setShowAddExpense(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Expense
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {receipts.map((receipt) => (
              <div key={receipt.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                <div className="flex-1">
                  <div className="flex items-center space-x-3">
                    <div className="h-10 w-10 bg-gradient-mountain rounded-full flex items-center justify-center">
                      <Receipt className="h-5 w-5 text-primary-foreground" />
                    </div>
                    <div>
                      <div className="text-body font-medium">{receipt.description}</div>
                      <div className="text-body-small text-muted-foreground flex items-center space-x-4">
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
                    <div className="text-heading-4">${receipt.amount}</div>
                  </div>
                  <Badge variant="secondary">
                    pending
                  </Badge>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => deleteReceipt(receipt.id)}
                    disabled={loading}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
