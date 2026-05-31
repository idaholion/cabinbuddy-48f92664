import { SampleSeason } from './allocation-samples';
import { cn } from '@/lib/utils';

// Color tokens per family index — using semantic Tailwind utilities backed by
// the project's design system. Index >3 falls back to muted.
const FAMILY_TONES = [
  'bg-primary/15 text-primary border-primary/30',
  'bg-accent/20 text-accent-foreground border-accent/40',
  'bg-secondary/40 text-secondary-foreground border-secondary',
  'bg-muted text-muted-foreground border-border',
];

interface Props {
  season: SampleSeason;
}

export function SampleSeasonGrid({ season }: Props) {
  const familyIndex = (name?: string) =>
    name ? season.families.indexOf(name) : -1;

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">{season.subtitle}</p>

      {/* Legend */}
      <div className="flex flex-wrap gap-2">
        {season.families.map((name, i) => (
          <span
            key={name}
            className={cn(
              'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium',
              FAMILY_TONES[i] ?? FAMILY_TONES[3]
            )}
          >
            <span className="h-2 w-2 rounded-full bg-current" />
            {name}
          </span>
        ))}
        <span className="inline-flex items-center gap-1.5 rounded-full border border-dashed border-border px-2.5 py-0.5 text-xs text-muted-foreground">
          <span className="h-2 w-2 rounded-full border border-current" />
          Open
        </span>
      </div>

      {/* Week grid */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {season.weeks.map((w) => {
          const idx = familyIndex(w.family);
          const tone = idx >= 0 ? FAMILY_TONES[idx] ?? FAMILY_TONES[3] : 'bg-background border-dashed border-border text-muted-foreground';
          return (
            <div
              key={w.label}
              className={cn(
                'rounded-md border p-2 text-xs',
                tone
              )}
            >
              <div className="font-semibold">{w.label}</div>
              <div className="truncate">{w.family ?? 'Open'}</div>
              {w.note && (
                <div className="mt-0.5 text-[10px] opacity-80">{w.note}</div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
