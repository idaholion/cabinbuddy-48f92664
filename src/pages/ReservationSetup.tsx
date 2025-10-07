import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { useNavigate, Link } from "react-router-dom";
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
  
  // Static Weeks configuration
  const [staticWeeksStartDay, setStaticWeeksStartDay] = useState("Friday");
  const [staticWeeksPeriodLength, setStaticWeeksPeriodLength] = useState("7");
  const [staticWeeksRotationDirection, setStaticWeeksRotationDirection] = useState("first");
  const [staticWeeksConfiguration, setStaticWeeksConfiguration] = useState<{[key: string]: number}>({});
  
  // Property details
  const [propertyName, setPropertyName] = useState("");
  const [address, setAddress] = useState("");
  const [bedrooms, setBedrooms] = useState("");
  const [bathrooms, setBathrooms] = useState("");
  const [maxGuests, setMaxGuests] = useState("");
  
  // Season configuration
  const [seasonStartMonth, setSeasonStartMonth] = useState("1");
  const [seasonStartDay, setSeasonStartDay] = useState("1");
  const [seasonEndMonth, setSeasonEndMonth] = useState("12");
  const [seasonEndDay, setSeasonEndDay] = useState("31");
  const [paymentDeadlineOffset, setPaymentDeadlineOffset] = useState("30");
  
  // Secondary selection
  const [enableSecondarySelection, setEnableSecondarySelection] = useState(false);
  const [secondaryMaxPeriods, setSecondaryMaxPeriods] = useState("1");
  const [secondarySelectionDays, setSecondarySelectionDays] = useState("7");
  
  // Post rotation selection
  const [enablePostRotationSelection, setEnablePostRotationSelection] = useState(false);

  // Load family groups and initialize rotation order
  useEffect(() => {
    if (familyGroups.length > 0) {
      setRotationOrder(new Array(familyGroups.length).fill(''));
    }
    
    // Also load from localStorage for backward compatibility
    const savedData = localStorage.getItem('familySetupData');
    if (savedData) {
      const data = JSON.parse(savedData);
      const groups = data.familyGroups?.filter((group: any) => 
        typeof group === 'string' && group.trim() !== ''
      ) || [];
      if (groups.length > 0 && familyGroups.length === 0) {
        setRotationOrder(new Array(groups.length).fill(''));
      }
    }
  }, [familyGroups]);

  // Load existing reservation settings including season data
  useEffect(() => {
    const loadReservationSettings = async () => {
      if (!organization?.id) return;
      
      try {
        const { data, error } = await supabase
          .from('reservation_settings')
          .select('*')
          .eq('organization_id', organization.id)
          .maybeSingle();
        
        if (error && error.code !== 'PGRST116') {
          console.error('Error loading reservation settings:', error);
          return;
        }
        
        if (data) {
          setPropertyName(data.property_name || "");
          setAddress(data.address || "");
          setBedrooms(data.bedrooms?.toString() || "");
          setBathrooms(data.bathrooms?.toString() || "");
          setMaxGuests(data.max_guests?.toString() || "");
          setSeasonStartMonth(data.season_start_month?.toString() || "1");
          setSeasonStartDay(data.season_start_day?.toString() || "1");
          setSeasonEndMonth(data.season_end_month?.toString() || "12");
          setSeasonEndDay(data.season_end_day?.toString() || "31");
          setPaymentDeadlineOffset(data.season_payment_deadline_offset_days?.toString() || "30");
        }
      } catch (error) {
        console.error('Error in loadReservationSettings:', error);
      }
    };
    
    if (organization?.id) {
      loadReservationSettings();
    }
  }, [organization?.id]);

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
          // Check if this is a manual setup (indicated by 'manual_mode' in rotation_order)
          // or static weeks setup (indicated by 'static_weeks_mode' in rotation_order)
          const savedOrder = Array.isArray(data.rotation_order) ? data.rotation_order : [];
          if (savedOrder.length === 1 && savedOrder[0] === 'manual_mode') {
            setSetupMethod('manual');
          } else if (savedOrder.length === 1 && savedOrder[0] === 'static_weeks_mode') {
            setSetupMethod('static-weeks');
            
            // Load static weeks settings
            setStaticWeeksStartDay(data.start_day || "Friday");
            setStaticWeeksPeriodLength(data.max_nights?.toString() || "7");
            setStaticWeeksRotationDirection(data.first_last_option || "first");
          } else {
            setSetupMethod('rotation');
            
            // Load all the saved settings for rotation mode
            setMaxTimeSlots(data.max_time_slots?.toString() || "2");
            setMaxNights(data.max_nights?.toString() || "7");
            setStartDay(data.start_day || "Friday");
            setStartTime(data.start_time || "12:00 PM");
            setFirstLastOption(data.first_last_option || "first");
            setStartMonth(data.start_month || "January");
            setSelectionDays(data.selection_days?.toString() || "14");
            setEnableSecondarySelection(data.enable_secondary_selection || false);
            setSecondaryMaxPeriods(data.secondary_max_periods?.toString() || "1");
            setSecondarySelectionDays(data.secondary_selection_days?.toString() || "7");
            setEnablePostRotationSelection((data as any).enable_post_rotation_selection || false);
            
            // Load the rotation order - use saved order directly
            if (savedOrder.length > 0) {
              setRotationOrder(savedOrder.map(String));
            }
          }
        }
      } catch (error) {
        console.error('Error loading rotation order:', error);
      }
    };
    
    if (organization?.id) {
      loadExistingRotationOrder();
    }
  }, [organization?.id, rotationYear]);

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

    // Validation for rotation method
    if (setupMethod === "rotation") {
      const filteredRotationOrder = rotationOrder.filter(group => group !== '');
      if (filteredRotationOrder.length === 0) {
        toast({
          title: "Error", 
          description: "Please select at least one family group in the rotation order",
          variant: "destructive",
        });
        return;
      }
    }

    setSavingRotationOrder(true);
    try {
      let saveData;
      
      if (setupMethod === "static-weeks") {
        // For static weeks, save configuration differently
        saveData = {
          organization_id: organization.id,
          rotation_year: parseInt(rotationYear),
          rotation_order: ['static_weeks_mode'], // Flag to identify static weeks mode
          max_time_slots: 0, // Not used in static weeks
          max_nights: parseInt(staticWeeksPeriodLength),
          start_day: staticWeeksStartDay,
          start_time: null, // Not used in static weeks
          first_last_option: staticWeeksRotationDirection,
          start_month: null, // Not used in static weeks
          selection_days: 0, // Not used in static weeks
          enable_secondary_selection: false,
          secondary_max_periods: 0,
          enable_post_rotation_selection: false,
        };
      } else {
        // For rotation method
        const filteredRotationOrder = rotationOrder.filter(group => group !== '');
        saveData = {
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
          enable_secondary_selection: enableSecondarySelection,
          secondary_max_periods: parseInt(secondaryMaxPeriods),
          secondary_selection_days: parseInt(secondarySelectionDays),
          enable_post_rotation_selection: enablePostRotationSelection,
        };
      }

      const { error } = await supabase
        .from('rotation_orders')
        .upsert(saveData, {
          onConflict: 'organization_id,rotation_year'
        });

      if (error) throw error;

      const successMessage = setupMethod === "static-weeks" 
        ? `Static weeks configuration saved for ${rotationYear}`
        : `Rotation order saved for ${rotationYear}`;

      toast({
        title: "Success",
        description: successMessage,
      });
    } catch (error) {
      console.error('Error saving configuration:', error);
      toast({
        title: "Error",
        description: "Failed to save configuration",
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
      season_start_month: seasonStartMonth ? parseInt(seasonStartMonth) : undefined,
      season_start_day: seasonStartDay ? parseInt(seasonStartDay) : undefined,
      season_end_month: seasonEndMonth ? parseInt(seasonEndMonth) : undefined,
      season_end_day: seasonEndDay ? parseInt(seasonEndDay) : undefined,
      season_payment_deadline_offset_days: paymentDeadlineOffset ? parseInt(paymentDeadlineOffset) : undefined,
    };

    // Save to database
    await saveReservationSettings(reservationData);
    
    // Save setup method to rotation_orders table to track the mode
    if (organization?.id) {
      try {
        let setupData;
        
        if (setupMethod === 'manual') {
          setupData = {
            organization_id: organization.id,
            rotation_year: parseInt(rotationYear),
            rotation_order: ['manual_mode'],
            max_time_slots: 0,
            max_nights: 0,
            start_day: null,
            start_time: null,
            first_last_option: null,
            start_month: null,
            selection_days: 0,
            enable_secondary_selection: false,
            secondary_max_periods: 0,
            enable_post_rotation_selection: false,
          };
        } else if (setupMethod === 'static-weeks') {
          setupData = {
            organization_id: organization.id,
            rotation_year: parseInt(rotationYear),
            rotation_order: ['static_weeks_mode'],
            max_time_slots: 0,
            max_nights: parseInt(staticWeeksPeriodLength),
            start_day: staticWeeksStartDay,
            start_time: null,
            first_last_option: staticWeeksRotationDirection,
            start_month: null,
            selection_days: 0,
            enable_secondary_selection: false,
            secondary_max_periods: 0,
            enable_post_rotation_selection: false,
          };
        } else {
          setupData = {
            organization_id: organization.id,
            rotation_year: parseInt(rotationYear),
            rotation_order: rotationOrder.filter(group => group !== ''),
            max_time_slots: parseInt(maxTimeSlots),
            max_nights: parseInt(maxNights),
            start_day: startDay,
            start_time: startTime,
            first_last_option: firstLastOption,
            start_month: startMonth,
            selection_days: parseInt(selectionDays),
            enable_secondary_selection: enableSecondarySelection,
            secondary_max_periods: parseInt(secondaryMaxPeriods),
            secondary_selection_days: parseInt(secondarySelectionDays),
            enable_post_rotation_selection: enablePostRotationSelection,
          };
        }

        const { error } = await supabase
          .from('rotation_orders')
          .upsert(setupData, {
            onConflict: 'organization_id,rotation_year'
          });

        if (error) throw error;
      } catch (error) {
        console.error('Error saving setup method:', error);
      }
    }
    
    // Also save rotation data to localStorage for now
    const rotationData = {
      setupMethod,
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
        <div className="mb-4">
          <Button variant="outline" asChild>
            <Link to="/setup">← Back to Setup</Link>
          </Button>
        </div>
        <div className="text-center space-y-2">
          <h1 className="text-6xl mb-4 font-kaushan text-primary drop-shadow-lg text-center">Reservation Setup</h1>
          <p className="text-2xl text-primary text-center font-medium">Configure rotation and time block preferences</p>
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
                <RadioGroupItem value="static-weeks" id="static-weeks-method" />
                <Label htmlFor="static-weeks-method" className="text-base font-medium">Static Weeks</Label>
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
                  <Label htmlFor="rotate" className="text-base text-foreground">Group Order Rotates</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="fixed" id="fixed" />
                  <Label htmlFor="fixed" className="text-base text-foreground">Group Order Constant</Label>
                </div>
              </RadioGroup>
              
              <div className="flex items-center gap-4">
                <p className="text-base">
                  Rotation order starting in 
                </p>
                <Select value={rotationYear} onValueChange={setRotationYear}>
                  <SelectTrigger className="w-24 text-lg">
                    <SelectValue className="text-lg" />
                  </SelectTrigger>
                  <SelectContent className="text-lg">
                    {years.map((year) => (
                      <SelectItem key={year} value={year} className="text-lg">{year}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="flex flex-wrap items-center gap-2 text-base">
                <span>Each Family Group can select</span>
                <Select value={maxTimeSlots} onValueChange={setMaxTimeSlots}>
                  <SelectTrigger className="w-16 text-lg">
                    <SelectValue className="text-lg" />
                  </SelectTrigger>
                  <SelectContent className="text-lg">
                    {Array.from({ length: 5 }, (_, i) => (i + 1).toString()).map((num) => (
                      <SelectItem key={num} value={num} className="text-lg">{num}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <span>time periods, each time period up to</span>
                <Select value={maxNights} onValueChange={setMaxNights}>
                  <SelectTrigger className="w-16 text-lg">
                    <SelectValue className="text-lg" />
                  </SelectTrigger>
                  <SelectContent className="text-lg">
                    {Array.from({ length: 14 }, (_, i) => (i + 1).toString()).map((num) => (
                      <SelectItem key={num} value={num} className="text-lg">{num}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <span>consecutive nights, starting on</span>
                <Select value={startDay} onValueChange={setStartDay}>
                  <SelectTrigger className="w-28 text-lg">
                    <SelectValue className="text-lg" />
                  </SelectTrigger>
                  <SelectContent className="text-lg">
                    {days.map((day) => (
                      <SelectItem key={day} value={day} className="text-lg">{day}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <span>at</span>
                <Select value={startTime} onValueChange={setStartTime}>
                  <SelectTrigger className="w-24 text-lg">
                    <SelectValue className="text-lg" />
                  </SelectTrigger>
                  <SelectContent className="text-lg">
                    {times.map((time) => (
                      <SelectItem key={time} value={time} className="text-lg">{time}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="flex flex-wrap items-center gap-2 text-base">
                <span>Each person will have</span>
                <Select value={selectionDays} onValueChange={setSelectionDays}>
                  <SelectTrigger className="w-16 text-lg">
                    <SelectValue className="text-lg" />
                  </SelectTrigger>
                  <SelectContent className="text-lg">
                    {[3, 5, 7, 10, 14, 21, 30].map((days) => (
                      <SelectItem key={days} value={days.toString()} className="text-lg">{days}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <span>days to make their reservations in the calendar before it moves to the next person in line.</span>
              </div>
              
              <div className="space-y-3">
                 <div className="flex flex-wrap items-center gap-2 text-base text-foreground">
                    <span>If Group Order Rotates selected, this order will rotate each year, with the person who selected</span>
                    <Select value={firstLastOption} onValueChange={setFirstLastOption}>
                      <SelectTrigger className="w-20 text-lg">
                        <SelectValue className="text-lg" />
                      </SelectTrigger>
                      <SelectContent className="text-lg">
                        <SelectItem value="first" className="text-lg">First</SelectItem>
                        <SelectItem value="last" className="text-lg">Last</SelectItem>
                      </SelectContent>
                    </Select>
                    <span>selecting {firstLastOption === "first" ? "last" : "first"} the following year.</span>
                  </div>
                 
                 <div className="flex flex-wrap items-center gap-2 text-base text-foreground">
                   <span>The selection will start the first day of</span>
                    <Select value={startMonth} onValueChange={setStartMonth}>
                      <SelectTrigger className="w-36 text-lg">
                        <SelectValue className="text-lg" />
                      </SelectTrigger>
                     <SelectContent className="text-lg">
                       {["January", "February", "March", "April", "May", "June", 
                         "July", "August", "September", "October", "November", "December"].map((month) => (
                         <SelectItem key={month} value={month} className="text-lg">{month}</SelectItem>
                       ))}
                     </SelectContent>
                   </Select>
                   <span>each year</span>
                 </div>
              </div>
              
              <div className="space-y-2">
                <Label className="text-base font-medium">Family Group Rotation Order in {rotationYear}:</Label>
                {rotationOrder.map((selectedGroup, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <span className="font-medium w-6">{index + 1}.</span>
                   <Select value={selectedGroup} onValueChange={(value) => handleRotationOrderChange(index, value)}>
                     <SelectTrigger className="flex-1 text-lg">
                       <SelectValue placeholder="Select Family Group" className="text-lg" />
                     </SelectTrigger>
                       <SelectContent className="text-lg">
                    {familyGroups
                      .filter(group => !rotationOrder.includes(group.name) || rotationOrder[index] === group.name)
                      .map((group) => (
                        <SelectItem key={group.id} value={group.name} className="text-lg">{group.name}</SelectItem>
                      ))}
                       </SelectContent>
                    </Select>
                  </div>
                ))}
              </div>
              
              {/* Secondary Selection Section */}
              <div className="space-y-4 pt-4 border-t">
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="enableSecondarySelection"
                    checked={enableSecondarySelection}
                    onCheckedChange={(checked) => setEnableSecondarySelection(checked === true)}
                  />
                  <Label htmlFor="enableSecondarySelection" className="text-base font-medium">
                    Enable Secondary Week Selection
                  </Label>
                </div>
                
                {enableSecondarySelection && (
                  <div className="pl-6 space-y-3">
                    <div className="p-3 bg-muted rounded-lg">
                      <p className="text-base text-foreground mb-2">
                        <strong>How Secondary Selection Works:</strong>
                      </p>
                      <ul className="text-base text-foreground space-y-1 list-disc list-inside">
                        <li>After all family groups complete their primary selections ({maxTimeSlots} periods each)</li>
                        <li>A secondary round automatically begins</li>
                        <li>Selection order follows <strong>reverse order</strong> from the last person who selected in the primary round</li>
                        <li>Each family group can select up to {secondaryMaxPeriods} additional period(s)</li>
                      </ul>
                    </div>
                    
                    <div className="flex flex-wrap items-center gap-2 text-base">
                      <span>In the secondary round, each family group can select up to</span>
                      <Select value={secondaryMaxPeriods} onValueChange={setSecondaryMaxPeriods}>
                        <SelectTrigger className="w-16 text-lg">
                          <SelectValue className="text-lg" />
                        </SelectTrigger>
                        <SelectContent className="text-lg">
                          {Array.from({ length: 3 }, (_, i) => (i + 1).toString()).map((num) => (
                            <SelectItem key={num} value={num} className="text-lg">{num}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <span>additional time period(s)</span>
                    </div>
                    
                    <div className="flex flex-wrap items-center gap-2 text-base">
                      <span>Each family group has</span>
                      <Select value={secondarySelectionDays} onValueChange={setSecondarySelectionDays}>
                        <SelectTrigger className="w-16 text-lg">
                          <SelectValue className="text-lg" />
                        </SelectTrigger>
                        <SelectContent className="text-lg">
                          {Array.from({ length: 14 }, (_, i) => (i + 1).toString()).map((num) => (
                            <SelectItem key={num} value={num} className="text-lg">{num}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <span>days to make their secondary selection</span>
                    </div>
                  </div>
                )}
              </div>
              
              {/* Post Rotation Selection Section */}
              <div className="space-y-4 pt-4 border-t">
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="enablePostRotationSelection"
                    checked={enablePostRotationSelection}
                    onCheckedChange={(checked) => setEnablePostRotationSelection(checked === true)}
                  />
                  <Label htmlFor="enablePostRotationSelection" className="text-base font-medium">
                    Enable Post Rotation Selection
                  </Label>
                </div>
                
                {enablePostRotationSelection && (
                  <div className="pl-6 space-y-3">
                    <div className="p-3 bg-muted rounded-lg">
                      <p className="text-base text-foreground mb-2">
                        <strong>How Post Rotation Selection Works:</strong>
                      </p>
                      <ul className="text-base text-foreground space-y-1 list-disc list-inside">
                        <li>After secondary selection completes (or primary if secondary is disabled)</li>
                        <li>Open first-come, first-served booking for all available dates</li>
                        <li>Any family group or authorized host member can make reservations</li>
                        <li>Calendar keeper can manually add reservations for any family group</li>
                      </ul>
                    </div>
                    
                    <div className="text-base text-foreground">
                      <p className="mb-2">Additional limits and restrictions can be configured here:</p>
                      <div className="p-2 bg-background rounded border border-dashed">
                        <p className="text-base text-foreground italic">
                          Future configuration options (e.g., max additional periods per group, booking windows, etc.) 
                          will be added here as needed.
                        </p>
                      </div>
                    </div>
                  </div>
                )}
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
                          <h5 className="text-base font-medium">{year}:</h5>
                          <div className="space-y-1">
                            {yearOrder.map((group, index) => (
                              <div key={index} className="text-base p-1 bg-background rounded flex items-center gap-2">
                                <span className="font-medium w-4">{index + 1}.</span>
                                <span>{group}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  <div className="mt-3 text-base text-foreground">
                    Rotation: {firstLastOption === "first" ? "First person moves to last position each year" : "Last person moves to first position each year"}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Static Weeks Setup - Only show if static-weeks is selected */}
        {setupMethod === "static-weeks" && (
          <Card>
            <CardHeader>
              <CardTitle>Static Weeks Configuration</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-4 bg-indigo-50 border-l-4 border-indigo-400 rounded-r-lg">
                <h4 className="text-lg font-semibold text-indigo-800 mb-2">How Static Weeks Work</h4>
                <div className="space-y-2 text-indigo-700">
                  <p className="text-base mb-3">
                    In the Static Weeks system, specific weeks throughout the year are assigned permanent numbers, 
                    and family groups are assigned to those numbered weeks.
                  </p>
                  <div className="space-y-2">
                    <div className="flex items-start gap-2">
                      <span className="text-indigo-600 font-bold">•</span>
                      <span className="text-base">First year: Family Group 1 gets weeks labeled "1", Family Group 2 gets weeks labeled "2", etc.</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="text-indigo-600 font-bold">•</span>
                      <span className="text-base">Following years: Groups rotate to the next number (Group 1 → Week 2, Group 2 → Week 3, etc.)</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="text-indigo-600 font-bold">•</span>
                      <span className="text-base">Calendar keeper assigns week numbers to specific calendar dates</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  <p className="text-base">
                    Starting year for static weeks assignment:
                  </p>
                  <Select value={rotationYear} onValueChange={setRotationYear}>
                    <SelectTrigger className="w-24 text-lg">
                      <SelectValue className="text-lg" />
                    </SelectTrigger>
                    <SelectContent className="text-lg">
                      {years.map((year) => (
                        <SelectItem key={year} value={year} className="text-lg">{year}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex flex-wrap items-center gap-2 text-base">
                  <span>Each reservation period lasts</span>
                  <Select value={staticWeeksPeriodLength} onValueChange={setStaticWeeksPeriodLength}>
                    <SelectTrigger className="w-16 text-lg">
                      <SelectValue className="text-lg" />
                    </SelectTrigger>
                    <SelectContent className="text-lg">
                      {Array.from({ length: 14 }, (_, i) => (i + 1).toString()).map((num) => (
                        <SelectItem key={num} value={num} className="text-lg">{num}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <span>consecutive nights, starting on</span>
                  <Select value={staticWeeksStartDay} onValueChange={setStaticWeeksStartDay}>
                    <SelectTrigger className="w-28 text-lg">
                      <SelectValue className="text-lg" />
                    </SelectTrigger>
                    <SelectContent className="text-lg">
                      {days.map((day) => (
                        <SelectItem key={day} value={day} className="text-lg">{day}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex flex-wrap items-center gap-2 text-base text-foreground">
                  <span>Each year, groups rotate with the</span>
                  <Select value={staticWeeksRotationDirection} onValueChange={setStaticWeeksRotationDirection}>
                    <SelectTrigger className="w-20 text-lg">
                      <SelectValue className="text-lg" />
                    </SelectTrigger>
                    <SelectContent className="text-lg">
                      <SelectItem value="first" className="text-lg">First</SelectItem>
                      <SelectItem value="last" className="text-lg">Last</SelectItem>
                    </SelectContent>
                  </Select>
                  <span>group moving to {staticWeeksRotationDirection === "first" ? "the last week number" : "the first week number"}</span>
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-base font-medium">Family Group Week Assignments for {rotationYear}:</Label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {familyGroups.map((group, index) => (
                    <div key={group.id} className="flex items-center gap-2 p-2 bg-muted rounded">
                      <span className="font-medium text-base w-20">Week {index + 1}:</span>
                      <span className="text-base">{group.name}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Week Assignment Calendar Instructions */}
              <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <h5 className="font-medium text-yellow-800 mb-2">Calendar Keeper Week Assignment:</h5>
                <div className="text-base text-yellow-700 space-y-2">
                  <p>
                    After saving this configuration, the Calendar Keeper can assign week numbers to specific calendar dates. 
                    For example, they might assign:
                  </p>
                  <ul className="list-disc list-inside space-y-1 ml-4">
                    <li>Week 1: Memorial Day weekend (May 24-31)</li>
                    <li>Week 2: July 4th week (July 1-8)</li>
                    <li>Week 3: Labor Day weekend (September 1-8)</li>
                    <li>Week 4: Thanksgiving week (November 21-28)</li>
                  </ul>
                  <p className="mt-2">
                    Family groups will then be automatically assigned to their corresponding numbered weeks based on the rotation.
                  </p>
                </div>
              </div>

              {/* Show rotation preview for static weeks */}
              {familyGroups.length > 0 && (
                <div className="mt-6 p-4 bg-muted rounded-lg">
                  <h4 className="font-medium mb-3">Static Weeks Rotation Preview</h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {[0, 1, 2].map((yearOffset) => {
                      const year = parseInt(rotationYear) + yearOffset;
                      const groupNames = familyGroups.map(g => g.name);
                      
                      // Calculate rotation for this year
                      let yearOrder = [...groupNames];
                      for (let i = 0; i < yearOffset; i++) {
                        if (staticWeeksRotationDirection === "first") {
                          // Move first group to last position
                          const first = yearOrder.shift();
                          if (first) yearOrder.push(first);
                        } else {
                          // Move last group to first position
                          const last = yearOrder.pop();
                          if (last) yearOrder.unshift(last);
                        }
                      }
                      
                      return (
                        <div key={year} className="space-y-2">
                          <h5 className="text-base font-medium">{year}:</h5>
                          <div className="space-y-1">
                            {yearOrder.map((group, index) => (
                              <div key={index} className="text-base p-1 bg-background rounded flex items-center gap-2">
                                <span className="font-medium w-12">Week {index + 1}:</span>
                                <span>{group}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  <div className="mt-3 text-base text-foreground">
                    Rotation: {staticWeeksRotationDirection === "first" ? "First group moves to last week each year" : "Last group moves to first week each year"}
                  </div>
                </div>
              )}

              <div className="pt-4 border-t">
                <Button 
                  onClick={handleSaveRotationOrder} 
                  disabled={savingRotationOrder}
                  className="w-full"
                >
                  {savingRotationOrder ? "Saving..." : "Save Static Weeks Configuration"}
                </Button>
              </div>
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
              <div className="p-4 bg-amber-50 border-l-4 border-amber-400 rounded-r-lg">
                <h4 className="text-lg font-semibold text-amber-800 mb-2">Calendar Keeper Control</h4>
                <p className="text-amber-700 mb-3">
                  With manual calendar setup, <strong>only the Calendar Keeper</strong> has permission to create, modify, or delete reservations.
                </p>
                <div className="space-y-2">
                  <div className="flex items-start gap-2">
                    <span className="text-green-600 font-bold">✓</span>
                    <span className="text-base text-amber-700">Calendar Keeper can manually input all reservation data</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-green-600 font-bold">✓</span>
                    <span className="text-base text-amber-700">Calendar Keeper can assign reservations to any family group</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-red-600 font-bold">✗</span>
                    <span className="text-base text-amber-700">Family groups cannot make their own reservations</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-red-600 font-bold">✗</span>
                    <span className="text-base text-amber-700">No automated rotation or selection process</span>
                  </div>
                </div>
              </div>
              
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <h5 className="font-medium text-blue-800 mb-2">How Manual Calendar Works:</h5>
                <ol className="text-base text-blue-700 space-y-1 list-decimal list-inside">
                  <li>Calendar Keeper receives booking requests via email, phone, or other communication</li>
                  <li>Calendar Keeper manually enters reservation details in the calendar</li>
                  <li>Family groups can view the calendar but cannot create or modify reservations</li>
                  <li>All reservation management is handled by the Calendar Keeper</li>
                </ol>
              </div>
              
              <div className="text-center py-4">
                <p className="text-foreground text-base">
                  This setup is ideal for organizations that prefer centralized booking management 
                  or have specific approval processes for reservations.
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
                <Label htmlFor="propertyName" className="text-base">Property Name</Label>
                <Input 
                  id="propertyName"
                  placeholder="Enter property name"
                  value={propertyName}
                  onChange={(e) => setPropertyName(e.target.value)}
                  className="text-lg placeholder:text-lg md:text-lg"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="address" className="text-base">Address</Label>
                <Input 
                  id="address"
                  placeholder="Enter property address"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="text-lg placeholder:text-lg md:text-lg"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="bedrooms" className="text-base">Bedrooms</Label>
                <Input 
                  id="bedrooms"
                  type="number"
                  placeholder="Number of bedrooms"
                  value={bedrooms}
                  onChange={(e) => setBedrooms(e.target.value)}
                  className="text-lg placeholder:text-lg md:text-lg"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="bathrooms" className="text-base">Bathrooms</Label>
                <Input 
                  id="bathrooms"
                  type="number"
                  placeholder="Number of bathrooms"
                  value={bathrooms}
                  onChange={(e) => setBathrooms(e.target.value)}
                  className="text-lg placeholder:text-lg md:text-lg"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="maxGuests" className="text-base">Maximum Guests</Label>
                <Input 
                  id="maxGuests"
                  type="number"
                  placeholder="Maximum number of guests"
                  value={maxGuests}
                  onChange={(e) => setMaxGuests(e.target.value)}
                  className="text-lg placeholder:text-lg md:text-lg"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Season Configuration Section */}
        <Card>
          <CardHeader>
            <CardTitle>Season Configuration</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-base text-muted-foreground">
              Define your cabin's usage season for billing calculations and payment tracking. This determines which reservations are included in season summaries.
            </p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Season Start Date */}
              <div className="space-y-3">
                <Label className="text-base font-medium">Season Start Date</Label>
                <div className="flex gap-3">
                  <div className="flex-1 space-y-2">
                    <Label htmlFor="seasonStartMonth" className="text-sm text-muted-foreground">Month</Label>
                    <Select value={seasonStartMonth} onValueChange={setSeasonStartMonth}>
                      <SelectTrigger id="seasonStartMonth" className="text-lg">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="text-lg">
                        {Array.from({ length: 12 }, (_, i) => i + 1).map((month) => (
                          <SelectItem key={month} value={month.toString()} className="text-lg">
                            {new Date(2000, month - 1, 1).toLocaleString('default', { month: 'long' })}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="w-24 space-y-2">
                    <Label htmlFor="seasonStartDay" className="text-sm text-muted-foreground">Day</Label>
                    <Select value={seasonStartDay} onValueChange={setSeasonStartDay}>
                      <SelectTrigger id="seasonStartDay" className="text-lg">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="text-lg max-h-[300px]">
                        {Array.from({ length: 31 }, (_, i) => i + 1).map((day) => (
                          <SelectItem key={day} value={day.toString()} className="text-lg">
                            {day}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              {/* Season End Date */}
              <div className="space-y-3">
                <Label className="text-base font-medium">Season End Date</Label>
                <div className="flex gap-3">
                  <div className="flex-1 space-y-2">
                    <Label htmlFor="seasonEndMonth" className="text-sm text-muted-foreground">Month</Label>
                    <Select value={seasonEndMonth} onValueChange={setSeasonEndMonth}>
                      <SelectTrigger id="seasonEndMonth" className="text-lg">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="text-lg">
                        {Array.from({ length: 12 }, (_, i) => i + 1).map((month) => (
                          <SelectItem key={month} value={month.toString()} className="text-lg">
                            {new Date(2000, month - 1, 1).toLocaleString('default', { month: 'long' })}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="w-24 space-y-2">
                    <Label htmlFor="seasonEndDay" className="text-sm text-muted-foreground">Day</Label>
                    <Select value={seasonEndDay} onValueChange={setSeasonEndDay}>
                      <SelectTrigger id="seasonEndDay" className="text-lg">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="text-lg max-h-[300px]">
                        {Array.from({ length: 31 }, (_, i) => i + 1).map((day) => (
                          <SelectItem key={day} value={day.toString()} className="text-lg">
                            {day}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            </div>

            {/* Payment Deadline Offset */}
            <div className="space-y-2">
              <Label htmlFor="paymentDeadline" className="text-base font-medium">
                Payment Deadline (Days Before Season Start)
              </Label>
              <Input 
                id="paymentDeadline"
                type="number"
                min="0"
                placeholder="e.g., 30"
                value={paymentDeadlineOffset}
                onChange={(e) => setPaymentDeadlineOffset(e.target.value)}
                className="text-lg placeholder:text-lg md:text-lg max-w-xs"
              />
              <p className="text-sm text-muted-foreground">
                Payments will be due this many days before the season starts
              </p>
            </div>

            {/* Example Display */}
            <div className="p-4 bg-muted rounded-lg">
              <h5 className="font-medium mb-2">Season Example:</h5>
              <div className="text-base space-y-1">
                <p>
                  <span className="font-medium">Season runs:</span>{" "}
                  {new Date(2000, parseInt(seasonStartMonth) - 1, parseInt(seasonStartDay)).toLocaleDateString('en-US', { month: 'long', day: 'numeric' })} 
                  {" to "}
                  {new Date(2000, parseInt(seasonEndMonth) - 1, parseInt(seasonEndDay)).toLocaleDateString('en-US', { month: 'long', day: 'numeric' })}
                  {parseInt(seasonStartMonth) > parseInt(seasonEndMonth) && " (crosses calendar year)"}
                </p>
                <p className="text-sm text-muted-foreground mt-2">
                  Common examples: Year-round (Jan 1 - Dec 31), Summer cabin (May 1 - Sep 30), Ski season (Nov 1 - Apr 30)
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-between items-center">
          <Button variant="outline" onClick={() => navigate("/financial-setup")} className="text-base">
            Back
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleSaveReservationSetup} disabled={loading} className="text-base">
              {loading ? "Saving..." : "Save Setup"}
            </Button>
            <Button onClick={() => navigate("/calendar-keeper-management")} className="text-base">
              Continue to Calendar Keeper Management
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}