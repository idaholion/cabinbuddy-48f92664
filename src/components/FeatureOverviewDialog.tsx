import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import {
  Calendar,
  DollarSign,
  Wrench,
  Receipt,
  ShoppingCart,
  FileText,
  Snowflake,
  Vote,
  Camera,
  MessageCircle,
  CheckSquare,
  Users,
  Settings,
  Home,
  CalendarPlus,
  BarChart3,
  Shield,
  Sparkles,
  Edit
} from "lucide-react";
import { useFeatures, type Feature } from "@/hooks/useFeatures";
import { useUserRole } from "@/hooks/useUserRole";
import { FeatureEditDialog } from "@/components/FeatureEditDialog";

// Icon mapping for dynamic icon rendering
const iconMap: Record<string, React.ElementType> = {
  Calendar,
  DollarSign,
  Wrench,
  Receipt,
  ShoppingCart,
  FileText,
  Snowflake,
  Vote,
  Camera,
  MessageCircle,
  CheckSquare,
  Users,
  Settings,
  Home,
  CalendarPlus,
  BarChart3,
  Shield
};

interface FeatureOverviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userRole: "host" | "admin";
  onFeatureClick?: (featureId: string) => void;
}

export const FeatureOverviewDialog = ({
  open,
  onOpenChange,
  userRole,
  onFeatureClick
}: FeatureOverviewDialogProps) => {
  const [editingFeature, setEditingFeature] = useState<Feature | null>(null);
  const { hostFeatures, adminFeatures, updateFeature, loading } = useFeatures();
  const { isAdmin } = useUserRole();

  const handleFeatureClick = (title: string) => {
    const featureId = title.toLowerCase().replace(/[^a-z0-9]/g, '-');
    onFeatureClick?.(featureId);
  };

  const handleEditFeature = (feature: Feature) => {
    setEditingFeature(feature);
  };

  const renderFeatureCard = (feature: Feature, isAdminFeature = false) => {
    const IconComponent = iconMap[feature.icon] || FileText;
    
    return (
      <div
        key={feature.id}
        className={`p-4 border rounded-lg hover:shadow-md transition-shadow cursor-pointer group relative ${
          isAdminFeature ? 'bg-accent/5' : ''
        }`}
        onClick={() => handleFeatureClick(feature.title)}
      >
        {isAdmin && (
          <Button
            variant="ghost"
            size="sm"
            className="absolute top-2 right-2 h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
            onClick={(e) => {
              e.stopPropagation();
              handleEditFeature(feature);
            }}
          >
            <Edit className="h-3 w-3" />
          </Button>
        )}
        
        <div className="flex items-start space-x-3">
          <div className={`p-2 rounded-lg group-hover:bg-primary/20 transition-colors ${
            isAdminFeature ? 'bg-accent/20' : 'bg-primary/10'
          }`}>
            <IconComponent className={`h-5 w-5 ${
              isAdminFeature ? 'text-accent-foreground' : 'text-primary'
            }`} />
          </div>
          <div className="flex-1 min-w-0">
            <h4 className={`font-medium text-sm group-hover:transition-colors ${
              isAdminFeature ? 'group-hover:text-accent-foreground' : 'group-hover:text-primary'
            }`}>
              {feature.title}
            </h4>
            <p className="text-sm text-muted-foreground mt-1 leading-relaxed">
              {feature.description}
            </p>
            <Button
              variant="ghost"
              size="sm"
              className={`mt-2 p-0 h-auto text-xs hover:text-primary/80 ${
                isAdminFeature ? 'text-accent-foreground hover:text-accent-foreground/80' : 'text-primary'
              }`}
            >
              Learn More →
            </Button>
          </div>
        </div>
      </div>
    );
  };

  const relevantFeatures = userRole === "admin" ? [...hostFeatures, ...adminFeatures] : hostFeatures;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl w-[95vw] max-h-[90vh] h-[90vh] p-0 flex flex-col">
        <DialogHeader className="p-4 sm:p-6 pb-4 flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Sparkles className="h-6 w-6 sm:h-8 sm:w-8 text-primary" />
              <div>
                <DialogTitle className="text-lg sm:text-2xl font-bold">
                  CabinBuddy Feature List
                </DialogTitle>
                <DialogDescription className="text-sm sm:text-base mt-1">
                  {userRole === "admin" 
                    ? "Here's everything available to administrators and family members. You can access this feature list anytime from the sidebar."
                    : "Here are all the features available to help manage your family cabin experience. You can access this feature list anytime from the sidebar."
                  }
                </DialogDescription>
              </div>
            </div>
          </div>
        </DialogHeader>

        <ScrollArea className="flex-1 px-4 sm:px-6 min-h-0">
          <div className="space-y-6 pb-6">
            {/* Host Features Section */}
            <div>
              <div className="flex items-center space-x-2 mb-4">
                <h3 className="text-lg font-semibold">Family Member Features</h3>
                <Badge variant="secondary" className="text-xs">
                  {hostFeatures.length} features
                </Badge>
              </div>
              <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2">
                {hostFeatures.map((feature) => renderFeatureCard(feature))}
              </div>
            </div>

            {/* Admin Features Section */}
            {userRole === "admin" && (
              <>
                <Separator />
                <div>
                  <div className="flex items-center space-x-2 mb-4">
                    <h3 className="text-lg font-semibold">Administrator Features</h3>
                  </div>
                  <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2">
                    {adminFeatures.map((feature) => renderFeatureCard(feature, true))}
                  </div>
                </div>
              </>
            )}

            {/* Getting Started Tips */}
            <Separator />
            <div className="bg-muted/30 p-4 rounded-lg">
              <h3 className="font-semibold text-sm mb-2">Getting Started Tips</h3>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Complete your profile information to get personalized features</li>
                <li>• Check the calendar regularly for family schedules and availability</li>
                <li>• Upload receipts promptly to keep expense tracking accurate</li>
                {userRole === "admin" && (
                  <li>• Set up Google Calendar integration to keep everyone synchronized</li>
                )}
              </ul>
            </div>
          </div>
        </ScrollArea>

        {/* Feature Edit Dialog */}
        <FeatureEditDialog
          open={!!editingFeature}
          onOpenChange={(open) => !open && setEditingFeature(null)}
          feature={editingFeature}
          onSave={updateFeature}
        />
      </DialogContent>
    </Dialog>
  );
};