import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { useDefaultFeatures, DefaultFeature } from "@/hooks/useDefaultFeatures";
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
  Edit,
  Plus,
  Save,
  X,
  Eye,
  ArrowLeft
} from "lucide-react";
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors } from "@dnd-kit/core";
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

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

const iconOptions = Object.keys(iconMap);

interface SortableFeatureItemProps {
  feature: DefaultFeature;
  onEdit: (feature: DefaultFeature) => void;
  onToggleActive: (featureId: string, isActive: boolean) => void;
}

const SortableFeatureItem = ({ feature, onEdit, onToggleActive }: SortableFeatureItemProps) => {
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

  const IconComponent = iconMap[feature.icon as keyof typeof iconMap] || FileText;

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={`p-4 border rounded-lg bg-card hover:bg-accent/50 transition-colors ${
        isDragging ? 'opacity-50' : ''
      }`}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3 flex-1">
          <div className="p-2 rounded-lg bg-primary/10">
            <IconComponent className="h-4 w-4 text-primary" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h4 className="font-medium">{feature.title}</h4>
              <Badge variant={feature.category === 'admin' ? 'secondary' : 'default'}>
                {feature.category}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground line-clamp-2">{feature.description}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Switch
            checked={feature.is_active}
            onCheckedChange={(checked) => onToggleActive(feature.id, checked)}
          />
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              onEdit(feature);
            }}
          >
            <Edit className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
};

interface FeatureEditFormProps {
  feature: DefaultFeature | null;
  onSave: (featureData: Partial<DefaultFeature>) => void;
  onCancel: () => void;
}

const FeatureEditForm = ({ feature, onSave, onCancel }: FeatureEditFormProps) => {
  const [title, setTitle] = useState(feature?.title || '');
  const [description, setDescription] = useState(feature?.description || '');
  const [icon, setIcon] = useState(feature?.icon || 'filetext');
  const [category, setCategory] = useState<'host' | 'admin'>(feature?.category || 'host');

  const handleSave = () => {
    onSave({
      title,
      description,
      icon,
      category,
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{feature ? 'Edit Feature' : 'Add New Feature'}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label htmlFor="title">Title</Label>
          <Input
            id="title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Feature title"
          />
        </div>
        
        <div>
          <Label htmlFor="description">Description</Label>
          <Textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Feature description"
            rows={3}
          />
        </div>
        
        <div>
          <Label htmlFor="icon">Icon</Label>
          <Select value={icon} onValueChange={setIcon}>
            <SelectTrigger>
              <SelectValue placeholder="Select an icon" />
            </SelectTrigger>
            <SelectContent>
              {iconOptions.map((iconKey) => {
                const IconComponent = iconMap[iconKey as keyof typeof iconMap];
                return (
                  <SelectItem key={iconKey} value={iconKey}>
                    <div className="flex items-center gap-2">
                      <IconComponent className="h-4 w-4" />
                      {iconKey}
                    </div>
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>
        </div>
        
        <div>
          <Label htmlFor="category">Category</Label>
          <Select value={category} onValueChange={(value: 'host' | 'admin') => setCategory(value)}>
            <SelectTrigger>
              <SelectValue placeholder="Select category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="host">Host</SelectItem>
              <SelectItem value="admin">Admin</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        <div className="flex gap-2">
          <Button onClick={handleSave} disabled={!title || !description}>
            <Save className="h-4 w-4 mr-2" />
            Save
          </Button>
          <Button variant="outline" onClick={onCancel}>
            <X className="h-4 w-4 mr-2" />
            Cancel
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

interface FeaturePreviewProps {
  features: DefaultFeature[];
  onBack: () => void;
}

const FeaturePreview = ({ features, onBack }: FeaturePreviewProps) => {
  const activeFeatures = features.filter(f => f.is_active);
  const hostFeatures = activeFeatures.filter(f => f.category === 'host');
  const adminFeatures = activeFeatures.filter(f => f.category === 'admin');

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Feature Preview - Final Layout</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              This is how the features will appear to users on the intro page
            </p>
          </div>
          <Button variant="outline" onClick={onBack}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Management
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-8">
        {/* Host Features Section */}
        {hostFeatures.length > 0 && (
          <div>
            <div className="flex items-center mb-4">
              <Users className="h-5 w-5 text-primary mr-2" />
              <h3 className="text-lg font-semibold">For All Users</h3>
            </div>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {hostFeatures.map((feature) => {
                const IconComponent = iconMap[feature.icon as keyof typeof iconMap] || FileText;
                return (
                  <Card key={feature.id} className="p-4 hover:shadow-md transition-shadow">
                    <div className="flex items-start gap-3">
                      <div className="p-2 rounded-lg bg-primary/10 mt-1">
                        <IconComponent className="h-4 w-4 text-primary" />
                      </div>
                      <div className="flex-1">
                        <h4 className="font-medium mb-1">{feature.title}</h4>
                        <p className="text-sm text-muted-foreground">{feature.description}</p>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          </div>
        )}

        {/* Admin Features Section */}
        {adminFeatures.length > 0 && (
          <div>
            <div className="flex items-center mb-4">
              <Shield className="h-5 w-5 text-primary mr-2" />
              <h3 className="text-lg font-semibold">For Managers</h3>
            </div>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {adminFeatures.map((feature) => {
                const IconComponent = iconMap[feature.icon as keyof typeof iconMap] || FileText;
                return (
                  <Card key={feature.id} className="p-4 hover:shadow-md transition-shadow border-orange-200">
                    <div className="flex items-start gap-3">
                      <div className="p-2 rounded-lg bg-orange-100 mt-1">
                        <IconComponent className="h-4 w-4 text-orange-600" />
                      </div>
                      <div className="flex-1">
                        <h4 className="font-medium mb-1">{feature.title}</h4>
                        <p className="text-sm text-muted-foreground">{feature.description}</p>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          </div>
        )}

        {activeFeatures.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            No active features to display. Enable some features to see the preview.
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export const DefaultFeatureManagement = () => {
  const { features, loading, updateFeature, reorderFeatures } = useDefaultFeatures();
  const [editingFeature, setEditingFeature] = useState<DefaultFeature | null>(null);
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: any) => {
    const { active, over } = event;

    if (active.id !== over?.id) {
      const oldIndex = features.findIndex((item) => item.id === active.id);
      const newIndex = features.findIndex((item) => item.id === over.id);
      
      const reorderedFeatures = arrayMove(features, oldIndex, newIndex);
      reorderFeatures(reorderedFeatures);
    }
  };

  const handleToggleActive = async (featureId: string, isActive: boolean) => {
    await updateFeature(featureId, { is_active: isActive });
  };

  const handleSaveFeature = async (featureData: Partial<DefaultFeature>) => {
    if (editingFeature) {
      await updateFeature(editingFeature.id, featureData);
      setEditingFeature(null);
    }
    // Note: Adding new features would require additional API endpoint
    setIsAddingNew(false);
  };

  const handleCancelEdit = () => {
    setEditingFeature(null);
    setIsAddingNew(false);
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Default Features Management</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-20 bg-muted animate-pulse rounded-lg"></div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (showPreview) {
    return <FeaturePreview features={features} onBack={() => setShowPreview(false)} />;
  }

  if (editingFeature || isAddingNew) {
    return (
      <FeatureEditForm
        feature={editingFeature}
        onSave={handleSaveFeature}
        onCancel={handleCancelEdit}
      />
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Default Features Management</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              Manage the features shown on the public intro page
            </p>
          </div>
          <div className="flex gap-2">
            <Button onClick={() => setIsAddingNew(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Feature
            </Button>
            <Button variant="outline" onClick={() => setShowPreview(true)}>
              <Eye className="h-4 w-4 mr-2" />
              Preview Final Layout
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext items={features.map(f => f.id)} strategy={verticalListSortingStrategy}>
            <div className="space-y-2">
              {features.map((feature) => (
                <SortableFeatureItem
                  key={feature.id}
                  feature={feature}
                  onEdit={setEditingFeature}
                  onToggleActive={handleToggleActive}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
        
        {features.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            No features found. Add some features to get started.
          </div>
        )}
      </CardContent>
    </Card>
  );
};