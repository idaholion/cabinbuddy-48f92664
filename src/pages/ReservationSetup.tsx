import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { useFamilyGroups } from "@/hooks/useFamilyGroups";
import { useReservationSettings } from "@/hooks/useReservationSettings";
import { useOrganization } from "@/hooks/useOrganization";
import { useRotationOrder } from "@/hooks/useRotationOrder";
import { supabase } from "@/integrations/supabase/client";

export default function ReservationSetup() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { familyGroups } = useFamilyGroups();
  const { saveReservationSettings, loading } = useReservationSettings();
  const { organization } = useOrganization();
  const { getRotationForYear, rotationData } = useRotationOrder();

  // Rotation saving state
  const [savingRotationOrder, setSavingRotationOrder] = useState(false);
  
  const [rotationYear, setRotationYear] = useState("2025");
  const [maxTimeSlots, setMaxTimeSlots] = useState("2");
  const [maxNights, setMaxNights] = useState("7");
  const [startDay, setStartDay] = useState("Friday");
  const [startTime, setStartTime] = useState("12:00 PM");
  const [rotationOption, setRotationOption] = useState("rotate");
  const [firstLastOption, setFirstLastOption] = useState("first");
  const [rotationOrder, setRotationOrder] = useState<string[]>([]);
  const [startMonth, setStartMonth] = useState("January");
  const [selectionDays, setSelectionDays] = useState("14");
  
  // Setup method selection
  const [setupMethod, setSetupMethod] = useState("rotation");
  
  // Property details
  const [propertyName, setPropertyName] = useState("");
  const [address, setAddress] = useState("");
  const [bedrooms, setBedrooms] = useState("");
  const [bathrooms, setBathrooms] = useState("");
  const [maxGuests, setMaxGuests] = useState("");

  // Load family groups and initialize rotation order
  useEffect(() => {
    if (familyGroups.length > 0) {
      setRotationOrder(new Array(familyGroups.length).fill(''));
    }
    
    // Also load from localStorage for backward compatibility
    const savedData = localStorage.getItem('familySetupData');
    if (savedData) {
      const data = JSON.parse(savedData);
      const groups = data.familyGroups?.filter((group: string) => group.trim() !== '') || [];
      if (groups.length > 0 && familyGroups.length === 0) {
        setRotationOrder(new Array(groups.length).fill(''));
      }
    }
  }, [familyGroups]);

  // Load existing rotation order from database
  useEffect(() => {
    const loadExistingRotationOrder = async () => {
      if (!organization?.id) return;
      
      try {
        const { data, error } = await supabase
          .from('rotation_orders')
          .select('*')
          .eq('organization_id', organization.id)
          .eq('rotation_year', parseInt(rotationYear))
          .single();
        
        if (error && error.code !== 'PGRST116') {
          console.error('Error loading rotation order:', error);
          return;
        }
        
        if (data) {
          // Load all the saved settings
          setMaxTimeSlots(data.max_time_slots?.toString() || "2");
          setMaxNights(data.max_nights?.toString() || "7");
          setStartDay(data.start_day || "Friday");
          setStartTime(data.start_time || "12:00 PM");
          setFirstLastOption(data.first_last_option || "first");
          setStartMonth(data.start_month || "January");
          setSelectionDays(data.selection_days?.toString() || "14");
          
          // Load the rotation order
          const savedOrder = Array.isArray(data.rotation_order) ? data.rotation_order : [];
          if (savedOrder.length > 0) {
            const fullOrder = new Array(familyGroups.length).fill('');
            savedOrder.forEach((group, index) => {
              if (index < fullOrder.length) {
                fullOrder[index] = group;
              }
            });
            setRotationOrder(fullOrder);
          }
        }
      } catch (error) {
        console.error('Error loading rotation order:', error);
      }
    };
    
    if (organization?.id && familyGroups.length > 0) {
      loadExistingRotationOrder();
    }
  }, [organization?.id, familyGroups.length, rotationYear]);

  const handleRotationOrderChange = (index: number, value: string) => {
    const newOrder = [...rotationOrder];
    newOrder[index] = value;
    setRotationOrder(newOrder);
  };

  const handleSaveRotationOrder = async () => {
    if (!organization?.id) {
      toast({
        title: "Error",
        description: "No organization selected",
        variant: "destructive",
      });
      return;
    }

    const filteredRotationOrder = rotationOrder.filter(group => group !== '');
    if (filteredRotationOrder.length === 0) {
      toast({
        title: "Error", 
        description: "Please select at least one family group in the rotation order",
        variant: "destructive",
      });
      return;
    }

    setSavingRotationOrder(true);
    try {
      const { error } = await supabase
        .from('rotation_orders')
        .upsert({
          organization_id: organization.id,
          rotation_year: parseInt(rotationYear),
          rotation_order: filteredRotationOrder,
          max_time_slots: parseInt(maxTimeSlots),
          max_nights: parseInt(maxNights),
          start_day: startDay,
          start_time: startTime,
          first_last_option: firstLastOption,
          start_month: startMonth,
          selection_days: parseInt(selectionDays),
        }, {
          onConflict: 'organization_id,rotation_year'
        });

      if (error) throw error;

      toast({
        title: "Success",
        description: `Rotation order saved for ${rotationYear}`,
      });
    } catch (error) {
      console.error('Error saving rotation order:', error);
      toast({
        title: "Error",
        description: "Failed to save rotation order",
        variant: "destructive",
      });
    } finally {
      setSavingRotationOrder(false);
    }
  };

  const handleSaveReservationSetup = async () => {
    const reservationData = {
      property_name: propertyName || undefined,
      address: address || undefined,
      bedrooms: bedrooms ? parseInt(bedrooms) : undefined,
      bathrooms: bathrooms ? parseInt(bathrooms) : undefined,
      max_guests: maxGuests ? parseInt(maxGuests) : undefined,
    };

    // Save to database
    await saveReservationSettings(reservationData);
    
    // Also save rotation data to localStorage for now
    const rotationData = {
      rotationYear,
      maxTimeSlots,
      maxNights,
      startDay,
      startTime,
      rotationOption,
      firstLastOption,
      rotationOrder: rotationOrder.filter(group => group !== ''),
      timestamp: new Date().toISOString()
    };
    localStorage.setItem('reservationSetupData', JSON.stringify(rotationData));
  };

  const years = Array.from({ length: 15 }, (_, i) => (2020 + i).toString());
  const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
  const times = [
    "12:00 AM", "1:00 AM", "2:00 AM", "3:00 AM", "4:00 AM", "5:00 AM",
    "6:00 AM", "7:00 AM", "8:00 AM", "9:00 AM", "10:00 AM", "11:00 AM",
    "12:00 PM", "1:00 PM", "2:00 PM", "3:00 PM", "4:00 PM", "5:00 PM",
    "6:00 PM", "7:00 PM", "8:00 PM", "9:00 PM", "10:00 PM", "11:00 PM"
  ];

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold">Reservation Setup</h1>
          <p className="text-muted-foreground">Configure rotation and time block preferences</p>
        </div>

        {/* Setup Method Selection */}
        <Card>
          <CardHeader>
            <CardTitle>Calendar Setup Method</CardTitle>
          </CardHeader>
          <CardContent>
            <RadioGroup value={setupMethod} onValueChange={setSetupMethod} className="flex items-center gap-6">
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="rotation" id="rotation-method" />
                <Label htmlFor="rotation-method" className="text-base font-medium">Rotation</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="manual" id="manual-method" />
                <Label htmlFor="manual-method" className="text-base font-medium">Manual Selection</Label>
              </div>
            </RadioGroup>
          </CardContent>
        </Card>

        {/* Rotation Section - Only show if rotation is selected */}
        {setupMethod === "rotation" && (
          <Card>
            <CardHeader>
              <CardTitle>Family Group Order</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <RadioGroup value={rotationOption} onValueChange={setRotationOption} className="flex items-center gap-4">
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="rotate" id="rotate" />
                  <Label htmlFor="rotate" className="text-sm text-muted-foreground">Group Order Rotates</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="fixed" id="fixed" />
                  <Label htmlFor="fixed" className="text-sm text-muted-foreground">Group Order Constant</Label>
                </div>
              </RadioGroup>
              
              <div className="flex items-center gap-4">
                <p className="text-sm">
                  Rotation order starting in 
                </p>
                <Select value={rotationYear} onValueChange={setRotationYear}>
                  <SelectTrigger className="w-24">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {years.map((year) => (
                      <SelectItem key={year} value={year}>{year}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="flex flex-wrap items-center gap-2 text-sm">
                <span>Each Family Group can select</span>
                <Select value={maxTimeSlots} onValueChange={setMaxTimeSlots}>
                  <SelectTrigger className="w-16">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: 5 }, (_, i) => (i + 1).toString()).map((num) => (
                      <SelectItem key={num} value={num}>{num}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <span>time periods, each time period up to</span>
                <Select value={maxNights} onValueChange={setMaxNights}>
                  <SelectTrigger className="w-16">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: 14 }, (_, i) => (i + 1).toString()).map((num) => (
                      <SelectItem key={num} value={num}>{num}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <span>consecutive nights, starting on</span>
                <Select value={startDay} onValueChange={setStartDay}>
                  <SelectTrigger className="w-28">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {days.map((day) => (
                      <SelectItem key={day} value={day}>{day}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <span>at</span>
                <Select value={startTime} onValueChange={setStartTime}>
                  <SelectTrigger className="w-24">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {times.map((time) => (
                      <SelectItem key={time} value={time}>{time}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="flex flex-wrap items-center gap-2 text-sm">
                <span>Each person will have</span>
                <Select value={selectionDays} onValueChange={setSelectionDays}>
                  <SelectTrigger className="w-16">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[3, 5, 7, 10, 14, 21, 30].map((days) => (
                      <SelectItem key={days} value={days.toString()}>{days}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <span>days to make their reservations in the calendar before it moves to the next person in line.</span>
              </div>
              
              <div className="space-y-3">
                 <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                   <span>If Group Order Rotates selected, this order will rotate each year, with the person who selected</span>
                   <Select value={firstLastOption} onValueChange={setFirstLastOption}>
                     <SelectTrigger className="w-20">
                       <SelectValue />
                     </SelectTrigger>
                     <SelectContent>
                       <SelectItem value="first">First</SelectItem>
                       <SelectItem value="last">Last</SelectItem>
                     </SelectContent>
                   </Select>
                   <span>selecting {firstLastOption === "first" ? "last" : "first"} the following year</span>
                 </div>
                 
                 <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                   <span>The selection will start the first day of</span>
                   <Select value={startMonth} onValueChange={setStartMonth}>
                     <SelectTrigger className="w-24">
                       <SelectValue />
                     </SelectTrigger>
                     <SelectContent>
                       {["January", "February", "March", "April", "May", "June", 
                         "July", "August", "September", "October", "November", "December"].map((month) => (
                         <SelectItem key={month} value={month}>{month}</SelectItem>
                       ))}
                     </SelectContent>
                   </Select>
                   <span>each year</span>
                 </div>
              </div>
              
              <div className="space-y-2">
                <Label className="text-sm font-medium">Family Group Rotation Order:</Label>
                {rotationOrder.map((selectedGroup, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <span className="font-medium w-6">{index + 1}.</span>
                    <Select value={selectedGroup} onValueChange={(value) => handleRotationOrderChange(index, value)}>
                      <SelectTrigger className="flex-1">
                        <SelectValue placeholder="Select Family Group" />
                      </SelectTrigger>
                      <SelectContent>
                    {familyGroups.map((group) => (
                      <SelectItem key={group.id} value={group.name}>{group.name}</SelectItem>
                    ))}
                      </SelectContent>
                    </Select>
                  </div>
                ))}
              </div>
              
              <div className="pt-4 border-t">
                <Button 
                  onClick={handleSaveRotationOrder} 
                  disabled={savingRotationOrder}
                  className="w-full"
                >
                  {savingRotationOrder ? "Saving..." : "Save Rotation Order"}
                </Button>
              </div>
              
              {/* Show rotation order preview */}
              {rotationOption === "rotate" && rotationOrder.filter(group => group !== '').length > 0 && (
                <div className="mt-6 p-4 bg-muted rounded-lg">
                  <h4 className="font-medium mb-3">Rotation Order Preview</h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {[0, 1, 2].map((yearOffset) => {
                      const year = parseInt(rotationYear) + yearOffset;
                      const currentOrder = rotationOrder.filter(group => group !== '');
                      
                      // Calculate rotation for this year
                      let yearOrder = [...currentOrder];
                      for (let i = 0; i < yearOffset; i++) {
                        if (firstLastOption === "first") {
                          // Move first person to last position
                          const first = yearOrder.shift();
                          if (first) yearOrder.push(first);
                        } else {
                          // Move last person to first position
                          const last = yearOrder.pop();
                          if (last) yearOrder.unshift(last);
                        }
                      }
                      
                      return (
                        <div key={year} className="space-y-2">
                          <h5 className="text-sm font-medium">{year}:</h5>
                          <div className="space-y-1">
                            {yearOrder.map((group, index) => (
                              <div key={index} className="text-xs p-1 bg-background rounded flex items-center gap-2">
                                <span className="font-medium w-4">{index + 1}.</span>
                                <span>{group}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  <div className="mt-3 text-xs text-muted-foreground">
                    Rotation: {firstLastOption === "first" ? "First person moves to last position each year" : "Last person moves to first position each year"}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Manual Calendar Setup - Only show if manual is selected */}
        {setupMethod === "manual" && (
          <Card>
            <CardHeader>
              <CardTitle>Manual Calendar Setup</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-center py-8">
                <p className="text-muted-foreground mb-4">
                  With manual selection, each family group can directly choose their preferred dates on the calendar without rotation constraints.
                </p>
                <p className="text-sm text-muted-foreground">
                  You can configure additional manual setup options here or proceed to the calendar to start booking dates.
                </p>
              </div>
            </CardContent>
          </Card>
        )}



        {/* Property Details Section */}
        <Card>
          <CardHeader>
            <CardTitle>Property Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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

        <div className="flex justify-between items-center">
          <Button variant="outline" onClick={() => navigate("/financial-setup")}>
            Back
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleSaveReservationSetup} disabled={loading}>
              {loading ? "Saving..." : "Save Setup"}
            </Button>
            <Button onClick={() => navigate("/calendar")}>
              Continue to Calendar
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}