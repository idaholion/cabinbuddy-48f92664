import { useEffect, useState, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { PhoneInput } from "@/components/ui/phone-input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { User, Save, LogOut, Camera, Download, Upload, UserPlus, ArrowRight, Shield, Home, UserCircle, CheckCircle2, Search } from "lucide-react";
import { useFamilyGroups } from "@/hooks/useFamilyGroups";
import { useOrganization } from "@/hooks/useOrganization";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { useAutoSave } from "@/hooks/useAutoSave";
import { unformatPhoneNumber } from "@/lib/phone-utils";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ConfirmationDialog } from "@/components/ui/confirmation-dialog";
// Removed FeatureOverviewDialog import as it's not needed here
import { ProfileClaimingDialog } from "@/components/ProfileClaimingDialog";
import { PageHeader } from "@/components/ui/page-header";
import { useProfileClaiming } from "@/hooks/useProfileClaiming";
import { useProfile } from "@/hooks/useProfile";
import { parseFullName, sanitizeName } from "@/lib/name-utils";

const groupMemberProfileSchema = z.object({
  selectedFamilyGroup: z.string().min(1, "Please select your family group"),
  selectedMemberName: z.string().min(1, "Please select your name"),
  email: z.string().email("Please enter a valid email").optional().or(z.literal("")),
  phone: z.string().optional(),
});

type GroupMemberProfileFormData = z.infer<typeof groupMemberProfileSchema>;

const GroupMemberProfile = () => {
  console.log('🔍 PROFILE PAGE - Component Mount:', {
    currentUrl: window.location.href,
    pathname: window.location.pathname,
    timestamp: new Date().toISOString()
  });

  const { toast } = useToast();
  const { user, signOut, resetPassword } = useAuth();
  const { organization } = useOrganization();
  const { familyGroups, updateFamilyGroup, loading } = useFamilyGroups();
  const { claimedProfile, hasClaimedProfile, isGroupLead, refreshClaimedProfile } = useProfileClaiming();
  const { updateProfile: updateUserProfile } = useProfile();
  const navigate = useNavigate();

  // Debug: Log user and profile data on component mount
  console.log('🔍 Profile Debug - Component Data:', {
    userEmail: user?.email,
    hasClaimedProfile,
    claimedProfile,
    isGroupLead,
    familyGroupsCount: familyGroups.length,
    organization: organization?.organization_name
  });

  // Check for any automatic redirects
  useEffect(() => {
    console.log('🔍 PROFILE - Mount check, no redirects should happen from this component');
  }, []);
  const [selectedGroup, setSelectedGroup] = useState<any>(null);
  const [availableMembers, setAvailableMembers] = useState<any[]>([]);
  const [selectedGroupMember, setSelectedGroupMember] = useState<any>(null);
  const [autoPopulated, setAutoPopulated] = useState(false);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [showClaimingDialog, setShowClaimingDialog] = useState(false);
  const [showQualityDialog, setShowQualityDialog] = useState(false);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Quality options for image compression
  const qualityOptions = {
    high: { maxWidth: 2400, maxHeight: 1600, quality: 0.95, label: "High Quality", description: "Best quality, larger file size" },
    balanced: { maxWidth: 1920, maxHeight: 1080, quality: 0.8, label: "Balanced", description: "Good quality, moderate file size" },
    small: { maxWidth: 1280, maxHeight: 720, quality: 0.6, label: "Small File", description: "Lower quality, smallest file size" }
  };
  
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

  // Debug logging for form state
  console.log('📋 Form State:', {
    watchedFamilyGroup,
    watchedMemberName,
    hasClaimedProfile,
    claimedProfileName: claimedProfile?.member_name,
    formIsValid: isValid
  });

  // Add this prominent debug logging
  useEffect(() => {
    console.log('🚨 FAMILY GROUPS DEBUG - Raw Data:', familyGroups);
    if (familyGroups.length > 0) {
      familyGroups.forEach((group, index) => {
        console.log(`🚨 Group ${index + 1}:`, {
          name: group.name,
          lead_name: group.lead_name,
          lead_email: group.lead_email,
          host_members: group.host_members,
          host_members_length: group.host_members?.length || 0
        });
      });
    }
  }, [familyGroups]);

  // Update available members when family group changes
  useEffect(() => {
    console.log('🚨 PROCESSING FAMILY GROUP:', watchedFamilyGroup);
    
    if (watchedFamilyGroup) {
      try {
        const group = familyGroups.find(g => g.name === watchedFamilyGroup);
        console.log('🚨 FOUND GROUP:', group);
        
        setSelectedGroup(group);
        
        if (group) {
          console.log('🚨 GROUP DETAILS:', {
            leadName: group.lead_name,
            leadNameTrimmed: group.lead_name?.trim(),
            leadNameExists: !!(group.lead_name && group.lead_name.trim()),
            hostMembers: group.host_members,
            hostMembersIsArray: Array.isArray(group.host_members),
            hostMembersLength: group.host_members?.length || 0
          });

          const leadMember = group.lead_name && group.lead_name.trim() ? [{ 
            name: group.lead_name, 
            email: group.lead_email, 
            phone: group.lead_phone,
            isLead: true 
          }] : [];

          console.log('🚨 LEAD MEMBER:', leadMember);

          const hostMembers = (group.host_members || [])
            .filter((member: any) => {
              const hasName = member.name && member.name.trim();
              // Filter out the lead to prevent duplicates
              const isNotLead = member.name !== group.lead_name;
              console.log('🚨 CHECKING HOST MEMBER:', {
                member,
                hasName,
                isNotLead,
                memberName: member.name,
                leadName: group.lead_name
              });
              return hasName && isNotLead;
            })
            .map((member: any) => ({ 
              name: member.name, 
              email: member.email, 
              phone: member.phone,
              isLead: false 
            }));

          console.log('🚨 HOST MEMBERS AFTER FILTERING:', hostMembers);

          const allMembers = [...leadMember, ...hostMembers];
          console.log('🚨 ALL MEMBERS COMBINED:', allMembers);
          
          setAvailableMembers(allMembers);
        } else {
          console.log('🚨 NO GROUP FOUND - CLEARING MEMBERS');
          setAvailableMembers([]);
        }
        
        // Only clear member name if not auto-populated to prevent conflict
        if (!autoPopulated) {
          setValue("selectedMemberName", "");
          setSelectedGroupMember(null);
        }
      } catch (error) {
        console.error('🚨 ERROR PROCESSING FAMILY GROUP:', error);
        setAvailableMembers([]);
      }
    } else {
      console.log('🚨 NO FAMILY GROUP SELECTED');
      setAvailableMembers([]);
    }
  }, [watchedFamilyGroup, familyGroups, setValue, autoPopulated]);

  // Update form fields when member name changes
  useEffect(() => {
    console.log('🚨 MEMBER NAME SELECTION EFFECT - START:', {
      watchedMemberName,
      availableMembersCount: availableMembers.length,
      availableMembers: availableMembers.map(m => ({ name: m.name, trimmed: m.name?.trim() }))
    });

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
      
      // Trim both the watched name and member names for comparison
      const trimmedWatchedName = watchedMemberName.trim();
      console.log('🚨 LOOKING FOR MEMBER:', {
        original: watchedMemberName,
        trimmed: trimmedWatchedName
      });
      
      const member = availableMembers.find(m => {
        const memberNameTrimmed = m.name?.trim();
        const matches = memberNameTrimmed === trimmedWatchedName;
        console.log('🚨 COMPARING:', {
          memberName: m.name,
          memberNameTrimmed,
          trimmedWatchedName,
          matches
        });
        return matches;
      });
      
      console.log('🚨 MEMBER FOUND:', member);
      
      if (member) {
        setSelectedGroupMember(member);
        setValue("email", member.email || "");
        setValue("phone", member.phone || "");
        console.log('🚨 SET MEMBER DATA:', {
          name: member.name,
          email: member.email,
          phone: member.phone
        });
      } else {
        console.log('🚨 NO MEMBER MATCH FOUND!');
        setSelectedGroupMember(null);
      }
    } else {
      console.log('🚨 NO MEMBER NAME OR NO AVAILABLE MEMBERS');
    }
  }, [watchedMemberName, availableMembers, setValue, toast]);

  // Auto-population effect - tries to match user's email with family group data or use claimed profile
  useEffect(() => {
    if (!user?.email || familyGroups.length === 0 || loading || autoPopulated) {
      return;
    }

    console.log('👤 Auto-population check:', {
      userEmail: user.email,
      hasClaimedProfile,
      claimedProfile,
      familyGroupsCount: familyGroups.length
    });

    // FIRST: If user has a claimed profile, use that data
    if (hasClaimedProfile && claimedProfile) {
      console.log('✅ Using claimed profile:', claimedProfile);
      const group = familyGroups.find(g => g.name === claimedProfile.family_group_name);
      if (group) {
        setValue("selectedFamilyGroup", claimedProfile.family_group_name);
        // Trim the member name to match available members
        const trimmedMemberName = claimedProfile.member_name.trim();
        setValue("selectedMemberName", trimmedMemberName);
        setSelectedGroup(group);
        
        // Find the member in the group data
        const isLead = claimedProfile.member_type === 'group_lead';
        let selectedMember = null;
        
        if (isLead && group.lead_name) {
          selectedMember = {
            name: group.lead_name,
            email: group.lead_email,
            phone: group.lead_phone,
            isLead: true
          };
        } else {
          // Find in host_members using trimmed name
          const hostMember = group.host_members?.find((m: any) => m.name?.trim() === trimmedMemberName);
          if (hostMember) {
            selectedMember = {
              name: hostMember.name,
              email: hostMember.email,
              phone: hostMember.phone,
              isLead: false
            };
          }
        }
        
        if (selectedMember) {
          setSelectedGroupMember(selectedMember);
          setValue("email", selectedMember.email || "");
          setValue("phone", selectedMember.phone || "");
          
          // Set available members for the dropdown
          const leadMember = group.lead_name ? [{ 
            name: group.lead_name, 
            email: group.lead_email, 
            phone: group.lead_phone,
            isLead: true 
          }] : [];
          
          const hostMembers = (group.host_members || [])
            .filter((member: any) => member.name && member.name.trim())
            .map((member: any) => ({ 
              name: member.name, 
              email: member.email, 
              phone: member.phone,
              isLead: false 
            }));
          
          setAvailableMembers([...leadMember, ...hostMembers]);
        }
        
        setAutoPopulated(true);
        return;
      }
    }

    // FALLBACK: Try email-based auto-detection for unclaimed profiles
    const userEmail = user.email.toLowerCase();
    for (const group of familyGroups) {
      // Check if user is the group lead
      if (group.lead_email?.toLowerCase() === userEmail && group.lead_name) {
        console.log('✅ Auto-detected as group lead:', { groupName: group.name, leadName: group.lead_name });
        setValue("selectedFamilyGroup", group.name);
        setValue("selectedMemberName", group.lead_name);
        setAutoPopulated(true);
        return;
      }

      // Check if user is in host_members
      if (group.host_members) {
        for (const member of group.host_members) {
          if (member.email?.toLowerCase() === userEmail && member.name) {
            console.log('✅ Auto-detected as host member:', { groupName: group.name, memberName: member.name });
            setValue("selectedFamilyGroup", group.name);
            setValue("selectedMemberName", member.name);
            setAutoPopulated(true);
            return;
          }
        }
      }
    }

    console.log('❌ No auto-detection match found for email:', userEmail);
  }, [user?.email, familyGroups, loading, hasClaimedProfile, claimedProfile, autoPopulated, setValue]);
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

  // Image compression function
  const compressImage = (file: File, maxWidth = 1920, maxHeight = 1080, quality = 0.8): Promise<File> => {
    return new Promise((resolve) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = document.createElement('img');
      
      img.onload = () => {
        // Calculate new dimensions
        let { width, height } = img;
        if (width > maxWidth || height > maxHeight) {
          const ratio = Math.min(maxWidth / width, maxHeight / height);
          width *= ratio;
          height *= ratio;
        }
        
        canvas.width = width;
        canvas.height = height;
        
        // Draw and compress
        ctx?.drawImage(img, 0, 0, width, height);
        canvas.toBlob((blob) => {
          if (blob) {
            const compressedFile = new File([blob], file.name, {
              type: 'image/jpeg',
              lastModified: Date.now()
            });
            resolve(compressedFile);
          }
        }, 'image/jpeg', quality);
        
        URL.revokeObjectURL(img.src);
      };
      
      img.src = URL.createObjectURL(file);
    });
  };

  // Handle avatar upload
  const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !user) return;

    // Check if it's a large image that might benefit from quality selection
    if (file.size > 100 * 1024) { // > 100KB
      setPendingFile(file);
      setShowQualityDialog(true);
      event.target.value = "";
      return;
    }

    // For small images, upload directly
    await uploadAvatar(file);
  };

  const handleQualitySelection = async (qualityKey: keyof typeof qualityOptions) => {
    if (!pendingFile) return;

    setShowQualityDialog(false);
    const options = qualityOptions[qualityKey];
    
    try {
      const processedFile = await compressImage(pendingFile, options.maxWidth, options.maxHeight, options.quality);
      await uploadAvatar(processedFile);
      setPendingFile(null);
    } catch (error) {
      console.error('Error processing image:', error);
      setPendingFile(null);
    }
  };

  const uploadAvatar = async (file: File) => {
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
        }, {
          onConflict: 'user_id'
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

  // Handle password reset
  const handlePasswordReset = async () => {
    if (!user?.email) {
      toast({
        title: "Error",
        description: "No email address found for your account.",
        variant: "destructive",
      });
      return;
    }

    try {
      const { error } = await resetPassword(user.email);
      if (error) {
        toast({
          title: "Error",
          description: error.message || "Failed to send password reset email.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Password Reset Email Sent",
          description: `A password reset link has been sent to ${user.email}. Please check your email and follow the instructions.`,
        });
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to send password reset email. Please try again.",
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
    if (!selectedGroup || !selectedGroupMember || !user) {
      toast({
        title: "Error",
        description: "Please select your family group and name.",
        variant: "destructive",
      });
      return;
    }

    try {
      const phoneFormatted = data.phone ? unformatPhoneNumber(data.phone) : "";
      
      // Sanitize and parse the member name
      const sanitizedName = sanitizeName(selectedGroupMember.name);
      const { firstName, lastName, displayName } = parseFullName(sanitizedName);
      
      // Update user profile first with parsed name fields
      await updateUserProfile({
        first_name: firstName,
        last_name: lastName,
        display_name: displayName,
        family_group: selectedGroup.name,
        family_role: selectedGroupMember.isLead ? 'lead' : 'member'
      });

      const updateData = {
        ...selectedGroupMember,
        email: data.email || selectedGroupMember.email,
        phone: phoneFormatted || selectedGroupMember.phone,
      };

      if (selectedGroupMember.isLead) {
        // Update the lead information
        const updates = {
          lead_email: updateData.email,
          lead_phone: updateData.phone,
        };
        await updateFamilyGroup(selectedGroup.id, updates);
      } else {
        // Update host_members array
        const updatedHostMembers = (selectedGroup.host_members || []).map((member: any) =>
          member.name === selectedGroupMember.name 
            ? { ...member, email: updateData.email, phone: updateData.phone }
            : member
        );
        
        const updates = {
          host_members: updatedHostMembers,
        };
        await updateFamilyGroup(selectedGroup.id, updates);
      }
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
      {/* Header with Home and Logout */}
      <PageHeader 
        title="Profile Settings"
        icon={UserCircle}
        backgroundImage={true}
      >
        <div className="flex justify-between items-center mb-6">
          <Button variant="outline" onClick={() => navigate('/')} className="flex items-center space-x-2 text-base">
            <Home className="h-4 w-4" />
            <span>Home</span>
          </Button>
          <Button variant="outline" onClick={signOut} className="flex items-center space-x-2 text-base">
            <LogOut className="h-4 w-4" />
            <span>Logout</span>
          </Button>
        </div>
      </PageHeader>

      {/* Profile Claiming Section - One-time account linking */}
      {!hasClaimedProfile && familyGroups.length > 0 && (
        <Card className="mb-6 border-primary/50 bg-primary/5">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <UserPlus className="h-5 w-5" />
              {autoPopulated ? 'Confirm Your Profile' : 'Claim Your Profile'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {autoPopulated ? (
              <div className="space-y-4">
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-base text-muted-foreground mb-1">
                      We detected your profile based on your email! Your information has been auto-populated below.
                    </p>
                    <p className="text-base text-muted-foreground">
                      Click <strong>Claim Profile</strong> to permanently link your account to this family group member.
                    </p>
                  </div>
                </div>
                <Button
                  onClick={() => setShowClaimingDialog(true)}
                  className="flex items-center gap-2"
                >
                  <UserPlus className="h-4 w-4" />
                  Claim Profile
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-start gap-2">
                  <Search className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-base text-muted-foreground mb-1">
                      We couldn't automatically detect your profile.
                    </p>
                    <p className="text-base text-muted-foreground">
                      Click <strong>Search & Claim</strong> to find and link your account to your family group member profile.
                    </p>
                  </div>
                </div>
                <Button
                  onClick={() => setShowClaimingDialog(true)}
                  className="flex items-center gap-2"
                >
                  <Search className="h-4 w-4" />
                  Search & Claim Profile
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Profile Successfully Claimed */}
      {hasClaimedProfile && claimedProfile && (
        <Card className="mb-6 border-green-200 bg-green-50">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2 text-green-800">
              <CheckCircle2 className="h-5 w-5" />
              Profile Linked Successfully
            </CardTitle>
          </CardHeader>
          <CardContent className="text-green-700">
            <p className="text-base mb-4">
              Your account is linked to <strong>{claimedProfile.family_group_name}</strong>
              {isGroupLead && ' as the Group Lead'}.
            </p>
            {isGroupLead && (
              <Button
                onClick={() => navigate('/family-group-setup')}
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
          
          <CardTitle className="text-3xl font-bold mt-4">Profile Settings</CardTitle>
          <p className="text-muted-foreground text-base">
            Manage your avatar and contact information
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
                     <Select onValueChange={field.onChange} value={field.value} disabled={autoPopulated}>
                        <FormControl>
                          <SelectTrigger className={autoPopulated ? "text-base text-foreground font-medium" : "text-base"}>
                            <SelectValue 
                              placeholder="Choose your family group" 
                              className={autoPopulated ? "text-foreground font-medium" : "text-base"} 
                            />
                          </SelectTrigger>
                        </FormControl>
                       <SelectContent className="bg-background border shadow-lg z-50">
                        {familyGroups
                          .filter(group => group.name && group.name.trim())
                          .map((group) => (
                            <SelectItem key={group.id} value={group.name}>
                              {group.name}
                            </SelectItem>
                          ))}
                       </SelectContent>
                    </Select>
                    <FormMessage />
                    {autoPopulated && (
                      <p className="text-xs text-green-600 mt-1">✓ Auto-detected based on your account information</p>
                    )}
                  </FormItem>
                )}
              />

              {/* Member Name Selection */}
              {(() => {
                console.log('🚨 DROPDOWN RENDER CHECK:', {
                  availableMembersLength: availableMembers.length,
                  availableMembers: availableMembers,
                  shouldShowDropdown: availableMembers.length > 0,
                  autoPopulated,
                  watchedFamilyGroup
                });
                return availableMembers.length > 0;
              })() && (
                <FormField
                  control={form.control}
                  name="selectedMemberName"
                  render={({ field }) => {
                    console.log('🚨 DROPDOWN FIELD RENDER:', {
                      fieldValue: field.value,
                      availableMembers: availableMembers
                    });
                    return (
                      <FormItem>
                         <FormLabel className="text-base">Select Your Name</FormLabel>
                         <Select onValueChange={field.onChange} value={field.value}>
                              <FormControl>
                                <SelectTrigger className={autoPopulated && selectedGroupMember ? "text-base text-foreground font-medium" : "text-base"}>
                                  <SelectValue 
                                    placeholder="Choose your name from the list"
                                    className={autoPopulated && selectedGroupMember ? "text-foreground font-medium" : "text-base"} 
                                  />
                                </SelectTrigger>
                              </FormControl>
                            <SelectContent className="bg-background border shadow-lg z-50">
                              {availableMembers
                                .filter(member => {
                                  const hasName = member.name && member.name.trim();
                                  console.log('🚨 DROPDOWN ITEM:', {
                                    member,
                                    hasName,
                                    name: member.name,
                                    trimmed: member.name?.trim()
                                  });
                                  return hasName;
                                })
                                .map((member, index) => {
                                  const trimmedName = member.name.trim();
                                  const displayText = member.isLead 
                                    ? `${trimmedName} (Group Lead)` 
                                    : trimmedName;
                                  // Use unique key combining name, email, and type to avoid duplicate warnings
                                  const uniqueKey = `${trimmedName}-${member.email}-${member.isLead ? 'lead' : 'member'}-${index}`;
                                  
                                  return (
                                    <SelectItem key={uniqueKey} value={trimmedName}>
                                      {displayText}
                                    </SelectItem>
                                  );
                                })}
                              <SelectItem value="NOT_FOUND" className="text-muted-foreground">
                                I don&apos;t see my name
                              </SelectItem>
                           </SelectContent>
                         </Select>
                         <FormMessage />
                         {autoPopulated && selectedGroupMember && (
                           <p className="text-xs text-green-600 mt-1">✓ Auto-detected based on your account information</p>
                         )}
                         {autoPopulated && !selectedGroupMember && (
                           <p className="text-xs text-orange-600 mt-1">⚠️ Auto-detection failed - please select your name manually</p>
                         )}
                       </FormItem>
                    );
                  }}
                />
              )}

              {/* Editable Name Field */}
              {selectedGroupMember && (
                <FormField
                  control={form.control}
                  name="selectedMemberName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-base">Your Name (Editable)</FormLabel>
                      <FormControl>
                        <Input 
                          {...field}
                          placeholder="Edit your name if needed"
                          className="text-base placeholder:text-base"
                        />
                      </FormControl>
                      <FormDescription className="text-xs">
                        You can edit your name here if you need to change the format or fix any issues
                      </FormDescription>
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
                          onChange={(formatted, raw) => {
                            console.log('📞 [PHONE INPUT] Change detected:', { formatted, raw });
                            field.onChange(formatted);
                          }}
                          autoFormat
                          className="text-base placeholder:text-base"
                          placeholder="Enter your phone number"
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
                  {loading ? "Saving Changes..." : "Save Profile Changes"}
                </Button>
              </div>
            </form>
          </Form>

        </CardContent>
      </Card>

      {/* Account Security Section */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Account Security
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <p className="text-muted-foreground text-base">
              Manage your account security settings and password.
            </p>
            <ConfirmationDialog
              title="Reset Password"
              description={`A password reset email will be sent to ${user?.email}. You will need to check your email and follow the instructions to create a new password.`}
              confirmText="Send Reset Email"
              onConfirm={handlePasswordReset}
            >
              <Button variant="outline" className="flex items-center gap-2">
                <Shield className="h-4 w-4" />
                Change Password
              </Button>
            </ConfirmationDialog>
          </div>
        </CardContent>
      </Card>

      {/* Security Tips */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-lg">Security Tips</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-base text-muted-foreground">
          <p>• Use a strong, unique password for your account</p>
          <p>• Never share your password with others</p>
          <p>• Check your email regularly for security notifications</p>
          <p>• Log out of shared devices after use</p>
          <p>• Contact support if you notice any suspicious activity</p>
        </CardContent>
      </Card>

      {/* Feature Overview Dialog removed */}

      {/* Profile Claiming Dialog */}
      <ProfileClaimingDialog
        open={showClaimingDialog}
        onOpenChange={setShowClaimingDialog}
        onProfileClaimed={refreshClaimedProfile}
      />

      {/* Quality Selection Dialog */}
      <Dialog open={showQualityDialog} onOpenChange={setShowQualityDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Choose Image Quality</DialogTitle>
            <DialogDescription>
              This image is large ({pendingFile ? Math.round(pendingFile.size / 1024 / 1024 * 100) / 100 : 0}MB). Select compression quality:
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            {(Object.keys(qualityOptions) as Array<keyof typeof qualityOptions>).map((key) => {
              const option = qualityOptions[key];
              return (
                <Button
                  key={key}
                  variant="outline"
                  className="w-full justify-start text-left h-auto p-4"
                  onClick={() => handleQualitySelection(key)}
                >
                  <div className="flex flex-col items-start">
                    <div className="font-medium">{option.label}</div>
                    <div className="text-sm text-muted-foreground">{option.description}</div>
                    <div className="text-xs text-muted-foreground mt-1">
                      Max: {option.maxWidth}×{option.maxHeight}px, Quality: {Math.round(option.quality * 100)}%
                    </div>
                  </div>
                </Button>
              );
            })}
          </div>
        </DialogContent>
      </Dialog>

      {/* Information Card */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-lg">Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-base text-muted-foreground">
          <p>• Your family group and name are automatically detected from your account</p>
          <p>• If auto-detection fails, you can manually claim your profile</p>
          <p>• Update your email and phone number as needed</p>
          <p>• Your changes will be saved automatically</p>
          <p>• Use the home buttons to navigate back to the main page</p>
        </CardContent>
      </Card>

      {/* Bottom Home Button */}
      <div className="flex justify-center pb-6">
        <Button onClick={() => navigate('/home')} size="lg" className="flex items-center space-x-2 text-base">
          <Home className="h-4 w-4" />
          <span>Return to Home</span>
        </Button>
      </div>
    </div>
  );
};

export default GroupMemberProfile;