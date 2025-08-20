import { useEffect, useState, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { PhoneInput } from "@/components/ui/phone-input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { User, Save, LogOut, Camera, Download, Upload, UserPlus, ArrowRight } from "lucide-react";
import { useFamilyGroups } from "@/hooks/useFamilyGroups";
import { useOrganization } from "@/hooks/useOrganization";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { useAutoSave } from "@/hooks/useAutoSave";
import { unformatPhoneNumber } from "@/lib/phone-utils";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
// Removed FeatureOverviewDialog import as it's not needed here
import { ProfileClaimingDialog } from "@/components/ProfileClaimingDialog";
import { useProfileClaiming } from "@/hooks/useProfileClaiming";

const groupMemberProfileSchema = z.object({
  selectedFamilyGroup: z.string().min(1, "Please select your family group"),
  selectedMemberName: z.string().min(1, "Please select your name"),
  email: z.string().email("Please enter a valid email").optional().or(z.literal("")),
  phone: z.string().optional(),
});

type GroupMemberProfileFormData = z.infer<typeof groupMemberProfileSchema>;

const GroupMemberProfile = () => {
  const { toast } = useToast();
  const { user, signOut } = useAuth();
  const { organization } = useOrganization();
  const { familyGroups, updateFamilyGroup, loading } = useFamilyGroups();
  const { claimedProfile, hasClaimedProfile, isGroupLead, refreshClaimedProfile } = useProfileClaiming();
  const navigate = useNavigate();
  const [selectedGroup, setSelectedGroup] = useState<any>(null);
  const [availableMembers, setAvailableMembers] = useState<any[]>([]);
  const [selectedGroupMember, setSelectedGroupMember] = useState<any>(null);
  const [autoPopulated, setAutoPopulated] = useState(false);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [showClaimingDialog, setShowClaimingDialog] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Removed feature onboarding as it's not appropriate for this page

  const form = useForm<GroupMemberProfileFormData>({
    resolver: zodResolver(groupMemberProfileSchema),
    defaultValues: {
      selectedFamilyGroup: "",
      selectedMemberName: "",
      email: "",
      phone: "",
    },
    mode: "onChange",
  });

  const { watch, setValue, formState: { isValid } } = form;
  const watchedFamilyGroup = watch("selectedFamilyGroup");
  const watchedMemberName = watch("selectedMemberName");

  // Update available members when family group changes
  useEffect(() => {
    if (watchedFamilyGroup) {
      const group = familyGroups.find(g => g.name === watchedFamilyGroup);
      setSelectedGroup(group);
      if (group) {
        const members = [
          ...(group.lead_name ? [{ 
            name: group.lead_name, 
            email: group.lead_email, 
            phone: group.lead_phone,
            isLead: true 
          }] : []),
          ...(group.host_members || []).map((member: any) => ({ 
            name: member.name, 
            email: member.email, 
            phone: member.phone,
            isLead: false 
          }))
        ];
        setAvailableMembers(members);
      } else {
        setAvailableMembers([]);
      }
      setValue("selectedMemberName", "");
      setSelectedGroupMember(null);
    }
  }, [watchedFamilyGroup, familyGroups, setValue]);

  // Update form fields when member name changes
  useEffect(() => {
    if (watchedMemberName && availableMembers.length > 0) {
      if (watchedMemberName === "NOT_FOUND") {
        // Handle "I don't see my name" selection
        setSelectedGroupMember(null);
        setValue("selectedFamilyGroup", "");
        setValue("email", "");
        setValue("phone", "");
        setSelectedGroup(null);
        setAvailableMembers([]);
        toast({
          title: "Family Group Reset",
          description: "Please verify you selected the correct family group above.",
          variant: "default",
        });
        return;
      }
      
      const member = availableMembers.find(m => m.name === watchedMemberName);
      if (member) {
        setSelectedGroupMember(member);
        setValue("email", member.email || "");
        setValue("phone", member.phone || "");
      }
    }
  }, [watchedMemberName, availableMembers, setValue, toast]);

  // Auto-populate user information when family groups load
  useEffect(() => {
    if (familyGroups.length > 0 && user && !autoPopulated) {
      const userEmail = user.email;
      const userFirstName = user.user_metadata?.first_name;
      
      // Try to find user by email or name in family groups
      for (const group of familyGroups) {
        // Check group lead
        if (group.lead_email?.toLowerCase() === userEmail?.toLowerCase() || 
            (userFirstName && group.lead_name?.toLowerCase().includes(userFirstName.toLowerCase()))) {
          setValue("selectedFamilyGroup", group.name);
          setValue("selectedMemberName", group.lead_name);
          setValue("email", group.lead_email || userEmail || "");
          setValue("phone", group.lead_phone || "");
          
          setSelectedGroup(group);
          const members = [
            { name: group.lead_name, email: group.lead_email, phone: group.lead_phone, isLead: true },
            ...(group.host_members || []).map((member: any) => ({ 
              name: member.name, email: member.email, phone: member.phone, isLead: false 
            }))
          ];
          setAvailableMembers(members);
          setSelectedGroupMember({ name: group.lead_name, email: group.lead_email, phone: group.lead_phone, isLead: true });
          setAutoPopulated(true);
          
          toast({
            title: "Profile Found",
            description: `Auto-populated your profile from ${group.name} as Group Lead`,
          });
          break;
        }
        
        // Check host members
        if (group.host_members) {
          const foundMember = group.host_members.find((member: any) => 
            member.email?.toLowerCase() === userEmail?.toLowerCase() || 
            (userFirstName && member.name?.toLowerCase().includes(userFirstName.toLowerCase()))
          );
          
          if (foundMember) {
            setValue("selectedFamilyGroup", group.name);
            setValue("selectedMemberName", foundMember.name);
            setValue("email", foundMember.email || userEmail || "");
            setValue("phone", foundMember.phone || "");
            
            setSelectedGroup(group);
            const members = [
              ...(group.lead_name ? [{ 
                name: group.lead_name, email: group.lead_email, phone: group.lead_phone, isLead: true 
              }] : []),
              ...group.host_members.map((member: any) => ({ 
                name: member.name, email: member.email, phone: member.phone, isLead: false 
              }))
            ];
            setAvailableMembers(members);
            setSelectedGroupMember(foundMember);
            setAutoPopulated(true);
            
            toast({
              title: "Profile Found",
              description: `Auto-populated your profile from ${group.name}`,
            });
            break;
          }
        }
      }
    }
  }, [familyGroups, user, setValue, autoPopulated, toast]);

  // Fetch user profile data
  useEffect(() => {
    const fetchUserProfile = async () => {
      if (user) {
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('user_id', user.id)
          .single();

        if (data && !error) {
          setUserProfile(data);
        }
      }
    };

    fetchUserProfile();
  }, [user]);

  // Handle avatar upload
  const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !user) return;

    setAvatarUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/avatar.${fileExt}`;

      // Upload file to storage
      const { error: uploadError } = await supabase.storage
        .from('user-avatars')
        .upload(fileName, file, { 
          upsert: true 
        });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('user-avatars')
        .getPublicUrl(fileName);

      // Update user profile with avatar URL
      const { error: updateError } = await supabase
        .from('profiles')
        .upsert({
          user_id: user.id,
          avatar_url: publicUrl,
          first_name: user.user_metadata?.first_name,
          last_name: user.user_metadata?.last_name,
          display_name: user.user_metadata?.first_name,
        });

      if (updateError) throw updateError;

      setUserProfile({ ...userProfile, avatar_url: publicUrl });
      toast({
        title: "Success",
        description: "Profile photo uploaded successfully!",
      });

    } catch (error: any) {
      console.error('Error uploading avatar:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to upload photo. Please try again.",
        variant: "destructive",
      });
    } finally {
      setAvatarUploading(false);
    }
  };

  // Handle avatar download
  const handleAvatarDownload = async () => {
    if (!userProfile?.avatar_url) {
      toast({
        title: "No Photo",
        description: "No profile photo to download.",
        variant: "destructive",
      });
      return;
    }

    try {
      const response = await fetch(userProfile.avatar_url);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${user?.user_metadata?.first_name || 'profile'}-photo.jpg`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      toast({
        title: "Success",
        description: "Profile photo downloaded successfully!",
      });
    } catch (error) {
      console.error('Error downloading avatar:', error);
      toast({
        title: "Error",
        description: "Failed to download photo. Please try again.",
        variant: "destructive",
      });
    }
  };

  const formData = form.watch();
  const autoSaveHook = useAutoSave({ 
    key: "group-member-profile", 
    data: formData, 
    delay: 2000 
  });

  const onSubmit = async (data: GroupMemberProfileFormData) => {
    if (!selectedGroup || !selectedGroupMember) {
      toast({
        title: "Error",
        description: "Please select your family group and name.",
        variant: "destructive",
      });
      return;
    }

    try {
      if (selectedGroupMember.isLead) {
        // Update group lead information
        await updateFamilyGroup(selectedGroup.id, {
          lead_email: data.email || "",
          lead_phone: data.phone ? unformatPhoneNumber(data.phone) : "",
        });
      } else {
        // Update the host member in the selected family group
        const hostMembersArray = selectedGroup.host_members || [];
        const updatedHostMembers = hostMembersArray.map((member: any) => {
          if (member.name === selectedGroupMember.name) {
            return {
              ...member,
              email: data.email || member.email,
              phone: data.phone ? unformatPhoneNumber(data.phone) : member.phone,
            };
          }
          return member;
        });

        await updateFamilyGroup(selectedGroup.id, {
          host_members: updatedHostMembers
        });
      }

      // Profile completion tracking removed
      
      toast({
        title: "Success",
        description: "Your profile has been updated successfully.",
      });
    } catch (error) {
      console.error("Error updating group member profile:", error);
      toast({
        title: "Error",
        description: "Failed to update your profile. Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      {/* Header with Logout */}
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Profile Settings</h1>
        <Button variant="outline" onClick={signOut} className="flex items-center space-x-2 text-base">
          <LogOut className="h-4 w-4" />
          <span>Logout</span>
        </Button>
      </div>

      {/* Profile Claim Dialog - Show if user hasn't claimed a profile yet */}
      {!hasClaimedProfile && familyGroups.length > 0 && (
        <Card className="mb-6 border-primary/50 bg-primary/5">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <UserPlus className="h-5 w-5" />
              Claim Your Group Member Profile
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-base text-muted-foreground mb-4">
              Link your account to your family group member profile using your name as it appears in the system.
            </p>
            <Button
              onClick={() => setShowClaimingDialog(true)}
              className="flex items-center gap-2"
            >
              <UserPlus className="h-4 w-4" />
              Claim Profile
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Show claimed profile info */}
      {hasClaimedProfile && claimedProfile && (
        <Card className="mb-6 border-green-200 bg-green-50">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2 text-green-800">
              <User className="h-5 w-5" />
              Profile Claimed Successfully
            </CardTitle>
          </CardHeader>
          <CardContent className="text-green-700">
            <p className="text-base mb-4">
              You are linked to <strong>{claimedProfile.member_name}</strong> in the <strong>{claimedProfile.family_group_name}</strong> family group
              {isGroupLead && ' as the Group Lead'}.
            </p>
            {isGroupLead && (
              <Button
                onClick={() => navigate('/family-setup')}
                className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white"
              >
                <ArrowRight className="h-4 w-4" />
                Proceed to Group Setup
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* Avatar Section */}
      <Card className="mb-6">
        <CardHeader className="text-center pb-6">
          <div className="flex flex-col items-center space-y-4">
            <Avatar className="h-24 w-24">
              <AvatarImage 
                src={userProfile?.avatar_url} 
                alt={user?.user_metadata?.first_name || "Profile"} 
              />
              <AvatarFallback className="text-2xl">
                {user?.user_metadata?.first_name?.[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase() || "U"}
              </AvatarFallback>
            </Avatar>
            
            <div className="flex space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                disabled={avatarUploading}
                className="flex items-center space-x-2 text-base"
              >
                <Upload className="h-4 w-4" />
                <span>{avatarUploading ? "Uploading..." : "Upload Photo"}</span>
              </Button>
              
              {userProfile?.avatar_url && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleAvatarDownload}
                  className="flex items-center space-x-2 text-base"
                >
                  <Download className="h-4 w-4" />
                  <span>Download</span>
                </Button>
              )}
            </div>
            
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleAvatarUpload}
              className="hidden"
            />
          </div>
          
          <CardTitle className="text-3xl font-bold mt-4">Group Member Profile</CardTitle>
          <p className="text-muted-foreground text-base">
            Update your personal information for your family group
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              {/* Family Group Selection */}
              <FormField
                control={form.control}
                name="selectedFamilyGroup"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-base">Select Your Family Group</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger className="text-base">
                          <SelectValue placeholder="Choose your family group" className="text-base" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {familyGroups.map((group) => (
                          <SelectItem key={group.id} value={group.name}>
                            {group.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Member Name Selection */}
              {availableMembers.length > 0 && (
                <FormField
                  control={form.control}
                  name="selectedMemberName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-base">Select Your Name</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger className="text-base">
                            <SelectValue placeholder="Choose your name from the list" className="text-base" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {availableMembers.map((member, index) => (
                            <SelectItem key={index} value={member.name}>
                              {member.name} {member.isLead && '(Group Lead)'}
                            </SelectItem>
                          ))}
                          <SelectItem value="NOT_FOUND" className="text-muted-foreground">
                            I don't see my name
                          </SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              {/* Email Field */}
              {selectedGroupMember && (
                <>
                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-base">Email Address</FormLabel>
                      <FormControl>
                        <Input 
                          {...field} 
                          type="email" 
                          placeholder="Enter your email address"
                          className="text-base placeholder:text-base"
                        />
                      </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Phone Field */}
                  <FormField
                    control={form.control}
                    name="phone"
                    render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-base">Phone Number</FormLabel>
                      <FormControl>
                        <PhoneInput
                          value={field.value || ""}
                          onChange={(formatted, raw) => field.onChange(formatted)}
                          autoFormat
                          className="text-base placeholder:text-base"
                        />
                      </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </>
              )}

              {/* Submit Button */}
              <div className="flex justify-center pt-6">
                <Button
                  type="submit"
                  disabled={loading || !isValid || !selectedGroupMember}
                  size="lg"
                  className="min-w-48 text-base"
                >
                  <Save className="h-4 w-4 mr-2" />
                  {loading ? "Saving..." : "Update Profile"}
                </Button>
              </div>
            </form>
          </Form>

        </CardContent>
      </Card>

      {/* Feature Overview Dialog removed */}

      {/* Profile Claiming Dialog */}
      <ProfileClaimingDialog
        open={showClaimingDialog}
        onOpenChange={setShowClaimingDialog}
        onProfileClaimed={refreshClaimedProfile}
      />

      {/* Information Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-base text-muted-foreground">
          <p>• First claim your group member profile if you haven't already</p>
          <p>• Select your family group from the dropdown menu</p>
          <p>• Choose your name from the list of group members</p>
          <p>• Update your email and phone number as needed</p>
          <p>• Your changes will be saved automatically</p>
        </CardContent>
      </Card>
    </div>
  );
};

export default GroupMemberProfile;