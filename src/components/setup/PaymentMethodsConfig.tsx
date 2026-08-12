import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Wallet, ArrowUp, ArrowDown, Plus, Trash2 } from "lucide-react";
import { PaymentMethodOption } from "@/lib/payment-methods";

interface PaymentMethodsConfigProps {
  methods: PaymentMethodOption[];
  onChange: (methods: PaymentMethodOption[]) => void;
}

export const PaymentMethodsConfig = ({ methods, onChange }: PaymentMethodsConfigProps) => {
  const sorted = [...methods].sort((a, b) => a.sortOrder - b.sortOrder);

  const commit = (list: PaymentMethodOption[]) =>
    onChange(list.map((m, i) => ({ ...m, sortOrder: i })));

  const update = (key: string, patch: Partial<PaymentMethodOption>) =>
    commit(sorted.map((m) => (m.key === key ? { ...m, ...patch } : m)));

  const move = (index: number, delta: number) => {
    const next = [...sorted];
    const target = index + delta;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    commit(next);
  };

  const addCustom = () => {
    commit([
      ...sorted,
      {
        key: `custom-${Date.now()}`,
        label: "New payment method",
        enabled: true,
        referenceLabel: "Payment Reference/Confirmation #",
        instructions: "",
        sortOrder: sorted.length,
        isCustom: true,
      },
    ]);
  };

  const removeCustom = (key: string) => commit(sorted.filter((m) => m.key !== key));

  return (
    <Card id="payment-methods" className="scroll-mt-24 target:ring-2 target:ring-primary">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Wallet className="h-4 w-4" />
          Payment Methods (Other Payment Options)
        </CardTitle>
        <CardDescription className="text-base">
          Control which methods members can choose when recording a payment, and the account
          information they see for each one.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {sorted.map((m, index) => (
          <div key={m.key} className="rounded-lg border p-4 space-y-3">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div className="flex items-center gap-3">
                <Switch
                  checked={m.enabled}
                  onCheckedChange={(checked) => update(m.key, { enabled: checked })}
                  aria-label={`Enable ${m.label}`}
                />
                <Input
                  value={m.label}
                  onChange={(e) => update(m.key, { label: e.target.value })}
                  className="w-56 text-base"
                />
              </div>
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-2 mr-2">
                  <Switch
                    checked={!!m.comingSoon}
                    onCheckedChange={(checked) => update(m.key, { comingSoon: checked })}
                    aria-label={`Mark ${m.label} coming soon`}
                  />
                  <span className="text-sm text-muted-foreground">Coming soon</span>
                </div>
                <Button variant="outline" size="icon" onClick={() => move(index, -1)} disabled={index === 0}>
                  <ArrowUp className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => move(index, 1)}
                  disabled={index === sorted.length - 1}
                >
                  <ArrowDown className="h-4 w-4" />
                </Button>
                {m.isCustom && (
                  <Button variant="outline" size="icon" onClick={() => removeCustom(m.key)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <div>
                <Label className="text-sm">Instructions / account info</Label>
                <Textarea
                  value={m.instructions || ""}
                  onChange={(e) => update(m.key, { instructions: e.target.value })}
                  placeholder="e.g., Send Zelle to 555-123-4567 (Cabin Fund)"
                  rows={2}
                  className="mt-1"
                />
              </div>
              <div>
                <Label className="text-sm">Reference field label</Label>
                <Input
                  value={m.referenceLabel || ""}
                  onChange={(e) => update(m.key, { referenceLabel: e.target.value })}
                  placeholder="e.g., Zelle Confirmation #"
                  className="mt-1"
                />
              </div>
            </div>
          </div>
        ))}

        <Button variant="outline" onClick={addCustom} className="gap-2">
          <Plus className="h-4 w-4" />
          Add payment method
        </Button>

        <p className="text-sm text-muted-foreground">
          Methods outside the standard list (Zelle, Credit Card, custom entries) are stored as
          "Other" with the method name kept on the payment reference.
        </p>
      </CardContent>
    </Card>
  );
};
