import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { ProgressSteps } from "@/components/ui/progress-steps";
import { StepNavigation } from "@/components/ui/step-navigation";
import { useMultiStepForm } from "@/hooks/useMultiStepForm";
import { useFamilyGroups } from "@/hooks/useFamilyGroups";
import { useToast } from "@/hooks/use-toast";
import { unformatPhoneNumber } from "@/lib/phone-utils";
import { GroupSelectionStep } from "./GroupSelectionStep";
import { LeadInformationStep } from "./LeadInformationStep";
import { HostMembersStep } from "./HostMembersStep";
import { PermissionsReviewStep } from "./PermissionsReviewStep";

interface HostMember {
  name: string;
  phone: string;
  email: string;
}

interface MultiStepFamilyGroupSetupProps {
  localFamilyGroups: string[];
}

const STEPS = ["Select Group", "Lead Info", "Host Members", "Review & Save"];

export const MultiStepFamilyGroupSetup = ({ localFamilyGroups }: MultiStepFamilyGroupSetupProps) => {
  const { toast } = useToast();
  const { familyGroups, createFamilyGroup, updateFamilyGroup, loading } = useFamilyGroups();

  // Form state
  const [selectedGroup, setSelectedGroup] = useState("");
  const [leadName, setLeadName] = useState("");
  const [leadPhone, setLeadPhone] = useState("");
  const [leadEmail, setLeadEmail] = useState("");
  const [hostMembers, setHostMembers] = useState<HostMember[]>([
    { name: "", phone: "", email: "" },
    { name: "", phone: "", email: "" },
    { name: "", phone: "", email: "" }
  ]);
  const [reservationPermission, setReservationPermission] = useState("lead_only");
  const [alternateLeadId, setAlternateLeadId] = useState("none");

  // Multi-step form logic
  const {
    currentStep,
    nextStep,
    previousStep,
    markStepCompleted,
    isStepCompleted,
    canProceed,
    canGoBack,
    isLastStep
  } = useMultiStepForm({
    totalSteps: 4,
    onStepChange: (step) => {
      // Validate current step when moving forward
      if (step > 1) {
        validateCurrentStep(step - 1);
      }
    }
  });

  // Combine database and localStorage groups for display
  const allGroups = [
    ...familyGroups.map(g => g.name),
    ...localFamilyGroups.filter(lg => !familyGroups.some(g => g.name === lg))
  ];

  // Get the selected family group data
  const selectedFamilyGroup = familyGroups.find(g => g.name === selectedGroup);

  // Load form data when a family group is selected
  useEffect(() => {
    if (selectedFamilyGroup) {
      setLeadName(selectedFamilyGroup.lead_name || "");
      setLeadPhone(selectedFamilyGroup.lead_phone || "");
      setLeadEmail(selectedFamilyGroup.lead_email || "");
      setReservationPermission(selectedFamilyGroup.reservation_permission || "lead_only");
      setAlternateLeadId(selectedFamilyGroup.alternate_lead_id || "none");
      
      // Populate host members
      if (selectedFamilyGroup.host_members && selectedFamilyGroup.host_members.length > 0) {
        setHostMembers(selectedFamilyGroup.host_members);
      } else {
        // Reset to default empty host members
        setHostMembers([
          { name: "", phone: "", email: "" },
          { name: "", phone: "", email: "" },
          { name: "", phone: "", email: "" }
        ]);
      }
    } else {
      // Reset form when no group is selected
      setLeadName("");
      setLeadPhone("");
      setLeadEmail("");
      setReservationPermission("lead_only");
      setAlternateLeadId("none");
      setHostMembers([
        { name: "", phone: "", email: "" },
        { name: "", phone: "", email: "" },
        { name: "", phone: "", email: "" }
      ]);
    }
  }, [selectedGroup, selectedFamilyGroup]);

  const validateCurrentStep = (step: number) => {
    switch (step) {
      case 1:
        if (selectedGroup) {
          markStepCompleted(1);
          return true;
        }
        return false;
      case 2:
        // Lead information is optional, so always mark as completed
        markStepCompleted(2);
        return true;
      case 3:
        // Host members are optional, so always mark as completed
        markStepCompleted(3);
        return true;
      case 4:
        markStepCompleted(4);
        return true;
      default:
        return false;
    }
  };

  const handleNext = () => {
    if (validateCurrentStep(currentStep)) {
      nextStep();
    } else {
      toast({
        title: "Please complete required fields",
        description: "Fill in the required information before proceeding.",
        variant: "destructive",
      });
    }
  };

  const handleSubmit = async () => {
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
    
    try {
      if (existingGroup) {
        // Update existing group
        await updateFamilyGroup(existingGroup.id, {
          lead_name: leadName || undefined,
          lead_phone: leadPhone ? unformatPhoneNumber(leadPhone) : undefined,
          lead_email: leadEmail || undefined,
          host_members: hostMembersList.length > 0 ? hostMembersList : undefined,
          reservation_permission: reservationPermission,
          alternate_lead_id: alternateLeadId === "none" ? undefined : alternateLeadId,
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
          alternate_lead_id: alternateLeadId === "none" ? undefined : alternateLeadId,
        });
      }

      toast({
        title: "Success",
        description: "Family group setup completed successfully!",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save family group setup. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleHostMemberChange = (index: number, field: 'name' | 'phone' | 'email', value: string) => {
    const newHostMembers = [...hostMembers];
    newHostMembers[index] = { ...newHostMembers[index], [field]: value };
    setHostMembers(newHostMembers);
  };

  const addHostMember = () => {
    setHostMembers([...hostMembers, { name: "", phone: "", email: "" }]);
  };

  const removeHostMember = (index: number) => {
    if (hostMembers.length > 3) {
      const newHostMembers = hostMembers.filter((_, i) => i !== index);
      setHostMembers(newHostMembers);
    }
  };

  const renderCurrentStep = () => {
    switch (currentStep) {
      case 1:
        return (
          <GroupSelectionStep
            selectedGroup={selectedGroup}
            onGroupChange={setSelectedGroup}
            allGroups={allGroups}
          />
        );
      case 2:
        return (
          <LeadInformationStep
            leadName={leadName}
            leadPhone={leadPhone}
            leadEmail={leadEmail}
            onLeadNameChange={setLeadName}
            onLeadPhoneChange={setLeadPhone}
            onLeadEmailChange={setLeadEmail}
          />
        );
      case 3:
        return (
          <HostMembersStep
            hostMembers={hostMembers}
            onHostMemberChange={handleHostMemberChange}
            onAddHostMember={addHostMember}
            onRemoveHostMember={removeHostMember}
          />
        );
      case 4:
        return (
          <PermissionsReviewStep
            selectedGroup={selectedGroup}
            leadName={leadName}
            leadPhone={leadPhone}
            leadEmail={leadEmail}
            hostMembers={hostMembers}
            reservationPermission={reservationPermission}
            alternateLeadId={alternateLeadId}
            onReservationPermissionChange={setReservationPermission}
            onAlternateLeadChange={setAlternateLeadId}
          />
        );
      default:
        return null;
    }
  };

  return (
    <Card className="bg-card/95">
      <CardContent className="p-6">
        <ProgressSteps
          steps={STEPS}
          currentStep={currentStep}
          completedSteps={[1, 2, 3, 4].filter(step => isStepCompleted(step))}
          className="mb-8"
        />

        <div className="min-h-[400px]">
          {renderCurrentStep()}
        </div>

        <StepNavigation
          onPrevious={previousStep}
          onNext={handleNext}
          onSubmit={handleSubmit}
          canGoBack={canGoBack()}
          canProceed={currentStep === 1 ? !!selectedGroup : canProceed()}
          isLastStep={isLastStep}
          isLoading={loading}
          submitLabel="Save Family Group Setup"
        />
      </CardContent>
    </Card>
  );
};