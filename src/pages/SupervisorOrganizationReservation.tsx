import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Home, Save } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface ReservationSettings {
  id: string;
  property_name?: string;
  address?: string;
  bedrooms?: number;
  bathrooms?: number;
  max_guests?: number;
  nightly_rate?: number;
  cleaning_fee?: number;
  pet_fee?: number;
  damage_deposit?: number;
  financial_method?: string;
}

const SupervisorOrganizationReservation = () => {
  const { organizationId } = useParams<{ organizationId: string }>();
  const { toast } = useToast();
  const navigate = useNavigate();
  
  const [loading, setLoading] = useState(false);
  const [settings, setSettings] = useState<ReservationSettings | null>(null);
  
  // Form fields
  const [propertyName, setPropertyName] = useState("");
  const [address, setAddress] = useState("");
  const [bedrooms, setBedrooms] = useState("");
  const [bathrooms, setBathrooms] = useState("");
  const [maxGuests, setMaxGuests] = useState("");
  const [nightlyRate, setNightlyRate] = useState("");
  const [cleaningFee, setCleaningFee] = useState("");
  const [petFee, setPetFee] = useState("");
  const [damageDeposit, setDamageDeposit] = useState("");
  const [financialMethod, setFinancialMethod] = useState("");

  const fetchSettings = async () => {
    if (!organizationId) return;

    try {
      const { data, error } = await supabase
        .from('reservation_settings')
        .select('*')
        .eq('organization_id', organizationId)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      if (data) {
        setSettings(data);
        setPropertyName(data.property_name || "");
        setAddress(data.address || "");
        setBedrooms(data.bedrooms?.toString() || "");
        setBathrooms(data.bathrooms?.toString() || "");
        setMaxGuests(data.max_guests?.toString() || "");
        setNightlyRate(data.nightly_rate?.toString() || "");
        setCleaningFee(data.cleaning_fee?.toString() || "");
        setPetFee(data.pet_fee?.toString() || "");
        setDamageDeposit(data.damage_deposit?.toString() || "");
        setFinancialMethod(data.financial_method || "");
      }
    } catch (error) {
      console.error('Error fetching reservation settings:', error);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, [organizationId]);

  const saveSettings = async () => {
    if (!organizationId) return;

    setLoading(true);
    try {
      const settingsData = {
        organization_id: organizationId,
        property_name: propertyName || undefined,
        address: address || undefined,
        bedrooms: bedrooms ? parseInt(bedrooms) : undefined,
        bathrooms: bathrooms ? parseInt(bathrooms) : undefined,
        max_guests: maxGuests ? parseInt(maxGuests) : undefined,
        nightly_rate: nightlyRate ? parseFloat(nightlyRate) : undefined,
        cleaning_fee: cleaningFee ? parseFloat(cleaningFee) : undefined,
        pet_fee: petFee ? parseFloat(petFee) : undefined,
        damage_deposit: damageDeposit ? parseFloat(damageDeposit) : undefined,
        financial_method: financialMethod || undefined,
      };

      let error;
      if (settings) {
        // Update existing
        const result = await supabase
          .from('reservation_settings')
          .update(settingsData)
          .eq('id', settings.id);
        error = result.error;
      } else {
        // Create new
        const result = await supabase
          .from('reservation_settings')
          .insert(settingsData);
        error = result.error;
      }

      if (error) throw error;

      toast({
        title: "Success",
        description: "Reservation settings saved successfully!",
      });

      fetchSettings();
    } catch (error) {
      console.error('Error saving reservation settings:', error);
      toast({
        title: "Error",
        description: "Failed to save reservation settings.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => navigate('/supervisor')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Organizations
          </Button>
        </div>

        <div className="text-center space-y-2">
          <h1 className="text-6xl mb-4 font-kaushan text-primary drop-shadow-lg text-center">Reservation Settings</h1>
          <p className="text-muted-foreground">Manage property details and pricing for this organization</p>
        </div>

        {/* Property Details */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Home className="h-5 w-5" />
              Property Details
            </CardTitle>
            <CardDescription>Basic information about the property</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="propertyName">Property Name</Label>
                <Input
                  id="propertyName"
                  placeholder="Enter property name"
                  value={propertyName}
                  onChange={(e) => setPropertyName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="address">Address</Label>
                <Input
                  id="address"
                  placeholder="Enter property address"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="bedrooms">Bedrooms</Label>
                <Input
                  id="bedrooms"
                  type="number"
                  placeholder="Number of bedrooms"
                  value={bedrooms}
                  onChange={(e) => setBedrooms(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="bathrooms">Bathrooms</Label>
                <Input
                  id="bathrooms"
                  type="number"
                  placeholder="Number of bathrooms"
                  value={bathrooms}
                  onChange={(e) => setBathrooms(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="maxGuests">Maximum Guests</Label>
                <Input
                  id="maxGuests"
                  type="number"
                  placeholder="Maximum number of guests"
                  value={maxGuests}
                  onChange={(e) => setMaxGuests(e.target.value)}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Pricing Details */}
        <Card>
          <CardHeader>
            <CardTitle>Pricing & Fees</CardTitle>
            <CardDescription>Set rates and fees for the property</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="nightlyRate">Nightly Rate ($)</Label>
                <Input
                  id="nightlyRate"
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={nightlyRate}
                  onChange={(e) => setNightlyRate(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="cleaningFee">Cleaning Fee ($)</Label>
                <Input
                  id="cleaningFee"
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={cleaningFee}
                  onChange={(e) => setCleaningFee(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="petFee">Pet Fee ($)</Label>
                <Input
                  id="petFee"
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={petFee}
                  onChange={(e) => setPetFee(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="damageDeposit">Damage Deposit ($)</Label>
                <Input
                  id="damageDeposit"
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={damageDeposit}
                  onChange={(e) => setDamageDeposit(e.target.value)}
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="financialMethod">Financial Method</Label>
                <Input
                  id="financialMethod"
                  placeholder="e.g., Venmo, PayPal, Check"
                  value={financialMethod}
                  onChange={(e) => setFinancialMethod(e.target.value)}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Current Settings Summary */}
        {settings && (
          <Card>
            <CardHeader>
              <CardTitle>Current Settings Summary</CardTitle>
              <CardDescription>Overview of saved reservation settings</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3 md:grid-cols-2">
                {settings.property_name && (
                  <div>
                    <div className="font-medium">Property Name</div>
                    <div className="text-muted-foreground">{settings.property_name}</div>
                  </div>
                )}
                {settings.address && (
                  <div>
                    <div className="font-medium">Address</div>
                    <div className="text-muted-foreground">{settings.address}</div>
                  </div>
                )}
                {settings.bedrooms && (
                  <div>
                    <div className="font-medium">Bedrooms</div>
                    <div className="text-muted-foreground">{settings.bedrooms}</div>
                  </div>
                )}
                {settings.bathrooms && (
                  <div>
                    <div className="font-medium">Bathrooms</div>
                    <div className="text-muted-foreground">{settings.bathrooms}</div>
                  </div>
                )}
                {settings.max_guests && (
                  <div>
                    <div className="font-medium">Max Guests</div>
                    <div className="text-muted-foreground">{settings.max_guests}</div>
                  </div>
                )}
                {settings.nightly_rate && (
                  <div>
                    <div className="font-medium">Nightly Rate</div>
                    <div className="text-muted-foreground">${settings.nightly_rate}</div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        <div className="flex justify-end">
          <Button onClick={saveSettings} disabled={loading}>
            <Save className="h-4 w-4 mr-2" />
            {loading ? "Saving..." : "Save Settings"}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default SupervisorOrganizationReservation;