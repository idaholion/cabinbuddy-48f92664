import { useEffect, useState, useRef } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { PhoneInput } from "@/components/ui/phone-input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Plus, Trash2, Users, Edit2, Check, X } from "lucide-react";
import { Link } from "react-router-dom";
import { useFamilyGroups } from "@/hooks/useFamilyGroups";
import { useMultiOrganization } from "@/hooks/useMultiOrganization";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { useAutoSave } from "@/hooks/useAutoSave";
import { useUnsavedChanges } from "@/hooks/useUnsavedChanges";
import { NavigationConfirmationDialog } from "@/components/ui/navigation-confirmation-dialog";
import { unformatPhoneNumber } from "@/lib/phone-utils";
import { familyGroupSetupSchema, type FamilyGroupSetupFormData } from "@/lib/validations";
import { parseFullName } from "@/lib/name-utils";
import { GroupMemberCard } from "@/components/GroupMemberCard";
import { ConfirmationDialog } from "@/components/ui/confirmation-dialog";
import { useNavigate } from "react-router-dom";
import { LoadingState } from "@/components/ui/loading-spinner";
import { ProfileClaimingDialog } from "@/components/ProfileClaimingDialog";

import { FamilyGroupColorPicker } from "@/components/FamilyGroupColorPicker";
import { useUserRole } from "@/hooks/useUserRole";
import { useSupervisor } from "@/hooks/useSupervisor";
import { useEnhancedProfileClaim } from "@/hooks/useEnhancedProfileClaim";
import { useProfile } from "@/hooks/useProfile";
import { supabase } from "@/integrations/supabase/client";

const FamilyGroupSetup = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { activeOrganization: organization, loading: organizationLoading } = useMultiOrganization();
  const { familyGroups, loading: familyGroupsLoading, createFamilyGroup, updateFamilyGroup, renameFamilyGroup, refetchFamilyGroups } = useFamilyGroups();
  const { isGroupLead, userFamilyGroup, isAdmin, loading: roleLoading, isGroupMember } = useUserRole();
  const { isSupervisor } = useSupervisor();
  const { claimProfile } = useEnhancedProfileClaim(organization?.organization_id);
  const { updateProfile: updateUserProfile } = useProfile();
  const [showAllMembers, setShowAllMembers] = useState(false);
  const [isEditingName, setIsEditingName] = useState(false);
  const [editingGroupName, setEditingGroupName] = useState("");
  const [showAlternateLeadDialog, setShowAlternateLeadDialog] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const hasLoadedAutoSave = useRef(false);
  const hasUserMadeChanges = useRef(false);
  const [memberClaimStatus, setMemberClaimStatus] = useState<Map<string, { hasAccount: boolean; hasClaimed: boolean }>>(new Map());
  const [showProfileClaimDialog, setShowProfileClaimDialog] = useState(false);

  const form = useForm<FamilyGroupSetupFormData>({
    resolver: zodResolver(familyGroupSetupSchema),
    defaultValues: {
      selectedGroup: "",
      leadName: "",
      leadPhone: "",
      leadEmail: "",
      groupMembers: [
        { firstName: "", lastName: "", name: "", phone: "", email: "", canHost: false }, // Group lead (index 0) can have contact info
        { firstName: "", lastName: "", name: "", phone: "", email: "", canHost: false },
        { firstName: "", lastName: "", name: "", phone: "", email: "", canHost: false }
      ],
      alternateLeadId: "none",
    },
    mode: "onChange",
  });

  const { control, watch, setValue, getValues, handleSubmit, trigger, formState: { errors, isValid, isDirty } } = form;
  const { fields, append, remove, move } = useFieldArray({
    control,
    name: "groupMembers",
  });

  const watchedData = watch();

  // Unsaved changes protection - track actual user changes
  const { 
    confirmNavigation,
    showNavigationDialog,
    handleSaveAndContinue,
    handleDiscardAndContinue,
    handleCancelNavigation
  } = useUnsavedChanges({
    hasUnsavedChanges: hasUserMadeChanges.current && !isSaving,
    message: "You have unsaved changes to your family group. Are you sure you want to leave?",
    onSave: async () => {
      const formData = getValues();
      await onSubmit(formData);
    }
  });

  // Auto-save form data with group-specific keys to prevent cross-contamination
  const autoSaveKey = watchedData.selectedGroup 
    ? `family-group-setup-${watchedData.selectedGroup}` 
    : 'family-group-setup';
    
  const { loadSavedData, clearSavedData } = useAutoSave({
    key: autoSaveKey,
    data: watchedData,
    enabled: true,
  });

  // Drag and drop sensors
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Get the selected family group data
  const selectedFamilyGroup = familyGroups.find(g => g.name === watchedData.selectedGroup);

  // Load member claim status for visual indicators (Phase 3)
  useEffect(() => {
    const loadMemberStatus = async () => {
      if (!organization?.organization_id || !selectedFamilyGroup) return;

      try {
        const { data: orgUsers, error: userError } = await supabase
          .rpc('get_organization_user_emails', { org_id: organization.organization_id });
        
        if (userError) throw userError;

        const { data: claims, error: claimError } = await supabase
          .from('member_profile_links')
          .select('member_name, claimed_by_user_id')
          .eq('organization_id', organization.organization_id)
          .eq('family_group_name', selectedFamilyGroup.name);

        if (claimError) throw claimError;

        const statusMap = new Map<string, { hasAccount: boolean; hasClaimed: boolean }>();
        const userEmailMap = new Map(orgUsers?.map((u: any) => [u.email.toLowerCase().trim(), u.user_id]) || []);
        const claimedSet = new Set(claims?.map(c => c.member_name) || []);

        selectedFamilyGroup.host_members?.forEach((member: any) => {
          if (member.email) {
            const email = member.email.toLowerCase().trim();
            const hasAccount = userEmailMap.has(email);
            const hasClaimed = claimedSet.has(member.name);
            statusMap.set(member.name, { hasAccount, hasClaimed });
          }
        });

        setMemberClaimStatus(statusMap);
      } catch (error) {
        console.error('Error loading member status:', error);
      }
    };

    loadMemberStatus();
  }, [organization?.organization_id, selectedFamilyGroup]);

  // Load auto-saved data on mount (only once) with validation
  useEffect(() => {
    if (hasLoadedAutoSave.current) return;
    
    const savedData = loadSavedData();
    console.log('🔍 [AUTO_SAVE_LOAD] Loaded saved data:', savedData);
    
    if (savedData && savedData.selectedGroup) {
      // Verify that the saved data belongs to an existing family group
      const groupExists = familyGroups.some(g => g.name === savedData.selectedGroup);
      
      if (!groupExists) {
        console.warn('⚠️ [AUTO_SAVE_LOAD] Saved data references non-existent group, clearing:', savedData.selectedGroup);
        clearSavedData();
        // Don't set hasLoadedAutoSave to true - let database load take over
        return;
      }
      
      // Check if auto-save data contains meaningful values (not just empty strings)
      const hasSignificantData = savedData.leadName || 
                                 savedData.leadEmail || 
                                 savedData.leadPhone ||
                                 (savedData.groupMembers && savedData.groupMembers.some((m: any) => m.name || m.email || m.phone));
      
      if (!hasSignificantData) {
        console.warn('⚠️ [AUTO_SAVE_LOAD] Saved data is empty/incomplete, clearing to allow database load');
        clearSavedData();
        // Don't set hasLoadedAutoSave to true - let database load and auto-populate take over
        return;
      }
      
      console.log('✅ [AUTO_SAVE_LOAD] Restoring auto-saved data for group:', savedData.selectedGroup);
      hasLoadedAutoSave.current = true;
      Object.keys(savedData).forEach((key) => {
        setValue(key as keyof FamilyGroupSetupFormData, savedData[key], { shouldDirty: false });
      });
      
      // Reset the form to clear dirty state after loading
      form.reset(getValues());
      hasUserMadeChanges.current = false;
      
      toast({
        title: "Draft Restored",
        description: "Your previous work has been restored from auto-save.",
      });
    }
    // If there's no saved data, don't set hasLoadedAutoSave - let auto-populate run
  }, [loadSavedData, setValue, toast, form, getValues, familyGroups, clearSavedData, user?.id]);

  // Redirect regular group members to their profile page
  useEffect(() => {
    if (!roleLoading && !authLoading && !organizationLoading) {
      console.log('🔍 [FAMILY_GROUP_SETUP] Role Detection:', {
        isAdmin,
        isSupervisor,
        isGroupLead,
        userFamilyGroup,
        familyGroupsCount: familyGroups.length,
        userEmail: user?.email,
        hasOrganization: !!organization
      });

      // Regular group members should use the Group Member Profile page
      if (isGroupMember && !isGroupLead && !isAdmin && !isSupervisor) {
        console.log('🔄 [FAMILY_GROUP_SETUP] Redirecting group member to profile page');
        toast({
          title: "Redirecting",
          description: "Group members should use the Group Member Profile page.",
        });
        navigate("/group-member-profile");
        return;
      }
    }
  }, [isGroupMember, isGroupLead, isAdmin, isSupervisor, roleLoading, authLoading, organizationLoading, navigate, toast, user?.email, userFamilyGroup, familyGroups.length, organization]);

  // Pre-populate user information for new signups AND auto-populate family group for non-admin users
  useEffect(() => {
    // Only run if user is authenticated and no auto-save data was loaded
    if (!user || hasLoadedAutoSave.current) return;

    // Auto-populate family group for non-admin users who have one
    if (!isAdmin && !isSupervisor && userFamilyGroup && !getValues("selectedGroup")) {
      console.log('🔧 [FAMILY_GROUP_SETUP] Auto-populating family group for non-admin user:', userFamilyGroup.name);
      setValue("selectedGroup", userFamilyGroup.name, { shouldDirty: false });
    }

    // Only pre-populate if form is empty (no group selected and lead fields are empty)
    const currentValues = getValues();
    if (currentValues.leadName || currentValues.leadEmail) return;

    console.log('🔧 [FAMILY_GROUP_SETUP] Pre-populating user information for new signup');

    // Get user information from user metadata
    const firstName = user.user_metadata?.first_name || '';
    const lastName = user.user_metadata?.last_name || '';
    const fullName = [firstName, lastName].filter(Boolean).join(' ');
    const userEmail = user.email || '';
    const userPhone = user.phone || user.user_metadata?.phone || '';

    if (fullName || userEmail) {
      // Pre-populate Group Lead fields
      if (fullName) setValue("leadName", fullName, { shouldDirty: false });
      if (userEmail) setValue("leadEmail", userEmail, { shouldDirty: false });
      if (userPhone) setValue("leadPhone", userPhone, { shouldDirty: false });

      // Also pre-populate ONLY Group Member 1 with same info (group lead is typically first member)
      const currentGroupMembers = getValues("groupMembers");
      if (currentGroupMembers && currentGroupMembers.length > 0) {
        const updatedGroupMembers = [...currentGroupMembers];
        // Only update the first member (index 0), leave others unchanged
        const { firstName, lastName } = parseFullName(fullName);
        updatedGroupMembers[0] = {
          name: fullName,
          firstName,
          lastName,
          phone: userPhone,
          email: userEmail,
          canHost: true // Group leads can always host
        };
        // Keep other members as they are (empty by default)
        setValue("groupMembers", updatedGroupMembers, { shouldDirty: false });
      }

      console.log('✅ [FAMILY_GROUP_SETUP] Pre-populated user information for first member only:', {
        fullName,
        userEmail,
        memberIndex: 0
      });
    }
  }, [user, setValue, getValues, hasLoadedAutoSave, isAdmin, isSupervisor, userFamilyGroup]);

  // Load form data when a family group is selected
  useEffect(() => {
    if (selectedFamilyGroup) {
      console.log('📝 [FORM_LOAD] Loading data for family group:', {
        groupName: selectedFamilyGroup.name,
        groupId: selectedFamilyGroup.id,
        leadName: selectedFamilyGroup.lead_name,
        leadEmail: selectedFamilyGroup.lead_email,
        hostMembersCount: selectedFamilyGroup.host_members?.length || 0,
        hostMembers: selectedFamilyGroup.host_members
      });
      
      setValue("leadName", selectedFamilyGroup.lead_name || "", { shouldDirty: false });
      setValue("leadPhone", selectedFamilyGroup.lead_phone || "", { shouldDirty: false });
      
      // Preserve user's email if family group doesn't have lead email set
      const currentEmail = getValues("leadEmail");
      const shouldUseUserEmail = !selectedFamilyGroup.lead_email && currentEmail && user?.email === currentEmail;
      setValue("leadEmail", selectedFamilyGroup.lead_email || (shouldUseUserEmail ? currentEmail : ""), { shouldDirty: false });
      
      // Force override alternate lead from database (don't let auto-save interfere)
      setValue("alternateLeadId", selectedFamilyGroup.alternate_lead_id || "none", { 
        shouldValidate: true,
        shouldDirty: false,
        shouldTouch: true 
      });
      
      // Populate host members - DEFENSIVE: Only use data from THIS family group
      if (selectedFamilyGroup.host_members && selectedFamilyGroup.host_members.length > 0) {
        console.log('📋 [FORM_LOAD] Populating host members from database:', {
          groupName: selectedFamilyGroup.name,
          members: selectedFamilyGroup.host_members.map(m => m.name)
        });
        
        // Create completely new member objects to avoid any reference issues
        const formattedHostMembers = selectedFamilyGroup.host_members.map((member, idx) => {
          const { firstName, lastName } = parseFullName(member.name || "");
          const newMember = {
            firstName: firstName || "",
            lastName: lastName || "",
            name: member.name || "",
            phone: member.phone || "",
            email: member.email || "",
            canHost: member.canHost || false,
          };
          console.log(`📋 [FORM_LOAD] Member ${idx}:`, newMember);
          return newMember;
        });
        
        setValue("groupMembers", formattedHostMembers, { shouldDirty: false });
        setShowAllMembers(formattedHostMembers.length > 3);
      } else {
        // Automatically copy Group Lead info to Group Member 1
        const leadEmail = selectedFamilyGroup.lead_email || (shouldUseUserEmail ? currentEmail : "");
        const { firstName, lastName } = parseFullName(selectedFamilyGroup.lead_name || "");
        const leadAsHostMember = {
          firstName: firstName || "",
          lastName: lastName || "",
          name: selectedFamilyGroup.lead_name || "",
          phone: selectedFamilyGroup.lead_phone || "",
          email: leadEmail,
          canHost: true // Group leads can always host
        };
        
        console.log('📋 [FORM_LOAD] Creating default member list with lead:', leadAsHostMember);
        setValue("groupMembers", [
          leadAsHostMember,
          { firstName: "", lastName: "", name: "", phone: "", email: "", canHost: false },
          { firstName: "", lastName: "", name: "", phone: "", email: "", canHost: false }
        ], { shouldDirty: false });
      }
      
      // Reset the form to clear dirty state after loading data from database
      const finalValues = getValues();
      console.log('✅ [FORM_LOAD] Final form values:', {
        groupName: finalValues.selectedGroup,
        leadName: finalValues.leadName,
        memberCount: finalValues.groupMembers?.length,
        memberNames: finalValues.groupMembers?.map(m => m.name)
      });
      
      form.reset(finalValues);
      hasUserMadeChanges.current = false;
      
      console.log('✅ [FORM_LOAD] Form populated successfully for group:', selectedFamilyGroup.name);
    } else if (watchedData.selectedGroup === "") {
      console.log('🔄 [FORM_LOAD] Clearing form - no group selected');
      form.reset();
      hasUserMadeChanges.current = false;
    }
  }, [selectedFamilyGroup, setValue, form, getValues, user?.email, setShowAllMembers, parseFullName]);

  // Auto-update ONLY Group Member 1 when Group Lead info changes - DISABLED to prevent contamination
  // This was causing data bleed between family groups
  /*
  useEffect(() => {
    const currentGroupMembers = getValues("groupMembers");
    const currentSelectedGroup = getValues("selectedGroup");
    
    console.log('🔍 [AUTO_UPDATE_CHECK] Effect triggered:', {
      hasGroupMembers: !!currentGroupMembers?.length,
      leadName: watchedData.leadName,
      leadEmail: watchedData.leadEmail,
      hasLoadedAutoSave: hasLoadedAutoSave.current,
      selectedGroup: currentSelectedGroup
    });
    
    // DEFENSIVE CHECK: Don't update if no group is selected or if data doesn't match
    if (!currentSelectedGroup || currentSelectedGroup === "") {
      console.log('⏸️ [AUTO_UPDATE_CHECK] Skipping - no group selected');
      return;
    }
    
    // Only update if we have group members and any lead info
    // Allow updates for both new groups and existing groups when lead info changes
    if (currentGroupMembers && currentGroupMembers.length > 0 && 
        (watchedData.leadName || watchedData.leadPhone || watchedData.leadEmail)) {
      
      // Create a copy to avoid mutations
      const updatedGroupMembers = [...currentGroupMembers];
      
      // ONLY update the first group member (index 0) with Group Lead info
      const { firstName, lastName } = parseFullName(watchedData.leadName || "");
      updatedGroupMembers[0] = {
        name: watchedData.leadName || "",
        firstName,
        lastName,
        phone: watchedData.leadPhone || "",
        email: watchedData.leadEmail || "",
        canHost: true // Group leads can always host
      };
      
      // Keep all other members exactly as they were
      setValue("groupMembers", updatedGroupMembers, { shouldDirty: false });
      
      // Trigger form validation to ensure the changes are recognized
      trigger("groupMembers");
      
      console.log('✅ [AUTO_UPDATE] Updated ONLY first group member with lead info for group:', {
        groupName: currentSelectedGroup,
        leadName: watchedData.leadName,
        leadEmail: watchedData.leadEmail,
        memberIndex: 0,
        totalMembers: updatedGroupMembers.length
      });
    }
  }, [watchedData.leadName, watchedData.leadPhone, watchedData.leadEmail, setValue, getValues, hasLoadedAutoSave, trigger]);
  */

  const onSubmit = async (data: FamilyGroupSetupFormData): Promise<boolean> => {
    if (!data.selectedGroup) {
      toast({
        title: "Error",
        description: "Please select a family group.",
        variant: "destructive",
      });
      return false;
    }

    setIsSaving(true);
    const groupMembersList = data.groupMembers
      .filter(member => (member.firstName?.trim() !== '' || member.lastName?.trim() !== ''))
      .map(member => ({
        firstName: member.firstName || "",
        lastName: member.lastName || "",
        name: `${member.firstName || ""} ${member.lastName || ""}`.trim() || "",
        phone: member.phone || "",
        email: member.email || "",
        canHost: member.canHost || false,
      }));

    const existingGroup = familyGroups.find(g => g.name === data.selectedGroup);
    
    try {
      if (existingGroup) {
        await updateFamilyGroup(existingGroup.id, {
          lead_name: data.leadName || undefined,
          lead_phone: data.leadPhone ? unformatPhoneNumber(data.leadPhone) : undefined,
          lead_email: data.leadEmail || undefined,
          host_members: groupMembersList.length > 0 ? groupMembersList : undefined,
          alternate_lead_id: data.alternateLeadId === "none" ? undefined : data.alternateLeadId,
        });
        
        toast({
          title: "Success",
          description: "Family group updated successfully.",
        });
        
        // Refresh family groups data to update user roles
        await refetchFamilyGroups();
      } else {
        await createFamilyGroup({
          name: data.selectedGroup,
          lead_name: data.leadName || undefined,
          lead_phone: data.leadPhone ? unformatPhoneNumber(data.leadPhone) : undefined,
          lead_email: data.leadEmail || undefined,
          host_members: groupMembersList.length > 0 ? groupMembersList : undefined,
          
          alternate_lead_id: data.alternateLeadId === "none" ? undefined : data.alternateLeadId,
        });
        
        toast({
          title: "Success",
          description: "Family group created successfully.",
        });
        
        // Refresh family groups data to update user roles
        await refetchFamilyGroups();
      }
      
      // Check if user has claimed their profile
      const { data: claimedProfile } = await supabase.rpc('get_user_claimed_profile', {
        p_organization_id: organization?.organization_id
      });

      if (!claimedProfile) {
        // User hasn't claimed profile yet - prompt them
        toast({
          title: "One more step!",
          description: "Link your account to your family group profile.",
        });
        clearSavedData();
        hasUserMadeChanges.current = false;
        setIsSaving(false);
        setShowProfileClaimDialog(true);
        return true;
      }
      
      // Profile already claimed - show success and clear
      clearSavedData();
      hasUserMadeChanges.current = false;
      setIsSaving(false);
      return true;
    } catch (error) {
      setIsSaving(false);
      // Error is handled by the hook
      return false;
    }
  };

  const addGroupMember = () => {
    append({ firstName: "", lastName: "", name: "", phone: "", email: "", canHost: false });
    setShowAllMembers(true);
  };

  const removeGroupMember = (index: number) => {
    remove(index);
    const currentMembers = getValues("groupMembers");
    if (currentMembers.length <= 3) {
      setShowAllMembers(false);
    }
  };

  const handleDragEnd = (event: any) => {
    const { active, over } = event;

    if (active.id !== over.id) {
      const oldIndex = fields.findIndex(field => `host-member-${field.id}` === active.id);
      const newIndex = fields.findIndex(field => `host-member-${field.id}` === over.id);
      
      move(oldIndex, newIndex);
    }
  };

  // Get available family groups - filter based on user role
  console.log('🔍 [FAMILY_GROUP_SETUP] Role Detection:', {
    isAdmin,
    isSupervisor,
    isGroupLead,
    userFamilyGroup: userFamilyGroup?.name,
    familyGroupsCount: familyGroups.length,
    userEmail: user?.email,
    hasOrganization: !!organization
  });
  
  const allGroups = (isAdmin || isSupervisor)
    ? familyGroups.map(g => g.name) // Admins and Supervisors see all groups
    : (isGroupLead && userFamilyGroup) 
      ? [userFamilyGroup.name] // Group leads see only their own group
      : familyGroups.map(g => g.name); // New users can see all groups to select one
  
  console.log('📋 [FAMILY_GROUP_SETUP] Available Groups:', allGroups);
  const displayedMembers = showAllMembers ? fields : fields.slice(0, 3);
  const filledMembersCount = watchedData.groupMembers?.filter(member => 
    member.name?.trim() || member.email?.trim() || member.phone?.trim()
  ).length || 0;

  const saveAndContinue = async () => {
    const currentData = getValues();
    
    // Check if alternate lead is selected
    if (!currentData.alternateLeadId || currentData.alternateLeadId === "none") {
      setShowAlternateLeadDialog(true);
      return;
    }
    
    // Save the form and wait for completion before navigating
    try {
      await handleSubmit(async (data) => {
        const success = await onSubmit(data);
        if (success) {
          navigate("/");
        }
      })();
    } catch (error) {
      // Form validation failed or save failed - stay on page
    }
  };

  const handleContinueWithoutAlternateLead = async () => {
    try {
      await handleSubmit(async (data) => {
        const success = await onSubmit(data);
        if (success) {
          setShowAlternateLeadDialog(false);
          navigate("/");
        }
      })();
    } catch (error) {
      // Form validation failed or save failed - stay on page
    }
  };

  const handleBackToSetup = () => {
    confirmNavigation(() => navigate("/setup"));
  };

  // Show loading state while auth or organization data is loading
  if (authLoading || organizationLoading) {
    return (
      <div className="min-h-screen bg-cover bg-center bg-no-repeat p-4" style={{
        backgroundImage: 'url(/lovable-uploads/45c3083f-46c5-4e30-a2f0-31a24ab454f4.png)'
      }}>
        <div className="max-w-6xl mx-auto">
          <div className="mb-8">
            <Button variant="outline" asChild className="mb-4">
              <Link to="/setup">← Back to Setup</Link>
            </Button>
            <h1 className="text-6xl mb-4 font-kaushan text-primary drop-shadow-lg text-center">Family Group Setup</h1>
            <p className="text-2xl text-primary text-center font-medium">Setting up your Family Groups</p>
          </div>
          <Card className="bg-card/95 mb-8">
            <CardContent className="py-8">
              <LoadingState message="Loading organization data..." size="lg" />
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Show message if no organization is found
  if (!organization) {
    return (
      <div className="min-h-screen bg-cover bg-center bg-no-repeat p-4" style={{
        backgroundImage: 'url(/lovable-uploads/45c3083f-46c5-4e30-a2f0-31a24ab454f4.png)'
      }}>
        <div className="max-w-6xl mx-auto">
          <div className="mb-8">
            <Button variant="outline" onClick={handleBackToSetup} className="mb-4">
              ← Back to Setup
            </Button>
            <h1 className="text-6xl mb-4 font-kaushan text-primary drop-shadow-lg text-center">Family Group Setup</h1>
            <p className="text-2xl text-primary text-center font-medium">Setting up your Family Groups</p>
          </div>
          <Card className="bg-card/95 mb-8">
            <CardContent className="py-8">
              <div className="text-center space-y-4">
                <p className="text-lg text-muted-foreground">No organization found.</p>
                <p className="text-sm text-muted-foreground">Please ensure you have an organization set up before creating family groups.</p>
                <Button asChild>
                  <Link to="/setup">Go to Setup</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-cover bg-center bg-no-repeat" style={{
      backgroundImage: 'url(/lovable-uploads/45c3083f-46c5-4e30-a2f0-31a24ab454f4.png)'
    }}>
      <div className="max-w-6xl mx-auto">
        <Card className="bg-card/95 mb-8 min-h-screen">
          <CardHeader className="pb-2 relative pt-8">
            <div className="text-center mb-6">
              <h1 className="text-6xl mb-6 mt-2 font-kaushan text-primary drop-shadow-lg">Family Group Setup</h1>
              <p className="text-2xl text-primary font-medium">Setting up your Family Groups</p>
            </div>
            <div className="absolute top-6 left-6">
              <Button variant="outline" onClick={handleBackToSetup} className="text-sm">
                ← Back to Setup
              </Button>
            </div>
            <div className="absolute top-6 right-6 flex flex-col gap-2">
              <Button 
                onClick={handleSubmit(onSubmit)}
                disabled={isSaving || familyGroupsLoading || !isValid}
                className="flex items-center gap-2"
              >
                {isSaving ? "Saving..." : "Save Family Group Setup"}
              </Button>
            </div>
            
          </CardHeader>
          <CardContent className="space-y-6 py-2">
            <Form {...form}>
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
                {/* Family Group Name */}
                <FormField
                  control={control}
                  name="selectedGroup"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-3xl font-semibold text-center block">
                        Family Group Name
                      </FormLabel>
                      <FormControl>
                        <div className="space-y-4">
                          {/* Show dropdown only for admins/supervisors OR users without a family group */}
                           {(isAdmin || isSupervisor || (!userFamilyGroup && allGroups.length > 0)) ? (
                            <Select 
                              value={field.value} 
                              onValueChange={(value) => {
                                hasUserMadeChanges.current = true;
                                field.onChange(value);
                              }}
                            >
                              <SelectTrigger className="w-full text-lg">
                                <SelectValue placeholder="Select a family group" className="text-lg" />
                              </SelectTrigger>
                               <SelectContent className="bg-background z-50 text-lg">
                                 {allGroups.length > 0 ? (
                                   allGroups.map((group, index) => (
                                     <SelectItem key={index} value={group} className="text-lg">
                                       {group}
                                     </SelectItem>
                                   ))
                                 ) : (
                                   <SelectItem value="no-groups" disabled className="text-lg">
                                     No family groups found - Please set them up in Family Setup first
                                   </SelectItem>
                                 )}
                               </SelectContent>
                            </Select>
                          ) : (
                            /* Show read-only input for non-admin users with a family group */
                            <Input
                              value={field.value || userFamilyGroup?.name || ""}
                              readOnly
                              className="w-full text-lg bg-muted/50 cursor-not-allowed"
                              placeholder="Your family group"
                            />
                          )}
                          
                          {/* Rename Group Section */}
                          {field.value && field.value !== "no-groups" && (
                            <div className="p-3 bg-muted/30 rounded border">
                              <div className="flex items-center justify-between mb-2">
                                <h4 className="text-sm font-medium">Rename Family Group</h4>
                                {!isEditingName && (
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => {
                                      setIsEditingName(true);
                                      setEditingGroupName(field.value);
                                    }}
                                  >
                                    <Edit2 className="h-4 w-4 mr-1" />
                                    Rename
                                  </Button>
                                )}
                              </div>
                              
                              {isEditingName ? (
                                <div className="flex items-center gap-2">
                                   <Input
                                    value={editingGroupName}
                                    onChange={(e) => setEditingGroupName(e.target.value)}
                                     placeholder="Enter new group name"
                                     className="flex-1 text-lg placeholder:text-lg"
                                  />
                                  <Button
                                    type="button"
                                    size="sm"
                                    variant="outline"
                                    onClick={async () => {
                                      if (editingGroupName.trim() && editingGroupName !== field.value) {
                                        await renameFamilyGroup(field.value, editingGroupName.trim());
                                        field.onChange(editingGroupName.trim());
                                      }
                                      setIsEditingName(false);
                                    }}
                                    disabled={!editingGroupName.trim() || editingGroupName === field.value}
                                  >
                                    <Check className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    type="button"
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => {
                                      setIsEditingName(false);
                                      setEditingGroupName("");
                                    }}
                                  >
                                    <X className="h-4 w-4" />
                                  </Button>
                                </div>
                              ) : (
                                <p className="text-sm text-muted-foreground">
                                  Current name: <span className="font-medium">{field.value}</span>
                                </p>
                              )}
                            </div>
                          )}
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Color Picker Section - Only visible to group leads */}
                {selectedFamilyGroup && isGroupLead && userFamilyGroup?.name === selectedFamilyGroup.name && (
                  <div className="p-4 bg-muted/10 rounded-lg border">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="text-sm font-medium mb-1">Group Color</h4>
                        <p className="text-xs text-muted-foreground">
                          Choose a unique color for your family group's reservations
                        </p>
                      </div>
                      <FamilyGroupColorPicker
                        familyGroup={selectedFamilyGroup}
                        onColorUpdate={refetchFamilyGroups}
                        isGroupLead={isGroupLead && userFamilyGroup?.name === selectedFamilyGroup.name}
                      />
                    </div>
                  </div>
                )}

                {/* Family Group Lead Section */}
                <div className="space-y-4">
                  <h3 className="text-3xl font-semibold text-center">Family Group Lead</h3>
                  
                  <FormField
                    control={control}
                    name="leadName"
                    render={({ field }) => (
                      <FormItem>
                          <FormLabel className="text-xl">
                            Lead Name <span className="text-destructive">*</span>
                          </FormLabel>
                        <FormControl>
                           <Input 
                             placeholder="Family Group Lead's full name"
                             className="text-lg placeholder:text-lg"
                             {...field}
                             onChange={(e) => {
                               hasUserMadeChanges.current = true;
                               field.onChange(e);
                             }}
                           />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid gap-4 md:grid-cols-2">
                    <FormField
                      control={control}
                      name="leadPhone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xl">Phone Number</FormLabel>
                          <FormControl>
                              <PhoneInput 
                                value={field.value}
                                onChange={(value) => {
                                  hasUserMadeChanges.current = true;
                                  field.onChange(value);
                                }}
                                className="text-lg placeholder:text-lg"
                              />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={control}
                      name="leadEmail"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xl">Email Address</FormLabel>
                          <FormControl>
                             <Input 
                               type="email" 
                               placeholder="lead@example.com"
                               className="text-lg placeholder:text-lg"
                               {...field}
                               onChange={(e) => {
                                 hasUserMadeChanges.current = true;
                                 field.onChange(e);
                               }}
                             />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>

                {/* Group Members Section */}
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                  <div className="text-center flex-1">
                    <h3 className="text-3xl font-semibold flex items-center justify-center gap-2">
                      <Users className="h-5 w-5" />
                      Family Group: {watch("selectedGroup")} ({filledMembersCount})
                    </h3>
                    
                    {/* Unique Email Address Requirement */}
                    <div className="mt-2 mb-3">
                      <p className="text-lg font-bold text-foreground">
                        Important: Only add email/phone for yourself (Group Member 1)
                      </p>
                      <p className="text-sm text-muted-foreground mt-1">
                        Other members will add their own contact information when they claim their profile after logging in. This prevents email mismatches.
                      </p>
                    </div>
                    
                    <p className="text-lg text-muted-foreground mt-1">
                      Additional family members who can use the property. If you want, just add the names and have them fill in their desired email and phone information in the Group Member Profile page. Check the boxes to indicate who can host and make reservations.
                    </p>
                  </div>
                   </div>


                  {/* Duplicate validation errors */}
                  {errors.groupMembers?.root && (
                    <div className="p-3 bg-destructive/10 border border-destructive/20 rounded text-sm text-destructive">
                      {errors.groupMembers.root.message}
                    </div>
                  )}

                  {/* Group Members List with Drag and Drop */}
                  <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragEnd={handleDragEnd}
                  >
                    <SortableContext
                      items={displayedMembers.map((_, index) => `host-member-${index}`)}
                      strategy={verticalListSortingStrategy}
                    >
                      <div className="grid gap-4">
                        {displayedMembers.map((field, index) => {
                          const memberName = `${watchedData.groupMembers[index]?.firstName || ''} ${watchedData.groupMembers[index]?.lastName || ''}`.trim();
                          const status = memberClaimStatus.get(memberName);
                          
                          return (
                            <GroupMemberCard
                              key={field.id}
                              index={index}
                              control={control}
                              onRemove={removeGroupMember}
                              canRemove={fields.length > 1}
                              onFieldChange={() => hasUserMadeChanges.current = true}
                              hasUserAccount={status?.hasAccount || false}
                              hasClaimed={status?.hasClaimed || false}
                              showStatusIndicators={isAdmin || isSupervisor}
                            />
                          );
                        })}
                      </div>
                    </SortableContext>
                  </DndContext>

                  {/* Show More/Less Button */}
                  {!showAllMembers && fields.length > 3 && (
                    <div className="text-center">
                      <Button 
                        type="button" 
                        variant="ghost" 
                        onClick={() => setShowAllMembers(true)}
                      >
                        Show {fields.length - 3} more group members...
                      </Button>
                    </div>
                  )}

                  {/* Add Group Member Button */}
                  <div className="flex justify-center pt-2">
                    <Button type="button" variant="outline" onClick={addGroupMember} className="text-lg">
                      <Plus className="h-4 w-4 mr-2" />
                      Add Group Member
                    </Button>
                  </div>
                </div>

                {/* Alternate Lead Selection */}
                <FormField
                  control={control}
                  name="alternateLeadId"
                  render={({ field }) => (
                    <FormItem className="p-4 border rounded-lg bg-muted/20">
                       <FormLabel className="text-3xl font-semibold text-center block">
                         Alternate Group Lead
                       </FormLabel>
                       <p className="text-lg text-muted-foreground text-center mb-3">
                         Select which group member serves as the alternate group lead
                       </p>
                      <FormControl>
                        <Select 
                          value={field.value} 
                          onValueChange={(value) => {
                            hasUserMadeChanges.current = true;
                            field.onChange(value);
                          }}
                        >
                           <SelectTrigger className="w-full text-lg">
                             <SelectValue placeholder="Select alternate lead" className="text-lg" />
                           </SelectTrigger>
                            <SelectContent className="bg-background z-50 text-lg">
                              <SelectItem value="none" className="text-lg">None selected</SelectItem>
                               {watchedData.groupMembers
                                ?.filter(member => member.name && member.name.trim() !== '')
                                .filter(member => member.name !== watchedData.leadName) // Exclude Group Lead
                                .map((member, index) => (
                                  <SelectItem key={index} value={member.name || ""} className="text-lg">
                                    {member.name}
                                  </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </form>
            </Form>
          </CardContent>
        </Card>
        
        {/* Save and Continue Section */}
        <Card className="bg-card/95">
          <CardContent className="space-y-4 py-6">
            <div className="text-lg text-muted-foreground text-center">
              <p>Ready to proceed to the next step? Make sure you've selected an alternate group lead.</p>
            </div>
            
            {/* Save and Continue Button */}
            <div className="flex justify-center">
              <Button 
                onClick={saveAndContinue} 
                disabled={isSaving || familyGroupsLoading}
                className="w-full max-w-md bg-primary hover:bg-primary/90 text-primary-foreground text-xl font-bold"
                size="lg"
              >
                {(isSaving || familyGroupsLoading) ? "Saving..." : "Save and Go to Home"}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Alternate Lead Confirmation Dialog */}
        <AlertDialog open={showAlternateLeadDialog} onOpenChange={setShowAlternateLeadDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Alternate Group Lead Not Selected</AlertDialogTitle>
              <AlertDialogDescription>
                You haven't selected an alternate group lead yet. It's recommended to have an alternate lead in case the primary lead is unavailable. Would you like to go back and select one, or continue without selecting an alternate lead for now?
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setShowAlternateLeadDialog(false)}>
                Go Back to Select
              </AlertDialogCancel>
              <AlertDialogAction onClick={handleContinueWithoutAlternateLead}>
                Continue Later
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <NavigationConfirmationDialog
          open={showNavigationDialog}
          onSaveAndContinue={handleSaveAndContinue}
          onDiscardAndContinue={handleDiscardAndContinue}
          onCancel={handleCancelNavigation}
          title="You have unsaved changes"
          description="You have unsaved changes to your family group setup. What would you like to do?"
          showSaveOption={true}
        />

        {/* Profile Claiming Dialog */}
        <ProfileClaimingDialog
          open={showProfileClaimDialog}
          onOpenChange={setShowProfileClaimDialog}
          onProfileClaimed={() => {
            toast({
              title: "Profile Claimed!",
              description: "Your account is now linked to your family group.",
            });
            navigate("/home");
          }}
        />
      </div>
    </div>
  );
};

export default FamilyGroupSetup;