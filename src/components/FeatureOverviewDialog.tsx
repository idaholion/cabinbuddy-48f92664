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
  X
} from "lucide-react";

interface FeatureItem {
  icon: React.ElementType;
  title: string;
  description: string;
  adminOnly?: boolean;
}

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
  const [showAgain, setShowAgain] = useState(true);

  const hostFeatures: FeatureItem[] = [
    {
      icon: Calendar,
      title: "Calendar & Reservations",
      description: "Book your family stays, view availability, and see everyone's scheduled visits"
    },
    {
      icon: DollarSign,
      title: "Financial Dashboard",
      description: "Track your stay costs, view payment summaries, and monitor your family's expenses"
    },
    {
      icon: Wrench,
      title: "Work Weekends",
      description: "Sign up for property maintenance weekends and coordinate with other families"
    },
    {
      icon: Receipt,
      title: "Receipts & Expenses",
      description: "Upload receipt photos, track shared cabin expenses, and split costs fairly"
    },
    {
      icon: ShoppingCart,
      title: "Shopping Lists",
      description: "Coordinate cabin supplies with other families and check off completed purchases"
    },
    {
      icon: FileText,
      title: "Documents",
      description: "Access important cabin papers, maintenance guides, and family agreements"
    },
    {
      icon: Snowflake,
      title: "Seasonal Documents",
      description: "View opening/closing checklists and seasonal maintenance procedures"
    },
    {
      icon: Vote,
      title: "Family Voting",
      description: "Participate in family decisions and cast votes on important proposals"
    },
    {
      icon: Camera,
      title: "Photo Sharing",
      description: "Upload memories from your stays and view photos shared by other families"
    },
    {
      icon: MessageCircle,
      title: "Communication",
      description: "Stay connected with family messaging, notifications, and important updates"
    },
    {
      icon: CheckSquare,
      title: "Check-in/Check-out",
      description: "Use digital checklists and report property conditions for each stay"
    }
  ];

  const adminFeatures: FeatureItem[] = [
    {
      icon: Users,
      title: "Family Group Management",
      description: "Set up families, assign group leads, and manage member permissions",
      adminOnly: true
    },
    {
      icon: Settings,
      title: "Financial Setup",
      description: "Configure billing rates, late fees, and expense categories for the property",
      adminOnly: true
    },
    {
      icon: Home,
      title: "Property Settings",
      description: "Manage reservation rules, calendar settings, and property-specific configurations",
      adminOnly: true
    },
    {
      icon: CalendarPlus,
      title: "Google Calendar Integration",
      description: "One-way sync from CabinBuddy to your family's shared Google Calendar",
      adminOnly: true
    },
    {
      icon: BarChart3,
      title: "Reports & Analytics",
      description: "View usage statistics, financial reports, and family engagement metrics",
      adminOnly: true
    },
    {
      icon: Shield,
      title: "System Administration",
      description: "Manage user access, organization settings, and system-wide configurations",
      adminOnly: true
    }
  ];

  const handleDontShowAgain = () => {
    localStorage.setItem('hideFeatureOverview', 'true');
    onOpenChange(false);
  };

  const handleFeatureClick = (title: string) => {
    const featureId = title.toLowerCase().replace(/[^a-z0-9]/g, '-');
    onFeatureClick?.(featureId);
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
                  Welcome to CabinBuddy!
                </DialogTitle>
                <DialogDescription className="text-sm sm:text-base mt-1">
                  {userRole === "admin" 
                    ? "Here's everything you can do as an administrator and family member"
                    : "Here are all the features available to help manage your family cabin experience"
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
                {hostFeatures.map((feature, index) => (
                  <div
                    key={index}
                    className="p-4 border rounded-lg hover:shadow-md transition-shadow cursor-pointer group"
                    onClick={() => handleFeatureClick(feature.title)}
                  >
                    <div className="flex items-start space-x-3">
                      <div className="p-2 bg-primary/10 rounded-lg group-hover:bg-primary/20 transition-colors">
                        <feature.icon className="h-5 w-5 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium text-sm group-hover:text-primary transition-colors">
                          {feature.title}
                        </h4>
                        <p className="text-sm text-muted-foreground mt-1 leading-relaxed">
                          {feature.description}
                        </p>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="mt-2 p-0 h-auto text-xs text-primary hover:text-primary/80"
                        >
                          Learn More →
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Admin Features Section */}
            {userRole === "admin" && (
              <>
                <Separator />
                <div>
                  <div className="flex items-center space-x-2 mb-4">
                    <h3 className="text-lg font-semibold">Administrator Features</h3>
                    <Badge variant="outline" className="text-xs">
                      Admin Only
                    </Badge>
                  </div>
                  <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2">
                    {adminFeatures.map((feature, index) => (
                      <div
                        key={index}
                        className="p-4 border rounded-lg hover:shadow-md transition-shadow cursor-pointer group bg-accent/5"
                        onClick={() => handleFeatureClick(feature.title)}
                      >
                        <div className="flex items-start space-x-3">
                          <div className="p-2 bg-accent/20 rounded-lg group-hover:bg-accent/30 transition-colors">
                            <feature.icon className="h-5 w-5 text-accent-foreground" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <h4 className="font-medium text-sm group-hover:text-accent-foreground transition-colors">
                              {feature.title}
                            </h4>
                            <p className="text-sm text-muted-foreground mt-1 leading-relaxed">
                              {feature.description}
                            </p>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="mt-2 p-0 h-auto text-xs text-accent-foreground hover:text-accent-foreground/80"
                            >
                              Learn More →
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
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

        {/* Footer Actions */}
        <div className="border-t p-4 sm:p-6 bg-muted/30 flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleDontShowAgain}
                className="text-sm"
              >
                Don't show this again
              </Button>
            </div>
            <div className="flex space-x-3">
              <Button
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Show me later
              </Button>
              <Button
                onClick={() => onOpenChange(false)}
                className="bg-primary hover:bg-primary/90"
              >
                Get Started!
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};