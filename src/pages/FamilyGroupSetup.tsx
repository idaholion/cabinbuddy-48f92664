import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { useState, useEffect } from "react";
import { MultiStepFamilyGroupSetup } from "@/components/family-group-setup/MultiStepFamilyGroupSetup";

const FamilyGroupSetup = () => {
  // Load from localStorage as fallback for display
  const [localFamilyGroups, setLocalFamilyGroups] = useState<string[]>([]);

  useEffect(() => {
    // Load from localStorage for backward compatibility
    const savedFamilyGroups = localStorage.getItem('familyGroupsList');
    if (savedFamilyGroups) {
      const groups = JSON.parse(savedFamilyGroups);
      setLocalFamilyGroups(groups);
    } else {
      const savedSetup = localStorage.getItem('familySetupData');
      if (savedSetup) {
        const setup = JSON.parse(savedSetup);
        if (setup.familyGroups) {
          const validFamilyGroups = setup.familyGroups.filter((group: string) => group.trim() !== '');
          setLocalFamilyGroups(validFamilyGroups);
        }
      }
    }
  }, []);
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

        <div className="mb-4 flex justify-end">
          <Button asChild>
            <Link to="/financial-setup">Go to Financial Setup</Link>
          </Button>
        </div>

        <MultiStepFamilyGroupSetup localFamilyGroups={localFamilyGroups} />
      </div>
    </div>
  );
};

export default FamilyGroupSetup;