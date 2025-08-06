import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { DollarSign, CreditCard, Calendar, Settings, FileText } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useFinancialSettings } from "@/hooks/useFinancialSettings";
import { BillingCalculator } from "@/lib/billing-calculator";

const FinancialSetupPage = () => {
  const { settings, loading, saveFinancialSettings } = useFinancialSettings();
  const navigate = useNavigate();
  const [autoInvoicing, setAutoInvoicing] = useState(false);
  const [lateFeesEnabled, setLateFeesEnabled] = useState(false);
  const [useFeeMethod, setUseFeeMethod] = useState("");
  const [feeAmount, setFeeAmount] = useState("");
  const [cleaningFee, setCleaningFee] = useState("");
  const [petFee, setPetFee] = useState("");
  const [damageDeposit, setDamageDeposit] = useState("");
  const [taxRate, setTaxRate] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("");
  const [paymentTerms, setPaymentTerms] = useState("");
  const [lateFeeAmount, setLateFeeAmount] = useState("");
  const [lateFeeDays, setLateFeeDays] = useState("");
  const [cancellationPolicy, setCancellationPolicy] = useState("");
  const [taxId, setTaxId] = useState("");
  const [taxJurisdiction, setTaxJurisdiction] = useState("");
  const [venmoHandle, setVenmoHandle] = useState("");
  const [paypalEmail, setPaypalEmail] = useState("");
  const [checkPayableTo, setCheckPayableTo] = useState("");
  const [checkMailingAddress, setCheckMailingAddress] = useState("");

  useEffect(() => {
    if (settings) {
      setUseFeeMethod(settings.billing_method);
      setFeeAmount(settings.billing_amount?.toString() || "");
      setCleaningFee(settings.cleaning_fee?.toString() || "");
      setPetFee(settings.pet_fee?.toString() || "");
      setDamageDeposit(settings.damage_deposit?.toString() || "");
      setTaxRate(settings.tax_rate?.toString() || "");
      setPaymentMethod(settings.preferred_payment_method || "");
      setPaymentTerms(settings.payment_terms || "");
      setAutoInvoicing(settings.auto_invoicing || false);
      setLateFeesEnabled(settings.late_fees_enabled || false);
      setLateFeeAmount(settings.late_fee_amount?.toString() || "");
      setLateFeeDays(settings.late_fee_grace_days?.toString() || "");
      setCancellationPolicy(settings.cancellation_policy || "");
      setTaxId(settings.tax_id || "");
      setTaxJurisdiction(settings.tax_jurisdiction || "");
      setVenmoHandle(settings.venmo_handle || "");
      setPaypalEmail(settings.paypal_email || "");
      setCheckPayableTo(settings.check_payable_to || "");
      setCheckMailingAddress(settings.check_mailing_address || "");
    }
  }, [settings]);

  const handleSaveSettings = async () => {
    const config = {
      method: useFeeMethod as any,
      amount: parseFloat(feeAmount) || 0,
      taxRate: parseFloat(taxRate) || undefined,
      cleaningFee: parseFloat(cleaningFee) || undefined,
      petFee: parseFloat(petFee) || undefined,
      damageDeposit: parseFloat(damageDeposit) || undefined,
    };

    const validation = BillingCalculator.validateBillingConfig(config);
    
    if (!validation.isValid) {
      console.error('Validation errors:', validation.errors);
      return;
    }

    await saveFinancialSettings({
      billing_method: useFeeMethod,
      billing_amount: parseFloat(feeAmount) || 0,
      tax_rate: parseFloat(taxRate) || undefined,
      cleaning_fee: parseFloat(cleaningFee) || undefined,
      pet_fee: parseFloat(petFee) || undefined,
      damage_deposit: parseFloat(damageDeposit) || undefined,
      preferred_payment_method: paymentMethod,
      payment_terms: paymentTerms,
      auto_invoicing: autoInvoicing,
      late_fees_enabled: lateFeesEnabled,
      late_fee_amount: parseFloat(lateFeeAmount) || undefined,
      late_fee_grace_days: parseInt(lateFeeDays) || undefined,
      cancellation_policy: cancellationPolicy,
      tax_id: taxId,
      tax_jurisdiction: taxJurisdiction,
      venmo_handle: venmoHandle,
      paypal_email: paypalEmail,
      check_payable_to: checkPayableTo,
      check_mailing_address: checkMailingAddress,
    });
    
    // Navigate to reservation setup after saving
    navigate('/reservation-setup');
  };

  return (
    <div className="min-h-screen bg-cover bg-center bg-no-repeat p-4" style={{backgroundImage: 'url(/lovable-uploads/45c3083f-46c5-4e30-a2f0-31a24ab454f4.png)'}}>
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <Button variant="outline" asChild className="mb-4">
            <Link to="/setup">← Back to Setup</Link>
          </Button>
          <h1 className="text-6xl mb-4 font-kaushan text-primary drop-shadow-lg text-center">Financial Setup</h1>
          <p className="text-2xl text-primary text-center font-medium">Configure your cabin's financial settings, billing rates, and payment options</p>
        </div>

        <div className="space-y-6 bg-card/95 p-6 rounded-lg">
          {/* Billing Rates */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Billing Rates
              </CardTitle>
              <CardDescription className="text-base">Set your cabin rental rates and pricing</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <Label className="text-base">Use Fee Method (Required)</Label>
                  <RadioGroup value={useFeeMethod} onValueChange={setUseFeeMethod} className="mt-3">
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="per-person-per-day" id="per-person-per-day" />
                      <Label htmlFor="per-person-per-day" className="text-base">Per Person Per Day</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="per-person-per-week" id="per-person-per-week" />
                      <Label htmlFor="per-person-per-week" className="text-base">Per Person Per Week</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="per-person-entire-stay" id="per-person-entire-stay" />
                      <Label htmlFor="per-person-entire-stay" className="text-base">Per Person per Entire Stay</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="flat-rate-per-day" id="flat-rate-per-day" />
                      <Label htmlFor="flat-rate-per-day" className="text-base">Flat Rate Per Day</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="flat-rate-per-week" id="flat-rate-per-week" />
                      <Label htmlFor="flat-rate-per-week" className="text-base">Flat Rate Per Week</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="flat-rate-entire-stay" id="flat-rate-entire-stay" />
                      <Label htmlFor="flat-rate-entire-stay" className="text-base">Flat Rate per Entire Stay</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="flat-rate-per-season" id="flat-rate-per-season" />
                      <Label htmlFor="flat-rate-per-season" className="text-base">Flat Rate Per Season</Label>
                    </div>
                  </RadioGroup>
                </div>
                <div>
                  <Label htmlFor="fee-amount" className="text-base">Use Fee Amount</Label>
                  <div className="relative mt-3">
                    <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground">$</span>
                    <Input 
                      id="fee-amount" 
                      placeholder="0.00" 
                      value={feeAmount}
                      onChange={(e) => setFeeAmount(e.target.value)}
                      type="number"
                      step="0.01"
                      className="pl-8"
                    />
                  </div>
                </div>
              </div>
              
              {/* Additional Fee Settings */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                <div>
                  <Label htmlFor="cleaning-fee" className="text-base">Cleaning Fee</Label>
                  <div className="relative mt-2">
                    <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground">$</span>
                    <Input 
                      id="cleaning-fee" 
                      placeholder="0.00" 
                      value={cleaningFee}
                      onChange={(e) => setCleaningFee(e.target.value)}
                      type="number"
                      step="0.01"
                      className="pl-8"
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="pet-fee" className="text-base">Pet Fee</Label>
                  <div className="relative mt-2">
                    <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground">$</span>
                    <Input 
                      id="pet-fee" 
                      placeholder="0.00" 
                      value={petFee}
                      onChange={(e) => setPetFee(e.target.value)}
                      type="number"
                      step="0.01"
                      className="pl-8"
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="damage-deposit" className="text-base">Damage Deposit</Label>
                  <div className="relative mt-2">
                    <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground">$</span>
                    <Input 
                      id="damage-deposit" 
                      placeholder="0.00" 
                      value={damageDeposit}
                      onChange={(e) => setDamageDeposit(e.target.value)}
                      type="number"
                      step="0.01"
                      className="pl-8"
                    />
                  </div>
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
              <CardDescription className="text-base">Configure payment methods and terms</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="payment-method" className="text-base">Preferred Payment Method</Label>
                  <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select payment method" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="venmo">Venmo</SelectItem>
                      <SelectItem value="paypal">PayPal</SelectItem>
                      <SelectItem value="send-check">Send check</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                {/* Payment Account Information */}
                {paymentMethod === 'venmo' && (
                  <div>
                    <Label htmlFor="venmo-handle" className="text-base">Venmo Handle</Label>
                    <Input 
                      id="venmo-handle" 
                      placeholder="@your-venmo-handle" 
                      value={venmoHandle}
                      onChange={(e) => setVenmoHandle(e.target.value)}
                    />
                    <p className="text-base text-muted-foreground mt-1">
                      Include the @ symbol (e.g., @CabinPayments)
                    </p>
                  </div>
                )}
                
                {paymentMethod === 'paypal' && (
                  <div>
                    <Label htmlFor="paypal-email" className="text-base">PayPal Email</Label>
                    <Input 
                      id="paypal-email" 
                      placeholder="payments@example.com" 
                      type="email"
                      value={paypalEmail}
                      onChange={(e) => setPaypalEmail(e.target.value)}
                    />
                  </div>
                )}
                
                {paymentMethod === 'send-check' && (
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="check-payable-to" className="text-base">Check Payable To</Label>
                      <Input 
                        id="check-payable-to" 
                        placeholder="Cabin Management LLC" 
                        value={checkPayableTo}
                        onChange={(e) => setCheckPayableTo(e.target.value)}
                      />
                    </div>
                    <div>
                      <Label htmlFor="check-mailing-address" className="text-base">Mailing Address</Label>
                      <textarea 
                        id="check-mailing-address" 
                        placeholder="123 Mountain View Drive&#10;Yellowstone, MT 59718"
                        value={checkMailingAddress}
                        onChange={(e) => setCheckMailingAddress(e.target.value)}
                        className="w-full min-h-[80px] px-3 py-2 text-base border border-input bg-background rounded-md resize-none"
                      />
                    </div>
                  </div>
                )}
                
                <div>
                  <Label htmlFor="payment-terms" className="text-base">Payment Terms</Label>
                  <Select value={paymentTerms} onValueChange={setPaymentTerms}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select payment terms" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pay-in-advance">Pay in Advance</SelectItem>
                      <SelectItem value="pay-at-checkout">Pay at Checkout</SelectItem>
                      <SelectItem value="pay-within-7-days">Pay within 7 days</SelectItem>
                      <SelectItem value="pay-within-30-days">Pay within 30 days</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-base">Automatic Invoicing</Label>
                  <p className="text-base text-muted-foreground">Send invoices automatically upon booking</p>
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
              <CardDescription className="text-base">Configure additional fees and cancellation policies</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-base">Late Payment Fees</Label>
                  <p className="text-base text-muted-foreground">Charge late fees for overdue payments</p>
                </div>
                <Switch checked={lateFeesEnabled} onCheckedChange={setLateFeesEnabled} />
              </div>
              {lateFeesEnabled && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="late-fee-amount" className="text-base">Late Fee Amount</Label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground">$</span>
                      <Input 
                        id="late-fee-amount" 
                        placeholder="25.00" 
                        value={lateFeeAmount}
                        onChange={(e) => setLateFeeAmount(e.target.value)}
                        type="number"
                        step="0.01"
                        className="pl-8"
                      />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="late-fee-days" className="text-base">Grace Period (Days)</Label>
                    <Input 
                      id="late-fee-days" 
                      placeholder="3" 
                      type="number" 
                      value={lateFeeDays}
                      onChange={(e) => setLateFeeDays(e.target.value)}
                    />
                  </div>
                </div>
              )}
              <div>
                <Label htmlFor="cancellation-policy" className="text-base">Cancellation Policy</Label>
                <Select value={cancellationPolicy} onValueChange={setCancellationPolicy}>
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
              <CardDescription className="text-base">Configure tax rates and reporting</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="tax-rate" className="text-base">Tax Rate (%)</Label>
                  <Input 
                    id="tax-rate" 
                    placeholder="8.5" 
                    type="number" 
                    step="0.1" 
                    value={taxRate}
                    onChange={(e) => setTaxRate(e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="tax-id" className="text-base">Tax ID Number</Label>
                  <Input 
                    id="tax-id" 
                    placeholder="12-3456789" 
                    value={taxId}
                    onChange={(e) => setTaxId(e.target.value)}
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="tax-jurisdiction" className="text-base">Tax Jurisdiction</Label>
                <Input 
                  id="tax-jurisdiction" 
                  placeholder="City, State" 
                  value={taxJurisdiction}
                  onChange={(e) => setTaxJurisdiction(e.target.value)}
                />
              </div>
            </CardContent>
          </Card>

          <Separator />

          <div className="flex gap-3">
            <Button 
              className="flex-1" 
              onClick={handleSaveSettings}
              disabled={loading || !useFeeMethod || !feeAmount}
            >
              {loading ? "Saving..." : "Save settings and go to Reservation Setup"}
            </Button>
            <Button variant="outline" className="flex-1">Preview Invoice</Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FinancialSetupPage;