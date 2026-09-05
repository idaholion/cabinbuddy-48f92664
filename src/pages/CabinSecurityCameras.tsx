import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Camera,
  Home,
  Video,
  Battery,
  Zap,
  AlertTriangle,
  StickyNote,
  Pencil,
  Plus,
  Trash2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
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

interface InstructionSection {
  id: string;
  title: string;
  items: string[];
}

const SECTION_ICONS = [Battery, Video, Zap, StickyNote, Camera];

const DEFAULT_SECTIONS: InstructionSection[] = [
  {
    id: 'battery-check',
    title: 'Check battery level',
    items: [
      'Open the Arlo app and check the battery level of the outdoor security camera batteries. Offline or unreadable cameras are often a sign of low battery.',
    ],
  },
  {
    id: 'remove-cameras',
    title: 'Remove cameras for charging',
    items: [
      'If any of the cameras show low power or are not able to be brought online, carefully unmount the camera and note the angle and direction it was facing so you can reinstall it the same way. Some of the cameras are mounted on a screw mount, one is on a magnetic mount.',
      'Use a sturdy step stool or ladder, and have someone spot you when working at height.',
    ],
  },
  {
    id: 'charge-reinstall',
    title: 'Charge and reinstall',
    items: [
      'Carefully open the battery container. Remove the battery and place in the battery charger.',
      'Wait until the charge indicator is solid green before reinstalling, usually 4–6 hours. Charge batteries indoors at room temperature.',
      'Mount the camera back in the same location, clean the lens if needed. Confirm it shows up online before you leave.',
    ],
  },
  {
    id: 'no-time-to-charge',
    title: 'If you cannot charge before leaving',
    items: [
      'If you notice camera batteries are low and there is not enough time to charge them before you leave, place the cameras in a visible location and leave a note for the next person indicating that the batteries need to be charged and the cameras reinstalled.',
    ],
  },
];

const DEFAULT_CAUTIONS =
  'Do not leave batteries charging when no one is at the cabin. Unattended charging is a fire risk. Avoid charging near flammable materials, in direct sunlight, or in very hot or cold areas. If a battery looks swollen or damaged, do not use it; replace it instead.';

const bgStyle = {
  backgroundImage: 'url(/lovable-uploads/45c3083f-46c5-4e30-a2f0-31a24ab454f4.png)',
};

const generateId = () => Math.random().toString(36).slice(2) + Date.now().toString(36);

const CabinSecurityCameras = () => {
  const { organization } = useOrganization();
  const { toast } = useToast();

  const storageKey = `cabin-camera-instructions-${organization?.id ?? 'none'}`;

  const [sections, setSections] = useState<InstructionSection[]>(DEFAULT_SECTIONS);
  const [cautions, setCautions] = useState(DEFAULT_CAUTIONS);
  const [loaded, setLoaded] = useState(false);
  const [editOpen, setEditOpen] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed?.sections)) setSections(parsed.sections);
        if (typeof parsed?.cautions === 'string') setCautions(parsed.cautions);
      }
    } catch {
      // ignore corrupt storage
    }
    setLoaded(true);
  }, [storageKey]);

  const handleSave = (nextSections: InstructionSection[], nextCautions: string) => {
    setSections(nextSections);
    setCautions(nextCautions);
    if (loaded) {
      localStorage.setItem(storageKey, JSON.stringify({ sections: nextSections, cautions: nextCautions }));
    }
    setEditOpen(false);
    toast({ title: 'Instructions saved' });
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
            Instructions for checking, charging, and reinstalling the cabin security cameras.
          </p>
        </div>

        <Card className="bg-card/95 mb-4">
          <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <Camera className="h-5 w-5 text-primary" />
              Camera Maintenance Instructions
            </h2>
            <Button variant="outline" size="sm" onClick={() => setEditOpen(true)}>
              <Pencil className="h-4 w-4 mr-2" />
              Edit
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            {sections.map((section, index) => {
              const Icon = SECTION_ICONS[index % SECTION_ICONS.length];
              return (
                <div key={section.id}>
                  <h3 className="font-semibold flex items-center gap-2 mb-1">
                    <Icon className="h-4 w-4 text-primary" />
                    {section.title}
                  </h3>
                  <ul className="list-disc pl-5 text-sm text-foreground/80 space-y-1">
                    {section.items.map((item, i) => (
                      <li key={i}>{item}</li>
                    ))}
                  </ul>
                </div>
              );
            })}

            {cautions.trim() && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Important cautions</AlertTitle>
                <AlertDescription className="text-sm whitespace-pre-wrap">{cautions}</AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
      </div>

      <InstructionsDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        initialSections={sections}
        initialCautions={cautions}
        onSave={handleSave}
      />
    </div>
  );
};

function InstructionsDialog({
  open,
  onOpenChange,
  initialSections,
  initialCautions,
  onSave,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  initialSections: InstructionSection[];
  initialCautions: string;
  onSave: (sections: InstructionSection[], cautions: string) => void;
}) {
  const [draft, setDraft] = useState<InstructionSection[]>([]);
  const [cautions, setCautions] = useState('');

  useEffect(() => {
    if (!open) return;
    setDraft(initialSections.map((s) => ({ ...s, items: [...s.items] })));
    setCautions(initialCautions);
  }, [open, initialSections, initialCautions]);

  const updateTitle = (id: string, title: string) =>
    setDraft((prev) => prev.map((s) => (s.id === id ? { ...s, title } : s)));

  const updateItems = (id: string, text: string) =>
    setDraft((prev) =>
      prev.map((s) =>
        s.id === id ? { ...s, items: text.split('\n').map((l) => l.trim()).filter(Boolean) } : s
      )
    );

  const removeSection = (id: string) => setDraft((prev) => prev.filter((s) => s.id !== id));

  const addSection = () =>
    setDraft((prev) => [...prev, { id: generateId(), title: 'New section', items: [] }]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Camera Maintenance Instructions</DialogTitle>
        </DialogHeader>
        <div className="space-y-6 py-2">
          {draft.map((section) => (
            <div key={section.id} className="space-y-2 border rounded-lg p-3">
              <div className="flex items-center gap-2">
                <Input
                  value={section.title}
                  onChange={(e) => updateTitle(section.id, e.target.value)}
                  placeholder="Section title"
                />
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-destructive shrink-0"
                  onClick={() => removeSection(section.id)}
                  aria-label="Remove section"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
              <Textarea
                value={section.items.join('\n')}
                onChange={(e) => updateItems(section.id, e.target.value)}
                placeholder={'One instruction per line'}
                rows={Math.max(2, section.items.length)}
              />
            </div>
          ))}

          <Button variant="outline" onClick={addSection}>
            <Plus className="h-4 w-4 mr-2" />
            Add section
          </Button>

          <div className="space-y-2">
            <Label htmlFor="cautions">Important cautions</Label>
            <Textarea
              id="cautions"
              value={cautions}
              onChange={(e) => setCautions(e.target.value)}
              rows={3}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={() => onSave(draft, cautions)}>Save instructions</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default CabinSecurityCameras;
