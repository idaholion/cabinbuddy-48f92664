import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import type { AggregatedNote } from '@/hooks/useAggregatedNotes';

interface LegacyNoteEditDialogProps {
  note: AggregatedNote;
  onUpdate: (note: AggregatedNote, newContent: string) => Promise<any>;
  children?: React.ReactNode;
}

export const LegacyNoteEditDialog = ({ note, onUpdate, children }: LegacyNoteEditDialogProps) => {
  const [open, setOpen] = useState(false);
  const [content, setContent] = useState(note.content);
  const [isUpdating, setIsUpdating] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) return;

    setIsUpdating(true);
    try {
      await onUpdate(note, content.trim());
      setOpen(false);
    } catch (error) {
      // Error handling is done in the hook
    } finally {
      setIsUpdating(false);
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen);
    if (newOpen) {
      setContent(note.content); // Reset content when opening
    }
  };

  const formatContextInfo = (note: AggregatedNote) => {
    switch (note.source) {
      case 'payments':
        return `${note.family_group} • ${note.payment_type?.replace('_', ' ')} • $${note.amount?.toFixed(2)}`;
      case 'recurring_bills':
        return `${note.bill_name} • ${note.frequency} • ${note.provider_name || 'No provider'}`;
      case 'checkin_sessions':
        return `${note.family_group} • ${note.date} • ${note.session_type}`;
      default:
        return '';
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-lg">Edit Note</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Source and context info */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-xs">
                {note.sourceLabel}
              </Badge>
              <span className="text-sm text-muted-foreground">
                {formatContextInfo(note)}
              </span>
            </div>
          </div>

          <div>
            <Label htmlFor="content" className="text-base">Note Content</Label>
            <Textarea
              id="content"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Enter note content..."
              required
              className="min-h-[100px] text-base placeholder:text-base resize-vertical"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              className="text-base"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isUpdating || !content.trim()}
              className="text-base"
            >
              {isUpdating ? 'Updating...' : 'Update Note'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};