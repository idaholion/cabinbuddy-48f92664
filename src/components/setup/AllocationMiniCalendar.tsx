import { AllocationModelKey } from './allocation-samples';

// Tile-sized previews that visually explain each allocation model.
// Each preview uses a horizontal week-strip metaphor (left-to-right = season time)
// with model-specific overlays:
//   • Rotating Selection — two strips showing pick order rotating between years
//   • Static Weeks       — two strips showing assignments shift +1 week year-over-year
//   • First Come         — one strip with a few booked cells + booking timestamps

interface Props {
  model: AllocationModelKey;
}

const TONES = [
  'hsl(var(--primary))',
  'hsl(var(--accent))',
  'hsl(var(--secondary-foreground))',
  'hsl(var(--muted-foreground))',
];

const WEEKS = 12;

function Strip({
  yearLabel,
  fills,
  width,
  y,
  cellH = 14,
}: {
  yearLabel: string;
  fills: (number | null)[]; // index into TONES, or null = open
  width: number;
  y: number;
  cellH?: number;
}) {
  const cellW = width / WEEKS;
  return (
    <g>
      <text
        x={0}
        y={y - 3}
        fontSize={7}
        fill="hsl(var(--muted-foreground))"
        fontWeight={600}
      >
        {yearLabel}
      </text>
      {fills.map((f, i) => (
        <rect
          key={i}
          x={i * cellW + 0.5}
          y={y}
          width={cellW - 1}
          height={cellH}
          rx={1.5}
          fill={f === null ? 'hsl(var(--muted))' : TONES[f]}
          fillOpacity={f === null ? 0.35 : 0.9}
          stroke={f === null ? 'hsl(var(--border))' : 'none'}
          strokeWidth={0.5}
          strokeDasharray={f === null ? '1.5 1.5' : undefined}
        />
      ))}
    </g>
  );
}

export function AllocationMiniCalendar({ model }: Props) {
  const W = 200;
  const H = 80;

  if (model === 'rotating_selection') {
    // Show 2 years. Year 1 pick order: A,B,C,D. Year 2 rotates: B,C,D,A.
    // 12 weeks: 1st round (4) + 2nd round (4) + 3rd round (4).
    const year1 = [0, 1, 2, 3, 3, 2, 1, 0, 0, 1, 2, 3];
    const year2 = [1, 2, 3, 0, 0, 3, 2, 1, 1, 2, 3, 0];
    return (
      <svg
        viewBox={`0 0 ${W} ${H}`}
        width="100%"
        height="auto"
        role="img"
        aria-label="Rotating Selection — pick order rotates each year"
        className="rounded-md border border-border bg-background"
      >
        <Strip yearLabel="2026 picks" fills={year1} width={W} y={14} />
        <Strip yearLabel="2027 picks (rotated)" fills={year2} width={W} y={50} />
        {/* Rotation arrow between strips */}
        <g transform={`translate(${W - 16}, 34)`}>
          <path
            d="M 0 4 L 10 4 M 7 1 L 10 4 L 7 7"
            stroke="hsl(var(--muted-foreground))"
            strokeWidth={1}
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </g>
      </svg>
    );
  }

  if (model === 'static_weeks') {
    // Same 4 owners assigned in repeating blocks. Year 2 shifts +1 week.
    const owners = [0, 0, 0, 1, 1, 1, 2, 2, 2, 3, 3, 3];
    const year1 = owners;
    const year2 = [owners[owners.length - 1], ...owners.slice(0, -1)];
    return (
      <svg
        viewBox={`0 0 ${W} ${H}`}
        width="100%"
        height="auto"
        role="img"
        aria-label="Static Weeks — assignments shift +1 week each year"
        className="rounded-md border border-border bg-background"
      >
        <Strip yearLabel="2026 assignments" fills={year1} width={W} y={14} />
        <Strip yearLabel="2027 (shifted +1 week)" fills={year2} width={W} y={50} />
        {/* Shift arrow */}
        <g transform={`translate(${W / 2 - 8}, 33)`}>
          <path
            d="M 0 4 L 14 4 M 11 1 L 14 4 L 11 7"
            stroke="hsl(var(--muted-foreground))"
            strokeWidth={1}
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </g>
      </svg>
    );
  }

  // first_come_first_serve
  // Single strip with sparse bookings + a couple of booking-date tags
  const booked: Record<number, number> = { 1: 0, 5: 1, 6: 1, 9: 2 };
  const fills: (number | null)[] = Array.from({ length: WEEKS }, (_, i) =>
    booked[i] !== undefined ? booked[i] : null
  );
  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      width="100%"
      height="auto"
      role="img"
      aria-label="First Come, First Served — open calendar, fills up over time"
      className="rounded-md border border-border bg-background"
    >
      <Strip yearLabel="Open calendar" fills={fills} width={W} y={14} cellH={18} />

      {/* Booking timeline below */}
      <text
        x={0}
        y={50}
        fontSize={7}
        fill="hsl(var(--muted-foreground))"
        fontWeight={600}
      >
        Booking activity
      </text>
      <line
        x1={0}
        y1={62}
        x2={W}
        y2={62}
        stroke="hsl(var(--border))"
        strokeWidth={0.75}
      />
      {[
        { x: 0.1, label: 'Jan 3' },
        { x: 0.35, label: 'Jan 5' },
        { x: 0.62, label: 'Feb 2' },
        { x: 0.88, label: 'Feb 18' },
      ].map((b, i) => (
        <g key={i} transform={`translate(${b.x * W}, 62)`}>
          <circle r={2} fill="hsl(var(--primary))" />
          <text
            x={0}
            y={11}
            fontSize={6.5}
            fill="hsl(var(--muted-foreground))"
            textAnchor={i === 0 ? 'start' : i === 3 ? 'end' : 'middle'}
          >
            {b.label}
          </text>
        </g>
      ))}
    </svg>
  );
}
