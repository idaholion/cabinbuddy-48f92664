import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { PhoneInput } from "@/components/ui/phone-input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Plus } from "lucide-react";
import { Link } from "react-router-dom";
import { useFamilyGroups } from "@/hooks/useFamilyGroups";
import { useOrganization } from "@/hooks/useOrganization";
import { useToast } from "@/hooks/use-toast";
import { useAutoSave } from "@/hooks/useAutoSave";
import { unformatPhoneNumber } from "@/lib/phone-utils";
import { familyGroupSetupSchema, type FamilyGroupSetupFormData } from "@/lib/validations";

// Form-specific interface for host members
interface FormHostMember {
  name: string;
  phone: string;
  email: string;
}

// Form data interface that matches our validation schema
interface FamilyGroupSetupForm {
  selectedGroup: string;
  leadName: string;
  leadPhone?: string;
  leadEmail?: string;
  hostMembers: FormHostMember[];
  reservationPermission: "lead_only" | "any_member";
  alternateLeadId: string;
}

const FamilyGroupSetup = () => {
  const { toast } = useToast();
  const { organization } = useOrganization();
  const { familyGroups, createFamilyGroup, updateFamilyGroup, loading } = useFamilyGroups();

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
    mode: "onChange", // Enable real-time validation
  });

  const { watch, setValue, getValues, formState: { errors, isValid } } = form;
  const watchedData = watch();

  // Auto-save form data
  const { loadSavedData, clearSavedData } = useAutoSave({
    key: 'family-group-setup',
    data: watchedData,
    enabled: !!watchedData.selectedGroup,
  });

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
      
      // Populate host members - ensure they match HostMember interface
      if (selectedFamilyGroup.host_members && selectedFamilyGroup.host_members.length > 0) {
        const formattedHostMembers = selectedFamilyGroup.host_members.map(member => ({
          name: member.name || "",
          phone: member.phone || "",
          email: member.email || "",
        }));
        setValue("hostMembers", formattedHostMembers);
      } else {
        setValue("hostMembers", [
          { name: "", phone: "", email: "" },
          { name: "", phone: "", email: "" },
          { name: "", phone: "", email: "" }
        ]);
      }
    } else if (watchedData.selectedGroup === "") {
      // Reset form when no group is selected
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
        // Update existing group
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
        // Create new group
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
      
      // Clear auto-saved data after successful save
      clearSavedData();
    } catch (error) {
      // Error is handled by the hook
    }
  };

  const addHostMember = () => {
    const currentMembers = getValues("hostMembers");
    setValue("hostMembers", [...currentMembers, { name: "", phone: "", email: "" }]);
  };

  // Get available family groups
  const allGroups = familyGroups.map(g => g.name);

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
              onClick={form.handleSubmit(onSubmit)}
              disabled={loading || !isValid}
            >
              {loading ? "Saving..." : "Save Family Group Setup"}
            </Button>
            <Button className="absolute top-16 right-6" asChild>
              <Link to="/financial-setup">Go to Financial Setup</Link>
            </Button>
            <CardTitle className="text-2xl text-center">Set up Family Groups</CardTitle>
            <CardDescription className="text-center">Create a family group with lead and host members</CardDescription>
            {watchedData.selectedGroup && (
              <p className="text-xs text-muted-foreground text-center mt-2">
                📝 Auto-saving your changes...
              </p>
            )}
          </CardHeader>
          <CardContent className="space-y-4 py-2">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                {/* Family Group Name */}
                <FormField
                  control={form.control}
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
                    control={form.control}
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
                            className={errors.leadName ? "border-destructive" : ""}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid gap-4 md:grid-cols-2">
                    <FormField
                      control={form.control}
                      name="leadPhone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Phone Number</FormLabel>
                          <FormControl>
                            <PhoneInput 
                              value={field.value}
                              onChange={field.onChange}
                              className={errors.leadPhone ? "border-destructive" : ""}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="leadEmail"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Email Address</FormLabel>
                          <FormControl>
                            <Input 
                              type="email" 
                              placeholder="lead@example.com"
                              {...field}
                              className={errors.leadEmail ? "border-destructive" : ""}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  
                  {/* Alternate Lead Selection */}
                  <FormField
                    control={form.control}
                    name="alternateLeadId"
                    render={({ field }) => (
                      <FormItem className="mt-4 p-4 border rounded-lg bg-muted/20">
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
                </div>

                {/* Host Members Section */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-center">Additional Host Members</h3>
                  <p className="text-sm text-muted-foreground text-center mb-4">
                    Radio buttons indicate who can reserve time
                  </p>
                  
                  <FormField
                    control={form.control}
                    name="reservationPermission"
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <RadioGroup value={field.value} onValueChange={field.onChange}>
                            {watchedData.hostMembers?.map((member, index) => (
                              <div key={index} className="space-y-2">
                                <h4 className="text-md font-medium">Host Member {index + 1}</h4>
                                <div className="grid gap-2 grid-cols-12 items-start">
                                  <div className="col-span-4">
                                    <FormField
                                      control={form.control}
                                      name={`hostMembers.${index}.name`}
                                      render={({ field: nameField }) => (
                                        <FormItem>
                                          <FormControl>
                                            <Input 
                                              placeholder="Full name"
                                              {...nameField}
                                              className={errors.hostMembers?.[index]?.name ? "border-destructive" : ""}
                                            />
                                          </FormControl>
                                          <FormMessage />
                                        </FormItem>
                                      )}
                                    />
                                  </div>
                                  <div className="col-span-3">
                                    <FormField
                                      control={form.control}
                                      name={`hostMembers.${index}.phone`}
                                      render={({ field: phoneField }) => (
                                        <FormItem>
                                          <FormControl>
                                            <PhoneInput 
                                              value={phoneField.value}
                                              onChange={phoneField.onChange}
                                              className={errors.hostMembers?.[index]?.phone ? "border-destructive" : ""}
                                            />
                                          </FormControl>
                                          <FormMessage />
                                        </FormItem>
                                      )}
                                    />
                                  </div>
                                  <div className="col-span-4">
                                    <FormField
                                      control={form.control}
                                      name={`hostMembers.${index}.email`}
                                      render={({ field: emailField }) => (
                                        <FormItem>
                                          <FormControl>
                                            <Input 
                                              type="email" 
                                              placeholder="email@example.com"
                                              {...emailField}
                                              className={errors.hostMembers?.[index]?.email ? "border-destructive" : ""}
                                            />
                                          </FormControl>
                                          <FormMessage />
                                        </FormItem>
                                      )}
                                    />
                                  </div>
                                  <div className="col-span-1 flex justify-center">
                                    <RadioGroupItem 
                                      value={`host_${index}`} 
                                      id={`host_${index}`}
                                    />
                                  </div>
                                </div>
                              </div>
                            ))}
                          </RadioGroup>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <div className="flex justify-center pt-2">
                    <Button type="button" variant="outline" onClick={addHostMember}>
                      <Plus className="h-4 w-4 mr-2" />
                      Add Host Member
                    </Button>
                  </div>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default FamilyGroupSetup;