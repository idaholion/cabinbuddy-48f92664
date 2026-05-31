import { AllocationModelKey } from './allocation-samples';

// Inline SVG mini-calendar previews — themed with semantic CSS variables.
// One per allocation model. ~16 week-cells across 4 rows.

interface Props {
  model: AllocationModelKey;
}

const W = 160;
const H = 88;
const COLS = 8;
const ROWS = 4;
const CELL_W = W / COLS;
const CELL_H = H / ROWS;

// Use design system token colors via inline style with hsl(var(--token))
const TONES = [
  'hsl(var(--primary))',
  'hsl(var(--accent))',
  'hsl(var(--secondary-foreground))',
  'hsl(var(--muted-foreground))',
];

function cell(x: number, y: number, fill: string, opacity = 0.85) {
  return (
    <rect
      key={`${x}-${y}`}
      x={x * CELL_W + 1}
      y={y * CELL_H + 1}
      width={CELL_W - 2}
      height={CELL_H - 2}
      rx={2}
      fill={fill}
      fillOpacity={opacity}
    />
  );
}

export function AllocationMiniCalendar({ model }: Props) {
  // Build a per-cell color map keyed by model
  const cells: React.ReactNode[] = [];

  if (model === 'rotating_selection') {
    // Rotating bands: families take turns row by row
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const i = (c + r) % 4;
        cells.push(cell(c, r, TONES[i], r === ROWS - 1 ? 0.35 : 0.85));
      }
    }
  } else if (model === 'static_weeks') {
    // Static stripes: each family owns the same columns
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const i = c % 4;
        cells.push(cell(c, r, TONES[i], 0.8));
      }
    }
  } else {
    // First come: sparse fills, most cells open
    const booked = new Set([2, 5, 9, 12, 17, 20, 25, 28]);
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const idx = r * COLS + c;
        if (booked.has(idx)) {
          cells.push(cell(c, r, TONES[idx % 4], 0.8));
        } else {
          cells.push(cell(c, r, 'hsl(var(--muted))', 0.5));
        }
      }
    }
  }

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      width="100%"
      height="auto"
      role="img"
      aria-label={`${model} mini calendar preview`}
      className="rounded-md border border-border bg-background"
    >
      {cells}
    </svg>
  );
}
