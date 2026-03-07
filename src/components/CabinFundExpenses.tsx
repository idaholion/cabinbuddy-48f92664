import { useState, useMemo } from "react";
import { DollarSign, Plus, Trash2, Download, Calendar, X } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { EmptyState } from "@/components/ui/empty-state";
import { useReceipts } from "@/hooks/useReceipts";
import { format } from "date-fns";
import { parseDateOnly } from "@/lib/date-utils";

const CABIN_FUND_MARKER = "Cabin Fund";

const CATEGORIES = [
  "Maintenance",
  "Supplies",
  "Repairs",
  "Improvements",
  "Administrative",
  "Utilities",
  "Insurance",
  "Other",
];

export const CabinFundExpenses = () => {
  const { receipts, createReceipt, deleteReceipt, loading } = useReceipts();
  const [showAddForm, setShowAddForm] = useState(false);

  // Form state
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("");
  const [paidBy, setPaidBy] = useState("");
  const [notes, setNotes] = useState("");
  const [expenseDate, setExpenseDate] = useState(new Date().toISOString().split("T")[0]);

  // Filter state
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState("");

  // Filter cabin fund receipts
  const cabinFundReceipts = useMemo(() => {
    return receipts.filter((r) => r.family_group === CABIN_FUND_MARKER);
  }, [receipts]);

  // Available years
  const availableYears = useMemo(() => {
    const years = new Set(
      cabinFundReceipts.map((r) => new Date(r.date).getFullYear())
    );
    years.add(new Date().getFullYear());
    return Array.from(years).sort((a, b) => b - a);
  }, [cabinFundReceipts]);

  // Filtered receipts
  const filteredReceipts = useMemo(() => {
    let filtered = cabinFundReceipts.filter(
      (r) => new Date(r.date).getFullYear() === selectedYear
    );

    if (selectedCategory !== "all") {
      filtered = filtered.filter((r) =>
        r.description?.toLowerCase().startsWith(`[${selectedCategory.toLowerCase()}]`)
      );
    }

    if (searchTerm.trim()) {
      filtered = filtered.filter((r) =>
        r.description?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    return filtered.sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );
  }, [cabinFundReceipts, selectedYear, selectedCategory, searchTerm]);

  const totalForYear = filteredReceipts.reduce((sum, r) => sum + r.amount, 0);

  const handleAdd = async () => {
    if (!description || !amount || !category) return;

    // Encode category and paid-by into description for storage
    const fullDescription = `[${category}] ${description}${paidBy ? ` (Paid by: ${paidBy})` : ""}${notes ? ` — ${notes}` : ""}`;

    await createReceipt({
      description: fullDescription,
      amount: parseFloat(amount),
      date: expenseDate,
      family_group: CABIN_FUND_MARKER,
    });

    // Reset form
    setDescription("");
    setAmount("");
    setCategory("");
    setPaidBy("");
    setNotes("");
    setExpenseDate(new Date().toISOString().split("T")[0]);
    setShowAddForm(false);
  };

  const exportCSV = () => {
    const csvContent = [
      ["Date", "Category", "Description", "Amount"],
      ...filteredReceipts.map((r) => [
        r.date || "",
        "",
        r.description || "",
        (r.amount || 0).toString(),
      ]),
    ]
      .map((row) => row.join(","))
      .join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `cabin-fund-expenses-${selectedYear}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  // Extract category from description like "[Maintenance] ..."
  const extractCategory = (desc: string) => {
    const match = desc?.match(/^\[([^\]]+)\]/);
    return match ? match[1] : "Other";
  };

  // Extract clean description (without category prefix)
  const extractCleanDescription = (desc: string) => {
    return desc?.replace(/^\[[^\]]+\]\s*/, "") || desc;
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold">General Expenses</h2>
          <p className="text-muted-foreground text-base">
            Organization-level expenses that offset cabin fees
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={exportCSV} disabled={filteredReceipts.length === 0}>
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
          <Button onClick={() => setShowAddForm(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Expense
          </Button>
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Year</p>
                <Select
                  value={selectedYear.toString()}
                  onValueChange={(v) => setSelectedYear(parseInt(v))}
                >
                  <SelectTrigger className="w-28 mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {availableYears.map((y) => (
                      <SelectItem key={y} value={y.toString()}>
                        {y}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Calendar className="h-8 w-8 text-primary" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Cabin Fund Expenses</p>
                <p className="text-2xl font-bold">${totalForYear.toFixed(2)}</p>
              </div>
              <DollarSign className="h-8 w-8 text-primary" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Expense Count</p>
                <p className="text-2xl font-bold">{filteredReceipts.length}</p>
              </div>
              <Badge variant="secondary">{selectedYear}</Badge>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Add Form */}
      {showAddForm && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Add Cabin Fund Expense</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Category *</Label>
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((cat) => (
                      <SelectItem key={cat} value={cat}>
                        {cat}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Amount *</Label>
                <Input
                  type="number"
                  placeholder="0.00"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Description *</Label>
                <Input
                  placeholder="What was this expense for?"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Date</Label>
                <Input
                  type="date"
                  value={expenseDate}
                  onChange={(e) => setExpenseDate(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Paid By</Label>
                <Input
                  placeholder="e.g. Admin, Contractor name"
                  value={paidBy}
                  onChange={(e) => setPaidBy(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Notes</Label>
                <Textarea
                  placeholder="Additional context..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="min-h-[40px]"
                />
              </div>
            </div>
            <div className="flex justify-end space-x-2 mt-4">
              <Button variant="outline" onClick={() => setShowAddForm(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleAdd}
                disabled={loading || !description || !amount || !category}
              >
                {loading ? "Adding..." : "Add Expense"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-4 items-end">
        <div className="space-y-1">
          <Label className="text-xs">Category</Label>
          <Select value={selectedCategory} onValueChange={setSelectedCategory}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="All" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {CATEGORIES.map((cat) => (
                <SelectItem key={cat} value={cat}>
                  {cat}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1 flex-1 min-w-[200px]">
          <Label className="text-xs">Search</Label>
          <Input
            placeholder="Search descriptions..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        {(selectedCategory !== "all" || searchTerm) && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setSelectedCategory("all");
              setSearchTerm("");
            }}
          >
            <X className="h-3 w-3 mr-1" />
            Clear
          </Button>
        )}
      </div>

      {/* Expenses List */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Cabin Fund Expenses — {selectedYear}</CardTitle>
          <CardDescription>
            Organization-level expenses paid from the shared cabin fund
          </CardDescription>
        </CardHeader>
        <CardContent>
          {filteredReceipts.length === 0 ? (
            <EmptyState
              icon={<DollarSign className="h-12 w-12" />}
              title="No cabin fund expenses"
              description={
                selectedCategory !== "all" || searchTerm
                  ? "No expenses match your current filters"
                  : `No cabin fund expenses recorded for ${selectedYear}`
              }
            />
          ) : (
            <div className="space-y-3">
              {filteredReceipts.map((receipt) => (
                <div
                  key={receipt.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant="outline" className="text-xs">
                        {extractCategory(receipt.description)}
                      </Badge>
                      <span className="text-sm text-muted-foreground flex items-center">
                        <Calendar className="h-3 w-3 mr-1" />
                        {(() => {
                          const date = parseDateOnly(receipt.date);
                          return isNaN(date.getTime())
                            ? receipt.date
                            : format(date, "MMM d, yyyy");
                        })()}
                      </span>
                    </div>
                    <div className="font-medium">
                      {extractCleanDescription(receipt.description)}
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-lg font-bold">
                      ${receipt.amount.toFixed(2)}
                    </div>
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
