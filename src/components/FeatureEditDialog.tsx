import { useState } from "react";
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
import type { Feature } from "@/hooks/useFeatures";

interface FeatureEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  feature: Feature | null;
  onSave: (featureId: string, updates: { title: string; description: string }) => Promise<boolean>;
}

export const FeatureEditDialog = ({
  open,
  onOpenChange,
  feature,
  onSave
}: FeatureEditDialogProps) => {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);

  // Update local state when feature changes
  useState(() => {
    if (feature) {
      setTitle(feature.title);
      setDescription(feature.description);
    }
  });

  const handleSave = async () => {
    if (!feature) return;

    setSaving(true);
    const success = await onSave(feature.id, { title, description });
    setSaving(false);

    if (success) {
      onOpenChange(false);
    }
  };

  const handleCancel = () => {
    if (feature) {
      setTitle(feature.title);
      setDescription(feature.description);
    }
    onOpenChange(false);
  };

  if (!feature) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Feature</DialogTitle>
          <DialogDescription>
            Update the title and description for this feature.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
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
              rows={4}
            />
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