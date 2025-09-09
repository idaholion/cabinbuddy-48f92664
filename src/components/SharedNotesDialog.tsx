import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Plus, X } from 'lucide-react';
import { SharedNote, useSharedNotes } from '@/hooks/useSharedNotes';

interface SharedNotesDialogProps {
  note?: SharedNote;
  onClose?: () => void;
  children?: React.ReactNode;
}

const CATEGORIES = [
  'general',
  'maintenance',
  'cleaning',
  'repairs',
  'supplies',
  'announcements',
  'policies',
  'reminders',
  'other'
];

const PRIORITIES = [
  { value: 'low', label: 'Low', color: 'bg-blue-100 text-blue-800' },
  { value: 'medium', label: 'Medium', color: 'bg-yellow-100 text-yellow-800' },
  { value: 'high', label: 'High', color: 'bg-orange-100 text-orange-800' },
  { value: 'urgent', label: 'Urgent', color: 'bg-red-100 text-red-800' }
];

export const SharedNotesDialog = ({ note, onClose, children }: SharedNotesDialogProps) => {
  const { createNote, updateNote } = useSharedNotes();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState(note?.title || '');
  const [content, setContent] = useState(note?.content || '');
  const [category, setCategory] = useState(note?.category || 'general');
  const [priority, setPriority] = useState<'low' | 'medium' | 'high' | 'urgent'>(note?.priority || 'medium');
  const [status, setStatus] = useState<'active' | 'draft' | 'archived'>(note?.status || 'active');
  const [tags, setTags] = useState<string[]>(note?.tags || []);
  const [newTag, setNewTag] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!title.trim() || !content.trim()) return;

    setSaving(true);
    try {
      if (note) {
        await updateNote(note.id, {
          title: title.trim(),
          content: content.trim(),
          category,
          priority: priority as any,
          status: status as any,
          tags
        });
      } else {
        await createNote({
          title: title.trim(),
          content: content.trim(),
          category,
          priority: priority as any,
          status: status as any,
          tags
        });
      }
      
      setOpen(false);
      onClose?.();
      
      // Reset form if creating new note
      if (!note) {
        setTitle('');
        setContent('');
        setCategory('general');
        setPriority('medium');
        setStatus('active');
        setTags([]);
      }
    } finally {
      setSaving(false);
    }
  };

  const addTag = () => {
    const trimmedTag = newTag.trim().toLowerCase();
    if (trimmedTag && !tags.includes(trimmedTag)) {
      setTags([...tags, trimmedTag]);
      setNewTag('');
    }
  };

  const removeTag = (tagToRemove: string) => {
    setTags(tags.filter(tag => tag !== tagToRemove));
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addTag();
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children || (
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            {note ? 'Edit Note' : 'Add Note'}
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{note ? 'Edit Note' : 'Create New Note'}</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div>
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter note title..."
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="category">Category</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map(cat => (
                    <SelectItem key={cat} value={cat}>
                      {cat.charAt(0).toUpperCase() + cat.slice(1)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="priority">Priority</Label>
              <Select value={priority} onValueChange={(value) => setPriority(value as any)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PRIORITIES.map(p => (
                    <SelectItem key={p.value} value={p.value}>
                      {p.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label htmlFor="status">Status</Label>
            <Select value={status} onValueChange={(value) => setStatus(value as any)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="archived">Archived</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Tags</Label>
            <div className="flex flex-wrap gap-2 mb-2">
              {tags.map(tag => (
                <Badge key={tag} variant="secondary" className="flex items-center gap-1">
                  {tag}
                  <X 
                    className="h-3 w-3 cursor-pointer" 
                    onClick={() => removeTag(tag)}
                  />
                </Badge>
              ))}
            </div>
            <div className="flex gap-2">
              <Input
                value={newTag}
                onChange={(e) => setNewTag(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Add tag..."
                className="flex-1"
              />
              <Button type="button" onClick={addTag} size="sm">
                Add
              </Button>
            </div>
          </div>

          <div>
            <Label htmlFor="content">Content</Label>
            <Textarea
              id="content"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Enter note content..."
              rows={6}
            />
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-4">
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button 
            onClick={handleSave} 
            disabled={!title.trim() || !content.trim() || saving}
          >
            {saving ? 'Saving...' : (note ? 'Update' : 'Create')}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};