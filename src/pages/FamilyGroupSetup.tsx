import { useEffect, useState } from "react";
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
import { Plus, Trash2, Users } from "lucide-react";
import { Link } from "react-router-dom";
import { useFamilyGroups } from "@/hooks/useFamilyGroups";
import { useOrganization } from "@/hooks/useOrganization";
import { useToast } from "@/hooks/use-toast";
import { useAutoSave } from "@/hooks/useAutoSave";
import { unformatPhoneNumber } from "@/lib/phone-utils";
import { familyGroupSetupSchema, type FamilyGroupSetupFormData } from "@/lib/validations";
import { HostMemberCard } from "@/components/HostMemberCard";

const FamilyGroupSetup = () => {
  const { toast } = useToast();
  const { organization } = useOrganization();
  const { familyGroups, createFamilyGroup, updateFamilyGroup, loading } = useFamilyGroups();
  const [showAllMembers, setShowAllMembers] = useState(false);

  const form = useForm<FamilyGroupSetupFormData>({
    resolver: zodResolver(familyGroupSetupSchema),
    defaultValues: {
      selectedGroup: "",
      leadName: "",
      leadPhone: "",
      leadEmail: "",
      hostMembers: [
        { name: "", phone: "", email: "" },
        { name: "", phone: "", email: "" },
        { name: "", phone: "", email: "" }
      ],
      reservationPermission: "lead_only",
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
    enabled: !!watchedData.selectedGroup,
  });

  // Drag and drop sensors
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Load auto-saved data on mount
  useEffect(() => {
    const savedData = loadSavedData();
    if (savedData && !watchedData.selectedGroup) {
      Object.keys(savedData).forEach((key) => {
        setValue(key as keyof FamilyGroupSetupFormData, savedData[key]);
      });
      
      toast({
        title: "Draft Restored",
        description: "Your previous work has been restored from auto-save.",
      });
    }
  }, [loadSavedData, setValue, toast, watchedData.selectedGroup]);

  // Get the selected family group data
  const selectedFamilyGroup = familyGroups.find(g => g.name === watchedData.selectedGroup);

  // Load form data when a family group is selected
  useEffect(() => {
    if (selectedFamilyGroup) {
      setValue("leadName", selectedFamilyGroup.lead_name || "");
      setValue("leadPhone", selectedFamilyGroup.lead_phone || "");
      setValue("leadEmail", selectedFamilyGroup.lead_email || "");
      setValue("reservationPermission", selectedFamilyGroup.reservation_permission || "lead_only");
      setValue("alternateLeadId", selectedFamilyGroup.alternate_lead_id || "none");
      
      // Populate host members
      if (selectedFamilyGroup.host_members && selectedFamilyGroup.host_members.length > 0) {
        const formattedHostMembers = selectedFamilyGroup.host_members.map(member => ({
          name: member.name || "",
          phone: member.phone || "",
          email: member.email || "",
        }));
        setValue("hostMembers", formattedHostMembers);
        setShowAllMembers(formattedHostMembers.length > 3);
      } else {
        setValue("hostMembers", [
          { name: "", phone: "", email: "" },
          { name: "", phone: "", email: "" },
          { name: "", phone: "", email: "" }
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
      }));

    const existingGroup = familyGroups.find(g => g.name === data.selectedGroup);
    
    try {
      if (existingGroup) {
        await updateFamilyGroup(existingGroup.id, {
          lead_name: data.leadName || undefined,
          lead_phone: data.leadPhone ? unformatPhoneNumber(data.leadPhone) : undefined,
          lead_email: data.leadEmail || undefined,
          host_members: hostMembersList.length > 0 ? hostMembersList : undefined,
          reservation_permission: data.reservationPermission,
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
          reservation_permission: data.reservationPermission,
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
    append({ name: "", phone: "", email: "" });
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
      { name: "", phone: "", email: "" },
      { name: "", phone: "", email: "" },
      { name: "", phone: "", email: "" }
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
      filledMembers.push({ name: "", phone: "", email: "" });
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

        <Card className="bg-card/95 mb-8">
          <CardHeader className="pb-2 relative">
            <div className="absolute top-6 right-6 flex flex-col gap-2">
              <Button 
                onClick={handleSubmit(onSubmit)}
                disabled={loading || !isValid}
              >
                {loading ? "Saving..." : "Save Family Group Setup"}
              </Button>
              <Button variant="outline" asChild>
                <Link to="/financial-setup">Go to Financial Setup →</Link>
              </Button>
            </div>
            <CardTitle className="text-2xl text-center pr-48">Set up Family Groups</CardTitle>
            <CardDescription className="text-center pr-48">Create a family group with lead and host members</CardDescription>
            {watchedData.selectedGroup && (
              <p className="text-xs text-muted-foreground text-center mt-2 pr-48">
                📝 Auto-saving your changes...
              </p>
            )}
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
                      <FormLabel className="text-xl font-semibold text-center block">
                        Family Group Name <span className="text-destructive">*</span>
                      </FormLabel>
                      <FormControl>
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
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Family Group Lead Section */}
                <div className="space-y-4">
                  <h3 className="text-xl font-semibold text-center">Family Group Lead</h3>
                  
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
                      <h3 className="text-lg font-semibold flex items-center justify-center gap-2">
                        <Users className="h-5 w-5" />
                        Host Members ({filledMembersCount} filled)
                      </h3>
                      <p className="text-sm text-muted-foreground mt-1">
                        Additional family members who can use the property
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

                {/* Reservation Permission */}
                <FormField
                  control={control}
                  name="reservationPermission"
                  render={({ field }) => (
                    <FormItem className="p-4 border rounded-lg bg-muted/20">
                      <FormLabel className="text-md font-semibold text-center block">
                        Reservation Permissions
                      </FormLabel>
                      <p className="text-sm text-muted-foreground text-center mb-3">
                        Who can make reservations for this family group?
                      </p>
                      <FormControl>
                        <RadioGroup value={field.value} onValueChange={field.onChange} className="flex flex-col gap-3">
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="lead_only" id="lead_only" />
                            <label htmlFor="lead_only" className="text-sm font-medium">
                              Lead only - Only the family group lead can make reservations
                            </label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="any_member" id="any_member" />
                            <label htmlFor="any_member" className="text-sm font-medium">
                              Any member - Any host member can make reservations
                            </label>
                          </div>
                        </RadioGroup>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Alternate Lead Selection */}
                <FormField
                  control={control}
                  name="alternateLeadId"
                  render={({ field }) => (
                    <FormItem className="p-4 border rounded-lg bg-muted/20">
                      <FormLabel className="text-md font-semibold text-center block">
                        Alternate Group Lead
                      </FormLabel>
                      <p className="text-sm text-muted-foreground text-center mb-3">
                        Select which host member serves as the alternate group lead
                      </p>
                      <FormControl>
                        <Select value={field.value} onValueChange={field.onChange}>
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Select alternate lead (optional)" />
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
      </div>
    </div>
  );
};

export default FamilyGroupSetup;