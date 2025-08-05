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
import { User, Save, LogOut, Camera, Download, Upload } from "lucide-react";
import { useFamilyGroups } from "@/hooks/useFamilyGroups";
import { useOrganization } from "@/hooks/useOrganization";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { useAutoSave } from "@/hooks/useAutoSave";
import { unformatPhoneNumber } from "@/lib/phone-utils";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

const hostProfileSchema = z.object({
  selectedFamilyGroup: z.string().min(1, "Please select your family group"),
  selectedHostName: z.string().min(1, "Please select your name"),
  email: z.string().email("Please enter a valid email").optional().or(z.literal("")),
  phone: z.string().optional(),
});

type HostProfileFormData = z.infer<typeof hostProfileSchema>;

const HostProfile = () => {
  const { toast } = useToast();
  const { user, signOut } = useAuth();
  const { organization } = useOrganization();
  const { familyGroups, updateFamilyGroup, loading } = useFamilyGroups();
  const [selectedGroup, setSelectedGroup] = useState<any>(null);
  const [availableHosts, setAvailableHosts] = useState<any[]>([]);
  const [selectedHostMember, setSelectedHostMember] = useState<any>(null);
  const [autoPopulated, setAutoPopulated] = useState(false);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const form = useForm<HostProfileFormData>({
    resolver: zodResolver(hostProfileSchema),
    defaultValues: {
      selectedFamilyGroup: "",
      selectedHostName: "",
      email: "",
      phone: "",
    },
    mode: "onChange",
  });

  const { watch, setValue, formState: { isValid } } = form;
  const watchedFamilyGroup = watch("selectedFamilyGroup");
  const watchedHostName = watch("selectedHostName");

  // Update available hosts when family group changes
  useEffect(() => {
    if (watchedFamilyGroup) {
      const group = familyGroups.find(g => g.name === watchedFamilyGroup);
      setSelectedGroup(group);
      if (group?.host_members) {
        setAvailableHosts(group.host_members);
      } else {
        setAvailableHosts([]);
      }
      setValue("selectedHostName", "");
      setSelectedHostMember(null);
    }
  }, [watchedFamilyGroup, familyGroups, setValue]);

  // Update form fields when host name changes
  useEffect(() => {
    if (watchedHostName && availableHosts.length > 0) {
      const hostMember = availableHosts.find(h => h.name === watchedHostName);
      if (hostMember) {
        setSelectedHostMember(hostMember);
        setValue("email", hostMember.email || "");
        setValue("phone", hostMember.phone || "");
      }
    }
  }, [watchedHostName, availableHosts, setValue]);

  // Auto-populate user information when family groups load
  useEffect(() => {
    if (familyGroups.length > 0 && user && !autoPopulated) {
      const userEmail = user.email;
      const userFirstName = user.user_metadata?.first_name;
      
      // Try to find user by email or name in family groups
      for (const group of familyGroups) {
        if (group.host_members) {
          const foundMember = group.host_members.find((member: any) => 
            member.email?.toLowerCase() === userEmail?.toLowerCase() || 
            (userFirstName && member.name?.toLowerCase().includes(userFirstName.toLowerCase()))
          );
          
          if (foundMember) {
            // Auto-populate the form
            setValue("selectedFamilyGroup", group.name);
            setValue("selectedHostName", foundMember.name);
            setValue("email", foundMember.email || userEmail || "");
            setValue("phone", foundMember.phone || "");
            
            setSelectedGroup(group);
            setAvailableHosts(group.host_members);
            setSelectedHostMember(foundMember);
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
    key: "host-profile", 
    data: formData, 
    delay: 2000 
  });

  const onSubmit = async (data: HostProfileFormData) => {
    if (!selectedGroup || !selectedHostMember) {
      toast({
        title: "Error",
        description: "Please select your family group and name.",
        variant: "destructive",
      });
      return;
    }

    try {
      // Update the host member in the selected family group
      const updatedHostMembers = selectedGroup.host_members.map((member: any) => {
        if (member.name === data.selectedHostName) {
          return {
            ...member,
            email: data.email || "",
            phone: data.phone ? unformatPhoneNumber(data.phone) : "",
          };
        }
        return member;
      });

      await updateFamilyGroup(selectedGroup.id, {
        host_members: updatedHostMembers,
      });

      toast({
        title: "Success",
        description: "Your profile has been updated successfully.",
      });
    } catch (error) {
      console.error("Error updating host profile:", error);
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
        <Button variant="outline" onClick={signOut} className="flex items-center space-x-2">
          <LogOut className="h-4 w-4" />
          <span>Logout</span>
        </Button>
      </div>

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
                className="flex items-center space-x-2"
              >
                <Upload className="h-4 w-4" />
                <span>{avatarUploading ? "Uploading..." : "Upload Photo"}</span>
              </Button>
              
              {userProfile?.avatar_url && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleAvatarDownload}
                  className="flex items-center space-x-2"
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
          
          <CardTitle className="text-3xl font-bold mt-4">Host Member Profile</CardTitle>
          <p className="text-muted-foreground">
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
                    <FormLabel>Select Your Family Group</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Choose your family group" />
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

              {/* Host Name Selection */}
              {availableHosts.length > 0 && (
                <FormField
                  control={form.control}
                  name="selectedHostName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Select Your Name</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Choose your name from the list" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {availableHosts.map((host, index) => (
                            <SelectItem key={index} value={host.name}>
                              {host.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              {/* Email Field */}
              {selectedHostMember && (
                <>
                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email Address</FormLabel>
                        <FormControl>
                          <Input 
                            {...field} 
                            type="email" 
                            placeholder="Enter your email address"
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
                        <FormLabel>Phone Number</FormLabel>
                        <FormControl>
                          <PhoneInput
                            value={field.value || ""}
                            onChange={(formatted, raw) => field.onChange(formatted)}
                            autoFormat
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
                  disabled={loading || !isValid || !selectedHostMember}
                  size="lg"
                  className="min-w-48"
                >
                  <Save className="h-4 w-4 mr-2" />
                  {loading ? "Saving..." : "Update Profile"}
                </Button>
              </div>
            </form>
          </Form>

        </CardContent>
      </Card>

      {/* Information Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>• Select your family group from the dropdown menu</p>
          <p>• Choose your name from the list of host members</p>
          <p>• Update your email and phone number as needed</p>
          <p>• Your changes will be saved automatically</p>
        </CardContent>
      </Card>
    </div>
  );
};

export default HostProfile;