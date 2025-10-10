import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import { Plus, X, FileText, Download, Send } from 'lucide-react';
import { useOrganization } from '@/hooks/useOrganization';
import { useFamilyGroups } from '@/hooks/useFamilyGroups';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { format } from 'date-fns';

interface LineItem {
  description: string;
  quantity: number;
  rate: number;
  amount: number;
}

interface InvoiceGeneratorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (invoiceData: any) => Promise<void>;
}

export const InvoiceGenerator = ({ open, onOpenChange, onSave }: InvoiceGeneratorProps) => {
  const { organization } = useOrganization();
  const { familyGroups } = useFamilyGroups();
  const [familyGroup, setFamilyGroup] = useState('');
  const [issueDate, setIssueDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [dueDate, setDueDate] = useState(format(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), 'yyyy-MM-dd'));
  const [lineItems, setLineItems] = useState<LineItem[]>([
    { description: '', quantity: 1, rate: 0, amount: 0 }
  ]);
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  const addLineItem = () => {
    setLineItems([...lineItems, { description: '', quantity: 1, rate: 0, amount: 0 }]);
  };

  const removeLineItem = (index: number) => {
    setLineItems(lineItems.filter((_, i) => i !== index));
  };

  const updateLineItem = (index: number, field: keyof LineItem, value: any) => {
    const updated = [...lineItems];
    updated[index] = { ...updated[index], [field]: value };
    
    // Recalculate amount
    if (field === 'quantity' || field === 'rate') {
      updated[index].amount = updated[index].quantity * updated[index].rate;
    }
    
    setLineItems(updated);
  };

  const subtotal = lineItems.reduce((sum, item) => sum + item.amount, 0);
  const taxAmount = 0; // No tax for now
  const total = subtotal + taxAmount;

  const handleSave = async () => {
    if (!familyGroup) {
      return;
    }

    setSaving(true);
    try {
      await onSave({
        family_group: familyGroup,
        issue_date: issueDate,
        due_date: dueDate,
        subtotal,
        tax_amount: taxAmount,
        total_amount: total,
        amount_paid: 0,
        balance_due: total,
        status: 'draft',
        line_items: lineItems,
        notes: notes || null,
        sent_at: null,
        paid_at: null,
        pdf_url: null,
        billing_cycle_id: null,
      });
      
      // Reset form
      setFamilyGroup('');
      setLineItems([{ description: '', quantity: 1, rate: 0, amount: 0 }]);
      setNotes('');
      onOpenChange(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Create Invoice
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Header Info */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Family Group</Label>
              <Select value={familyGroup} onValueChange={setFamilyGroup}>
                <SelectTrigger>
                  <SelectValue placeholder="Select family group" />
                </SelectTrigger>
                <SelectContent>
                  {familyGroups.map(group => (
                    <SelectItem key={group.id} value={group.name}>
                      {group.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Invoice Number</Label>
              <div className="text-sm text-muted-foreground mt-2">
                Auto-generated on save
              </div>
            </div>
            <div>
              <Label>Issue Date</Label>
              <Input
                type="date"
                value={issueDate}
                onChange={(e) => setIssueDate(e.target.value)}
              />
            </div>
            <div>
              <Label>Due Date</Label>
              <Input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
              />
            </div>
          </div>

          {/* Line Items */}
          <Card className="p-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-semibold">Line Items</h3>
              <Button size="sm" variant="outline" onClick={addLineItem}>
                <Plus className="h-4 w-4 mr-2" />
                Add Item
              </Button>
            </div>

            <div className="space-y-3">
              {lineItems.map((item, index) => (
                <div key={index} className="grid grid-cols-12 gap-2 items-end">
                  <div className="col-span-5">
                    <Label className="text-xs">Description</Label>
                    <Input
                      placeholder="Item description"
                      value={item.description}
                      onChange={(e) => updateLineItem(index, 'description', e.target.value)}
                    />
                  </div>
                  <div className="col-span-2">
                    <Label className="text-xs">Quantity</Label>
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      value={item.quantity}
                      onChange={(e) => updateLineItem(index, 'quantity', parseFloat(e.target.value) || 0)}
                    />
                  </div>
                  <div className="col-span-2">
                    <Label className="text-xs">Rate</Label>
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      value={item.rate}
                      onChange={(e) => updateLineItem(index, 'rate', parseFloat(e.target.value) || 0)}
                    />
                  </div>
                  <div className="col-span-2">
                    <Label className="text-xs">Amount</Label>
                    <div className="font-semibold pt-2">${item.amount.toFixed(2)}</div>
                  </div>
                  <div className="col-span-1">
                    {lineItems.length > 1 && (
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => removeLineItem(index)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Totals */}
            <div className="mt-4 pt-4 border-t space-y-2">
              <div className="flex justify-between text-sm">
                <span>Subtotal:</span>
                <span>${subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Tax:</span>
                <span>${taxAmount.toFixed(2)}</span>
              </div>
              <div className="flex justify-between font-bold text-lg">
                <span>Total:</span>
                <span>${total.toFixed(2)}</span>
              </div>
            </div>
          </Card>

          {/* Notes */}
          <div>
            <Label>Notes</Label>
            <Textarea
              placeholder="Additional notes or payment instructions"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving || !familyGroup}>
              {saving ? 'Creating...' : 'Create Invoice'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
