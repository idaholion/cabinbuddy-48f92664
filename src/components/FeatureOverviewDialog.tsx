import { useState } from "react";
import { useNavigate } from "react-router-dom";
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
  Edit,
  GripVertical,
  ExternalLink,
  ChevronDown,
  ChevronUp
} from "lucide-react";
import { useFeatures, type Feature } from "@/hooks/useFeatures";
import { useUserRole } from "@/hooks/useUserRole";
import { FeatureEditDialog } from "@/components/FeatureEditDialog";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import {
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

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

interface SortableFeatureCardProps {
  feature: Feature;
  isAdminFeature?: boolean;
  onEdit: (feature: Feature) => void;
  onFeatureClick: (title: string) => void;
  isAdmin: boolean;
}

const SortableFeatureCard = ({ 
  feature, 
  isAdminFeature = false, 
  onEdit, 
  onFeatureClick, 
  isAdmin 
}: SortableFeatureCardProps) => {
  const [showLearnMore, setShowLearnMore] = useState(false);
  const navigate = useNavigate();
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: feature.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const IconComponent = iconMap[feature.icon] || FileText;
  
  const handleLearnMoreClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    
    if (feature.learn_more_type === 'internal_link' && feature.learn_more_url) {
      navigate(feature.learn_more_url);
    } else if (feature.learn_more_type === 'external_link' && feature.learn_more_url) {
      window.open(feature.learn_more_url, '_blank', 'noopener,noreferrer');
    } else if (feature.learn_more_type === 'text') {
      setShowLearnMore(!showLearnMore);
    }
  };

  const hasLearnMore = feature.learn_more_type && (
    (feature.learn_more_type === 'text' && feature.learn_more_text) ||
    ((feature.learn_more_type === 'internal_link' || feature.learn_more_type === 'external_link') && feature.learn_more_url)
  );
  
  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`p-4 border rounded-lg hover:shadow-md transition-shadow cursor-pointer group relative ${
        isAdminFeature ? 'bg-accent/5' : ''
      } ${isDragging ? 'opacity-50' : ''}`}
      onClick={() => onFeatureClick(feature.title)}
    >
      {isAdmin && (
        <>
          <div
            {...attributes}
            {...listeners}
            className="absolute top-2 left-2 h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity cursor-grab active:cursor-grabbing"
            onClick={(e) => e.stopPropagation()}
          >
            <GripVertical className="h-4 w-4 text-muted-foreground" />
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="absolute top-2 right-2 h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
            onClick={(e) => {
              e.stopPropagation();
              onEdit(feature);
            }}
          >
            <Edit className="h-3 w-3" />
          </Button>
        </>
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
          
          {hasLearnMore && (
            <div className="mt-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleLearnMoreClick}
                className={`p-0 h-auto text-xs hover:text-primary/80 ${
                  isAdminFeature ? 'text-accent-foreground hover:text-accent-foreground/80' : 'text-primary'
                }`}
              >
                {feature.learn_more_type === 'text' ? (
                  <>
                    Learn more {showLearnMore ? <ChevronUp className="ml-1 h-3 w-3" /> : <ChevronDown className="ml-1 h-3 w-3" />}
                  </>
                ) : (
                  <>
                    Learn more <ExternalLink className="ml-1 h-3 w-3" />
                  </>
                )}
              </Button>
              
              {feature.learn_more_type === 'text' && showLearnMore && feature.learn_more_text && (
                <div className="mt-2 p-3 bg-muted/50 rounded-md">
                  <p className="text-xs text-muted-foreground leading-relaxed whitespace-pre-wrap">
                    {feature.learn_more_text}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
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
  const { hostFeatures, adminFeatures, updateFeature, reorderFeatures, loading } = useFeatures();
  const { isAdmin } = useUserRole();

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleFeatureClick = (title: string) => {
    const featureId = title.toLowerCase().replace(/[^a-z0-9]/g, '-');
    onFeatureClick?.(featureId);
  };

  const handleEditFeature = (feature: Feature) => {
    setEditingFeature(feature);
  };

  const handleDragEnd = (event: DragEndEvent, features: Feature[], isAdminSection: boolean) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = features.findIndex(f => f.id === active.id);
      const newIndex = features.findIndex(f => f.id === over.id);
      
      const newOrder = arrayMove(features, oldIndex, newIndex);
      reorderFeatures(newOrder);
    }
  };

  const renderFeatureCard = (feature: Feature, isAdminFeature = false) => {
    return (
      <SortableFeatureCard
        key={feature.id}
        feature={feature}
        isAdminFeature={isAdminFeature}
        onEdit={handleEditFeature}
        onFeatureClick={handleFeatureClick}
        isAdmin={isAdmin}
      />
    );
  };

  const renderFeatureSection = (features: Feature[], title: string, isAdminSection = false) => {
    const content = (
      <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2">
        {features.map(feature => renderFeatureCard(feature, isAdminSection))}
      </div>
    );

    if (isAdmin) {
      return (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={(event) => handleDragEnd(event, features, isAdminSection)}
        >
          <SortableContext items={features.map(f => f.id)} strategy={verticalListSortingStrategy}>
            {content}
          </SortableContext>
        </DndContext>
      );
    }

    return content;
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
              {renderFeatureSection(hostFeatures, "Family Member Features")}
            </div>

            {/* Admin Features Section */}
            {userRole === "admin" && (
              <>
                <Separator />
                <div>
                  <div className="flex items-center space-x-2 mb-4">
                    <h3 className="text-lg font-semibold">Administrator Features</h3>
                  </div>
                  {renderFeatureSection(adminFeatures, "Administrator Features", true)}
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