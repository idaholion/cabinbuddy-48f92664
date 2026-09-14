import { useState, useMemo, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface MemberOption {
  key: string;
  label: string;
  familyGroup?: string;
}

interface TransferCreditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sourceKey?: string | null;
  sourceLabel?: string;
  availableCredit: number;
  familyGroups: any[];
  isAdmin: boolean;
  creditBySource?: Record<string, number>;
  onTransfer: (data: {
    from_ledger_name: string;
    to_ledger_name: string;
    amount: number;
    transfer_date: string;
    notes?: string;
  }) => Promise<void>;
}

export const TransferCreditDialog = ({
  open,
  onOpenChange,
  sourceKey,
  sourceLabel,
  availableCredit,
  familyGroups,
  isAdmin,
  creditBySource,
  onTransfer,
}: TransferCreditDialogProps) => {
  const members = useMemo<MemberOption[]>(() => {
    const seen = new Set<string>();
    const list: MemberOption[] = [];
    for (const group of familyGroups || []) {
      const membersArr = Array.isArray(group.host_members) ? group.host_members : [];
      for (const member of membersArr) {
        if (!member?.name) continue;
        const key = member.email
          ? `p:${String(member.email).trim().toLowerCase()}`
          : `n:${String(member.name).trim().toLowerCase()}`;
        if (seen.has(key)) continue;
        seen.add(key);
        list.push({
          key,
          label: `${member.name}${group.name ? ` (${group.name})` : ""}`,
          familyGroup: group.name,
        });
      }
    }
    return list.sort((a, b) => a.label.localeCompare(b.label));
  }, [familyGroups]);

  const [selectedSource, setSelectedSource] = useState<string>(sourceKey || "");
  const [selectedRecipient, setSelectedRecipient] = useState<string>("");
  const [amount, setAmount] = useState<string>("");
  const [notes, setNotes] = useState<string>("");
  const [saving, setSaving] = useState(false);

  // Reset source selection when the dialog reopens with a new sourceKey.
  useEffect(() => {
    setSelectedSource(sourceKey || "");
    setAmount("");
    setNotes("");
  }, [sourceKey]);

  const effectiveSource = sourceKey || selectedSource;
  const sourceDisplay = sourceKey
    ? sourceLabel || sourceKey
    : members.find((m) => m.key === selectedSource)?.label || selectedSource;

  const effectiveAvailable = sourceKey
    ? availableCredit
    : (creditBySource?.[selectedSource] || 0);

  // For admin source selection, only list people who actually have transferable credit.
  const sourceOptions = useMemo(
    () => members.filter((m) => (creditBySource?.[m.key] || 0) > 0.004),
    [members, creditBySource]
  );

  const recipientOptions = useMemo(
    () => members.filter((m) => m.key !== effectiveSource),
    [members, effectiveSource]
  );

  const numericAmount = Math.abs(parseFloat(amount) || 0);
  const isValid =
    effectiveSource &&
    selectedRecipient &&
    numericAmount > 0.004 &&
    numericAmount <= effectiveAvailable + 0.004;

  const handleSubmit = async () => {
    if (!isValid) return;
    setSaving(true);
    try {
      await onTransfer({
        from_ledger_name: effectiveSource,
        to_ledger_name: selectedRecipient,
        amount: Math.round(numericAmount * 100) / 100,
        transfer_date: new Date().toISOString().split("T")[0],
        notes: notes.trim() || undefined,
      });
      onOpenChange(false);
      setSelectedRecipient("");
      setAmount("");
      setNotes("");
    } catch (error) {
      console.error("Transfer failed:", error);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Transfer Credit</DialogTitle>
          <DialogDescription>
            Move available credit from one person to another.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label>From</Label>
            {sourceKey ? (
              <div className="mt-1 text-sm font-medium">{sourceDisplay}</div>
            ) : (
              <Select value={selectedSource} onValueChange={setSelectedSource}>
                <SelectTrigger className="w-full mt-1">
                  <SelectValue placeholder="Select a person with credit" />
                </SelectTrigger>
                <SelectContent>
                  {sourceOptions.map((m) => (
                    <SelectItem key={m.key} value={m.key}>
                      {m.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            <p className="text-xs text-muted-foreground mt-1">
              Available credit: ${effectiveAvailable.toFixed(2)}
            </p>
          </div>

          <div>
            <Label>To</Label>
            <Select value={selectedRecipient} onValueChange={setSelectedRecipient}>
              <SelectTrigger className="w-full mt-1">
                <SelectValue placeholder="Select recipient" />
              </SelectTrigger>
              <SelectContent>
                {recipientOptions.map((m) => (
                  <SelectItem key={m.key} value={m.key}>
                    {m.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="transfer-amount">Amount</Label>
            <Input
              id="transfer-amount"
              type="number"
              step="0.01"
              min={0.01}
              max={effectiveAvailable}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              className="mt-1"
            />
            {numericAmount > effectiveAvailable + 0.004 && (
              <p className="text-xs text-destructive mt-1">
                Amount cannot exceed available credit (${effectiveAvailable.toFixed(2)}).
              </p>
            )}
          </div>

          <div>
            <Label htmlFor="transfer-notes">Note (optional)</Label>
            <Textarea
              id="transfer-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g., Moving Alex’s overpayment to Tina’s account"
              className="mt-1"
              rows={2}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={!isValid || saving}>
            {saving ? "Transferring..." : "Transfer Credit"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
