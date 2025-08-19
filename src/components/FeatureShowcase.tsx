import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useFeatures } from "@/hooks/useFeatures";
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
  ChevronDown,
  ChevronUp,
  ExternalLink,
  ArrowRight
} from "lucide-react";
import { useNavigate } from "react-router-dom";

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
} as const;

interface FeatureCardProps {
  feature: {
    id: string;
    title: string;
    description: string;
    icon: string;
    learn_more_text?: string;
    learn_more_url?: string;
    learn_more_type?: 'text' | 'internal_link' | 'external_link';
  };
  onLearnMore?: () => void;
}

const FeatureCard = ({ feature, onLearnMore }: FeatureCardProps) => {
  const [expanded, setExpanded] = useState(false);
  const navigate = useNavigate();
  
  const IconComponent = iconMap[feature.icon as keyof typeof iconMap] || FileText;

  const handleLearnMore = () => {
    if (feature.learn_more_type === 'text') {
      setExpanded(!expanded);
    } else if (feature.learn_more_type === 'internal_link' && feature.learn_more_url) {
      navigate(feature.learn_more_url);
    } else if (feature.learn_more_type === 'external_link' && feature.learn_more_url) {
      window.open(feature.learn_more_url, '_blank');
    }
    onLearnMore?.();
  };

  const hasLearnMore = feature.learn_more_type && (
    (feature.learn_more_type === 'text' && feature.learn_more_text) ||
    ((feature.learn_more_type === 'internal_link' || feature.learn_more_type === 'external_link') && feature.learn_more_url)
  );

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
        
        {expanded && feature.learn_more_text && (
          <div className="mt-4 p-4 bg-muted/50 rounded-lg">
            <p className="text-sm text-foreground leading-relaxed">
              {feature.learn_more_text}
            </p>
          </div>
        )}
        
        {hasLearnMore && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleLearnMore}
            className="mt-3 p-0 h-auto font-normal text-primary hover:text-primary/80"
          >
            {feature.learn_more_type === 'text' ? (
              <>
                {expanded ? 'Show Less' : 'Learn More'}
                {expanded ? <ChevronUp className="ml-1 h-3 w-3" /> : <ChevronDown className="ml-1 h-3 w-3" />}
              </>
            ) : feature.learn_more_type === 'external_link' ? (
              <>
                Learn More
                <ExternalLink className="ml-1 h-3 w-3" />
              </>
            ) : (
              <>
                Learn More
                <ArrowRight className="ml-1 h-3 w-3" />
              </>
            )}
          </Button>
        )}
      </CardContent>
    </Card>
  );
};

interface FeatureShowcaseProps {
  onFeatureClick?: (featureId: string) => void;
}

export const FeatureShowcase = ({ onFeatureClick }: FeatureShowcaseProps) => {
  const { hostFeatures, adminFeatures, loading } = useFeatures();

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
              <FeatureCard
                key={feature.id}
                feature={feature}
                onLearnMore={() => onFeatureClick?.(feature.id)}
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
              <FeatureCard
                key={feature.id}
                feature={feature}
                onLearnMore={() => onFeatureClick?.(feature.id)}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
};