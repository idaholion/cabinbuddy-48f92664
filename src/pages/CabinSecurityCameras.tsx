import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import {
  Camera,
  Home,
  Plus,
  Trash2,
  Pencil,
  Search,
  CheckCircle2,
  AlertCircle,
  Video,
  Battery,
  Zap,
  AlertTriangle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { useOrganization } from '@/hooks/useOrganization';

export type CameraStatus = 'online' | 'offline' | 'intermittent';

export interface SecurityCamera {
  id: string;
  name: string;
  location: string;
  status: CameraStatus;
  notes: string;
  lastChecked: string | null;
  addedAt: string;
}

const STATUS_LABEL: Record<CameraStatus, string> = {
  online: 'Online',
  offline: 'Offline',
  intermittent: 'Intermittent',
};

const STATUS_ICON: Record<CameraStatus, typeof CheckCircle2> = {
  online: CheckCircle2,
  intermittent: AlertCircle,
  offline: AlertCircle,
};

const STATUS_VARIANT: Record<CameraStatus, 'default' | 'destructive' | 'secondary'> = {
  online: 'default',
  intermittent: 'secondary',
  offline: 'destructive',
};

const bgStyle = {
  backgroundImage: 'url(/lovable-uploads/45c3083f-46c5-4e30-a2f0-31a24ab454f4.png)',
};

const generateId = () => Math.random().toString(36).slice(2) + Date.now().toString(36);


const CabinSecurityCameras = () => {
  const { organization } = useOrganization();
  const { toast } = useToast();

  const storageKey = `cabin-security-cameras-${organization?.id ?? 'none'}`;

  const [cameras, setCameras] = useState<SecurityCamera[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<SecurityCamera | null>(null);

  const today = new Date().toISOString().slice(0, 10);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          setCameras(parsed);
        }
      }
    } catch {
      // ignore corrupt storage
    }
    setLoaded(true);
  }, [storageKey]);

  useEffect(() => {
    if (!loaded) return;
    localStorage.setItem(storageKey, JSON.stringify(cameras));
  }, [cameras, loaded, storageKey]);

  const filteredCameras = useMemo(() => {
    let list = [...cameras].sort((a, b) => a.name.localeCompare(b.name));
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          c.location.toLowerCase().includes(q) ||
          c.notes.toLowerCase().includes(q)
      );
    }
    return list;
  }, [cameras, search]);

  const stats = useMemo(() => {
    const online = cameras.filter((c) => c.status === 'online').length;
    const offline = cameras.filter((c) => c.status === 'offline').length;
    const intermittent = cameras.filter((c) => c.status === 'intermittent').length;
    return { online, offline, intermittent, total: cameras.length };
  }, [cameras]);

  const openAdd = () => {
    setEditing(null);
    setDialogOpen(true);
  };

  const openEdit = (camera: SecurityCamera) => {
    setEditing(camera);
    setDialogOpen(true);
  };

  const handleDelete = (id: string) => {
    setCameras((prev) => prev.filter((c) => c.id !== id));
    toast({ title: 'Camera removed' });
  };

  const handleSubmit = (camera: SecurityCamera) => {
    if (editing) {
      setCameras((prev) =>
        prev.map((c) => (c.id === editing.id ? { ...camera, id: editing.id, addedAt: editing.addedAt } : c))
      );
      toast({ title: 'Camera updated' });
    } else {
      setCameras((prev) => [
        ...prev,
        { ...camera, id: generateId(), addedAt: new Date().toISOString() },
      ]);
      toast({ title: 'Camera added' });
    }
    setDialogOpen(false);
    setEditing(null);
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
            <Camera className="h-10 w-10" />
            Cabin Security Cameras
          </h1>
          <p className="text-center text-base text-foreground/80 bg-card/60 rounded px-3 py-1 max-w-2xl mx-auto">
            Keep track of security cameras around the cabin: locations, status, and notes.
          </p>
        </div>

        <Card className="bg-card/95 mb-4">
          <CardHeader className="pb-2">
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <Camera className="h-5 w-5 text-primary" />
              Camera Maintenance Instructions
            </h2>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h3 className="font-semibold flex items-center gap-2 mb-1">
                <Battery className="h-4 w-4 text-primary" />
                Check battery level
              </h3>
              <ul className="list-disc pl-5 text-sm text-foreground/80 space-y-1">
                <li>Open the battery compartment and check the LED indicator near the power button. Green means a strong charge, yellow is moderate, and red means it needs charging soon.</li>
                <li>If the camera is connected through the mobile app, the battery percentage may also appear there.</li>
                <li>Offline or intermittent cameras are often the first sign of a low battery.</li>
              </ul>
            </div>

            <div>
              <h3 className="font-semibold flex items-center gap-2 mb-1">
                <Video className="h-4 w-4 text-primary" />
                Remove cameras for charging
              </h3>
              <ul className="list-disc pl-5 text-sm text-foreground/80 space-y-1">
                <li>Power the camera off first by holding the button for a few seconds.</li>
                <li>Carefully unmount the camera and note the angle and direction it was facing so you can reinstall it the same way.</li>
                <li>Use a sturdy step stool or ladder, and have someone spot you when working at height.</li>
              </ul>
            </div>

            <div>
              <h3 className="font-semibold flex items-center gap-2 mb-1">
                <Zap className="h-4 w-4 text-primary" />
                Charge and reinstall
              </h3>
              <ul className="list-disc pl-5 text-sm text-foreground/80 space-y-1">
                <li>Charge batteries indoors at room temperature using the supplied cable or charging base.</li>
                <li>Wait until the charge indicator is solid green before reinstalling, usually 4–6 hours.</li>
                <li>Mount the camera back in the same location, clean the lens if needed, and power it on. Confirm it shows as online before you leave.</li>
              </ul>
            </div>

            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Important cautions</AlertTitle>
              <AlertDescription className="text-sm">
                Do not leave batteries charging when no one is at the cabin. Unattended charging is a fire risk. Avoid charging near flammable materials, in direct sunlight, or in very hot or cold areas. If a battery looks swollen or damaged, do not use it; replace it instead.
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
          <Card className="bg-card/95">
            <CardContent className="pt-4 pb-3 text-center">
              <div className="text-2xl font-bold text-primary">{stats.total}</div>
              <div className="text-xs text-muted-foreground">Total cameras</div>
            </CardContent>
          </Card>
          <Card className="bg-card/95">
            <CardContent className="pt-4 pb-3 text-center">
              <div className="text-2xl font-bold text-emerald-600">{stats.online}</div>
              <div className="text-xs text-muted-foreground">Online</div>
            </CardContent>
          </Card>
          <Card className="bg-card/95">
            <CardContent className="pt-4 pb-3 text-center">
              <div className="text-2xl font-bold text-destructive">{stats.offline}</div>
              <div className="text-xs text-muted-foreground">Offline</div>
            </CardContent>
          </Card>
          <Card className="bg-card/95">
            <CardContent className="pt-4 pb-3 text-center">
              <div className="text-2xl font-bold text-amber-500">{stats.intermittent}</div>
              <div className="text-xs text-muted-foreground">Intermittent</div>
            </CardContent>
          </Card>
        </div>

        <Card className="bg-card/95">
          <CardHeader className="pb-3">
            <div className="flex flex-col md:flex-row gap-3 md:items-center md:justify-between">
              <div className="relative w-full md:w-72">
                <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search cameras…"
                  className="pl-9"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              <Button onClick={openAdd} className="w-full md:w-auto">
                <Plus className="h-4 w-4 mr-2" />
                Add Camera
              </Button>
            </div>
          </CardHeader>

          <CardContent>
            {filteredCameras.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Video className="h-10 w-10 mx-auto mb-3 opacity-40" />
                <p className="mb-3">No cameras recorded yet.</p>
                <Button variant="outline" onClick={openAdd}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add your first camera
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredCameras.map((camera) => (
                  <CameraCard
                    key={camera.id}
                    camera={camera}
                    onEdit={() => openEdit(camera)}
                    onDelete={() => handleDelete(camera.id)}
                  />
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <CameraDialog
        open={dialogOpen}
        onOpenChange={(o) => {
          setDialogOpen(o);
          if (!o) setEditing(null);
        }}
        initial={editing}
        today={today}
        onSubmit={handleSubmit}
      />
    </div>
  );
};

function CameraCard({
  camera,
  onEdit,
  onDelete,
}: {
  camera: SecurityCamera;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const StatusIcon = STATUS_ICON[camera.status];

  return (
    <div className="border rounded-lg p-4 bg-background/50 hover:bg-background transition-colors">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 min-w-0">
          <div className="mt-1 shrink-0">
            <Video className="h-5 w-5 text-muted-foreground" />
          </div>
          <div className="min-w-0">
            <div className="font-semibold text-base">{camera.name}</div>
            <div className="text-sm text-muted-foreground">{camera.location}</div>
            {camera.notes && (
              <p className="text-sm text-muted-foreground whitespace-pre-wrap mt-2">{camera.notes}</p>
            )}
            <div className="flex flex-wrap gap-2 mt-2 text-xs">
              <Badge variant={STATUS_VARIANT[camera.status]}>
                <StatusIcon className="h-3 w-3 mr-1" />
                {STATUS_LABEL[camera.status]}
              </Badge>
              {camera.lastChecked && (
                <Badge variant="outline">Last checked {format(new Date(camera.lastChecked), 'MMM d, yyyy')}</Badge>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <Button size="sm" variant="ghost" onClick={onEdit} aria-label="Edit">
            <Pencil className="h-4 w-4" />
          </Button>
          <Button size="sm" variant="ghost" className="text-destructive" onClick={onDelete} aria-label="Delete">
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}

function CameraDialog({
  open,
  onOpenChange,
  initial,
  today,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  initial: SecurityCamera | null;
  today: string;
  onSubmit: (camera: SecurityCamera) => void;
}) {
  const [name, setName] = useState('');
  const [location, setLocation] = useState('');
  const [status, setStatus] = useState<CameraStatus>('online');
  const [notes, setNotes] = useState('');
  const [lastChecked, setLastChecked] = useState('');

  useEffect(() => {
    if (!open) return;
    if (initial) {
      setName(initial.name);
      setLocation(initial.location);
      setStatus(initial.status);
      setNotes(initial.notes);
      setLastChecked(initial.lastChecked ?? '');
    } else {
      setName('');
      setLocation('');
      setStatus('online');
      setNotes('');
      setLastChecked(today);
    }
  }, [open, initial, today]);

  const handleSave = () => {
    if (!name.trim() || !location.trim()) return;
    onSubmit({
      id: initial?.id ?? '',
      name: name.trim(),
      location: location.trim(),
      status,
      notes: notes.trim(),
      lastChecked: lastChecked || null,
      addedAt: initial?.addedAt ?? new Date().toISOString(),
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{initial ? 'Edit Camera' : 'Add Camera'}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="camera-name">Camera name</Label>
            <Input
              id="camera-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Front Driveway"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="camera-location">Location</Label>
            <Input
              id="camera-location"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="e.g. Mounted above front door"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="camera-status">Status</Label>
            <Select value={status} onValueChange={(v) => setStatus(v as CameraStatus)}>
              <SelectTrigger id="camera-status">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="online">Online</SelectItem>
                <SelectItem value="intermittent">Intermittent</SelectItem>
                <SelectItem value="offline">Offline</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="camera-last-checked">Last checked</Label>
            <Input
              id="camera-last-checked"
              type="date"
              value={lastChecked}
              onChange={(e) => setLastChecked(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="camera-notes">Notes</Label>
            <Textarea
              id="camera-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Model number, access info, or issues…"
              rows={3}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={!name.trim() || !location.trim()}>
            {initial ? 'Save changes' : 'Add camera'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default CabinSecurityCameras;
