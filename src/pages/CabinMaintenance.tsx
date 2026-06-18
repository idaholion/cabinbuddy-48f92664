import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import {
  Wrench,
  Home,
  Plus,
  Trash2,
  Search,
  CheckCircle2,
  Circle,
  Image as ImageIcon,
  CalendarDays,
  DollarSign,
  User as UserIcon,
  Tag,
  Pencil,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { useOrgAdmin } from '@/hooks/useOrgAdmin';
import { useEnhancedProfileClaim } from '@/hooks/useEnhancedProfileClaim';
import { useFamilyGroups } from '@/hooks/useFamilyGroups';
import {
  useCabinMaintenance,
  type EntryType,
  type MaintenanceEntry,
  type NewEntryInput,
  type Priority,
} from '@/hooks/useCabinMaintenance';

const CATEGORIES = [
  'Plumbing',
  'Electrical',
  'Exterior',
  'Interior',
  'Septic/Well',
  'Appliances',
  'HVAC',
  'Grounds',
  'Safety',
  'Reference Info',
  'Other',
];

const PRIORITY_LABEL: Record<Priority, string> = {
  low: 'Low',
  medium: 'Medium',
  high: 'High',
};

const UNASSIGNED = '__unassigned__';

const bgStyle = {
  backgroundImage: 'url(/lovable-uploads/45c3083f-46c5-4e30-a2f0-31a24ab454f4.png)',
};

function memberName(member: any): string {
  if (!member) return '';
  if (typeof member === 'string') return member;
  if (member.full_name) return member.full_name;
  return [member.first_name, member.last_name].filter(Boolean).join(' ').trim();
}

const CabinMaintenance = () => {
  const { user } = useAuth();
  const { isAdmin } = useOrgAdmin();
  const { claimedProfile } = useEnhancedProfileClaim();
  const { familyGroups } = useFamilyGroups();
  const { toast } = useToast();
  const { entries, loading, createEntry, updateEntry, completeTodo, reopenTodo, deleteEntry } = useCabinMaintenance();

  const [tab, setTab] = useState<EntryType>('work_log');
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [todoFilter, setTodoFilter] = useState<'open' | 'completed' | 'all'>('open');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<MaintenanceEntry | null>(null);

  const allMembers = useMemo(() => {
    const names = new Set<string>();
    familyGroups.forEach((g: any) => {
      (g.host_members || []).forEach((m: any) => {
        const n = memberName(m);
        if (n) names.add(n);
      });
    });
    return Array.from(names).sort();
  }, [familyGroups]);

  const defaultPerformedBy = useMemo(() => {
    if (claimedProfile?.member_name) return claimedProfile.member_name;
    return user?.email || '';
  }, [claimedProfile, user]);

  const filteredEntries = useMemo(() => {
    let list = entries.filter((e) => e.entry_type === tab);
    if (tab === 'todo' && todoFilter !== 'all') {
      list = list.filter((e) => e.status === todoFilter);
    }
    if (categoryFilter !== 'all') {
      list = list.filter((e) => e.category === categoryFilter);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (e) =>
          e.title.toLowerCase().includes(q) ||
          e.description?.toLowerCase().includes(q) ||
          e.category?.toLowerCase().includes(q) ||
          e.performed_by_name?.toLowerCase().includes(q)
      );
    }
    if (tab === 'work_log') {
      list = [...list].sort((a, b) => (b.date_performed || '').localeCompare(a.date_performed || ''));
    }
    return list;
  }, [entries, tab, todoFilter, categoryFilter, search]);

  const stats = useMemo(() => {
    const thisYear = new Date().getFullYear();
    const workThisYear = entries.filter(
      (e) =>
        e.entry_type === 'work_log' &&
        e.date_performed &&
        new Date(e.date_performed).getFullYear() === thisYear
    ).length;
    const openTodos = entries.filter((e) => e.entry_type === 'todo' && e.status === 'open').length;
    const refCount = entries.filter((e) => e.entry_type === 'reference').length;
    return { workThisYear, openTodos, refCount };
  }, [entries]);

  const canModify = (e: MaintenanceEntry) => isAdmin || e.created_by === user?.id;

  const openAdd = () => {
    setEditingEntry(null);
    setDialogOpen(true);
  };

  const openEdit = (e: MaintenanceEntry) => {
    setEditingEntry(e);
    setDialogOpen(true);
  };

  return (
    <div className="min-h-screen bg-cover bg-center bg-no-repeat p-4" style={bgStyle}>
      <div className="max-w-5xl mx-auto">
        <div className="mb-6">
          <Button variant="outline" asChild className="mb-4 text-base">
            <Link to="/home">
              <Home className="h-4 w-4 mr-2" />
              Home
            </Link>
          </Button>
          <h1 className="text-6xl mb-2 font-kaushan text-primary drop-shadow-lg text-center flex items-center justify-center gap-3">
            <Wrench className="h-10 w-10" />
            Cabin Maintenance
          </h1>
          <p className="text-center text-base text-foreground/80 bg-card/60 rounded px-3 py-1 max-w-2xl mx-auto">
            Log maintenance work, save reference info (paint colors, model numbers), and track open
            to-do items.
          </p>
        </div>

        <div className="grid grid-cols-3 gap-3 mb-4">
          <Card className="bg-card/95">
            <CardContent className="pt-4 pb-3 text-center">
              <div className="text-2xl font-bold text-primary">{stats.workThisYear}</div>
              <div className="text-xs text-muted-foreground">Work entries this year</div>
            </CardContent>
          </Card>
          <Card className="bg-card/95">
            <CardContent className="pt-4 pb-3 text-center">
              <div className="text-2xl font-bold text-primary">{stats.openTodos}</div>
              <div className="text-xs text-muted-foreground">Open to-dos</div>
            </CardContent>
          </Card>
          <Card className="bg-card/95">
            <CardContent className="pt-4 pb-3 text-center">
              <div className="text-2xl font-bold text-primary">{stats.refCount}</div>
              <div className="text-xs text-muted-foreground">Reference notes</div>
            </CardContent>
          </Card>
        </div>

        <Card className="bg-card/95">
          <CardHeader className="pb-3">
            {/* Row 1: tabs + Add button */}
            <div className="flex flex-col md:flex-row gap-3 md:items-center md:justify-between">
              <Tabs value={tab} onValueChange={(v) => setTab(v as EntryType)} className="w-full md:w-auto">
                <TabsList>
                  <TabsTrigger value="work_log">Work Log</TabsTrigger>
                  <TabsTrigger value="reference">Reference Info</TabsTrigger>
                  <TabsTrigger value="todo">To-Do</TabsTrigger>
                </TabsList>
              </Tabs>
              <div className="md:ml-auto">
                <Button onClick={openAdd} className="w-full md:w-auto">
                  <Plus className="h-4 w-4 mr-2" />
                  Add {tab === 'work_log' ? 'Work Entry' : tab === 'reference' ? 'Reference' : 'To-Do'}
                </Button>
              </div>
            </div>

            {/* Row 2: filters */}
            <div className="flex flex-col md:flex-row gap-2 mt-3">
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="md:w-48">
                  <SelectValue placeholder="All categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All categories</SelectItem>
                  {CATEGORIES.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {tab === 'todo' && (
                <Select value={todoFilter} onValueChange={(v) => setTodoFilter(v as any)}>
                  <SelectTrigger className="md:w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="open">Open</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="all">All</SelectItem>
                  </SelectContent>
                </Select>
              )}
            </div>
          </CardHeader>


          <CardContent>
            {loading ? (
              <p className="text-center text-muted-foreground py-8">Loading…</p>
            ) : filteredEntries.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Wrench className="h-10 w-10 mx-auto mb-3 opacity-40" />
                <p className="mb-3">Nothing here yet.</p>
                <Button variant="outline" onClick={openAdd}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add your first entry
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredEntries.map((e) => (
                  <EntryCard
                    key={e.id}
                    entry={e}
                    onComplete={() => completeTodo(e.id)}
                    onReopen={() => reopenTodo(e.id)}
                    onDelete={() => deleteEntry(e.id)}
                    onEdit={() => openEdit(e)}
                    canModify={canModify(e)}
                  />
                ))}
              </div>
            )}

            <div className="relative mt-4">
              <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search entries…"
                className="pl-9"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

          </CardContent>
        </Card>
      </div>

      <EntryDialog
        open={dialogOpen}
        onOpenChange={(o) => {
          setDialogOpen(o);
          if (!o) setEditingEntry(null);
        }}
        entryType={tab}
        editing={editingEntry}
        defaultPerformedBy={defaultPerformedBy}
        memberOptions={allMembers}
        onSubmit={async (input) => {
          if (editingEntry) {
            await updateEntry(editingEntry.id, {
              title: input.title,
              description: input.description ?? null,
              category: input.category ?? null,
              date_performed: input.date_performed ?? null,
              performed_by_name: input.performed_by_name ?? null,
              cost: input.cost ?? null,
              priority: input.priority ?? null,
              target_date: input.target_date ?? null,
            } as any);
            setDialogOpen(false);
            setEditingEntry(null);
            toast({ title: 'Updated' });
          } else {
            const result = await createEntry(input);
            if (result) setDialogOpen(false);
          }
        }}
      />
    </div>
  );
};

function EntryCard({
  entry,
  onComplete,
  onReopen,
  onDelete,
  onEdit,
  canModify,
}: {
  entry: MaintenanceEntry;
  onComplete: () => void;
  onReopen: () => void;
  onDelete: () => void;
  onEdit: () => void;
  canModify: boolean;
}) {
  const [lightbox, setLightbox] = useState<string | null>(null);
  const isTodo = entry.entry_type === 'todo';
  const isOpenTodo = isTodo && entry.status === 'open';

  return (
    <>
      <div className="border rounded-lg p-3 bg-background/50 hover:bg-background transition-colors">
        <div className="flex items-start gap-3">
          {isTodo && (
            <button
              onClick={isOpenTodo ? onComplete : onReopen}
              className="mt-1 shrink-0"
              aria-label={isOpenTodo ? 'Mark complete' : 'Reopen'}
            >
              {isOpenTodo ? (
                <Circle className="h-5 w-5 text-muted-foreground" />
              ) : (
                <CheckCircle2 className="h-5 w-5 text-primary" />
              )}
            </button>
          )}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <div className={`font-semibold ${entry.status === 'completed' && isTodo ? 'line-through text-muted-foreground' : ''}`}>
                  {entry.title}
                </div>
                {entry.description && (
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap mt-1">
                    {entry.description}
                  </p>
                )}
              </div>
              {canModify && (
                <div className="flex items-center gap-1 shrink-0">
                  <Button size="sm" variant="ghost" onClick={onEdit} aria-label="Edit">
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button size="sm" variant="ghost" className="text-destructive" aria-label="Delete">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete this entry?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This cannot be undone. Photos attached to this entry will also be removed.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={onDelete}>Delete</AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              )}
            </div>

            <div className="flex flex-wrap gap-2 mt-2 text-xs">
              {entry.category && (
                <Badge variant="secondary">
                  <Tag className="h-3 w-3 mr-1" />
                  {entry.category}
                </Badge>
              )}
              {entry.date_performed && (
                <Badge variant="outline">
                  <CalendarDays className="h-3 w-3 mr-1" />
                  {format(new Date(entry.date_performed), 'MMM d, yyyy')}
                </Badge>
              )}
              {entry.target_date && isOpenTodo && (
                <Badge variant="outline">
                  Target: {format(new Date(entry.target_date), 'MMM d, yyyy')}
                </Badge>
              )}
              {entry.performed_by_name && (
                <Badge variant="outline">
                  <UserIcon className="h-3 w-3 mr-1" />
                  {entry.performed_by_name}
                </Badge>
              )}
              {entry.cost != null && (
                <Badge variant="outline">
                  <DollarSign className="h-3 w-3 mr-1" />
                  {entry.cost.toFixed(2)}
                </Badge>
              )}
              {entry.priority && isTodo && (
                <Badge variant={entry.priority === 'high' ? 'destructive' : 'secondary'}>
                  {PRIORITY_LABEL[entry.priority]} priority
                </Badge>
              )}
            </div>

            {entry.photos && entry.photos.length > 0 && (
              <div className="flex gap-2 mt-3 flex-wrap">
                {entry.photos.map((p) => (
                  <button key={p.id} onClick={() => setLightbox(p.url || null)}>
                    <img
                      src={p.url}
                      alt={p.caption || 'maintenance photo'}
                      className="h-16 w-16 object-cover rounded border"
                    />
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <Dialog open={!!lightbox} onOpenChange={(o) => !o && setLightbox(null)}>
        <DialogContent className="max-w-3xl">
          {lightbox && <img src={lightbox} alt="" className="w-full h-auto" />}
        </DialogContent>
      </Dialog>
    </>
  );
}

function EntryDialog({
  open,
  onOpenChange,
  entryType,
  editing,
  defaultPerformedBy,
  memberOptions,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  entryType: EntryType;
  editing: MaintenanceEntry | null;
  defaultPerformedBy: string;
  memberOptions: string[];
  onSubmit: (input: NewEntryInput) => Promise<void> | void;
}) {
  const today = new Date().toISOString().slice(0, 10);
  const effectiveType: EntryType = editing?.entry_type || entryType;

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<string>('');
  const [datePerformed, setDatePerformed] = useState(today);
  const [performedBy, setPerformedBy] = useState('');
  const [cost, setCost] = useState('');
  const [priority, setPriority] = useState<Priority>('medium');
  const [targetDate, setTargetDate] = useState('');
  const [photos, setPhotos] = useState<File[]>([]);
  const [saving, setSaving] = useState(false);

  // Reset/populate when dialog opens
  useEffect(() => {
    if (!open) return;
    if (editing) {
      setTitle(editing.title || '');
      setDescription(editing.description || '');
      setCategory(editing.category || '');
      setDatePerformed(editing.date_performed || today);
      setPerformedBy(editing.performed_by_name || '');
      setCost(editing.cost != null ? String(editing.cost) : '');
      setPriority((editing.priority as Priority) || 'medium');
      setTargetDate(editing.target_date || '');
      setPhotos([]);
    } else {
      setTitle('');
      setDescription('');
      setCategory('');
      setDatePerformed(today);
      // Work log defaults to current user; To-Do "Assigned to" defaults blank.
      setPerformedBy(entryType === 'work_log' ? defaultPerformedBy : '');
      setCost('');
      setPriority('medium');
      setTargetDate('');
      setPhotos([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, editing?.id]);

  const handleSubmit = async () => {
    if (!title.trim()) return;
    setSaving(true);
    try {
      await onSubmit({
        entry_type: effectiveType,
        title,
        description,
        category: category || undefined,
        date_performed: effectiveType === 'work_log' ? datePerformed : null,
        performed_by_name: effectiveType === 'reference' ? null : (performedBy || null),
        cost: cost ? parseFloat(cost) : null,
        priority: effectiveType === 'todo' ? priority : null,
        target_date: effectiveType === 'todo' && targetDate ? targetDate : null,
        photos,
      });
    } finally {
      setSaving(false);
    }
  };

  const titleLabel = editing
    ? 'Edit Entry'
    : effectiveType === 'work_log'
    ? 'Add Work Log Entry'
    : effectiveType === 'reference'
    ? 'Add Reference Info'
    : 'Add To-Do';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{titleLabel}</DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          <div>
            <Label>Title *</Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={
                effectiveType === 'reference'
                  ? 'e.g., Exterior stain color'
                  : effectiveType === 'todo'
                  ? 'e.g., Replace water heater anode'
                  : 'e.g., Added Ridex to septic'
              }
              maxLength={200}
            />
          </div>

          <div>
            <Label>Description</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={
                effectiveType === 'reference'
                  ? 'e.g., Sherwin-Williams Cedar Bark SW-3525, 2 gallons'
                  : 'Details, brand names, part numbers…'
              }
              rows={3}
              maxLength={2000}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Category</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger>
                  <SelectValue placeholder="Pick…" />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {effectiveType === 'work_log' && (
              <div>
                <Label>Date performed</Label>
                <Input type="date" value={datePerformed} onChange={(e) => setDatePerformed(e.target.value)} />
              </div>
            )}
            {effectiveType === 'todo' && (
              <div>
                <Label>Priority</Label>
                <Select value={priority} onValueChange={(v) => setPriority(v as Priority)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          {effectiveType === 'todo' && (
            <div>
              <Label>Target date (optional)</Label>
              <Input type="date" value={targetDate} onChange={(e) => setTargetDate(e.target.value)} />
            </div>
          )}

          {effectiveType !== 'reference' && (
            <div className="space-y-2">
              <Label>{effectiveType === 'todo' ? 'Assigned to' : 'Performed by'}</Label>
              <div className="flex flex-col sm:flex-row gap-2">
                <Input
                  value={performedBy}
                  onChange={(e) => setPerformedBy(e.target.value)}
                  placeholder={effectiveType === 'todo' ? 'Unassigned' : 'Name'}
                  className="flex-1"
                />
                <Select
                  value=""
                  onValueChange={(v) => setPerformedBy(v === UNASSIGNED ? '' : v)}
                >
                  <SelectTrigger className="sm:w-48">
                    <SelectValue placeholder="Pick member…" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={UNASSIGNED}>Unassigned</SelectItem>
                    {defaultPerformedBy && !memberOptions.includes(defaultPerformedBy) && (
                      <SelectItem value={defaultPerformedBy}>{defaultPerformedBy} (me)</SelectItem>
                    )}
                    {memberOptions.map((m) => (
                      <SelectItem key={m} value={m}>
                        {m}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          {effectiveType === 'work_log' && (
            <div>
              <Label>Cost (optional)</Label>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={cost}
                onChange={(e) => setCost(e.target.value)}
                placeholder="0.00"
              />
            </div>
          )}

          {!editing && (
            <div>
              <Label className="flex items-center gap-2">
                <ImageIcon className="h-4 w-4" />
                Photos (optional)
              </Label>
              <Input
                type="file"
                accept="image/*"
                multiple
                onChange={(e) => setPhotos(Array.from(e.target.files || []))}
              />
              {photos.length > 0 && (
                <p className="text-xs text-muted-foreground mt-1">{photos.length} file(s) selected</p>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={saving || !title.trim()}>
            {saving ? 'Saving…' : editing ? 'Save Changes' : 'Save'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default CabinMaintenance;
