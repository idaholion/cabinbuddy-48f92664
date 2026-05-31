import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Sparkles } from 'lucide-react';
import { AllocationModelKey } from './allocation-samples';
import { AllocationModelTile } from './AllocationModelTile';
import { AllocationExampleDrawer } from './AllocationExampleDrawer';
import { AllocationRecommenderDialog } from './AllocationRecommenderDialog';
import { AllocationSwitchConsequences } from './AllocationSwitchConsequences';

interface Props {
  currentModel: AllocationModelKey;
  selectedModel: AllocationModelKey;
  onSelect: (model: AllocationModelKey) => void;
  readOnlyApply?: boolean;          // preview mode: disable apply
  onApply?: () => void;             // when not read-only
}

const ALL_MODELS: AllocationModelKey[] = [
  'rotating_selection',
  'static_weeks',
  'first_come_first_serve',
];

export function AllocationModelChooser({
  currentModel,
  selectedModel,
  onSelect,
  readOnlyApply = false,
  onApply,
}: Props) {
  const [exampleOpen, setExampleOpen] = useState(false);
  const [exampleModel, setExampleModel] = useState<AllocationModelKey | null>(null);
  const [recommenderOpen, setRecommenderOpen] = useState(false);
  const [recommended, setRecommended] = useState<AllocationModelKey | null>(null);
  const [confirmed, setConfirmed] = useState(false);

  const switching = selectedModel !== currentModel;

  const openExample = (model: AllocationModelKey) => {
    setExampleModel(model);
    setExampleOpen(true);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle>Choose your allocation model</CardTitle>
            <CardDescription>
              How your families share weeks at the cabin. Pick the model that
              fits your group — you can change it later.
            </CardDescription>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setRecommenderOpen(true)}
          >
            <Sparkles className="mr-1.5 h-4 w-4" />
            Not sure? Answer 3 questions
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid gap-4 md:grid-cols-3">
          {ALL_MODELS.map((model) => (
            <AllocationModelTile
              key={model}
              model={model}
              selected={selectedModel === model}
              current={currentModel === model}
              recommended={recommended === model}
              onSelect={() => {
                onSelect(model);
                setConfirmed(false);
              }}
              onSeeExample={() => openExample(model)}
            />
          ))}
        </div>

        {switching && (
          <div className="space-y-4">
            <AllocationSwitchConsequences from={currentModel} to={selectedModel} />

            <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-border bg-muted/30 p-3">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border-border"
                  checked={confirmed}
                  onChange={(e) => setConfirmed(e.target.checked)}
                  disabled={readOnlyApply}
                />
                I understand what will change
              </label>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    onSelect(currentModel);
                    setConfirmed(false);
                  }}
                >
                  Cancel
                </Button>
                <Button
                  size="sm"
                  disabled={readOnlyApply || !confirmed}
                  onClick={onApply}
                  title={readOnlyApply ? 'Disabled in preview — visit Reservation Setup to actually apply' : undefined}
                >
                  {readOnlyApply ? 'Apply change (disabled in preview)' : 'Apply change'}
                </Button>
              </div>
            </div>
          </div>
        )}
      </CardContent>

      <AllocationExampleDrawer
        model={exampleModel}
        open={exampleOpen}
        onOpenChange={setExampleOpen}
      />
      <AllocationRecommenderDialog
        open={recommenderOpen}
        onOpenChange={setRecommenderOpen}
        onRecommend={(model) => {
          setRecommended(model);
          onSelect(model);
          setConfirmed(false);
        }}
      />
    </Card>
  );
}
