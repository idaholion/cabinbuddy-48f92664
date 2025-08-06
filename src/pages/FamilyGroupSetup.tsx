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
import { useOrganization } from "@/hooks/useOrganization";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { useAutoSave } from "@/hooks/useAutoSave";
import { unformatPhoneNumber } from "@/lib/phone-utils";
import { familyGroupSetupSchema, type FamilyGroupSetupFormData } from "@/lib/validations";
import { HostMemberCard } from "@/components/HostMemberCard";
import { useNavigate } from "react-router-dom";
import { LoadingState } from "@/components/ui/loading-spinner";
import { OrganizationRoleReminder } from "@/components/OrganizationRoleReminder";
import { FamilyGroupColorPicker } from "@/components/FamilyGroupColorPicker";
import { useUserRole } from "@/hooks/useUserRole";

const FamilyGroupSetup = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { organization, loading: organizationLoading } = useOrganization();
  const { familyGroups, createFamilyGroup, updateFamilyGroup, renameFamilyGroup, loading, refetchFamilyGroups } = useFamilyGroups();
  const { isGroupLead, userFamilyGroup } = useUserRole();
  const [showAllMembers, setShowAllMembers] = useState(false);
  const [isEditingName, setIsEditingName] = useState(false);
  const [editingGroupName, setEditingGroupName] = useState("");
  const [showAlternateLeadDialog, setShowAlternateLeadDialog] = useState(false);
  const hasLoadedAutoSave = useRef(false);

  const form = useForm<FamilyGroupSetupFormData>({
    resolver: zodResolver(familyGroupSetupSchema),
    defaultValues: {
      selectedGroup: "",
      leadName: "",
      leadPhone: "",
      leadEmail: "",
      hostMembers: [
        { name: "", phone: "", email: "", canReserve: false },
        { name: "", phone: "", email: "", canReserve: false },
        { name: "", phone: "", email: "", canReserve: false }
      ],
      alternateLeadId: "none",
    },
    mode: "onChange",
  });

  const { control, watch, setValue, getValues, handleSubmit, formState: { errors, isValid } } = form;
  const { fields, append, remove, move } = useFieldArray({
    control,
    name: "hostMembers",
  });

  const watchedData = watch();

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

  // Get the selected family group data
  const selectedFamilyGroup = familyGroups.find(g => g.name === watchedData.selectedGroup);

  // Load form data when a family group is selected
  useEffect(() => {
    if (selectedFamilyGroup) {
      setValue("leadName", selectedFamilyGroup.lead_name || "");
      setValue("leadPhone", selectedFamilyGroup.lead_phone || "");
      setValue("leadEmail", selectedFamilyGroup.lead_email || "");
      
      // Force override alternate lead from database (don't let auto-save interfere)
      setValue("alternateLeadId", selectedFamilyGroup.alternate_lead_id || "none", { 
        shouldValidate: true,
        shouldDirty: true,
        shouldTouch: true 
      });
      
      // Populate host members
      if (selectedFamilyGroup.host_members && selectedFamilyGroup.host_members.length > 0) {
        const formattedHostMembers = selectedFamilyGroup.host_members.map(member => ({
          name: member.name || "",
          phone: member.phone || "",
          email: member.email || "",
          canReserve: member.canReserve || false,
        }));
        setValue("hostMembers", formattedHostMembers);
        setShowAllMembers(formattedHostMembers.length > 3);
      } else {
        setValue("hostMembers", [
          { name: "", phone: "", email: "", canReserve: false },
          { name: "", phone: "", email: "", canReserve: false },
          { name: "", phone: "", email: "", canReserve: false }
        ]);
      }
    } else if (watchedData.selectedGroup === "") {
      form.reset();
    }
  }, [selectedFamilyGroup, setValue, form, watchedData.selectedGroup]);

  const onSubmit = async (data: FamilyGroupSetupFormData) => {
    if (!data.selectedGroup) {
      toast({
        title: "Error",
        description: "Please select a family group.",
        variant: "destructive",
      });
      return;
    }

    const hostMembersList = data.hostMembers
      .filter(member => member.name?.trim() !== '')
      .map(member => ({
        name: member.name || "",
        phone: member.phone || "",
        email: member.email || "",
        canReserve: member.canReserve || false,
      }));

    const existingGroup = familyGroups.find(g => g.name === data.selectedGroup);
    
    try {
      if (existingGroup) {
        await updateFamilyGroup(existingGroup.id, {
          lead_name: data.leadName || undefined,
          lead_phone: data.leadPhone ? unformatPhoneNumber(data.leadPhone) : undefined,
          lead_email: data.leadEmail || undefined,
          host_members: hostMembersList.length > 0 ? hostMembersList : undefined,
          alternate_lead_id: data.alternateLeadId === "none" ? undefined : data.alternateLeadId,
        });
        
        toast({
          title: "Success",
          description: "Family group updated successfully.",
        });
      } else {
        await createFamilyGroup({
          name: data.selectedGroup,
          lead_name: data.leadName || undefined,
          lead_phone: data.leadPhone ? unformatPhoneNumber(data.leadPhone) : undefined,
          lead_email: data.leadEmail || undefined,
          host_members: hostMembersList.length > 0 ? hostMembersList : undefined,
          
          alternate_lead_id: data.alternateLeadId === "none" ? undefined : data.alternateLeadId,
        });
        
        toast({
          title: "Success",
          description: "Family group created successfully.",
        });
      }
      
      clearSavedData();
    } catch (error) {
      // Error is handled by the hook
    }
  };

  const addHostMember = () => {
    append({ name: "", phone: "", email: "", canReserve: false });
    setShowAllMembers(true);
  };

  const removeHostMember = (index: number) => {
    remove(index);
    const currentMembers = getValues("hostMembers");
    if (currentMembers.length <= 3) {
      setShowAllMembers(false);
    }
  };

  const clearAllHostMembers = () => {
    setValue("hostMembers", [
      { name: "", phone: "", email: "", canReserve: false },
      { name: "", phone: "", email: "", canReserve: false },
      { name: "", phone: "", email: "", canReserve: false }
    ]);
    setShowAllMembers(false);
  };

  const removeEmptySlots = () => {
    const currentMembers = getValues("hostMembers");
    const filledMembers = currentMembers.filter(member => 
      member.name?.trim() || member.email?.trim() || member.phone?.trim()
    );
    
    // Ensure at least 3 slots
    while (filledMembers.length < 3) {
      filledMembers.push({ name: "", phone: "", email: "", canReserve: false });
    }
    
    setValue("hostMembers", filledMembers);
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

  // Get available family groups
  const allGroups = familyGroups.map(g => g.name);
  const displayedMembers = showAllMembers ? fields : fields.slice(0, 3);
  const filledMembersCount = watchedData.hostMembers?.filter(member => 
    member.name?.trim() || member.email?.trim() || member.phone?.trim()
  ).length || 0;

  const saveAndContinue = async () => {
    const currentData = getValues();
    
    // Check if alternate lead is selected
    if (!currentData.alternateLeadId || currentData.alternateLeadId === "none") {
      setShowAlternateLeadDialog(true);
      return;
    }
    
    // Save the form and navigate
    await handleSubmit(onSubmit)();
    navigate("/financial-setup");
  };

  const handleContinueWithoutAlternateLead = async () => {
    await handleSubmit(onSubmit)();
    setShowAlternateLeadDialog(false);
    navigate("/financial-setup");
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
            <Button variant="outline" asChild className="mb-4">
              <Link to="/setup">← Back to Setup</Link>
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
              <Button variant="outline" asChild className="text-sm">
                <Link to="/setup">← Back to Setup</Link>
              </Button>
            </div>
            <div className="absolute top-6 right-6 flex flex-col gap-2">
              <Button 
                onClick={handleSubmit(onSubmit)}
                disabled={loading || !isValid}
              >
                {loading ? "Saving..." : "Save Family Group Setup"}
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
                                    className="flex-1"
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
                        <FormLabel>
                          Lead Name <span className="text-destructive">*</span>
                        </FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="Family Group Lead's full name"
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
                          <FormLabel>Phone Number</FormLabel>
                          <FormControl>
                            <PhoneInput 
                              value={field.value}
                              onChange={field.onChange}
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
                          <FormLabel>Email Address</FormLabel>
                          <FormControl>
                            <Input 
                              type="email" 
                              placeholder="lead@example.com"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>

                {/* Host Members Section */}
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <div className="text-center flex-1">
                      <h3 className="text-3xl font-semibold flex items-center justify-center gap-2">
                        <Users className="h-5 w-5" />
                        Host Members ({filledMembersCount} filled)
                      </h3>
                       <p className="text-sm text-muted-foreground mt-1">
                         Additional family members who can use the property. Check the box to indicate who can make reservations.
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
                              <AlertDialogTitle>Clear All Host Members</AlertDialogTitle>
                              <AlertDialogDescription>
                                This will clear all host member information and reset to 3 empty slots. This action cannot be undone.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction onClick={clearAllHostMembers}>
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
                  {errors.hostMembers?.root && (
                    <div className="p-3 bg-destructive/10 border border-destructive/20 rounded text-sm text-destructive">
                      {errors.hostMembers.root.message}
                    </div>
                  )}

                  {/* Host Members List with Drag and Drop */}
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
                          <HostMemberCard
                            key={field.id}
                            index={index}
                            control={control}
                            onRemove={removeHostMember}
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
                        Show {fields.length - 3} more host members...
                      </Button>
                    </div>
                  )}

                  {/* Add Host Member Button */}
                  <div className="flex justify-center pt-2">
                    <Button type="button" variant="outline" onClick={addHostMember}>
                      <Plus className="h-4 w-4 mr-2" />
                      Add Host Member
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
                      <p className="text-sm text-muted-foreground text-center mb-3">
                        Select which host member serves as the alternate group lead
                      </p>
                      <FormControl>
                        <Select value={field.value} onValueChange={field.onChange}>
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Select alternate lead" />
                          </SelectTrigger>
                          <SelectContent className="bg-background z-50">
                            <SelectItem value="none">None selected</SelectItem>
                            {watchedData.hostMembers
                              ?.filter(member => member.name && member.name.trim() !== '')
                              .map((member, index) => (
                                <SelectItem key={index} value={member.name || ""}>
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
        
        {/* Organization Role Reminder */}
        <OrganizationRoleReminder />
        
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
                disabled={loading || !isValid}
                className="w-full max-w-md bg-primary hover:bg-primary/90 text-primary-foreground"
                size="lg"
              >
                {loading ? "Saving..." : "Save and Go to Financial Setup"}
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
      </div>
    </div>
  );
};

export default FamilyGroupSetup;