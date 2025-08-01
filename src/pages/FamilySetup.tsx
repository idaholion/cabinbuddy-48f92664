
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { PhoneInput } from "@/components/ui/phone-input";
import { Label } from "@/components/ui/label";
import { Users, Plus, Settings, Copy, X } from "lucide-react";
import { Link, useSearchParams, useNavigate } from "react-router-dom";
import { FamilyGroups } from "@/components/FamilyGroups";
import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { useOrganization } from "@/hooks/useOrganization";
import { useReservationSettings } from "@/hooks/useReservationSettings";
import { unformatPhoneNumber } from "@/lib/phone-utils";

const FamilySetup = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const { organization, createOrganization, updateOrganization, loading: orgLoading } = useOrganization();
  const { reservationSettings, saveReservationSettings, loading: settingsLoading } = useReservationSettings();
  const [searchParams] = useSearchParams();
  
  // Check if this is a "create new" operation
  const isCreatingNew = searchParams.get('mode') === 'create';
  
  // State for organization setup
  const [orgName, setOrgName] = useState("");
  const [propertyName, setPropertyName] = useState("");
  const [adminName, setAdminName] = useState("");
  const [adminPhone, setAdminPhone] = useState("");
  const [adminEmail, setAdminEmail] = useState("");
  const [treasurerName, setTreasurerName] = useState("");
  const [treasurerPhone, setTreasurerPhone] = useState("");
  const [treasurerEmail, setTreasurerEmail] = useState("");
  const [calendarKeeperName, setCalendarKeeperName] = useState("");
  const [calendarKeeperPhone, setCalendarKeeperPhone] = useState("");
  const [calendarKeeperEmail, setCalendarKeeperEmail] = useState("");
  const [familyGroups, setFamilyGroups] = useState<string[]>([""]);

  // Load saved data on component mount
  useEffect(() => {
    // If we're creating a new organization, auto-populate admin data from signup
    if (isCreatingNew) {
      console.log('Creating new organization - checking for signup data');
      const signupData = localStorage.getItem('signupData');
      if (signupData) {
        try {
          const data = JSON.parse(signupData);
          const now = Date.now();
          // Only use data if it's less than 1 hour old
          if (data.timestamp && (now - data.timestamp) < 3600000) {
            setAdminName(`${data.firstName} ${data.lastName}`.trim());
            setAdminEmail(data.email);
            // Clear the signup data after using it
            localStorage.removeItem('signupData');
          }
        } catch (error) {
          console.error('Error parsing signup data:', error);
        }
      }
      return;
    }
    
    // First try to load from database if organization exists
    if (organization) {
      setOrgName(organization.name || "");
      setOrganizationCode(organization.code || generateOrgCode());
      setAdminName(organization.admin_name || "");
      setAdminPhone(organization.admin_phone || "");
      setAdminEmail(organization.admin_email || "");
      setTreasurerName(organization.treasurer_name || "");
      setTreasurerPhone(organization.treasurer_phone || "");
      setTreasurerEmail(organization.treasurer_email || "");
      setCalendarKeeperName(organization.calendar_keeper_name || "");
      setCalendarKeeperPhone(organization.calendar_keeper_phone || "");
      setCalendarKeeperEmail(organization.calendar_keeper_email || "");
    } else {
      // Fallback to localStorage for backward compatibility
      const savedSetup = localStorage.getItem('familySetupData');
      if (savedSetup) {
        const data = JSON.parse(savedSetup);
        setOrgName(data.orgName || "");
        setAdminName(data.adminName || "");
        setAdminPhone(data.adminPhone || "");
        setAdminEmail(data.adminEmail || "");
        setTreasurerName(data.treasurerName || "");
        setTreasurerPhone(data.treasurerPhone || "");
        setTreasurerEmail(data.treasurerEmail || "");
        setCalendarKeeperName(data.calendarKeeperName || "");
        setCalendarKeeperPhone(data.calendarKeeperPhone || "");
        setCalendarKeeperEmail(data.calendarKeeperEmail || "");
        setFamilyGroups(data.familyGroups && data.familyGroups.length > 0 ? data.familyGroups : [""]);
      }
    }
  }, [organization, isCreatingNew]);

  // Load property name from reservation settings
  useEffect(() => {
    if (reservationSettings && !isCreatingNew) {
      setPropertyName(reservationSettings.property_name || "");
    }
  }, [reservationSettings, isCreatingNew]);

  // Save organization setup
  const saveOrganizationSetup = async () => {
    if (!orgName.trim() || !organizationCode.trim()) {
      toast({
        title: "Missing required fields",
        description: "Please provide at least organization name and code.",
        variant: "destructive",
      });
      return;
    }

    const orgData = {
      name: orgName,
      code: organizationCode,
      admin_name: adminName || null,
      admin_email: adminEmail || null,
      admin_phone: adminPhone ? unformatPhoneNumber(adminPhone) : null,
      treasurer_name: treasurerName || null,
      treasurer_email: treasurerEmail || null,
      treasurer_phone: treasurerPhone ? unformatPhoneNumber(treasurerPhone) : null,
      calendar_keeper_name: calendarKeeperName || null,
      calendar_keeper_email: calendarKeeperEmail || null,
      calendar_keeper_phone: calendarKeeperPhone ? unformatPhoneNumber(calendarKeeperPhone) : null,
    };
    
    try {
      let newOrganization;
      if (organization) {
        // Update existing organization
        newOrganization = await updateOrganization(orgData);
      } else {
        // Create new organization
        newOrganization = await createOrganization(orgData);
      }
      
      // Save property name to reservation settings if provided and organization exists
      if (propertyName.trim() && (organization || newOrganization)) {
        await saveReservationSettings({ property_name: propertyName });
      }
      
      // Also save family groups to localStorage for backward compatibility
      const setupData = {
        orgName,
        organizationCode,
        propertyName,
        adminName,
        adminPhone,
        adminEmail,
        treasurerName,
        treasurerPhone,
        treasurerEmail,
        calendarKeeperName,
        calendarKeeperPhone,
        calendarKeeperEmail,
        familyGroups
      };
      
      localStorage.setItem('familySetupData', JSON.stringify(setupData));
      
      // Also save just the family groups for the SelectFamilyGroup page
      const nonEmptyGroups = familyGroups.filter(group => group.trim() !== "");
      localStorage.setItem('familyGroupsList', JSON.stringify(nonEmptyGroups));
    } catch (error) {
      console.error('Error saving organization setup:', error);
    }
  };

  // Save organization setup and navigate to family groups
  const saveAndContinueToFamilyGroups = async () => {
    await saveOrganizationSetup();
    navigate("/family-group-setup");
  };

  // Handle family group input changes
  const handleFamilyGroupChange = (index: number, value: string) => {
    const newFamilyGroups = [...familyGroups];
    newFamilyGroups[index] = value;
    setFamilyGroups(newFamilyGroups);
  };

  // Add a new family group field
  const addFamilyGroup = () => {
    setFamilyGroups(prev => [...prev, ""]);
  };

  // Remove a family group field
  const removeFamilyGroup = (index: number) => {
    if (familyGroups.length > 1) {
      setFamilyGroups(prev => prev.filter((_, i) => i !== index));
    }
  };
  
  // Curated list of family-friendly 6-letter words for organization codes
  const sixLetterWords = [
    'CASTLE', 'BRIDGE', 'GARDEN', 'LAUNCH', 'MARKET', 'NATURE',
    'BRIGHT', 'FRIEND', 'TRAVEL', 'WONDER', 'PLANET', 'SMOOTH',
    'SILVER', 'GOLDEN', 'SIMPLE', 'STRONG', 'GENTLE', 'GLOBAL',
    'MASTER', 'WISDOM', 'BREATH', 'HEALTH', 'SUNSET', 'FUTURE',
    'SPIRIT', 'ENERGY', 'STABLE', 'FAMOUS', 'LEGACY', 'SAFETY',
    'SISTER', 'MOTHER', 'FATHER', 'FAMILY', 'SUPPLY', 'OFFICE',
    'POCKET', 'LETTER', 'NUMBER', 'FINGER', 'CIRCLE', 'MIDDLE',
    'BUTTON', 'LOVELY', 'BOTTLE', 'MENTAL', 'RESULT', 'NOTICE',
    'REMIND', 'NEARLY', 'MOMENT', 'SPRING', 'WINTER', 'SUMMER',
    'CHANGE', 'BEFORE', 'FOLLOW', 'AROUND', 'PURPLE', 'YELLOW',
    'ORANGE', 'PLAYER', 'LEADER', 'FINGER', 'FLOWER', 'SEASON',
    'REASON', 'CHOICE', 'COUSIN', 'LISTEN', 'CAMERA', 'HANDLE',
    'PENCIL', 'CANDLE', 'THREAD', 'NEEDLE', 'NORMAL', 'SCHOOL',
    'BEAUTY', 'RESCUE', 'MODERN', 'ACCESS', 'DOUBLE', 'SINGLE',
    'TACKLE', 'BUCKET', 'SOCKET', 'SWITCH', 'RHYTHM', 'WARMTH'
  ];

  // Generate a unique 6-letter word organization code
  const generateOrgCode = () => {
    const randomIndex = Math.floor(Math.random() * sixLetterWords.length);
    return sixLetterWords[randomIndex];
  };

  const [organizationCode, setOrganizationCode] = useState(() => {
    // If creating new, always generate fresh code
    if (isCreatingNew) {
      return generateOrgCode();
    }
    
    // Check if we have saved data with an existing code
    const savedSetup = localStorage.getItem('familySetupData');
    if (savedSetup) {
      const data = JSON.parse(savedSetup);
      return data.organizationCode || generateOrgCode();
    }
    return generateOrgCode();
  });

  // Check if user is admin (for now, assume admin if they have admin email filled)
  const isAdmin = adminEmail && adminEmail.trim() !== "";

  const regenerateOrgCode = () => {
    setOrganizationCode(generateOrgCode());
    toast({
      title: "Organization code regenerated!",
      description: "A new organization code has been generated.",
    });
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(organizationCode);
    toast({
      title: "Organization code copied!",
      description: "The organization code has been copied to your clipboard.",
    });
  };

  // Copy admin data to treasurer
  const copyAdminToTreasurer = () => {
    setTreasurerName(adminName);
    setTreasurerEmail(adminEmail);
    setTreasurerPhone(adminPhone);
    toast({
      title: "Information copied!",
      description: "Administrator information has been copied to Treasurer.",
    });
  };

  // Copy admin data to calendar keeper
  const copyAdminToCalendarKeeper = () => {
    setCalendarKeeperName(adminName);
    setCalendarKeeperEmail(adminEmail);
    setCalendarKeeperPhone(adminPhone);
    toast({
      title: "Information copied!",
      description: "Administrator information has been copied to Calendar Keeper.",
    });
  };

  return <div className="min-h-screen bg-cover bg-center bg-no-repeat p-4" style={{
    backgroundImage: 'url(/lovable-uploads/45c3083f-46c5-4e30-a2f0-31a24ab454f4.png)'
  }}>
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <Button variant="outline" asChild className="mb-4">
            <Link to="/setup">← Back to Setup</Link>
          </Button>
          <h1 className="text-6xl mb-4 font-kaushan text-primary drop-shadow-lg text-center">Family Organization Setup</h1>
          <p className="text-2xl text-primary text-center font-medium">Setting up your Family Organization and Family Groups list</p>
        </div>

        {/* Combined Family Organization and Groups Setup */}
        <Card className="bg-card/95 mb-8">
          <CardHeader className="pb-2 relative">
            <div className="flex justify-end">
              <Button onClick={saveOrganizationSetup} disabled={orgLoading || settingsLoading}>
                {(orgLoading || settingsLoading) ? "Saving..." : "Save Organization Setup"}
              </Button>
            </div>
            <CardTitle className="text-2xl text-center">Family Organization & Groups Setup</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6 py-4">
            {/* Organization Setup Section */}
            <div className="space-y-4">
              {/* Property Name */}
              <div className="space-y-1">
                <Label htmlFor="propertyName" className="text-xl font-semibold text-center block">Property Name</Label>
                <Input 
                  id="propertyName" 
                  placeholder="Enter property name" 
                  value={propertyName}
                  onChange={(e) => setPropertyName(e.target.value)}
                />
              </div>
              
              {/* Organization Name */}
              <div className="space-y-1">
                <Label htmlFor="orgName" className="text-xl font-semibold text-center block">Family Organization Name</Label>
                <Input 
                  id="orgName" 
                  placeholder="Enter organization name" 
                  value={orgName}
                  onChange={(e) => setOrgName(e.target.value)}
                />
              </div>

              {/* Organization Code */}
              <div className="space-y-2">
                <Label className="text-lg font-semibold text-center block">Organization Code</Label>
                <div className="flex items-center justify-center gap-2">
                  <div className="bg-muted px-4 py-2 rounded-md border-2 border-dashed border-border">
                    <span className="text-2xl font-bold tracking-wider text-primary">{organizationCode}</span>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={copyToClipboard}
                    className="flex items-center gap-1"
                  >
                    <Copy className="h-4 w-4" />
                    Copy
                  </Button>
                  {(isCreatingNew || isAdmin) && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={regenerateOrgCode}
                      className="flex items-center gap-1"
                    >
                      <Settings className="h-4 w-4" />
                      Change Code
                    </Button>
                  )}
                </div>
                <p className="text-sm text-muted-foreground text-center">
                  Share this code with new members to help them join your organization
                  {orgName && orgName.trim() !== "" && (
                    <span className="block text-xs text-green-600 mt-1">
                      Code is locked for "{orgName}". Only administrators can change it.
                    </span>
                  )}
                </p>
              </div>

              {/* Administrator Section */}
              <div className="space-y-2">
                <h3 className="text-xl font-semibold text-center">Administrator</h3>
                <div className="grid gap-2 md:grid-cols-3 text-center items-start">
                  <div className="space-y-1">
                    <Label htmlFor="adminName">Name</Label>
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="adminPhone">Phone Number</Label>
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="adminEmail">Email Address</Label>
                  </div>
                </div>
                <div className="grid gap-2 md:grid-cols-3">
                  <Input 
                    id="adminName" 
                    placeholder="Administrator's full name" 
                    value={adminName}
                    onChange={(e) => setAdminName(e.target.value)}
                  />
                  <PhoneInput 
                    id="adminPhone" 
                    value={adminPhone}
                    onChange={(formatted) => setAdminPhone(formatted)}
                  />
                  <Input 
                    id="adminEmail" 
                    type="email" 
                    placeholder="administrator@example.com" 
                    value={adminEmail}
                    onChange={(e) => setAdminEmail(e.target.value)}
                  />
                </div>
              </div>

              {/* Treasurer Section */}
              <div className="space-y-2">
                <div className="flex items-center justify-center gap-2">
                  <h3 className="text-xl font-semibold">Treasurer</h3>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={copyAdminToTreasurer}
                    className="flex items-center gap-1"
                    title="Copy administrator information to treasurer"
                  >
                    <Copy className="h-3 w-3" />
                    Copy from Admin
                  </Button>
                </div>
                <div className="grid gap-2 md:grid-cols-3 text-center items-start">
                  <div className="space-y-1">
                    <Label htmlFor="treasurerName">Name</Label>
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="treasurerPhone">Phone Number</Label>
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="treasurerEmail">Email Address</Label>
                  </div>
                </div>
                <div className="grid gap-2 md:grid-cols-3">
                  <Input 
                    id="treasurerName" 
                    placeholder="Treasurer's full name" 
                    value={treasurerName}
                    onChange={(e) => setTreasurerName(e.target.value)}
                  />
                  <PhoneInput 
                    id="treasurerPhone" 
                    value={treasurerPhone}
                    onChange={(formatted) => setTreasurerPhone(formatted)}
                  />
                  <Input 
                    id="treasurerEmail" 
                    type="email" 
                    placeholder="treasurer@example.com" 
                    value={treasurerEmail}
                    onChange={(e) => setTreasurerEmail(e.target.value)}
                  />
                </div>
              </div>

              {/* Calendar Keeper Section */}
              <div className="space-y-2">
                <div className="flex items-center justify-center gap-2">
                  <h3 className="text-xl font-semibold">Calendar Keeper</h3>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={copyAdminToCalendarKeeper}
                    className="flex items-center gap-1"
                    title="Copy administrator information to calendar keeper"
                  >
                    <Copy className="h-3 w-3" />
                    Copy from Admin
                  </Button>
                </div>
                <div className="grid gap-2 md:grid-cols-3 text-center items-start">
                  <div className="space-y-1">
                    <Label htmlFor="calendarKeeperName">Name</Label>
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="calendarKeeperPhone">Phone Number</Label>
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="calendarKeeperEmail">Email Address</Label>
                  </div>
                </div>
                <div className="grid gap-2 md:grid-cols-3">
                  <Input 
                    id="calendarKeeperName" 
                    placeholder="Calendar Keeper's full name" 
                    value={calendarKeeperName}
                    onChange={(e) => setCalendarKeeperName(e.target.value)}
                  />
                  <PhoneInput 
                    id="calendarKeeperPhone" 
                    value={calendarKeeperPhone}
                    onChange={(formatted) => setCalendarKeeperPhone(formatted)}
                  />
                  <Input 
                    id="calendarKeeperEmail" 
                    type="email" 
                    placeholder="calendarkeeper@example.com" 
                    value={calendarKeeperEmail}
                    onChange={(e) => setCalendarKeeperEmail(e.target.value)}
                  />
                </div>
              </div>
            </div>

            {/* Family Groups Section */}
            <div className="space-y-4">
              <div>
                <h2 className="text-xl font-semibold text-center border-b pb-2">
                  List of Family Groups ({familyGroups.filter(g => g.trim()).length}/{familyGroups.length})
                </h2>
              </div>
              
              <div className="space-y-3">
                {familyGroups.map((group, index) => (
                  <div key={index} className="flex items-end gap-2">
                    <div className="flex-1 space-y-1">
                      <Label htmlFor={`familyGroup${index}`} className="text-lg font-semibold">Family Group {index + 1}</Label>
                      <Input
                        id={`familyGroup${index}`}
                        placeholder={`Enter Family Group ${index + 1} name`}
                        value={group}
                        onChange={(e) => handleFamilyGroupChange(index, e.target.value)}
                        autoFocus={index === familyGroups.length - 1 && group === ""}
                      />
                    </div>
                    {familyGroups.length > 1 && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => removeFamilyGroup(index)}
                        className="text-destructive hover:text-destructive"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                ))}
                
                <div className="flex justify-center pt-2">
                  <Button
                    variant="outline"
                    onClick={addFamilyGroup}
                    className="flex items-center gap-2"
                  >
                    <Plus className="h-4 w-4" />
                    Add Family Group
                  </Button>
                </div>
              </div>
              
              <div className="text-sm text-muted-foreground text-center mt-4">
                <p>After saving, you can add more details like lead contacts and host members for each family group in the next step.</p>
              </div>
              
              {/* Save and Continue Button */}
              <div className="flex justify-center pt-6 border-t border-border">
                <Button 
                  onClick={saveAndContinueToFamilyGroups} 
                  disabled={orgLoading || settingsLoading}
                  className="w-full max-w-md"
                  size="lg"
                >
                  {(orgLoading || settingsLoading) ? "Saving..." : "Save and Continue to Family Groups"}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

      </div>
    </div>;
};
export default FamilySetup;
