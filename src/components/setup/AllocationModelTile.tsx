import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Check, Eye } from 'lucide-react';
import { cn } from '@/lib/utils';
import { AllocationModelKey, MODEL_META } from './allocation-samples';
import { AllocationMiniCalendar } from './AllocationMiniCalendar';

interface Props {
  model: AllocationModelKey;
  selected: boolean;
  current: boolean;
  recommended: boolean;
  onSelect: () => void;
  onSeeExample: () => void;
}

export function AllocationModelTile({
  model,
  selected,
  current,
  recommended,
  onSelect,
  onSeeExample,
}: Props) {
  const meta = MODEL_META[model];

  return (
    <Card
      className={cn(
        'relative flex flex-col gap-4 p-5 transition-all cursor-pointer hover:shadow-md',
        selected
          ? 'border-primary border-2 shadow-md ring-2 ring-primary/20'
          : 'border-border'
      )}
      onClick={onSelect}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onSelect();
        }
      }}
    >
      {/* Badges */}
      <div className="absolute right-3 top-3 flex flex-col items-end gap-1">
        {current && (
          <Badge variant="secondary" className="text-[10px]">
            Current model
          </Badge>
        )}
        {recommended && (
          <Badge className="bg-primary text-primary-foreground text-[10px]">
            Recommended
          </Badge>
        )}
        {selected && !current && (
          <Badge variant="outline" className="text-[10px] border-primary text-primary">
            <Check className="mr-1 h-3 w-3" /> Selected
          </Badge>
        )}
      </div>

      {/* Header */}
      <div className="pr-24">
        <h3 className="text-lg font-semibold leading-tight">{meta.friendlyName}</h3>
        <p className="text-sm text-muted-foreground mt-1">{meta.tagline}</p>
      </div>

      {/* Mini calendar */}
      <AllocationMiniCalendar model={model} />

      {/* Best for */}
      <div className="rounded-md bg-muted/40 px-3 py-2 text-xs">
        <span className="font-medium text-foreground">Best for: </span>
        <span className="text-muted-foreground">{meta.bestFor}</span>
      </div>

      {/* Bullets */}
      <ul className="space-y-2 text-sm">
        {meta.bullets.map((b) => (
          <li key={b.label} className="flex gap-2">
            <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
            <span>
              <span className="font-medium">{b.label}: </span>
              <span className="text-muted-foreground">{b.value}</span>
            </span>
          </li>
        ))}
      </ul>

      {/* See example */}
      <Button
        variant="outline"
        size="sm"
        className="mt-auto"
        onClick={(e) => {
          e.stopPropagation();
          onSeeExample();
        }}
      >
        <Eye className="mr-1.5 h-4 w-4" /> See an example
      </Button>
    </Card>
  );
}
