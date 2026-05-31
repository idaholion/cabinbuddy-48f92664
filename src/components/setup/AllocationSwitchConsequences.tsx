import { AlertTriangle, Info } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AllocationModelKey, MODEL_META } from './allocation-samples';

interface Props {
  from: AllocationModelKey;
  to: AllocationModelKey;
}

function buildConsequences(from: AllocationModelKey, to: AllocationModelKey): string[] {
  const lines: string[] = [];

  if (from === to) return lines;

  // Always-true reassurance
  lines.push('No reservations will be deleted.');

  // From rotating_selection
  if (from === 'rotating_selection') {
    if (to === 'static_weeks') {
      lines.push('Your current rotation order will be cleared.');
      lines.push('You will need to assign permanent weeks to each family.');
    }
    if (to === 'first_come_first_serve') {
      lines.push('Your rotation order will be cleared.');
      lines.push('The selection-period schedule will no longer apply.');
      lines.push('Families will be able to book any open dates immediately.');
    }
  }

  // From static_weeks
  if (from === 'static_weeks') {
    if (to === 'rotating_selection') {
      lines.push('Existing static week assignments will be preserved but no longer enforced.');
      lines.push('You will need to set a rotation order and selection-period schedule.');
    }
    if (to === 'first_come_first_serve') {
      lines.push('Existing static week assignments will be preserved but no longer enforced.');
      lines.push('Families will be able to book any open dates immediately.');
    }
  }

  // From first_come_first_serve
  if (from === 'first_come_first_serve') {
    if (to === 'rotating_selection') {
      lines.push('You will need to set a rotation order and selection-period schedule.');
      lines.push('Already-booked dates remain; new bookings will follow the rotation rules.');
    }
    if (to === 'static_weeks') {
      lines.push('You will need to assign permanent weeks to each family.');
      lines.push('Already-booked dates remain; new bookings will follow the static assignments.');
    }
  }

  return lines;
}

export function AllocationSwitchConsequences({ from, to }: Props) {
  if (from === to) return null;
  const lines = buildConsequences(from, to);

  return (
    <Alert className="border-warning/40 bg-warning/5">
      <AlertTriangle className="h-4 w-4" />
      <AlertTitle>
        Switching from <strong>{MODEL_META[from].friendlyName}</strong> to{' '}
        <strong>{MODEL_META[to].friendlyName}</strong>
      </AlertTitle>
      <AlertDescription>
        <ul className="mt-2 space-y-1.5 text-sm">
          {lines.map((line, i) => (
            <li key={i} className="flex gap-2">
              <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
              <span>{line}</span>
            </li>
          ))}
        </ul>
      </AlertDescription>
    </Alert>
  );
}
