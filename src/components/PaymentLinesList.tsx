import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Pencil, Trash2, Check, X } from "lucide-react";
import { format, parseISO } from "date-fns";
import { toast } from "sonner";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import {
  PaymentLine,
  listPaymentLines,
  updatePaymentLine,
  deletePaymentLine,
} from "@/lib/payment-transactions";

interface Props {
  /** One or more stay payment records whose lines should be shown together. */
  paymentIds: string[];
  /** Combined paid total on the stay record(s) (includes non-line adjustments). */
  amountPaid: number;
  /** Optional stay label per payment id, shown on each line when given. */
  stayLabels?: Record<string, string>;
  readOnly?: boolean;
  onChanged: () => void;
  /** Called with null when payment lines aren't installed yet. */
  onAvailability?: (available: boolean) => void;
}

const money = (v: number) => `$${v.toFixed(2)}`;

export const PaymentLinesList = ({ paymentIds, amountPaid, stayLabels, readOnly, onChanged, onAvailability }: Props) => {
  const [lines, setLines] = useState<PaymentLine[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState({ amount: 0, paidDate: "", reference: "", notes: "" });
  const [busy, setBusy] = useState(false);

  const idsKey = paymentIds.join(",");

  const load = async () => {
    setLoading(true);
    try {
      const data = await listPaymentLines(paymentIds);
      setLines(data);
      onAvailability?.(data !== null);
    } catch (e) {
      console.error(e);
      toast.error("Couldn't load payment lines");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idsKey]);

  if (loading) return <div className="flex justify-center py-4"><LoadingSpinner /></div>;
  if (lines === null) return null;

  const startEdit = (l: PaymentLine) => {
    setEditingId(l.id);
    setDraft({
      amount: Number(l.amount),
      paidDate: l.paid_date,
      reference: l.payment_reference || "",
      notes: l.notes || "",
    });
  };

  const save = async (l: PaymentLine) => {
    if (draft.amount < 0 || !draft.paidDate) {
      toast.error("Enter a valid amount and date");
      return;
    }
    setBusy(true);
    try {
      await updatePaymentLine(l.id, {
        amount: draft.amount,
        paidDate: draft.paidDate,
        paymentMethod: l.payment_method,
        paymentReference: draft.reference,
        notes: draft.notes,
      });
      toast.success("Payment corrected");
      setEditingId(null);
      await load();
      onChanged();
    } catch (e) {
      console.error(e);
      toast.error("Couldn't save the correction");
    } finally {
      setBusy(false);
    }
  };

  const remove = async (l: PaymentLine) => {
    if (!window.confirm(`Delete this ${money(Number(l.amount))} payment? The stay's paid total will drop by that amount.`)) return;
    setBusy(true);
    try {
      await deletePaymentLine(l.id);
      toast.success("Payment removed");
      await load();
      onChanged();
    } catch (e) {
      console.error(e);
      toast.error("Couldn't remove the payment");
    } finally {
      setBusy(false);
    }
  };

  const linesTotal = Math.round(lines.reduce((s, l) => s + Number(l.amount), 0) * 100) / 100;
  const otherAdjustments = Math.round((amountPaid - linesTotal) * 100) / 100;

  if (lines.length === 0 && Math.abs(otherAdjustments) < 0.01) return null;

  return (
    <div className="space-y-2">
      {lines.map((l) => (
        <Card key={l.id} className="p-3">
          {editingId === l.id ? (
            <div className="space-y-2">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-xs">Amount</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={draft.amount}
                    onChange={(e) => setDraft({ ...draft, amount: Math.round((parseFloat(e.target.value) || 0) * 100) / 100 })}
                  />
                </div>
                <div>
                  <Label className="text-xs">Date</Label>
                  <Input type="date" value={draft.paidDate} onChange={(e) => setDraft({ ...draft, paidDate: e.target.value })} />
                </div>
              </div>
              <div>
                <Label className="text-xs">Reference</Label>
                <Input value={draft.reference} onChange={(e) => setDraft({ ...draft, reference: e.target.value })} />
              </div>
              <div>
                <Label className="text-xs">Notes</Label>
                <Textarea rows={2} value={draft.notes} onChange={(e) => setDraft({ ...draft, notes: e.target.value })} />
              </div>
              <div className="flex justify-end gap-2">
                <Button size="sm" variant="outline" onClick={() => setEditingId(null)} disabled={busy}>
                  <X className="h-4 w-4 mr-1" /> Cancel
                </Button>
                <Button size="sm" onClick={() => save(l)} disabled={busy}>
                  <Check className="h-4 w-4 mr-1" /> Save
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-semibold">{money(Number(l.amount))}</span>
                  <span className="text-sm text-muted-foreground">{format(parseISO(l.paid_date), "MMM d, yyyy")}</span>
                  {l.payment_method && <Badge variant="secondary">{l.payment_method.replace("_", " ")}</Badge>}
                </div>
                {stayLabels?.[l.payment_id] && (
                  <div className="text-xs text-muted-foreground">Stay: {stayLabels[l.payment_id]}</div>
                )}
                {l.payment_reference && <div className="text-xs text-muted-foreground">Ref: {l.payment_reference}</div>}
                {l.notes && <div className="text-xs text-muted-foreground whitespace-pre-line break-words">{l.notes}</div>}
              </div>
              {!readOnly && (
                <div className="flex shrink-0">
                  <Button size="icon" variant="ghost" aria-label="Edit payment" onClick={() => startEdit(l)} disabled={busy}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button size="icon" variant="ghost" aria-label="Delete payment" onClick={() => remove(l)} disabled={busy}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              )}
            </div>
          )}
        </Card>
      ))}
      {Math.abs(otherAdjustments) >= 0.01 && (
        <div className="flex justify-between text-xs text-muted-foreground px-1">
          <span>Other adjustments (credits applied, etc.)</span>
          <span>{money(otherAdjustments)}</span>
        </div>
      )}
      {lines.length > 0 && (
        <p className="text-xs text-muted-foreground px-1">Every correction is saved in the payment's change history.</p>
      )}
    </div>
  );
};
