import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { DollarSign, CreditCard, Calendar, Settings, Users, FileText } from "lucide-react";

export const FinancialSetupSheet = () => {
  const [autoInvoicing, setAutoInvoicing] = useState(false);
  const [lateFeesEnabled, setLateFeesEnabled] = useState(false);
  const [useFeeMethod, setUseFeeMethod] = useState("");
  const [feeAmount, setFeeAmount] = useState("");

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button className="w-full" variant="outline">
          Financial Setup
        </Button>
      </SheetTrigger>
      <SheetContent className="w-[600px] sm:max-w-[600px] overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Financial Setup
          </SheetTitle>
          <SheetDescription>
            Configure your cabin's financial settings, billing rates, and payment options.
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-6 py-6">
          {/* Billing Rates */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Billing Rates
              </CardTitle>
              <CardDescription>Set your cabin rental rates and pricing</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <Label>Use Fee Method (Required)</Label>
                  <RadioGroup value={useFeeMethod} onValueChange={setUseFeeMethod} className="mt-3">
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="per-person-per-day" id="per-person-per-day" />
                      <Label htmlFor="per-person-per-day">Per Person Per Day</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="per-person-per-week" id="per-person-per-week" />
                      <Label htmlFor="per-person-per-week">Per Person Per Week</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="per-person-entire-stay" id="per-person-entire-stay" />
                      <Label htmlFor="per-person-entire-stay">Per Person per Entire Stay</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="flat-rate-per-day" id="flat-rate-per-day" />
                      <Label htmlFor="flat-rate-per-day">Flat Rate Per Day</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="flat-rate-per-week" id="flat-rate-per-week" />
                      <Label htmlFor="flat-rate-per-week">Flat Rate Per Week</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="flat-rate-entire-stay" id="flat-rate-entire-stay" />
                      <Label htmlFor="flat-rate-entire-stay">Flat Rate per Entire Stay</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="flat-rate-per-season" id="flat-rate-per-season" />
                      <Label htmlFor="flat-rate-per-season">Flat Rate Per Season</Label>
                    </div>
                  </RadioGroup>
                </div>
                <div>
                  <Label htmlFor="fee-amount">Use Fee Amount ($)</Label>
                  <Input 
                    id="fee-amount" 
                    placeholder="Enter amount" 
                    value={feeAmount}
                    onChange={(e) => setFeeAmount(e.target.value)}
                    type="number"
                    step="0.01"
                    className="mt-3"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Payment Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-4 w-4" />
                Payment Settings
              </CardTitle>
              <CardDescription>Configure payment methods and terms</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="payment-method">Preferred Payment Method</Label>
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="Select payment method" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="venmo">Venmo</SelectItem>
                      <SelectItem value="paypal">Paypal</SelectItem>
                      <SelectItem value="send-check">Send check</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="payment-terms">Payment Terms</Label>
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="Select payment terms" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pay-in-advance">Pay in Advance</SelectItem>
                      <SelectItem value="pay-at-checkout">Pay at Checkout</SelectItem>
                      <SelectItem value="pay-within-30-days">Pay within 30 days</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Automatic Invoicing</Label>
                  <p className="text-sm text-muted-foreground">Send invoices automatically upon booking</p>
                </div>
                <Switch checked={autoInvoicing} onCheckedChange={setAutoInvoicing} />
              </div>
            </CardContent>
          </Card>

          {/* Late Fees & Policies */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Fees & Policies
              </CardTitle>
              <CardDescription>Configure additional fees and cancellation policies</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Late Payment Fees</Label>
                  <p className="text-sm text-muted-foreground">Charge late fees for overdue payments</p>
                </div>
                <Switch checked={lateFeesEnabled} onCheckedChange={setLateFeesEnabled} />
              </div>
              {lateFeesEnabled && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="late-fee-amount">Late Fee Amount</Label>
                    <Input id="late-fee-amount" placeholder="$25" />
                  </div>
                  <div>
                    <Label htmlFor="late-fee-days">Grace Period (Days)</Label>
                    <Input id="late-fee-days" placeholder="3" type="number" />
                  </div>
                </div>
              )}
              <div>
                <Label htmlFor="cancellation-policy">Cancellation Policy</Label>
                <Select>
                  <SelectTrigger>
                    <SelectValue placeholder="Select cancellation policy" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="flexible">Flexible (24hrs before)</SelectItem>
                    <SelectItem value="moderate">Moderate (5 days before)</SelectItem>
                    <SelectItem value="strict">Strict (14 days before)</SelectItem>
                    <SelectItem value="super-strict">Super Strict (30 days before)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Tax Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-4 w-4" />
                Tax Settings
              </CardTitle>
              <CardDescription>Configure tax rates and reporting</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="tax-rate">Tax Rate (%)</Label>
                  <Input id="tax-rate" placeholder="8.5" type="number" step="0.1" />
                </div>
                <div>
                  <Label htmlFor="tax-id">Tax ID Number</Label>
                  <Input id="tax-id" placeholder="12-3456789" />
                </div>
              </div>
              <div>
                <Label htmlFor="tax-jurisdiction">Tax Jurisdiction</Label>
                <Input id="tax-jurisdiction" placeholder="City, State" />
              </div>
            </CardContent>
          </Card>

          {/* Family Member Billing */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                Family Member Billing
              </CardTitle>
              <CardDescription>Set rates and billing preferences for family members</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="family-discount">Family Member Discount (%)</Label>
                <Input id="family-discount" placeholder="20" type="number" />
              </div>
              <div>
                <Label htmlFor="billing-frequency">Billing Frequency</Label>
                <Select>
                  <SelectTrigger>
                    <SelectValue placeholder="Select billing frequency" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="per-stay">Per Stay</SelectItem>
                    <SelectItem value="monthly">Monthly Summary</SelectItem>
                    <SelectItem value="quarterly">Quarterly</SelectItem>
                    <SelectItem value="annual">Annual</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          <Separator />

          <div className="flex gap-3">
            <Button className="flex-1">Save Settings</Button>
            <Button variant="outline" className="flex-1">Preview Invoice</Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
};