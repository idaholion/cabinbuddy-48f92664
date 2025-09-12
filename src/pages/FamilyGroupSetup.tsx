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

import { FamilyGroupColorPicker } from "@/components/FamilyGroupColorPicker";
import { useUserRole } from "@/hooks/useUserRole";
import { useSupervisor } from "@/hooks/useSupervisor";

const FamilyGroupSetup = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { activeOrganization: organization, loading: organizationLoading } = useMultiOrganization();
  const { familyGroups, loading: familyGroupsLoading, createFamilyGroup, updateFamilyGroup, renameFamilyGroup, refetchFamilyGroups } = useFamilyGroups();
  const { isGroupLead, userFamilyGroup, isAdmin, loading: roleLoading, isGroupMember } = useUserRole();
  const { isSupervisor } = useSupervisor();
  const [showAllMembers, setShowAllMembers] = useState(false);
  const [isEditingName, setIsEditingName] = useState(false);
  const [editingGroupName, setEditingGroupName] = useState("");
  const [showAlternateLeadDialog, setShowAlternateLeadDialog] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const hasLoadedAutoSave = useRef(false);

  const form = useForm<FamilyGroupSetupFormData>({
    resolver: zodResolver(familyGroupSetupSchema),
    defaultValues: {
      selectedGroup: "",
      leadName: "",
      leadPhone: "",
      leadEmail: "",
      groupMembers: [
        { firstName: "", lastName: "", name: "", phone: "", email: "", canHost: false },
        { firstName: "", lastName: "", name: "", phone: "", email: "", canHost: false },
        { firstName: "", lastName: "", name: "", phone: "", email: "", canHost: false }
      ],
      alternateLeadId: "none",
    },
    mode: "onChange",
  });

  const { control, watch, setValue, getValues, handleSubmit, formState: { errors, isValid, isDirty } } = form;
  const { fields, append, remove, move } = useFieldArray({
    control,
    name: "groupMembers",
  });

  const watchedData = watch();

  // Unsaved changes protection
  const { 
    confirmNavigation,
    showNavigationDialog,
    handleSaveAndContinue,
    handleDiscardAndContinue,
    handleCancelNavigation
  } = useUnsavedChanges({
    hasUnsavedChanges: isDirty && !isSaving,
    message: "You have unsaved changes to your family group. Are you sure you want to leave?",
    onSave: async () => {
      const formData = getValues();
      await onSubmit(formData);
    }
  });

  // Auto-save form data
  const { loadSavedData, clearSavedData } = useAutoSave({
    key: 'family-group-setup',
    data: watchedData,
    enabled: true, // Always enable auto-save
  });

  // Drag and drop sensors
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Scroll to top when page loads
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  // Load auto-saved data on mount (only once)
  useEffect(() => {
    if (hasLoadedAutoSave.current) return;
    
    const savedData = loadSavedData();
    if (savedData && savedData.selectedGroup) {
      hasLoadedAutoSave.current = true;
      Object.keys(savedData).forEach((key) => {
        setValue(key as keyof FamilyGroupSetupFormData, savedData[key]);
      });
      
      toast({
        title: "Draft Restored",
        description: "Your previous work has been restored from auto-save.",
      });
    }
  }, [loadSavedData, setValue, toast]);

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

  // Pre-populate user information for new signups
  useEffect(() => {
    // Only run if user is authenticated and no auto-save data was loaded
    if (!user || hasLoadedAutoSave.current) return;

    // Only pre-populate if form is empty (no group selected and lead fields are empty)
    const currentValues = getValues();
    if (currentValues.selectedGroup || currentValues.leadName || currentValues.leadEmail) return;

    console.log('🔧 [FAMILY_GROUP_SETUP] Pre-populating user information for new signup');

    // Get user information from user metadata
    const firstName = user.user_metadata?.first_name || '';
    const lastName = user.user_metadata?.last_name || '';
    const fullName = [firstName, lastName].filter(Boolean).join(' ');
    const userEmail = user.email || '';
    const userPhone = user.phone || user.user_metadata?.phone || '';

    if (fullName || userEmail) {
      // Pre-populate Group Lead fields
      if (fullName) setValue("leadName", fullName);
      if (userEmail) setValue("leadEmail", userEmail);
      if (userPhone) setValue("leadPhone", userPhone);

      // Also pre-populate ONLY Group Member 1 with same info (group lead is typically first member)
      const currentGroupMembers = getValues("groupMembers");
      if (currentGroupMembers && currentGroupMembers.length > 0) {
        const updatedGroupMembers = [...currentGroupMembers];
        // Only update the first member (index 0), leave others unchanged
        updatedGroupMembers[0] = {
          name: fullName,
          phone: userPhone,
          email: userEmail,
          canHost: true // Group leads can always host
        };
        // Keep other members as they are (empty by default)
        setValue("groupMembers", updatedGroupMembers);
      }

      console.log('✅ [FAMILY_GROUP_SETUP] Pre-populated user information for first member only:', {
        fullName,
        userEmail,
        memberIndex: 0
      });
    }
  }, [user, setValue, getValues, hasLoadedAutoSave]);

  // Get the selected family group data
  const selectedFamilyGroup = familyGroups.find(g => g.name === watchedData.selectedGroup);

  // Load form data when a family group is selected
  useEffect(() => {
    if (selectedFamilyGroup) {
      setValue("leadName", selectedFamilyGroup.lead_name || "");
      setValue("leadPhone", selectedFamilyGroup.lead_phone || "");
      
      // Preserve user's email if family group doesn't have lead email set
      const currentEmail = getValues("leadEmail");
      const shouldUseUserEmail = !selectedFamilyGroup.lead_email && currentEmail && user?.email === currentEmail;
      setValue("leadEmail", selectedFamilyGroup.lead_email || (shouldUseUserEmail ? currentEmail : ""));
      
      // Force override alternate lead from database (don't let auto-save interfere)
      setValue("alternateLeadId", selectedFamilyGroup.alternate_lead_id || "none", { 
        shouldValidate: true,
        shouldDirty: true,
        shouldTouch: true 
      });
      
      // Populate host members
      if (selectedFamilyGroup.host_members && selectedFamilyGroup.host_members.length > 0) {
        const formattedHostMembers = selectedFamilyGroup.host_members.map(member => {
          const { firstName, lastName } = parseFullName(member.name || "");
          return {
            firstName,
            lastName,
            name: member.name || "",
            phone: member.phone || "",
            email: member.email || "",
            canHost: member.canHost || false,
          };
        });
        setValue("groupMembers", formattedHostMembers);
        setShowAllMembers(formattedHostMembers.length > 3);
      } else {
        // Automatically copy Group Lead info to Group Member 1
        const leadEmail = selectedFamilyGroup.lead_email || (shouldUseUserEmail ? currentEmail : "");
        const { firstName, lastName } = parseFullName(selectedFamilyGroup.lead_name || "");
        const leadAsHostMember = {
          firstName,
          lastName,
          name: selectedFamilyGroup.lead_name || "",
          phone: selectedFamilyGroup.lead_phone || "",
          email: leadEmail,
          canHost: true // Group leads can always host
        };
        
        setValue("groupMembers", [
          leadAsHostMember,
          { firstName: "", lastName: "", name: "", phone: "", email: "", canHost: false },
          { firstName: "", lastName: "", name: "", phone: "", email: "", canHost: false }
        ]);
      }
    } else if (watchedData.selectedGroup === "") {
      form.reset();
    }
  }, [selectedFamilyGroup, setValue, form, watchedData.selectedGroup, getValues, user?.email]);

  // Auto-update ONLY Group Member 1 when Group Lead info changes
  useEffect(() => {
    const currentGroupMembers = getValues("groupMembers");
    
    // Only update if we have group members and any lead info, and avoid interference with pre-population
    if (currentGroupMembers && currentGroupMembers.length > 0 && (watchedData.leadName || watchedData.leadPhone || watchedData.leadEmail) && !hasLoadedAutoSave.current) {
      // Create a copy to avoid mutations
      const updatedGroupMembers = [...currentGroupMembers];
      
      // ONLY update the first group member (index 0) with Group Lead info
      updatedGroupMembers[0] = {
        name: watchedData.leadName || "",
        phone: watchedData.leadPhone || "",
        email: watchedData.leadEmail || "",
        canHost: true // Group leads can always host
      };
      
      // Keep all other members exactly as they were
      setValue("groupMembers", updatedGroupMembers);
      
      console.log('🔄 [FAMILY_GROUP_SETUP] Updated ONLY first group member with lead info:', {
        leadName: watchedData.leadName,
        leadEmail: watchedData.leadEmail,
        memberIndex: 0,
        totalMembers: updatedGroupMembers.length
      });
    }
  }, [watchedData.leadName, watchedData.leadPhone, watchedData.leadEmail, setValue, getValues, hasLoadedAutoSave]);

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
      
      clearSavedData();
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

  const clearAllGroupMembers = () => {
    setValue("groupMembers", [
      { firstName: "", lastName: "", name: "", phone: "", email: "", canHost: false },
      { firstName: "", lastName: "", name: "", phone: "", email: "", canHost: false },
      { firstName: "", lastName: "", name: "", phone: "", email: "", canHost: false }
    ]);
    setShowAllMembers(false);
  };

  const removeEmptySlots = () => {
    const currentMembers = getValues("groupMembers");
    const filledMembers = currentMembers.filter(member => 
      member.firstName?.trim() || member.lastName?.trim() || member.email?.trim() || member.phone?.trim()
    );
    
    // Ensure at least 3 slots
    while (filledMembers.length < 3) {
      filledMembers.push({ firstName: "", lastName: "", name: "", phone: "", email: "", canHost: false });
    }
    
    setValue("groupMembers", filledMembers);
    setShowAllMembers(filledMembers.length > 3);
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
                          <Select value={field.value} onValueChange={field.onChange}>
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
                                onChange={field.onChange}
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
                  <p className="text-lg text-muted-foreground mt-1">
                    Additional family members who can use the property. If you want, just add the names and have them fill in their desired email and phone information in the Group Member Profile page. Check the boxes to indicate who can host and make reservations.
                  </p>
                </div>
                    
                    {fields.length > 3 && (
                      <div className="flex gap-2">
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button type="button" variant="outline" size="sm">
                              Clear All
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Clear All Group Members</AlertDialogTitle>
                              <AlertDialogDescription>
                                This will clear all group member information and reset to 3 empty slots. This action cannot be undone.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction onClick={clearAllGroupMembers}>
                                Clear All
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>

                        <Button 
                          type="button" 
                          variant="outline" 
                          size="sm"
                          onClick={removeEmptySlots}
                        >
                          Remove Empty
                        </Button>
                      </div>
                    )}
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
                        {displayedMembers.map((field, index) => (
                          <GroupMemberCard
                            key={field.id}
                            index={index}
                            control={control}
                            onRemove={removeGroupMember}
                            canRemove={fields.length > 1}
                          />
                        ))}
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
                        <Select value={field.value} onValueChange={field.onChange}>
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
      </div>
    </div>
  );
};

export default FamilyGroupSetup;