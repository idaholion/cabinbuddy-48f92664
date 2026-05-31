import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Sparkles, ArrowRight, RotateCcw } from 'lucide-react';
import { AllocationModelKey, MODEL_META } from './allocation-samples';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onRecommend: (model: AllocationModelKey) => void;
}

type AnswerKey = 'guaranteed' | 'tradeoff' | 'busy' | 'open' | 'structured' | 'fair' | 'loose';

interface Question {
  id: number;
  text: string;
  options: { value: AnswerKey; label: string; hint: string }[];
}

const QUESTIONS: Question[] = [
  {
    id: 1,
    text: 'Does every family want a guaranteed week, or do you trade off who gets the prime weeks?',
    options: [
      { value: 'guaranteed', label: 'Each family wants a guaranteed week', hint: 'Predictable, same every year' },
      { value: 'tradeoff', label: 'We trade off who gets prime weeks', hint: 'Fairness over time' },
    ],
  },
  {
    id: 2,
    text: 'How busy is your calendar — do most weeks get claimed, or is there lots of open time?',
    options: [
      { value: 'busy', label: 'Most weeks get claimed', hint: 'Demand exceeds supply' },
      { value: 'open', label: 'Lots of weeks stay open', hint: 'Plenty of room for everyone' },
    ],
  },
  {
    id: 3,
    text: 'How structured do you want the booking process to be?',
    options: [
      { value: 'structured', label: 'Very structured', hint: 'Clear rules, fixed assignments' },
      { value: 'fair', label: 'Structured but flexible', hint: 'Defined picks, then open' },
      { value: 'loose', label: 'Loose and informal', hint: 'Just book when you want' },
    ],
  },
];

function recommend(answers: Record<number, AnswerKey>): AllocationModelKey {
  const a1 = answers[1];
  const a2 = answers[2];
  const a3 = answers[3];

  // Strong signals
  if (a3 === 'loose' || a2 === 'open') return 'first_come_first_serve';
  if (a1 === 'guaranteed' && a3 === 'structured') return 'static_weeks';
  if (a1 === 'tradeoff') return 'rotating_selection';
  if (a1 === 'guaranteed') return 'static_weeks';
  return 'rotating_selection';
}

export function AllocationRecommenderDialog({ open, onOpenChange, onRecommend }: Props) {
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Record<number, AnswerKey>>({});

  const reset = () => {
    setStep(0);
    setAnswers({});
  };

  const handleClose = (next: boolean) => {
    if (!next) reset();
    onOpenChange(next);
  };

  const isResult = step >= QUESTIONS.length;
  const result = isResult ? recommend(answers) : null;
  const currentQ = !isResult ? QUESTIONS[step] : null;
  const currentAnswer = currentQ ? answers[currentQ.id] : undefined;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Help me choose
          </DialogTitle>
          <DialogDescription>
            {isResult
              ? "Based on your answers, here's the model that fits best."
              : `Question ${step + 1} of ${QUESTIONS.length}`}
          </DialogDescription>
        </DialogHeader>

        {currentQ && (
          <div className="space-y-4 py-2">
            <p className="font-medium">{currentQ.text}</p>
            <RadioGroup
              value={currentAnswer ?? ''}
              onValueChange={(v) =>
                setAnswers((prev) => ({ ...prev, [currentQ.id]: v as AnswerKey }))
              }
              className="space-y-2"
            >
              {currentQ.options.map((opt) => (
                <Label
                  key={opt.value}
                  htmlFor={`q${currentQ.id}-${opt.value}`}
                  className="flex items-start gap-3 rounded-md border border-border p-3 cursor-pointer hover:bg-muted/50"
                >
                  <RadioGroupItem value={opt.value} id={`q${currentQ.id}-${opt.value}`} className="mt-1" />
                  <div>
                    <div className="font-medium">{opt.label}</div>
                    <div className="text-xs text-muted-foreground">{opt.hint}</div>
                  </div>
                </Label>
              ))}
            </RadioGroup>
          </div>
        )}

        {isResult && result && (
          <div className="space-y-3 py-2">
            <div className="rounded-lg border-2 border-primary bg-primary/5 p-4">
              <p className="text-xs uppercase tracking-wide text-primary font-semibold">
                Recommended
              </p>
              <h3 className="mt-1 text-xl font-bold">{MODEL_META[result].friendlyName}</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                {MODEL_META[result].tagline}
              </p>
              <p className="mt-3 text-sm">
                <span className="font-medium">Why: </span>
                {result === 'rotating_selection' &&
                  'You want fairness across prime weeks and a structured process — rotating selection takes turns each year so no family is always last.'}
                {result === 'static_weeks' &&
                  'You want predictability — static weeks give each family the same weeks every year with no annual negotiating.'}
                {result === 'first_come_first_serve' &&
                  'You have plenty of open time and prefer a low-overhead, informal approach — anyone books when they want.'}
              </p>
            </div>
          </div>
        )}

        <DialogFooter className="flex-row justify-between sm:justify-between">
          <Button variant="ghost" size="sm" onClick={reset}>
            <RotateCcw className="mr-1.5 h-4 w-4" /> Start over
          </Button>
          <div className="flex gap-2">
            {!isResult && step > 0 && (
              <Button variant="outline" onClick={() => setStep(step - 1)}>
                Back
              </Button>
            )}
            {!isResult && (
              <Button
                disabled={!currentAnswer}
                onClick={() => setStep(step + 1)}
              >
                {step === QUESTIONS.length - 1 ? 'See recommendation' : 'Next'}{' '}
                <ArrowRight className="ml-1.5 h-4 w-4" />
              </Button>
            )}
            {isResult && result && (
              <Button
                onClick={() => {
                  onRecommend(result);
                  handleClose(false);
                }}
              >
                Highlight this model
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
