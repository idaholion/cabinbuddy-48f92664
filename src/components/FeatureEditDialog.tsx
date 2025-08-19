import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { Feature } from "@/hooks/useFeatures";

interface FeatureEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  feature: Feature | null;
  onSave: (featureId: string, updates: { 
    title: string; 
    description: string;
    learn_more_text?: string;
    learn_more_url?: string;
    learn_more_type?: 'text' | 'internal_link' | 'external_link';
  }) => Promise<boolean>;
}

export const FeatureEditDialog = ({
  open,
  onOpenChange,
  feature,
  onSave
}: FeatureEditDialogProps) => {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [learnMoreText, setLearnMoreText] = useState("");
  const [learnMoreUrl, setLearnMoreUrl] = useState("");
  const [learnMoreType, setLearnMoreType] = useState<'text' | 'internal_link' | 'external_link' | undefined>(undefined);
  const [saving, setSaving] = useState(false);

  // Update local state when feature changes
  useEffect(() => {
    if (feature) {
      setTitle(feature.title);
      setDescription(feature.description);
      setLearnMoreText(feature.learn_more_text || "");
      setLearnMoreUrl(feature.learn_more_url || "");
      setLearnMoreType(feature.learn_more_type);
    }
  }, [feature]);

  const handleSave = async () => {
    if (!feature) return;

    setSaving(true);
    const success = await onSave(feature.id, { 
      title, 
      description,
      learn_more_text: learnMoreText || undefined,
      learn_more_url: learnMoreUrl || undefined,
      learn_more_type: learnMoreType
    });
    setSaving(false);

    if (success) {
      onOpenChange(false);
    }
  };

  const handleCancel = () => {
    if (feature) {
      setTitle(feature.title);
      setDescription(feature.description);
      setLearnMoreText(feature.learn_more_text || "");
      setLearnMoreUrl(feature.learn_more_url || "");
      setLearnMoreType(feature.learn_more_type);
    }
    onOpenChange(false);
  };

  if (!feature) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Feature</DialogTitle>
          <DialogDescription>
            Update the feature details and configure how users can learn more.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          <div className="grid grid-cols-1 gap-4">
            <div className="space-y-2">
              <Label htmlFor="title">Feature Title</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Enter feature title"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Enter feature description"
                rows={3}
              />
            </div>
          </div>

          <div className="space-y-4">
            <Label className="text-base font-medium">Learn More Configuration</Label>
            
            <div className="space-y-2">
              <Label htmlFor="learn-more-type">Learn More Type</Label>
              <Select value={learnMoreType || "none"} onValueChange={(value) => setLearnMoreType(value === "none" ? undefined : value as typeof learnMoreType)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select learn more type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  <SelectItem value="text">Expandable Text</SelectItem>
                  <SelectItem value="internal_link">Internal Link</SelectItem>
                  <SelectItem value="external_link">External Link</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {learnMoreType === 'text' && (
              <div className="space-y-2">
                <Label htmlFor="learn-more-text">Learn More Text</Label>
                <Textarea
                  id="learn-more-text"
                  value={learnMoreText}
                  onChange={(e) => setLearnMoreText(e.target.value)}
                  placeholder="Enter detailed information about this feature"
                  rows={4}
                />
              </div>
            )}

            {(learnMoreType === 'internal_link' || learnMoreType === 'external_link') && (
              <div className="space-y-2">
                <Label htmlFor="learn-more-url">
                  {learnMoreType === 'internal_link' ? 'Internal Route (e.g., /calendar)' : 'External URL'}
                </Label>
                <Input
                  id="learn-more-url"
                  value={learnMoreUrl}
                  onChange={(e) => setLearnMoreUrl(e.target.value)}
                  placeholder={learnMoreType === 'internal_link' ? '/feature-page' : 'https://example.com'}
                />
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleCancel}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? "Saving..." : "Save Changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};