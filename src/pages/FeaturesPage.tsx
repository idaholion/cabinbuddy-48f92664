import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { FeatureOverviewDialog } from "@/components/FeatureOverviewDialog";
import { useUserRole } from "@/hooks/useUserRole";

const FeaturesPage = () => {
  const navigate = useNavigate();
  const [showDialog, setShowDialog] = useState(true);
  const { isAdmin } = useUserRole();

  const handleFeatureClick = (featureId: string) => {
    console.log(`Feature clicked: ${featureId}`);
    // Here you could navigate to specific feature pages or show detailed help
  };

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">CabinBuddy Features</h1>
          <p className="text-muted-foreground mt-1">
            Explore all the features available to help manage your family cabin experience
          </p>
        </div>
        <Button 
          variant="outline" 
          onClick={() => navigate(-1)}
          className="hover:scale-105 hover:shadow-md transition-all duration-200"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
      </div>

      {/* Show Features Button when dialog is closed */}
      {!showDialog && (
        <div className="text-center py-12">
          <Button
            onClick={() => setShowDialog(true)}
            size="lg"
            className="bg-primary hover:bg-primary/90 hover:scale-105 hover:shadow-lg transition-all duration-200"
          >
            Show Feature Overview
          </Button>
        </div>
      )}

      {/* Feature Overview Dialog */}
      <FeatureOverviewDialog
        open={showDialog}
        onOpenChange={setShowDialog}
        userRole={isAdmin ? "admin" : "host"}
        onFeatureClick={handleFeatureClick}
      />
    </div>
  );
};

export default FeaturesPage;