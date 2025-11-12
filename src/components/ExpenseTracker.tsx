
import { useState, useMemo } from "react";
import { DollarSign, Plus, Receipt, Users, Calendar, Trash2, X } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useReceipts } from "@/hooks/useReceipts";
import { useFamilyGroups } from "@/hooks/useFamilyGroups";
import { EmptyState } from "@/components/ui/empty-state";

export const ExpenseTracker = () => {
  const [showAddExpense, setShowAddExpense] = useState(false);
  const { receipts, createReceipt, deleteReceipt, loading } = useReceipts();
  const { familyGroups } = useFamilyGroups();
  
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("");
  const [familyGroup, setFamilyGroup] = useState("");

  // Filter and sort state
  const [selectedFamilyGroup, setSelectedFamilyGroup] = useState<string>("all");
  const [sortBy, setSortBy] = useState<"date" | "amount" | "family_group">("date");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [searchTerm, setSearchTerm] = useState("");

  // Filtered and sorted receipts
  const filteredAndSortedReceipts = useMemo(() => {
    let filtered = receipts;

    // Family group filter
    if (selectedFamilyGroup !== "all") {
      filtered = filtered.filter(r => r.family_group === selectedFamilyGroup);
    }

    // Search filter
    if (searchTerm.trim()) {
      filtered = filtered.filter(r => 
        r.description?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Sorting
    const sorted = [...filtered].sort((a, b) => {
      let comparison = 0;
      
      switch (sortBy) {
        case "date":
          comparison = new Date(a.date).getTime() - new Date(b.date).getTime();
          break;
        case "amount":
          comparison = a.amount - b.amount;
          break;
        case "family_group":
          comparison = (a.family_group || "").localeCompare(b.family_group || "");
          break;
      }
      
      return sortOrder === "asc" ? comparison : -comparison;
    });

    return sorted;
  }, [receipts, selectedFamilyGroup, searchTerm, sortBy, sortOrder]);

  const totalExpenses = filteredAndSortedReceipts.reduce((sum, receipt) => sum + receipt.amount, 0);
  const receiptCount = filteredAndSortedReceipts.length;

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
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-caption text-muted-foreground">Total Expenses</p>
                <p className="text-heading-3 text-foreground">${totalExpenses.toFixed(2)}</p>
              </div>
              <DollarSign className="h-8 w-8 text-primary" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-caption text-muted-foreground">Receipt Count</p>
                <p className="text-heading-3 text-foreground">{receiptCount}</p>
              </div>
              <Receipt className="h-8 w-8 text-primary" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-caption text-muted-foreground">Family Groups</p>
                <p className="text-heading-3 text-foreground">{familyGroups.length}</p>
              </div>
              <Users className="h-8 w-8 text-primary" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-caption text-muted-foreground">
                  {selectedFamilyGroup !== "all" ? "Filtered" : "All Records"}
                </p>
                <p className="text-heading-3 text-success">
                  {selectedFamilyGroup !== "all" ? "Active" : "Viewing All"}
                </p>
              </div>
              <Badge className={selectedFamilyGroup !== "all" ? "bg-success" : "bg-muted"}>
                {selectedFamilyGroup !== "all" ? "Filtered" : "All"}
              </Badge>
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

      {/* Filter and Sort Controls */}
      <Card>
        <CardHeader>
          <CardTitle className="text-heading-4">Filters & Sorting</CardTitle>
          <CardDescription>Refine your expense view</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Family Group Filter */}
            <div className="space-y-2">
              <Label htmlFor="family-filter">Family Group</Label>
              <Select value={selectedFamilyGroup} onValueChange={setSelectedFamilyGroup}>
                <SelectTrigger id="family-filter">
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

            {/* Sort By */}
            <div className="space-y-2">
              <Label htmlFor="sort-by">Sort By</Label>
              <Select value={sortBy} onValueChange={(val) => setSortBy(val as any)}>
                <SelectTrigger id="sort-by">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="date">Date</SelectItem>
                  <SelectItem value="amount">Amount</SelectItem>
                  <SelectItem value="family_group">Family Group</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Sort Order */}
            <div className="space-y-2">
              <Label htmlFor="sort-order">Order</Label>
              <Select value={sortOrder} onValueChange={(val) => setSortOrder(val as any)}>
                <SelectTrigger id="sort-order">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="desc">Newest First</SelectItem>
                  <SelectItem value="asc">Oldest First</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Search */}
            <div className="space-y-2">
              <Label htmlFor="search">Search</Label>
              <Input
                id="search"
                placeholder="Search descriptions..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>

          {/* Active Filters Display */}
          {(selectedFamilyGroup !== "all" || searchTerm) && (
            <div className="flex items-center gap-2 mt-4 pt-4 border-t">
              <span className="text-sm text-muted-foreground">Active filters:</span>
              {selectedFamilyGroup !== "all" && (
                <Badge variant="secondary" className="gap-1">
                  {selectedFamilyGroup}
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-4 w-4 p-0 hover:bg-transparent"
                    onClick={() => setSelectedFamilyGroup("all")}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </Badge>
              )}
              {searchTerm && (
                <Badge variant="secondary" className="gap-1">
                  "{searchTerm}"
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-4 w-4 p-0 hover:bg-transparent"
                    onClick={() => setSearchTerm("")}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </Badge>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSelectedFamilyGroup("all");
                  setSearchTerm("");
                }}
              >
                Clear All
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

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
          {filteredAndSortedReceipts.length === 0 ? (
            <EmptyState
              icon={<Receipt className="h-12 w-12" />}
              title="No receipts found"
              description={
                selectedFamilyGroup !== "all" || searchTerm
                  ? "No receipts match your current filters"
                  : "No expenses have been added yet"
              }
            />
          ) : (
            <div className="space-y-4">
              {filteredAndSortedReceipts.map((receipt) => (
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
                          {receipt.family_group && (
                            <Badge variant="outline" className="font-normal">
                              <Users className="h-3 w-3 mr-1" />
                              {receipt.family_group}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-4">
                    <div className="text-right">
                      <div className="text-heading-4">${receipt.amount.toFixed(2)}</div>
                    </div>
                    {receipt.image_url && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => window.open(receipt.image_url, '_blank')}
                      >
                        <Receipt className="h-4 w-4" />
                      </Button>
                    )}
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
          )}
        </CardContent>
      </Card>
    </div>
  );
};
