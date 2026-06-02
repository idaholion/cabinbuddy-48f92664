import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import { AllocationModelKey, SAMPLES, MODEL_META } from './allocation-samples';
import { SampleSeasonGrid } from './SampleSeasonGrid';

interface Props {
  model: AllocationModelKey | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AllocationExampleDrawer({ model, open, onOpenChange }: Props) {
  if (!model) return null;
  const sample = SAMPLES[model];
  const meta = MODEL_META[model];

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{sample.title}</SheetTitle>
          <SheetDescription>
            {meta.friendlyName} — {meta.tagline}
          </SheetDescription>
        </SheetHeader>
        <div className="mt-6">
          <SampleSeasonGrid season={sample} modelKey={modelKey} />
        </div>
      </SheetContent>
    </Sheet>
  );
}
