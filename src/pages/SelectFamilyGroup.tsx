import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Users, Loader2 } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useFamilyGroups } from "@/hooks/useFamilyGroups";
import { useAuth } from "@/contexts/AuthContext";
import { useOrganization } from "@/hooks/useOrganization";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const SelectFamilyGroup = () => {
  const navigate = useNavigate();
  const { familyGroups, loading } = useFamilyGroups();
  const { user } = useAuth();
  const { organization } = useOrganization();
  const { toast } = useToast();
  const [selectedFamilyGroup, setSelectedFamilyGroup] = useState("");

  const handleFamilyGroupSelection = async () => {
    if (!selectedFamilyGroup || !user) {
      console.error('Missing required data:', { selectedFamilyGroup, user: !!user });
      return;
    }

    console.log('Starting family group selection process:', {
      selectedFamilyGroup,
      userEmail: user.email,
      organizationId: organization?.id
    });

    try {
      // Find the selected family group first to validate it exists
      const selectedGroup = familyGroups.find(group => group.name === selectedFamilyGroup);
      
      console.log('Selected group data:', selectedGroup);
      console.log('All family groups:', familyGroups);

      if (!selectedGroup) {
        console.error('Selected family group not found in available groups');
        toast({
          title: "Error",
          description: "Selected family group could not be found. Please try again.",
          variant: "destructive",
        });
        return;
      }

      // Update the user's profile with the selected family group
      const { error } = await supabase
        .from('profiles')
        .upsert({ 
          user_id: user.id,
          family_group: selectedFamilyGroup,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', user.id);

      if (error) {
        console.error('Error updating profile:', error);
        toast({
          title: "Error",
          description: "Failed to save family group selection. Please try again.",
          variant: "destructive",
        });
        return;
      }

      console.log('Profile updated successfully');

      toast({
        title: "Success!",
        description: `You've been added to ${selectedFamilyGroup}`,
      });

      // Check if user is the group lead of this specific family group
      const isGroupLead = selectedGroup.lead_email && user.email === selectedGroup.lead_email;
      
      console.log('Role determination:', {
        userEmail: user.email,
        groupLeadEmail: selectedGroup.lead_email,
        isGroupLead
      });

      // If no lead email is set, check if user is in host members
      let shouldGoToSetup = isGroupLead;
      
      if (!selectedGroup.lead_email && selectedGroup.host_members) {
        // If no lead is set, check if user is a host member who can make reservations
        const hostMember = selectedGroup.host_members.find(
          (member: any) => member.email === user.email
        );
        
        console.log('Checking host members for user:', {
          hostMember,
          canMakeReservations: hostMember?.canMakeReservations
        });
        
        // If user is a host member with reservation permissions, they might be the effective lead
        if (hostMember?.canMakeReservations) {
          shouldGoToSetup = true;
        }
      }

      console.log('Final navigation decision:', {
        shouldGoToSetup,
        destination: shouldGoToSetup ? "/family-group-setup" : "/host-profile"
      });
      
      // Small delay to allow profile update to propagate, then navigate based on actual role
      setTimeout(() => {
        if (shouldGoToSetup) {
          navigate("/family-group-setup");
        } else {
          navigate("/host-profile");
        }
      }, 500);
    } catch (error) {
      console.error('Error in family group selection:', error);
      toast({
        title: "Error",
        description: "An unexpected error occurred. Please try again.",
        variant: "destructive",
      });
    }
  };

  // Check if in debug mode
  const urlParams = new URLSearchParams(window.location.search);
  const isDebugMode = urlParams.has('debug') || window.location.hostname === 'localhost' || process.env.NODE_ENV === 'development';

  // Redirect if no organization selected - but not in debug mode
  useEffect(() => {
    if (!loading && !organization && !isDebugMode) {
      navigate("/manage-organizations");
    }
  }, [organization, loading, navigate, isDebugMode]);

  if (loading) {
    return (
      <div className="min-h-screen bg-cover bg-center bg-no-repeat relative flex items-center justify-center" 
           style={{backgroundImage: 'url(/lovable-uploads/45c3083f-46c5-4e30-a2f0-31a24ab454f4.png)'}}>
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div
      className="min-h-screen bg-cover bg-center bg-no-repeat"
      style={{
        backgroundImage: "url('/lovable-uploads/45c3083f-46c5-4e30-a2f0-31a24ab454f4.png')",
      }}
    >
      <div className="min-h-screen p-4">
        <div className="container mx-auto max-w-2xl">

          {/* Page title */}
          <div className="text-center mb-8 pt-8">
            <h1 className="text-4xl md:text-6xl font-kaushan text-primary mb-4 drop-shadow-lg">
              Select Your Family Group
            </h1>
          </div>

          {/* Selection card */}
          <Card className="bg-white/95 backdrop-blur-sm shadow-2xl">
            <CardHeader className="text-center">
              <CardDescription className="text-3xl font-kaushan text-primary font-medium">
                Select the family group you belong to in {organization?.name || "this organization"}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {familyGroups.length > 0 ? (
                <>
                  <Select value={selectedFamilyGroup} onValueChange={setSelectedFamilyGroup}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Choose your family group" />
                    </SelectTrigger>
                    <SelectContent>
                      {familyGroups.map((group) => (
                        <SelectItem key={group.id} value={group.name}>
                          {group.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  {selectedFamilyGroup && (
                    <Button 
                      onClick={handleFamilyGroupSelection}
                      className="w-full"
                      size="lg"
                    >
                      Continue to Setup
                    </Button>
                  )}
                </>
              ) : (
                <div className="text-center py-8">
                  <Users className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium mb-2">No Family Groups Found</h3>
                  <p className="text-muted-foreground mb-4">
                    There are no family groups set up in {organization?.name || 'this organization'} yet.
                  </p>
                  <Button asChild>
                    <Link to="/family-setup">
                      Set Up Family Groups
                    </Link>
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
          
          {/* Back button moved to bottom - made green for visibility */}
          <div className="mt-8 text-center">
            <Button
              variant="default"
              onClick={() => navigate(-1)}
              className="bg-green-600 text-white hover:bg-green-700 shadow-lg px-6 py-3"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SelectFamilyGroup;