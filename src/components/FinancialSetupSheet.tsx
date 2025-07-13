import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Settings } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export const FinancialSetupSheet = () => {
  const [familyName, setFamilyName] = useState("Smith Family Cabin");
  const [feeMethod, setFeeMethod] = useState("");
  const [rates, setRates] = useState({
    perPersonPerDay: "10",
    perPersonPerWeek: "10",
    flatRatePerDay: "10",
    flatRatePerWeek: "10",
    flatRatePerSeason: "10"
  });
  const [paymentMethod, setPaymentMethod] = useState("");
  const { toast } = useToast();

  const handleSave = () => {
    toast({
      title: "Financial Setup Saved",
      description: "Your financial configuration has been updated successfully.",
    });
  };

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="outline" className="w-full">
          <Settings className="h-4 w-4 mr-2" />
          Set up Financials
        </Button>
      </SheetTrigger>
      <SheetContent className="w-[400px] sm:w-[540px] overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Set up Financials</SheetTitle>
          <SheetDescription>
            Configure your cabin's financial settings, pricing, and payment methods.
          </SheetDescription>
        </SheetHeader>
        
        <div className="grid gap-6 py-4">
          {/* Family Organization Name */}
          <div className="grid gap-2">
            <Label htmlFor="family-name">Family Organization Name</Label>
            <Input
              id="family-name"
              value={familyName}
              onChange={(e) => setFamilyName(e.target.value)}
              placeholder="Enter organization name"
            />
          </div>

          {/* Use Fee Method */}
          <div className="grid gap-4">
            <Label>Use Fee Method (Select 1)</Label>
            <RadioGroup value={feeMethod} onValueChange={setFeeMethod}>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="per-person-day" id="per-person-day" />
                <Label htmlFor="per-person-day" className="flex-1">Per Person Per day</Label>
                <div className="w-20">
                  <Input
                    value={rates.perPersonPerDay}
                    onChange={(e) => setRates({...rates, perPersonPerDay: e.target.value})}
                    placeholder="$10"
                    className="text-center"
                  />
                </div>
              </div>
              
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="per-person-week" id="per-person-week" />
                <Label htmlFor="per-person-week" className="flex-1">Per Person Per (Week)</Label>
                <div className="w-20">
                  <Input
                    value={rates.perPersonPerWeek}
                    onChange={(e) => setRates({...rates, perPersonPerWeek: e.target.value})}
                    placeholder="$10"
                    className="text-center"
                  />
                </div>
              </div>
              
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="flat-rate-day" id="flat-rate-day" />
                <Label htmlFor="flat-rate-day" className="flex-1">Flat Rate Per day</Label>
                <div className="w-20">
                  <Input
                    value={rates.flatRatePerDay}
                    onChange={(e) => setRates({...rates, flatRatePerDay: e.target.value})}
                    placeholder="$10"
                    className="text-center"
                  />
                </div>
              </div>
              
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="flat-rate-week" id="flat-rate-week" />
                <Label htmlFor="flat-rate-week" className="flex-1">Flat Rate Per (Week)</Label>
                <div className="w-20">
                  <Input
                    value={rates.flatRatePerWeek}
                    onChange={(e) => setRates({...rates, flatRatePerWeek: e.target.value})}
                    placeholder="$10"
                    className="text-center"
                  />
                </div>
              </div>
              
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="flat-rate-season" id="flat-rate-season" />
                <Label htmlFor="flat-rate-season" className="flex-1">Flat Rate Per Season</Label>
                <div className="w-20">
                  <Input
                    value={rates.flatRatePerSeason}
                    onChange={(e) => setRates({...rates, flatRatePerSeason: e.target.value})}
                    placeholder="$10"
                    className="text-center"
                  />
                </div>
              </div>
            </RadioGroup>
          </div>

          {/* Payment Terms */}
          <div className="grid gap-4">
            <Label>Payment Terms</Label>
            <RadioGroup value={paymentMethod} onValueChange={setPaymentMethod}>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="pay-advance" id="pay-advance" />
                <Label htmlFor="pay-advance">Pay in Advance</Label>
              </div>
              
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="pay-checkout" id="pay-checkout" />
                <Label htmlFor="pay-checkout">Pay at checkout</Label>
              </div>
              
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="pay-30days" id="pay-30days" />
                <Label htmlFor="pay-30days">Pay Within 30 days</Label>
              </div>
            </RadioGroup>
          </div>

          {/* Summary Card */}
          <Card className="bg-muted/30">
            <CardHeader>
              <CardTitle className="text-sm">Current Configuration</CardTitle>
            </CardHeader>
            <CardContent className="text-sm space-y-2">
              <div><strong>Organization:</strong> {familyName}</div>
              {feeMethod && (
                <div><strong>Fee Method:</strong> {feeMethod.replace(/-/g, " ").replace(/\b\w/g, l => l.toUpperCase())}</div>
              )}
              {paymentMethod && (
                <div><strong>Payment Terms:</strong> {paymentMethod.replace(/-/g, " ").replace(/\b\w/g, l => l.toUpperCase())}</div>
              )}
            </CardContent>
          </Card>

          <Button onClick={handleSave} className="w-full mt-4">
            Save Financial Settings
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
};