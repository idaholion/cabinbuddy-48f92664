import { SampleSeason, AllocationModelKey, FAMILY_NAMES, WEEK_LABELS } from './allocation-samples';
import { cn } from '@/lib/utils';
import { ArrowRight, Clock } from 'lucide-react';

// Color tokens per family index
const FAMILY_TONES = [
  { chip: 'bg-primary/15 text-primary border-primary/30', dot: 'bg-primary' },
  { chip: 'bg-accent/20 text-accent-foreground border-accent/40', dot: 'bg-accent' },
  { chip: 'bg-secondary/60 text-secondary-foreground border-secondary', dot: 'bg-secondary-foreground/70' },
  { chip: 'bg-muted text-muted-foreground border-border', dot: 'bg-muted-foreground/70' },
];

interface Props {
  season: SampleSeason;
  modelKey?: AllocationModelKey;
}

function Legend({ families }: { families: string[] }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      {families.map((name, i) => (
        <span
          key={name}
          className={cn(
            'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium',
            FAMILY_TONES[i].chip
          )}
        >
          <span className={cn('h-2 w-2 rounded-full', FAMILY_TONES[i].dot)} />
          {name}
        </span>
      ))}
      <span className="inline-flex items-center gap-1.5 rounded-full border border-dashed border-border px-2.5 py-0.5 text-xs text-muted-foreground">
        <span className="h-2 w-2 rounded-full border border-current" />
        Open
      </span>
    </div>
  );
}

// Horizontal calendar strip — one cell per week, labeled by month
function CalendarStrip({
  weeks,
  families,
  showPickBadge = false,
}: {
  weeks: { family?: string; pick?: number }[];
  families: string[];
  showPickBadge?: boolean;
}) {
  const familyIdx = (name?: string) => (name ? families.indexOf(name) : -1);

  // Group consecutive weeks by month for header labels
  const months: { name: string; span: number }[] = [];
  WEEK_LABELS.forEach((label) => {
    const month = label.split(' ')[0];
    const last = months[months.length - 1];
    if (last && last.name === month) last.span += 1;
    else months.push({ name: month, span: 1 });
  });

  return (
    <div className="overflow-x-auto">
      <div className="min-w-[640px]">
        {/* Month headers */}
        <div className="flex border-b border-border pb-1 mb-1">
          {months.map((m, i) => (
            <div
              key={i}
              className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground text-center"
              style={{ flex: m.span }}
            >
              {m.name}
            </div>
          ))}
        </div>

        {/* Week cells */}
        <div className="flex gap-1">
          {weeks.map((w, i) => {
            const idx = familyIdx(w.family);
            const tone =
              idx >= 0
                ? FAMILY_TONES[idx].chip
                : 'bg-background border-dashed border-border text-muted-foreground';
            const label = WEEK_LABELS[i];
            const dayRange = label.replace(/[A-Za-z]+\s/g, '').replace(/\s*–\s*/, '–');
            return (
              <div
                key={i}
                className={cn(
                  'flex-1 min-w-0 rounded border px-1 py-2 text-center relative',
                  tone
                )}
                title={`${label}${w.family ? ` — ${w.family}` : ' — Open'}`}
              >
                <div className="text-[10px] font-semibold leading-tight">{dayRange}</div>
                {showPickBadge && w.pick && (
                  <div className="text-[9px] opacity-75 mt-0.5">#{w.pick}</div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export function SampleSeasonGrid({ season, modelKey }: Props) {
  // Derive layout per model
  if (modelKey === 'rotating_selection') {
    const weeks = season.weeks.map((w, i) => ({
      family: w.family,
      pick: i < 4 ? 1 : i < 8 ? 2 : i < 12 ? 3 : undefined,
    }));
    return (
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">{season.subtitle}</p>
        <Legend families={season.families} />
        <div className="rounded-lg border border-border bg-card/30 p-3">
          <div className="text-xs font-medium text-muted-foreground mb-2">
            Summer 2026 season — picks land in rounds (#1, #2, #3)
          </div>
          <CalendarStrip weeks={weeks} families={season.families} showPickBadge />
        </div>
        <div className="text-xs text-muted-foreground flex items-center gap-1.5">
          <ArrowRight className="h-3 w-3" />
          Next year the pick order rotates — Brooks picks first, then Chen, Diaz, Anderson.
        </div>
      </div>
    );
  }

  if (modelKey === 'static_weeks') {
    // Year 1: family i owns week i % 4 pattern. Year 2: same but shifted +1.
    const owners = ['Anderson', 'Brooks', 'Chen', 'Diaz'];
    const year1 = WEEK_LABELS.map((_, i) => ({ family: owners[i % 4] }));
    const year2 = WEEK_LABELS.map((_, i) => ({ family: owners[(i + 1) % 4] }));
    return (
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">{season.subtitle}</p>
        <Legend families={season.families} />
        <div className="rounded-lg border border-border bg-card/30 p-3 space-y-3">
          <div>
            <div className="text-xs font-medium text-muted-foreground mb-2">Summer 2026</div>
            <CalendarStrip weeks={year1} families={season.families} />
          </div>
          <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
            <ArrowRight className="h-3 w-3" />
            Assignments shift +1 week next year
            <ArrowRight className="h-3 w-3" />
          </div>
          <div>
            <div className="text-xs font-medium text-muted-foreground mb-2">Summer 2027</div>
            <CalendarStrip weeks={year2} families={season.families} />
          </div>
        </div>
        <div className="text-xs text-muted-foreground">
          Each family knows their weeks years in advance, and prime weeks rotate fairly over time.
        </div>
      </div>
    );
  }

  if (modelKey === 'first_come_first_serve') {
    // Booking timeline — show who booked when
    const bookings: { week: number; family: string; bookedOn: string }[] = [
      { week: 2, family: 'Anderson', bookedOn: 'Jan 3' },
      { week: 7, family: 'Brooks', bookedOn: 'Jan 5' },
      { week: 8, family: 'Brooks', bookedOn: 'Jan 5' },
      { week: 4, family: 'Diaz', bookedOn: 'Jan 12' },
      { week: 11, family: 'Chen', bookedOn: 'Feb 2' },
      { week: 13, family: 'Anderson', bookedOn: 'Feb 18' },
    ];
    const weeks = WEEK_LABELS.map((_, i) => {
      const b = bookings.find((x) => x.week === i);
      return { family: b?.family };
    });
    return (
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">{season.subtitle}</p>
        <Legend families={season.families} />
        <div className="rounded-lg border border-border bg-card/30 p-3 space-y-3">
          <div className="text-xs font-medium text-muted-foreground">
            Calendar as of today — most weeks still open
          </div>
          <CalendarStrip weeks={weeks} families={season.families} />

          <div className="border-t border-border pt-3">
            <div className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1.5">
              <Clock className="h-3 w-3" />
              Booking activity
            </div>
            <ol className="space-y-1.5">
              {bookings.map((b, i) => {
                const fi = season.families.indexOf(b.family);
                return (
                  <li key={i} className="flex items-center gap-2 text-xs">
                    <span className="text-muted-foreground tabular-nums w-12">{b.bookedOn}</span>
                    <span className={cn('h-2 w-2 rounded-full', FAMILY_TONES[fi]?.dot)} />
                    <span className="font-medium">{b.family}</span>
                    <span className="text-muted-foreground">booked</span>
                    <span className="font-medium">{WEEK_LABELS[b.week]}</span>
                  </li>
                );
              })}
            </ol>
          </div>
        </div>
      </div>
    );
  }

  // Fallback: simple legend + strip
  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">{season.subtitle}</p>
      <Legend families={season.families} />
      <CalendarStrip
        weeks={season.weeks.map((w) => ({ family: w.family }))}
        families={season.families}
      />
    </div>
  );
}
