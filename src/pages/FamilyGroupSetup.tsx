import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { PhoneInput } from "@/components/ui/phone-input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Plus } from "lucide-react";
import { Link } from "react-router-dom";
import { useState, useEffect } from "react";
import { useFamilyGroups } from "@/hooks/useFamilyGroups";
import { useOrganization } from "@/hooks/useOrganization";
import { useToast } from "@/hooks/use-toast";
import { unformatPhoneNumber } from "@/lib/phone-utils";

const FamilyGroupSetup = () => {
  const { toast } = useToast();
  const { organization } = useOrganization();
  const { familyGroups, createFamilyGroup, updateFamilyGroup, loading } = useFamilyGroups();
  
  const [selectedGroup, setSelectedGroup] = useState("");
  const [leadName, setLeadName] = useState("");
  const [leadPhone, setLeadPhone] = useState("");
  const [leadEmail, setLeadEmail] = useState("");
  const [hostMembers, setHostMembers] = useState<{name: string; phone: string; email: string}[]>([
    {name: "", phone: "", email: ""},
    {name: "", phone: "", email: ""},
    {name: "", phone: "", email: ""}
  ]);
  const [reservationPermission, setReservationPermission] = useState("lead_only");
  const [alternateLeadId, setAlternateLeadId] = useState("");

  // Load from localStorage as fallback for display
  const [localFamilyGroups, setLocalFamilyGroups] = useState<string[]>([]);

  useEffect(() => {
    // Load from localStorage for backward compatibility
    const savedFamilyGroups = localStorage.getItem('familyGroupsList');
    if (savedFamilyGroups) {
      const groups = JSON.parse(savedFamilyGroups);
      setLocalFamilyGroups(groups);
    } else {
      const savedSetup = localStorage.getItem('familySetupData');
      if (savedSetup) {
        const setup = JSON.parse(savedSetup);
        if (setup.familyGroups) {
          const validFamilyGroups = setup.familyGroups.filter((group: string) => group.trim() !== '');
          setLocalFamilyGroups(validFamilyGroups);
        }
      }
    }
  }, []);

  const handleSaveFamilyGroup = async () => {
    if (!selectedGroup) {
      toast({
        title: "Error",
        description: "Please select a family group.",
        variant: "destructive",
      });
      return;
    }

    const hostMembersList = hostMembers.filter(member => member.name.trim() !== '');
    
    const existingGroup = familyGroups.find(g => g.name === selectedGroup);
    
    if (existingGroup) {
      // Update existing group
      await updateFamilyGroup(existingGroup.id, {
        lead_name: leadName || undefined,
        lead_phone: leadPhone ? unformatPhoneNumber(leadPhone) : undefined,
        lead_email: leadEmail || undefined,
        host_members: hostMembersList.length > 0 ? hostMembersList : undefined,
        reservation_permission: reservationPermission,
        alternate_lead_id: alternateLeadId || undefined,
      });
    } else {
      // Create new group
      await createFamilyGroup({
        name: selectedGroup,
        lead_name: leadName || undefined,
        lead_phone: leadPhone ? unformatPhoneNumber(leadPhone) : undefined,
        lead_email: leadEmail || undefined,
        host_members: hostMembersList.length > 0 ? hostMembersList : undefined,
        reservation_permission: reservationPermission,
        alternate_lead_id: alternateLeadId || undefined,
      });
    }
  };

  const handleHostMemberChange = (index: number, field: 'name' | 'phone' | 'email', value: string) => {
    const newHostMembers = [...hostMembers];
    newHostMembers[index] = { ...newHostMembers[index], [field]: value };
    setHostMembers(newHostMembers);
  };

  const addHostMember = () => {
    setHostMembers([...hostMembers, {name: "", phone: "", email: ""}]);
  };

  // Combine database and localStorage groups for display
  const allGroups = [
    ...familyGroups.map(g => g.name),
    ...localFamilyGroups.filter(lg => !familyGroups.some(g => g.name === lg))
  ];
  return (
    <div className="min-h-screen bg-cover bg-center bg-no-repeat p-4" style={{
      backgroundImage: 'url(/lovable-uploads/45c3083f-46c5-4e30-a2f0-31a24ab454f4.png)'
    }}>
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <Button variant="outline" asChild className="mb-4">
            <Link to="/family-setup">← Back to Family Setup</Link>
          </Button>
          <h1 className="text-4xl font-bold mb-2 text-orange-400 text-center">Family Group Setup</h1>
          <p className="text-orange-500 text-3xl text-center">Setting up your Family Groups</p>
        </div>

        {/* Setup Family Groups Form */}
        <Card className="bg-card/95 mb-8">
          <CardHeader className="pb-2 relative">
            <Button 
              className="absolute top-6 right-6" 
              onClick={handleSaveFamilyGroup}
              disabled={loading}
            >
              {loading ? "Saving..." : "Save Family Group Setup"}
            </Button>
            <Button className="absolute top-16 right-6" asChild>
              <Link to="/financial-setup">Go to Financial Setup</Link>
            </Button>
            <CardTitle className="text-2xl text-center">Set up Family Groups</CardTitle>
            <CardDescription className="text-center">Create a family group with lead and host members</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 py-2">
            {/* Family Group Name */}
            <div className="space-y-1">
              <Label htmlFor="groupName" className="text-xl font-semibold text-center block">Family Group Name</Label>
              <Select value={selectedGroup} onValueChange={setSelectedGroup}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select a family group" />
                </SelectTrigger>
                <SelectContent className="bg-background z-50">
                  {allGroups.length > 0 ? (
                    allGroups.map((group, index) => (
                      <SelectItem key={index} value={group}>
                        {group}
                      </SelectItem>
                    ))
                  ) : (
                    <SelectItem value="no-groups" disabled>
                      No family groups found - Please set them up in Family Setup first
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>

            {/* Family Group Lead Section */}
            <div className="space-y-2">
              <h3 className="text-xl font-semibold text-center">Family Group Lead</h3>
              <div className="grid gap-2 md:grid-cols-3 text-center items-start">
                <div className="space-y-1">
                  <Label htmlFor="leadName">Name</Label>
                </div>
                <div className="space-y-1">
                  <Label htmlFor="leadPhone">Phone Number</Label>
                </div>
                <div className="space-y-1">
                  <Label htmlFor="leadEmail">Email Address</Label>
                </div>
              </div>
              <div className="grid gap-2 md:grid-cols-3">
                <Input 
                  id="leadName" 
                  placeholder="Family Group Lead's full name"
                  value={leadName}
                  onChange={(e) => setLeadName(e.target.value)}
                />
                <PhoneInput 
                  id="leadPhone" 
                  value={leadPhone}
                  onChange={(formatted) => setLeadPhone(formatted)}
                />
                <Input 
                  id="leadEmail" 
                  type="email" 
                  placeholder="lead@example.com"
                  value={leadEmail}
                  onChange={(e) => setLeadEmail(e.target.value)}
                />
              </div>
              
              {/* Alternate Lead Selection */}
              <div className="mt-4 p-4 border rounded-lg bg-muted/20">
                <h4 className="text-md font-semibold text-center mb-2">Alternate Group Lead</h4>
                <p className="text-sm text-muted-foreground text-center mb-3">Select which host member serves as the alternate group lead</p>
                <Select value={alternateLeadId} onValueChange={setAlternateLeadId}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select alternate lead (optional)" />
                  </SelectTrigger>
                  <SelectContent className="bg-background z-50">
                    <SelectItem value="">None selected</SelectItem>
                    {hostMembers
                      .filter(member => member.name.trim() !== '')
                      .map((member, index) => (
                        <SelectItem key={index} value={member.name}>
                          {member.name}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
            </div>


            {/* Host Members Section */}
            <div className="space-y-2">
              <h3 className="text-lg font-semibold text-center">Additional Host Members</h3>
              <p className="text-sm text-muted-foreground text-center mb-4">Radio buttons indicate who can reserve time</p>
              {hostMembers.map((member, index) => (
                <div key={index} className="space-y-2">
                  <h4 className="text-md font-medium">Host Member {index + 1}</h4>
                   <div className="grid gap-2 grid-cols-12 items-center">
                     <div className="col-span-4">
                       <Input 
                         placeholder="Full name"
                         value={member.name}
                         onChange={(e) => handleHostMemberChange(index, 'name', e.target.value)}
                       />
                     </div>
                     <div className="col-span-1">
                       <PhoneInput 
                         value={member.phone}
                         onChange={(formatted) => handleHostMemberChange(index, 'phone', formatted)}
                       />
                     </div>
                     <div className="col-span-6">
                       <Input 
                         type="email" 
                         placeholder="email@example.com"
                         value={member.email}
                         onChange={(e) => handleHostMemberChange(index, 'email', e.target.value)}
                       />
                     </div>
                     <div className="col-span-1 flex justify-center">
                       <RadioGroupItem 
                         value={`host_${index}`} 
                         id={`host_${index}`}
                         checked={reservationPermission === `host_${index}`}
                         onClick={() => setReservationPermission(`host_${index}`)}
                       />
                     </div>
                   </div>
                </div>
              ))}
              
              <div className="flex justify-center pt-2">
                <Button variant="outline" onClick={addHostMember}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Host Member
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default FamilyGroupSetup;