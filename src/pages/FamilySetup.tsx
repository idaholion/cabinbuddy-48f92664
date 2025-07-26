
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Users, Plus, Settings, Copy } from "lucide-react";
import { Link } from "react-router-dom";
import { FamilyGroups } from "@/components/FamilyGroups";
import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";

const FamilySetup = () => {
  const { toast } = useToast();
  
  // State for organization setup
  const [orgName, setOrgName] = useState("");
  const [adminName, setAdminName] = useState("");
  const [adminPhone, setAdminPhone] = useState("");
  const [adminEmail, setAdminEmail] = useState("");
  const [treasurerName, setTreasurerName] = useState("");
  const [treasurerPhone, setTreasurerPhone] = useState("");
  const [treasurerEmail, setTreasurerEmail] = useState("");
  const [calendarKeeperName, setCalendarKeeperName] = useState("");
  const [calendarKeeperPhone, setCalendarKeeperPhone] = useState("");
  const [calendarKeeperEmail, setCalendarKeeperEmail] = useState("");
  const [familyGroups, setFamilyGroups] = useState<string[]>(Array(6).fill(""));

  // Load saved data on component mount
  useEffect(() => {
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
      setFamilyGroups(data.familyGroups || Array(6).fill(""));
    }
  }, []);

  // Save organization setup
  const saveOrganizationSetup = () => {
    const setupData = {
      orgName,
      organizationCode,
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
    
    toast({
      title: "Setup saved successfully!",
      description: "Your family organization setup has been saved.",
    });
  };

  // Handle family group input changes
  const handleFamilyGroupChange = (index: number, value: string) => {
    const newFamilyGroups = [...familyGroups];
    newFamilyGroups[index] = value;
    setFamilyGroups(newFamilyGroups);
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

  return <div className="min-h-screen bg-cover bg-center bg-no-repeat p-4" style={{
    backgroundImage: 'url(/lovable-uploads/45c3083f-46c5-4e30-a2f0-31a24ab454f4.png)'
  }}>
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <Button variant="outline" asChild className="mb-4">
            <Link to="/home">← Back to Home</Link>
          </Button>
          <h1 className="text-4xl font-bold mb-2 text-red-500 text-center" style={{ fontFamily: 'Brush Script MT, cursive' }}>Organization Setup</h1>
          <p className="text-red-500 text-3xl text-center" style={{ fontFamily: 'Brush Script MT, cursive' }}>Setting up your Family Organization and Family Groups list</p>
        </div>

        {/* Combined Family Organization and Groups Setup */}
        <Card className="bg-card/95 mb-8">
          <CardHeader className="pb-2 relative">
            <div className="flex justify-end">
              <Button onClick={saveOrganizationSetup}>Save Organization Setup</Button>
            </div>
            <CardTitle className="text-2xl text-center">Family Organization & Groups Setup</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6 py-4">
            {/* Organization Setup Section */}
            <div className="space-y-4">
              <h2 className="text-xl font-semibold text-center border-b pb-2">Set up Family Organization</h2>
              
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
                  {isAdmin && (
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
                  <Input 
                    id="adminPhone" 
                    type="tel" 
                    placeholder="(555) 123-4567" 
                    value={adminPhone}
                    onChange={(e) => setAdminPhone(e.target.value)}
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
                <h3 className="text-xl font-semibold text-center">Treasurer</h3>
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
                  <Input 
                    id="treasurerPhone" 
                    type="tel" 
                    placeholder="(555) 123-4567" 
                    value={treasurerPhone}
                    onChange={(e) => setTreasurerPhone(e.target.value)}
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
                <h3 className="text-xl font-semibold text-center">Calendar Keeper</h3>
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
                  <Input 
                    id="calendarKeeperPhone" 
                    type="tel" 
                    placeholder="(555) 123-4567" 
                    value={calendarKeeperPhone}
                    onChange={(e) => setCalendarKeeperPhone(e.target.value)}
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
              <div className="relative">
                <h2 className="text-xl font-semibold text-center border-b pb-2">List of Family Groups</h2>
                <Button className="absolute top-0 right-0" asChild>
                  <Link to="/family-group-setup">Set up Family Groups</Link>
                </Button>
              </div>
              
              {[...Array(6)].map((_, index) => (
                <div key={index} className="space-y-1">
                  <Label htmlFor={`familyGroup${index + 1}`} className="text-lg font-semibold">Family Group {index + 1}</Label>
                  <Input 
                    id={`familyGroup${index + 1}`} 
                    placeholder={`Enter Family Group ${index + 1} name`}
                    value={familyGroups[index]}
                    onChange={(e) => handleFamilyGroupChange(index, e.target.value)}
                  />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

      </div>
    </div>;
};
export default FamilySetup;
