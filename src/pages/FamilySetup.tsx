import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { PhoneInput } from "@/components/ui/phone-input";
import { Label } from "@/components/ui/label";
import { Users, Plus, Settings, Copy, X } from "lucide-react";
import { Link, useSearchParams, useNavigate } from "react-router-dom";
import { FamilyGroups } from "@/components/FamilyGroups";
import { AdminProfileClaimingStep } from "@/components/AdminProfileClaimingStep";
import { useState, useEffect, useRef } from "react";
import { useToast } from "@/hooks/use-toast";
import { useOrganization } from "@/hooks/useOrganization";
import { useReservationSettings } from "@/hooks/useReservationSettings";
import { useAuth } from "@/contexts/AuthContext";
import { useFamilyGroups } from "@/hooks/useFamilyGroups";

import { useAutoSave } from "@/hooks/useAutoSave";
import { unformatPhoneNumber } from "@/lib/phone-utils";

import { supabase } from "@/integrations/supabase/client";

const FamilySetup = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { organization, createOrganization, updateOrganization, loading: orgLoading } = useOrganization();
  const { reservationSettings, saveReservationSettings, loading: settingsLoading } = useReservationSettings();
  const { familyGroups: existingFamilyGroups } = useFamilyGroups();
  
  const [searchParams] = useSearchParams();
  
  // Check if this is a "create new" operation
  const isCreatingNew = searchParams.get('mode') === 'create';
  
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
  const [familyGroups, setFamilyGroups] = useState<{name: string, leadFirstName: string, leadLastName: string}[]>([{name: "", leadFirstName: "", leadLastName: ""}]);
  const [organizationCode, setOrganizationCode] = useState(generateOrgCode);
  const [adminFamilyGroup, setAdminFamilyGroup] = useState("");
  const [showProfileClaimingStep, setShowProfileClaimingStep] = useState(false);
  const hasShownToastRef = useRef(false);

  // Auto-save all form data
  const formData = {
    orgName,
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
    familyGroups,
    organizationCode,
    adminFamilyGroup
  };

  const { loadSavedData, clearSavedData } = useAutoSave({
    key: 'family-setup',
    data: formData,
    enabled: true,
  });

  // Load saved data on component mount
  useEffect(() => {
    // If we're creating a new organization, auto-populate admin data from signup
    if (isCreatingNew) {
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
      
      // Load auto-saved data if available
      const savedData = loadSavedData();
      if (savedData && (savedData.orgName || savedData.familyGroups?.some((g: string) => g.trim()))) {
        if (savedData.orgName) setOrgName(savedData.orgName);
        if (savedData.propertyName) setPropertyName(savedData.propertyName);
        if (savedData.adminPhone) setAdminPhone(savedData.adminPhone);
        if (savedData.treasurerName) setTreasurerName(savedData.treasurerName);
        if (savedData.treasurerPhone) setTreasurerPhone(savedData.treasurerPhone);
        if (savedData.treasurerEmail) setTreasurerEmail(savedData.treasurerEmail);
        if (savedData.calendarKeeperName) setCalendarKeeperName(savedData.calendarKeeperName);
        if (savedData.calendarKeeperPhone) setCalendarKeeperPhone(savedData.calendarKeeperPhone);
        if (savedData.calendarKeeperEmail) setCalendarKeeperEmail(savedData.calendarKeeperEmail);
        if (savedData.familyGroups && savedData.familyGroups.length > 0) {
          // Handle both old string[] format and new object format
          const groups = savedData.familyGroups.map((g: any) => 
            typeof g === 'string' ? {name: g, leadFirstName: "", leadLastName: ""} : g
          );
          setFamilyGroups(groups);
        }
        if (savedData.organizationCode) setOrganizationCode(savedData.organizationCode);
        if (savedData.adminFamilyGroup) setAdminFamilyGroup(savedData.adminFamilyGroup);
        
        if (!hasShownToastRef.current) {
          hasShownToastRef.current = true;
          toast({
            title: "Draft Restored",
            description: "Your previous work has been restored from auto-save.",
          });
        }
      }
      return;
    }
    
    // First try to load from database if organization exists
    if (organization && !isCreatingNew) {
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
      
      // Don't overwrite with auto-save data when loading fresh organization data
      return;
    }
    
    // Only load auto-saved data if we're not loading fresh organization data
    if (!organization) {
      // Try to load auto-saved data first (only if there's meaningful data)
      const savedData = loadSavedData();
      if (savedData && (savedData.orgName || savedData.familyGroups?.some((g: string) => g.trim()))) {
        setOrgName(savedData.orgName || "");
        setPropertyName(savedData.propertyName || "");
        setAdminName(savedData.adminName || "");
        setAdminPhone(savedData.adminPhone || "");
        setAdminEmail(savedData.adminEmail || "");
        setTreasurerName(savedData.treasurerName || "");
        setTreasurerPhone(savedData.treasurerPhone || "");
        setTreasurerEmail(savedData.treasurerEmail || "");
        setCalendarKeeperName(savedData.calendarKeeperName || "");
        setCalendarKeeperPhone(savedData.calendarKeeperPhone || "");
        setCalendarKeeperEmail(savedData.calendarKeeperEmail || "");
        const groups = savedData.familyGroups && savedData.familyGroups.length > 0 ? 
          savedData.familyGroups.map((g: any) => 
            typeof g === 'string' ? {name: g, leadFirstName: "", leadLastName: ""} : g
          ) : [{name: "", leadFirstName: "", leadLastName: ""}];
        setFamilyGroups(groups);
        if (savedData.organizationCode) setOrganizationCode(savedData.organizationCode);
        if (savedData.adminFamilyGroup) setAdminFamilyGroup(savedData.adminFamilyGroup);
        
        if (!hasShownToastRef.current) {
          hasShownToastRef.current = true;
          toast({
            title: "Draft Restored",
            description: "Your previous work has been restored from auto-save.",
          });
        }
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
          const groups = data.familyGroups && data.familyGroups.length > 0 ? 
            data.familyGroups.map((g: any) => 
              typeof g === 'string' ? {name: g, leadFirstName: "", leadLastName: ""} : g
            ) : [{name: "", leadFirstName: "", leadLastName: ""}];
          setFamilyGroups(groups);
        }
      }
    }
  }, [organization, isCreatingNew]); // Removed problematic dependencies

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

    // Validate admin family group selection if creating new organization
    if (isCreatingNew && !adminFamilyGroup.trim()) {
      toast({
        title: "Missing administrator family group",
        description: "Please select which family group you belong to.",
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
        newOrganization = await updateOrganization(orgData);
      } else {
        newOrganization = await createOrganization(orgData);
      }
      
      // Save property name to reservation settings if provided and organization exists
      if (propertyName.trim() && (organization || newOrganization)) {
        try {
          await saveReservationSettings({ property_name: propertyName });
        } catch (error) {
          console.log('Property name will be saved later - organization context not ready yet');
          // This is not critical, property name can be saved later
        }
      }
      
      // Validate family groups have required lead names
      const validGroups = familyGroups.filter(group => 
        group.name.trim() !== "" && group.leadFirstName.trim() !== "" && group.leadLastName.trim() !== ""
      );
      
      if (familyGroups.some(g => g.name.trim() !== "" && (!g.leadFirstName.trim() || !g.leadLastName.trim()))) {
        toast({
          title: "Missing lead information",
          description: "Please provide first and last names for all family group leads.",
          variant: "destructive",
        });
        return;
      }
      
      // Create family groups in the database
      const currentOrgId = (organization || newOrganization)?.id;
      
      if (validGroups.length > 0 && currentOrgId) {
        try {
          const payload = validGroups.map(group => ({
            organization_id: currentOrgId,
            name: group.name.trim(),
            lead_name: `${group.leadFirstName.trim()} ${group.leadLastName.trim()}`,
            lead_phone: null,
            lead_email: null,
            host_members: [],
            color: null,
            alternate_lead_id: null,
          }));

          // Use upsert to handle duplicates gracefully
          const { data, error } = await supabase
            .from('family_groups')
            .upsert(payload, { 
              onConflict: 'organization_id,name',
              ignoreDuplicates: true 
            })
            .select();

          if (error) {
            throw error;
          }

          

          // If this is a new organization and admin selected a family group, update their profile
          if (isCreatingNew && adminFamilyGroup.trim()) {
            try {
              const { error: profileError } = await supabase
                .from('profiles')
                .upsert({ 
                  user_id: user?.id,
                  family_group: adminFamilyGroup.trim(),
                  updated_at: new Date().toISOString()
                })
                .eq('user_id', user?.id);

              if (profileError) {
                console.error('❌ Failed to update admin profile with family group:', profileError);
              }
            } catch (error) {
              console.error('❌ Error updating admin profile:', error);
            }
          }
        } catch (error) {
          toast({
            title: "Family Group Creation Error",
            description: error instanceof Error ? error.message : 'Failed to create initial family groups.',
            variant: "destructive",
          });
        }
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
        familyGroups,
        adminFamilyGroup
      };
      
      localStorage.setItem('familySetupData', JSON.stringify(setupData));
      
      // Clear auto-saved data after successful save
      clearSavedData();
      
      // Also save just the family groups for the SelectFamilyGroup page
      localStorage.setItem('familyGroupsList', JSON.stringify(validGroups.map(g => g.name)));
      
    } catch (error) {
      toast({
        title: "Save Error",
        description: `Failed to save organization setup. Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        variant: "destructive",
      });
    }
  };

  // Save organization setup and show profile claiming step for new organizations
  const saveAndContinueToFamilyGroups = async () => {
    try {
      await saveOrganizationSetup();
      // Clear auto-saved data since we're navigating away
      clearSavedData();
      
      // For new organizations with family groups, show profile claiming step
      if (isCreatingNew && (existingFamilyGroups.length > 0 || familyGroups.some(g => g.name.trim()))) {
        setShowProfileClaimingStep(true);
        return;
      }
      
      // For existing organizations or those without family groups, go directly to setup
      setTimeout(() => {
        navigate("/family-group-setup");
      }, 100);
    } catch (error) {
      console.error('Error in save and continue:', error);
      // Still navigate even if there was an error, user can retry later
      navigate("/family-group-setup");
    }
  };

  // Handle profile claimed - navigate based on role
  const handleProfileClaimed = (claimedProfile: any) => {
    const isGroupLead = claimedProfile?.member_type === 'group_lead';
    
    toast({
      title: "Setup Complete!",
      description: `Proceeding to ${isGroupLead ? 'group setup' : 'profile management'}...`,
    });
    
    setTimeout(() => {
      if (isGroupLead) {
        navigate("/family-group-setup");
      } else {
        navigate("/group-member-profile");
      }
    }, 1000);
  };

  // Handle skip profile claiming
  const handleSkipProfileClaiming = () => {
    toast({
      title: "Setup Complete!",
      description: "You can claim your profile later from the Group Member Profile page.",
    });
    
    setTimeout(() => {
      navigate("/family-group-setup");
    }, 1000);
  };

  // Handle family group input changes
  const handleFamilyGroupChange = (index: number, field: 'name' | 'leadFirstName' | 'leadLastName', value: string) => {
    const newFamilyGroups = [...familyGroups];
    newFamilyGroups[index][field] = value;
    setFamilyGroups(newFamilyGroups);
  };

  // Add a new family group field
  const addFamilyGroup = () => {
    setFamilyGroups(prev => [...prev, {name: "", leadFirstName: "", leadLastName: ""}]);
  };

  // Remove a family group field
  const removeFamilyGroup = (index: number) => {
    if (familyGroups.length > 1) {
      setFamilyGroups(prev => prev.filter((_, i) => i !== index));
    }
  };

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

  return (
    <div className="min-h-screen bg-cover bg-center bg-no-repeat p-4" style={{
      backgroundImage: 'url(/lovable-uploads/45c3083f-46c5-4e30-a2f0-31a24ab454f4.png)'
    }}>
      <div className="max-w-6xl mx-auto">
        <div className="mb-4">
          <Button variant="outline" asChild className="mb-4">
            <Link to="/setup">← Back to Setup</Link>
          </Button>
          <h1 className="text-6xl mb-4 font-kaushan text-primary drop-shadow-lg text-center">
            {showProfileClaimingStep ? 'Profile Setup' : 'Family Organization Setup'}
          </h1>
          <p className="text-2xl text-primary text-center font-medium">
            {showProfileClaimingStep 
              ? 'Link your administrator account to your family profile' 
              : 'Setting up your Family Organization and Family Groups list'
            }
          </p>
        </div>

        {/* Show Profile Claiming Step or Regular Setup */}
        {showProfileClaimingStep ? (
          <AdminProfileClaimingStep
            onProfileClaimed={handleProfileClaimed}
            onSkip={handleSkipProfileClaiming}
            familyGroups={existingFamilyGroups.length > 0 ? existingFamilyGroups : 
              familyGroups.filter(g => g.name.trim()).map(group => ({ name: group.name.trim() }))}
            adminEmail={adminEmail}
          />
        ) : (
        <Card className="bg-card/95 mb-8">
          <CardHeader className="pb-2 relative">
            <div className="flex justify-end">
              <Button onClick={saveOrganizationSetup} disabled={orgLoading || settingsLoading}>
                {(orgLoading || settingsLoading) ? "Saving..." : "Save Organization Setup"}
              </Button>
            </div>
            <CardTitle className="text-2xl text-center">Family Organization & Groups Setup</CardTitle>
            <CardDescription className="text-center">
              📝 Auto-saving your changes...
            </CardDescription>
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
                  Family Groups ({existingFamilyGroups.length > 0 ? 'Current Groups' : 'Setup New Groups'})
                </h2>
              </div>
              
              {/* Show existing family groups if they exist */}
              {existingFamilyGroups.length > 0 ? (
                <div className="space-y-3">
                  <div className="text-sm text-muted-foreground text-center mb-4">
                    <p>Current family groups in your organization:</p>
                  </div>
                  {existingFamilyGroups.map((group, index) => (
                    <div key={group.id} className="flex items-center gap-2 p-3 border rounded-lg bg-muted/30">
                      <div className="flex-1">
                        <div className="font-medium">{group.name}</div>
                        {group.lead_name && (
                          <div className="text-sm text-muted-foreground">
                            Lead: {group.lead_name} {group.lead_email && `(${group.lead_email})`}
                          </div>
                        )}
                        {group.host_members && group.host_members.length > 0 && (
                          <div className="text-xs text-muted-foreground">
                            {group.host_members.length} group member{group.host_members.length !== 1 ? 's' : ''}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                  
                  
                  {/* Add More Family Groups Section for Existing Organizations */}
                  <div className="border-t pt-4">
                    <h3 className="text-lg font-semibold text-center mb-4">Add More Family Groups</h3>
                    <div className="space-y-4">
                      {familyGroups.map((group, index) => (
                        <div key={index} className="border rounded-lg p-4 space-y-3 bg-muted/20">
                          <div className="flex items-center justify-between">
                            <Label className="text-lg font-semibold">New Family Group {index + 1}</Label>
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
                          
                          <div className="space-y-2">
                            <Label htmlFor={`familyGroupName${index}`} className="text-sm font-medium">Group Name *</Label>
                            <Input
                              id={`familyGroupName${index}`}
                              placeholder={`Enter Family Group ${index + 1} name`}
                              value={group.name}
                              onChange={(e) => handleFamilyGroupChange(index, 'name', e.target.value)}
                              autoFocus={index === familyGroups.length - 1 && group.name === ""}
                            />
                          </div>
                          
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                            <div className="space-y-2">
                              <Label htmlFor={`leadFirstName${index}`} className="text-sm font-medium">Lead First Name *</Label>
                              <Input
                                id={`leadFirstName${index}`}
                                placeholder="First name"
                                value={group.leadFirstName}
                                onChange={(e) => handleFamilyGroupChange(index, 'leadFirstName', e.target.value)}
                              />
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor={`leadLastName${index}`} className="text-sm font-medium">Lead Last Name *</Label>
                              <Input
                                id={`leadLastName${index}`}
                                placeholder="Last name"
                                value={group.leadLastName}
                                onChange={(e) => handleFamilyGroupChange(index, 'leadLastName', e.target.value)}
                              />
                            </div>
                          </div>
                        </div>
                      ))}
                      
                      <div className="flex justify-center pt-2">
                        <Button
                          variant="outline"
                          onClick={addFamilyGroup}
                          className="flex items-center gap-2"
                        >
                          <Plus className="h-4 w-4" />
                          Add Another Family Group
                        </Button>
                      </div>
                    </div>
                  </div>
                  
                  <div className="text-sm text-muted-foreground text-center mt-4">
                    <p>To modify existing family groups, use the "Family Group Setup" page after saving.</p>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  {familyGroups.map((group, index) => (
                    <div key={index} className="border rounded-lg p-4 space-y-3 bg-muted/20">
                      <div className="flex items-center justify-between">
                        <Label className="text-lg font-semibold">Family Group {index + 1}</Label>
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
                      
                      <div className="space-y-2">
                        <Label htmlFor={`familyGroupName${index}`} className="text-sm font-medium">Group Name *</Label>
                        <Input
                          id={`familyGroupName${index}`}
                          placeholder={`Enter Family Group ${index + 1} name`}
                          value={group.name}
                          onChange={(e) => handleFamilyGroupChange(index, 'name', e.target.value)}
                          autoFocus={index === familyGroups.length - 1 && group.name === ""}
                        />
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        <div className="space-y-2">
                          <Label htmlFor={`leadFirstName${index}`} className="text-sm font-medium">Lead First Name *</Label>
                          <Input
                            id={`leadFirstName${index}`}
                            placeholder="First name"
                            value={group.leadFirstName}
                            onChange={(e) => handleFamilyGroupChange(index, 'leadFirstName', e.target.value)}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor={`leadLastName${index}`} className="text-sm font-medium">Lead Last Name *</Label>
                          <Input
                            id={`leadLastName${index}`}
                            placeholder="Last name"
                            value={group.leadLastName}
                            onChange={(e) => handleFamilyGroupChange(index, 'leadLastName', e.target.value)}
                          />
                        </div>
                      </div>
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
                
                  <div className="text-sm text-muted-foreground text-center mt-4">
                    <p>After saving, you can add more details like lead contacts, group members, and colors for each family group in the next step.</p>
                    <p className="text-xs mt-1 text-orange-600">* All fields marked with asterisk are required</p>
                  </div>
                </div>
              )}

              {/* Administrator Family Group Selection - Only for new organizations */}
              {isCreatingNew && (existingFamilyGroups.length > 0 || familyGroups.some(g => g.name.trim())) && (
                <div className="space-y-3 border-t border-border pt-4">
                  <h3 className="text-lg font-semibold text-center">Select Your Family Group</h3>
                  <p className="text-sm text-muted-foreground text-center">
                    As the administrator, which family group do you belong to?
                  </p>
                  <div className="max-w-md mx-auto">
                    <select
                      value={adminFamilyGroup}
                      onChange={(e) => setAdminFamilyGroup(e.target.value)}
                      className="w-full p-2 border border-border rounded-md bg-background text-foreground"
                      required
                    >
                      <option value="">Choose your family group...</option>
                      {existingFamilyGroups.length > 0 
                        ? existingFamilyGroups.map((group) => (
                            <option key={group.id} value={group.name}>
                              {group.name}
                            </option>
                          ))
                        : familyGroups
                            .filter(group => group.name.trim() !== "")
                            .map((group, index) => (
                              <option key={index} value={group.name.trim()}>
                                {group.name.trim()}
                              </option>
                            ))
                      }
                    </select>
                  </div>
                  <p className="text-xs text-muted-foreground text-center">
                    This helps us route you to the correct setup pages after saving.
                  </p>
                </div>
              )}
              
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
        )}


      </div>
    </div>
  );
};

export default FamilySetup;
