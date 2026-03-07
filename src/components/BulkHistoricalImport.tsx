import { useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Upload, FileSpreadsheet, CheckCircle2, AlertCircle, PlusCircle, ArrowRight } from "lucide-react";
import { toast } from "sonner";
import * as XLSX from "xlsx";

interface HistoricalValue {
  date: string;
  amount: number;
  notes?: string;
}

interface ExistingBill {
  id: string;
  name: string;
  category: string;
  historical_values?: HistoricalValue[] | null;
}

interface ParsedBillData {
  excelName: string;
  entries: { date: string; amount: number }[];
}

type MatchStatus = "exact" | "suggested" | "none";

interface BillMapping {
  excelName: string;
  matchStatus: MatchStatus;
  matchedBillId: string | null;
  matchedBillName: string | null;
  action: "map" | "create";
  entries: { date: string; amount: number }[];
}

interface BulkHistoricalImportProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  existingBills: ExistingBill[];
  organizationId: string;
  onImportComplete: () => void;
}

const CATEGORIES = [
  "Utilities", "Insurance", "Maintenance", "Property Management",
  "Internet", "Security", "Landscaping", "Cleaning",
  "Forest Service Lease", "Other"
];

export const BulkHistoricalImport = ({
  open, onOpenChange, existingBills, organizationId, onImportComplete
}: BulkHistoricalImportProps) => {
  const [step, setStep] = useState<"upload" | "mapping" | "importing">("upload");
  const [pasteData, setPasteData] = useState("");
  const [parsedBills, setParsedBills] = useState<ParsedBillData[]>([]);
  const [mappings, setMappings] = useState<BillMapping[]>([]);
  const [importing, setImporting] = useState(false);
  const [newBillCategories, setNewBillCategories] = useState<Record<string, string>>({});
  const fileInputRef = useRef<HTMLInputElement>(null);

  const resetState = () => {
    setStep("upload");
    setPasteData("");
    setParsedBills([]);
    setMappings([]);
    setImporting(false);
    setNewBillCategories({});
  };

  const handleClose = (open: boolean) => {
    if (!open) resetState();
    onOpenChange(open);
  };

  // Parse currency string like "-$2,877.90" or "$500" to number
  const parseCurrency = (value: string): number | null => {
    if (!value || !value.trim()) return null;
    const cleaned = value.replace(/[$,\s]/g, "");
    const num = parseFloat(cleaned);
    return isNaN(num) ? null : Math.abs(num);
  };

  // Parse date from various formats to YYYY-MM-DD
  const parseExcelDate = (value: string | number): string | null => {
    if (!value) return null;
    
    // Handle Excel serial date numbers
    if (typeof value === "number") {
      const date = XLSX.SSF.parse_date_code(value);
      if (date) {
        return `${date.y}-${String(date.m).padStart(2, "0")}-${String(date.d).padStart(2, "0")}`;
      }
      return null;
    }

    const str = String(value).trim();
    
    // MM/DD/YYYY or MM/DD/YY
    const slashMatch = str.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
    if (slashMatch) {
      const month = slashMatch[1].padStart(2, "0");
      const day = slashMatch[2].padStart(2, "0");
      let year = slashMatch[3];
      if (year.length === 2) {
        year = parseInt(year) > 50 ? `19${year}` : `20${year}`;
      }
      return `${year}-${month}-${day}`;
    }

    // Try standard date parsing
    const d = new Date(str);
    if (!isNaN(d.getTime())) {
      return d.toISOString().split("T")[0];
    }

    return null;
  };

  // Smart matching: find best match for an Excel bill name among existing bills
  const findMatch = (excelName: string): { status: MatchStatus; bill: ExistingBill | null } => {
    const normalized = excelName.toLowerCase().trim();
    
    // 1. Exact match (case-insensitive)
    const exact = existingBills.find(b => b.name.toLowerCase().trim() === normalized);
    if (exact) return { status: "exact", bill: exact };
    
    // 2. Containment match (either direction)
    const contained = existingBills.find(b => {
      const bn = b.name.toLowerCase().trim();
      return bn.includes(normalized) || normalized.includes(bn);
    });
    if (contained) return { status: "suggested", bill: contained };

    // 3. Word overlap match (at least 2 shared words or first word matches)
    const excelWords = normalized.split(/[\s\/]+/).filter(w => w.length > 2);
    let bestOverlap = { bill: null as ExistingBill | null, score: 0 };
    
    for (const bill of existingBills) {
      const billWords = bill.name.toLowerCase().split(/[\s\/]+/).filter(w => w.length > 2);
      const overlap = excelWords.filter(w => billWords.some(bw => bw.includes(w) || w.includes(bw))).length;
      if (overlap > bestOverlap.score && overlap >= 1) {
        bestOverlap = { bill, score: overlap };
      }
    }
    if (bestOverlap.bill && bestOverlap.score >= 1) {
      return { status: "suggested", bill: bestOverlap.bill };
    }

    return { status: "none", bill: null };
  };

  const processData = (data: (string | number)[][]) => {
    if (data.length < 2) {
      toast.error("Not enough data rows found");
      return;
    }

    // Find the header row with dates - scan first few rows
    let dateRowIndex = -1;
    let dateStartCol = -1;
    let dates: string[] = [];

    for (let rowIdx = 0; rowIdx < Math.min(5, data.length); rowIdx++) {
      const row = data[rowIdx];
      const parsedDates: { col: number; date: string }[] = [];
      
      for (let colIdx = 1; colIdx < row.length; colIdx++) {
        const parsed = parseExcelDate(row[colIdx]);
        if (parsed) parsedDates.push({ col: colIdx, date: parsed });
      }
      
      if (parsedDates.length >= 2) {
        dateRowIndex = rowIdx;
        dateStartCol = parsedDates[0].col;
        dates = parsedDates.map(d => d.date);
        break;
      }
    }

    if (dateRowIndex === -1 || dates.length === 0) {
      toast.error("Could not find date headers in the data. Expected dates across the top row.");
      return;
    }

    // Parse bill rows (rows after date header)
    const bills: ParsedBillData[] = [];
    
    for (let rowIdx = dateRowIndex + 1; rowIdx < data.length; rowIdx++) {
      const row = data[rowIdx];
      const billName = String(row[0] || "").trim();
      
      if (!billName || billName.toLowerCase() === "total" || billName.toLowerCase().includes("total")) continue;

      const entries: { date: string; amount: number }[] = [];
      
      for (let colIdx = 0; colIdx < dates.length; colIdx++) {
        const cellValue = row[dateStartCol + colIdx];
        const amount = parseCurrency(String(cellValue || ""));
        if (amount !== null && amount !== 0) {
          entries.push({ date: dates[colIdx], amount });
        }
      }

      if (entries.length > 0) {
        bills.push({ excelName: billName, entries });
      }
    }

    if (bills.length === 0) {
      toast.error("No bill data found. Check that bill names are in the first column.");
      return;
    }

    setParsedBills(bills);

    // Create mappings with smart matching
    const newMappings: BillMapping[] = bills.map(bill => {
      const match = findMatch(bill.excelName);
      return {
        excelName: bill.excelName,
        matchStatus: match.status,
        matchedBillId: match.bill?.id || null,
        matchedBillName: match.bill?.name || null,
        action: match.status !== "none" ? "map" as const : "create" as const,
        entries: bill.entries
      };
    });

    setMappings(newMappings);
    setStep("mapping");
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const arrayBuffer = await file.arrayBuffer();
      const workbook = XLSX.read(arrayBuffer, { type: "array" });
      const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
      const data = XLSX.utils.sheet_to_json(firstSheet, { header: 1, raw: true }) as (string | number)[][];
      processData(data);
    } catch (error) {
      console.error("Error reading Excel file:", error);
      toast.error("Failed to read Excel file. Please check the format.");
    }
    
    // Reset file input
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handlePasteImport = () => {
    if (!pasteData.trim()) {
      toast.error("Please paste data from Excel first");
      return;
    }

    const rows = pasteData.trim().split("\n").map(row => row.split("\t"));
    processData(rows);
  };

  const updateMapping = (index: number, billId: string) => {
    const updated = [...mappings];
    if (billId === "__create__") {
      updated[index] = {
        ...updated[index],
        action: "create",
        matchedBillId: null,
        matchedBillName: null,
        matchStatus: "none"
      };
    } else {
      const bill = existingBills.find(b => b.id === billId);
      if (bill) {
        updated[index] = {
          ...updated[index],
          action: "map",
          matchedBillId: bill.id,
          matchedBillName: bill.name,
          matchStatus: "exact"
        };
      }
    }
    setMappings(updated);
  };

  const handleImport = async () => {
    setImporting(true);
    let importedEntries = 0;
    let newBillsCreated = 0;
    let billsUpdated = 0;

    try {
      for (const mapping of mappings) {
        if (mapping.action === "map" && mapping.matchedBillId) {
          // Merge into existing bill
          const existingBill = existingBills.find(b => b.id === mapping.matchedBillId);
          const existingHistory: HistoricalValue[] = existingBill?.historical_values || [];
          const existingDates = new Set(existingHistory.map(h => h.date));

          const newEntries: HistoricalValue[] = mapping.entries
            .filter(e => !existingDates.has(e.date))
            .map(e => ({ date: e.date, amount: e.amount, notes: "Bulk Import" }));

          if (newEntries.length > 0) {
            const merged = [...existingHistory, ...newEntries]
              .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

            const { error } = await supabase
              .from("recurring_bills")
              .update({ historical_values: JSON.stringify(merged) })
              .eq("id", mapping.matchedBillId);

            if (error) throw error;
            importedEntries += newEntries.length;
            billsUpdated++;
          }
        } else if (mapping.action === "create") {
          // Create new bill with historical data
          const category = newBillCategories[mapping.excelName] || "Other";
          const historicalValues: HistoricalValue[] = mapping.entries.map(e => ({
            date: e.date, amount: e.amount, notes: "Bulk Import"
          }));

          const { error } = await supabase
            .from("recurring_bills")
            .insert([{
              name: mapping.excelName,
              organization_id: organizationId,
              category,
              frequency: "annually",
              historical_values: JSON.stringify(historicalValues),
              historical_tracking_type: "annually"
            }]);

          if (error) throw error;
          importedEntries += mapping.entries.length;
          newBillsCreated++;
        }
      }

      const parts = [`Imported ${importedEntries} entries`];
      if (billsUpdated > 0) parts.push(`updated ${billsUpdated} bills`);
      if (newBillsCreated > 0) parts.push(`created ${newBillsCreated} new bills`);
      toast.success(parts.join(", "));

      onImportComplete();
      handleClose(false);
    } catch (error) {
      console.error("Import error:", error);
      toast.error("Failed to import data. Please try again.");
    } finally {
      setImporting(false);
    }
  };

  const getStatusBadge = (mapping: BillMapping) => {
    if (mapping.action === "create") {
      return <Badge variant="outline" className="text-orange-600 border-orange-300 bg-orange-50"><PlusCircle className="h-3 w-3 mr-1" />Create New</Badge>;
    }
    switch (mapping.matchStatus) {
      case "exact":
        return <Badge variant="outline" className="text-green-600 border-green-300 bg-green-50"><CheckCircle2 className="h-3 w-3 mr-1" />Exact Match</Badge>;
      case "suggested":
        return <Badge variant="outline" className="text-yellow-600 border-yellow-300 bg-yellow-50"><AlertCircle className="h-3 w-3 mr-1" />Suggested</Badge>;
      default:
        return <Badge variant="outline" className="text-red-600 border-red-300 bg-red-50"><AlertCircle className="h-3 w-3 mr-1" />No Match</Badge>;
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto" onPointerDownOutside={(e) => e.preventDefault()} onInteractOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5" />
            Bulk Import Historical Data
          </DialogTitle>
          <DialogDescription>
            {step === "upload" && "Upload an Excel file or paste data to import historical bill amounts."}
            {step === "mapping" && "Review how Excel bill names map to your existing bills. Adjust as needed."}
            {step === "importing" && "Importing data..."}
          </DialogDescription>
        </DialogHeader>

        {step === "upload" && (
          <div className="space-y-6">
            {/* File upload */}
            <div className="space-y-2">
              <Label className="text-base font-medium">Upload Excel File (.xlsx)</Label>
              <div
                className="border-2 border-dashed rounded-lg p-8 text-center cursor-pointer hover:border-primary/50 transition-colors"
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">Click to select an Excel file</p>
                <p className="text-xs text-muted-foreground mt-1">Supports .xlsx and .xls files</p>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls"
                className="hidden"
                onChange={handleFileUpload}
              />
            </div>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">Or paste data</span>
              </div>
            </div>

            {/* Paste area */}
            <div className="space-y-2">
              <Label className="text-base font-medium">Paste from Excel</Label>
              <Textarea
                value={pasteData}
                onChange={(e) => setPasteData(e.target.value)}
                placeholder="Select cells in Excel, copy (Ctrl+C), then paste here (Ctrl+V)..."
                className="min-h-[150px] font-mono text-sm"
              />
              <Button onClick={handlePasteImport} disabled={!pasteData.trim()} className="w-full">
                <ArrowRight className="h-4 w-4 mr-2" />
                Parse Pasted Data
              </Button>
            </div>

            <div className="bg-muted/50 rounded-lg p-4 text-sm text-muted-foreground space-y-1">
              <p className="font-medium text-foreground">Expected format:</p>
              <p>• Bill names in the first column (e.g., "Lease", "Insurance")</p>
              <p>• Dates across the top row (e.g., 12/31/2012, 12/31/2013)</p>
              <p>• Amounts in the grid cells (e.g., -$2,877.90)</p>
            </div>
          </div>
        )}

        {step === "mapping" && (
          <div className="space-y-4">
            <div className="bg-muted/50 rounded-lg p-3 text-sm">
              Found <strong>{parsedBills.length}</strong> bills with data across <strong>{parsedBills[0]?.entries.length || 0}</strong> date periods
            </div>

            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Excel Name</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Map To</TableHead>
                    <TableHead className="text-right">Entries</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {mappings.map((mapping, index) => (
                    <TableRow key={index}>
                      <TableCell className="font-medium">{mapping.excelName}</TableCell>
                      <TableCell>{getStatusBadge(mapping)}</TableCell>
                      <TableCell>
                        <div className="space-y-2">
                          <Select
                            value={mapping.action === "create" ? "__create__" : (mapping.matchedBillId || "__create__")}
                            onValueChange={(value) => updateMapping(index, value)}
                          >
                            <SelectTrigger className="w-[250px] text-sm">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="__create__">
                                <span className="flex items-center gap-1">
                                  <PlusCircle className="h-3 w-3" /> Create New Bill
                                </span>
                              </SelectItem>
                              {existingBills.map(bill => (
                                <SelectItem key={bill.id} value={bill.id}>
                                  {bill.name} ({bill.category})
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          {mapping.action === "create" && (
                            <Select
                              value={newBillCategories[mapping.excelName] || "Other"}
                              onValueChange={(value) => setNewBillCategories(prev => ({ ...prev, [mapping.excelName]: value }))}
                            >
                              <SelectTrigger className="w-[250px] text-sm">
                                <SelectValue placeholder="Category" />
                              </SelectTrigger>
                              <SelectContent>
                                {CATEGORIES.map(cat => (
                                  <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">{mapping.entries.length}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={() => setStep("upload")}>Back</Button>
              <Button onClick={handleImport} disabled={importing}>
                {importing ? "Importing..." : `Import ${mappings.reduce((sum, m) => sum + m.entries.length, 0)} Entries`}
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
