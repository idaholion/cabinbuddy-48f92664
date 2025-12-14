import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useDefaultFeatures } from "@/hooks/useDefaultFeatures";
import { 
  Calendar, 
  Users, 
  DollarSign, 
  FileText, 
  Camera, 
  MessageSquare, 
  Settings, 
  Shield, 
  Vote, 
  ClipboardCheck,
  BookOpen,
  Wrench,
  ShoppingCart,
  StickyNote,
  History,
  UserCheck,
  HelpCircle,
  Receipt,
  Database,
  Download,
  Split,
  BarChart3,
} from "lucide-react";

// Icon mapping for feature display
const iconMap = {
  calendar: Calendar,
  users: Users,
  dollarsign: DollarSign,
  filetext: FileText,
  camera: Camera,
  messagesquare: MessageSquare,
  settings: Settings,
  shield: Shield,
  vote: Vote,
  clipboardcheck: ClipboardCheck,
  bookopen: BookOpen,
  wrench: Wrench,
  shoppingcart: ShoppingCart,
  stickynote: StickyNote,
  history: History,
  usercheck: UserCheck,
  helpcircle: HelpCircle,
  receipt: Receipt,
  database: Database,
  download: Download,
  split: Split,
  barchart: BarChart3,
} as const;

interface DefaultFeatureCardProps {
  feature: {
    id: string;
    title: string;
    description: string;
    icon: string;
  };
}

const DefaultFeatureCard = ({ feature }: DefaultFeatureCardProps) => {
  const IconComponent = iconMap[feature.icon as keyof typeof iconMap] || FileText;

  return (
    <Card className="h-full hover:shadow-lg transition-shadow bg-card/95 backdrop-blur border-border/50">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <IconComponent className="h-5 w-5 text-primary" />
          </div>
          <div className="flex-1">
            <CardTitle className="text-lg font-semibold">{feature.title}</CardTitle>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <CardDescription className="text-sm text-muted-foreground leading-relaxed">
          {feature.description}
        </CardDescription>
      </CardContent>
    </Card>
  );
};

export const DefaultFeatureShowcase = () => {
  const { hostFeatures, adminFeatures, loading } = useDefaultFeatures();

  if (loading) {
    return (
      <div className="space-y-8">
        <div className="text-center">
          <div className="h-8 bg-muted animate-pulse rounded-md w-64 mx-auto mb-2"></div>
          <div className="h-4 bg-muted animate-pulse rounded-md w-96 mx-auto"></div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-40 bg-muted animate-pulse rounded-lg"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-12">
      {/* Family Member Features */}
      {hostFeatures.length > 0 && (
        <div className="space-y-6">
          <div className="text-center">
            <h3 className="text-2xl font-bold text-foreground mb-2">
              Core Features
            </h3>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Everything your family needs to manage your shared cabin experience
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {hostFeatures.map((feature) => (
              <DefaultFeatureCard
                key={feature.id}
                feature={feature}
              />
            ))}
          </div>
        </div>
      )}

      {/* Administrator Features */}
      {adminFeatures.length > 0 && (
        <div className="space-y-6">
          <div className="text-center">
            <div className="flex items-center justify-center gap-2 mb-2">
              <h3 className="text-2xl font-bold text-foreground">
                Administrator Features
              </h3>
              <Badge variant="secondary" className="text-xs">
                Admin Only
              </Badge>
            </div>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Advanced management tools for cabin administrators
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {adminFeatures.map((feature) => (
              <DefaultFeatureCard
                key={feature.id}
                feature={feature}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
};