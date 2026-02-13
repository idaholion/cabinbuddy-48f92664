import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ListChecks, Image as ImageIcon, FileUp, ArrowRight } from 'lucide-react';

interface ChecklistPathwayCardsProps {
  onSelectPath: (path: 'quick' | 'illustrated' | 'import') => void;
}

export const ChecklistPathwayCards: React.FC<ChecklistPathwayCardsProps> = ({ onSelectPath }) => {
  const pathways = [
    {
      id: 'quick' as const,
      icon: ListChecks,
      title: 'Quick Checklist',
      subtitle: 'Text only — fast & simple',
      description: 'Type items one by one or paste a list. No images, just a clean checklist you can enhance later.',
      color: 'text-emerald-600 dark:text-emerald-400',
      bg: 'bg-emerald-50 dark:bg-emerald-950/30',
      border: 'border-emerald-200 dark:border-emerald-800',
    },
    {
      id: 'illustrated' as const,
      icon: ImageIcon,
      title: 'Illustrated Checklist',
      subtitle: 'With reference photos',
      description: 'Build a checklist with photos attached to items. Great for showing exactly what to do or where things are.',
      color: 'text-blue-600 dark:text-blue-400',
      bg: 'bg-blue-50 dark:bg-blue-950/30',
      border: 'border-blue-200 dark:border-blue-800',
    },
    {
      id: 'import' as const,
      icon: FileUp,
      title: 'Import from Document',
      subtitle: 'Word doc or PDF',
      description: 'Already have a checklist in a document? Upload it and we\'ll convert it into an interactive checklist.',
      color: 'text-violet-600 dark:text-violet-400',
      bg: 'bg-violet-50 dark:bg-violet-950/30',
      border: 'border-violet-200 dark:border-violet-800',
    },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-3">
      {pathways.map((pathway) => {
        const Icon = pathway.icon;
        return (
          <Card
            key={pathway.id}
            className={`${pathway.border} hover:shadow-md transition-shadow cursor-pointer group`}
            onClick={() => onSelectPath(pathway.id)}
          >
            <CardContent className="p-5 space-y-3">
              <div className={`inline-flex p-2.5 rounded-lg ${pathway.bg}`}>
                <Icon className={`h-6 w-6 ${pathway.color}`} />
              </div>
              <div>
                <h3 className="font-semibold text-base">{pathway.title}</h3>
                <p className="text-sm text-muted-foreground">{pathway.subtitle}</p>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {pathway.description}
              </p>
              <Button
                variant="ghost"
                size="sm"
                className="gap-1 p-0 h-auto text-primary group-hover:underline"
              >
                Get started <ArrowRight className="h-3 w-3" />
              </Button>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
};
