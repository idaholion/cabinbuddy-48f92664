import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { HelpCircle, ListChecks, CheckSquare, Image as ImageIcon, FileUp, Sparkles, ArrowRight } from 'lucide-react';

export const WhatCanItDoDialog: React.FC = () => {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <HelpCircle className="h-4 w-4" />
          What can it do?
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            What Can Checklist Creator Do?
          </DialogTitle>
        </DialogHeader>
        <div className="overflow-y-auto space-y-4 pr-1">
          <div className="space-y-3">
            <div className="flex gap-3 items-start p-3 rounded-lg bg-muted/50">
              <ListChecks className="h-5 w-5 text-primary mt-0.5 shrink-0" />
              <div>
                <p className="font-medium text-sm">Quick Text Checklists</p>
                <p className="text-sm text-muted-foreground">
                  Type items one by one, or paste a list — each line becomes a checklist item. Fast and simple.
                </p>
              </div>
            </div>

            <div className="flex gap-3 items-start p-3 rounded-lg bg-muted/50">
              <ImageIcon className="h-5 w-5 text-primary mt-0.5 shrink-0" />
              <div>
                <p className="font-medium text-sm">Illustrated Checklists</p>
                <p className="text-sm text-muted-foreground">
                  Attach reference photos to any item — helpful for showing exactly what something should look like (e.g. how to close a valve, where the shutoff is).
                </p>
              </div>
            </div>

            <div className="flex gap-3 items-start p-3 rounded-lg bg-muted/50">
              <FileUp className="h-5 w-5 text-primary mt-0.5 shrink-0" />
              <div>
                <p className="font-medium text-sm">Import from a Document</p>
                <p className="text-sm text-muted-foreground">
                  Upload a Word doc or PDF and it gets converted into an interactive checklist automatically.
                </p>
              </div>
            </div>

            <div className="flex gap-3 items-start p-3 rounded-lg bg-muted/50">
              <CheckSquare className="h-5 w-5 text-primary mt-0.5 shrink-0" />
              <div>
                <p className="font-medium text-sm">Save as Seasonal Checklists</p>
                <p className="text-sm text-muted-foreground">
                  Assign your checklist to a season (Opening, Closing, Maintenance, etc.) so family members can track their progress interactively.
                </p>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export const StepsToMakeDialog: React.FC = () => {
  const steps = [
    { number: '1', title: 'Choose a method', description: 'Pick Quick (text only), Illustrated (with photos), or Import (from a document).' },
    { number: '2', title: 'Add your items', description: 'Type items individually, paste a list, or upload a file.' },
    { number: '3', title: 'Add photos (optional)', description: 'Browse the image library or upload your own photos to attach to any item.' },
    { number: '4', title: 'Save to a season', description: 'Choose a checklist type (Opening, Closing, etc.) and save. Members can then use it interactively.' },
  ];

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <ArrowRight className="h-4 w-4" />
          Steps to make a checklist
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>How to Create a Checklist</DialogTitle>
        </DialogHeader>
        <div className="overflow-y-auto space-y-3 pr-1">
          {steps.map((step) => (
            <div key={step.number} className="flex gap-3 items-start">
              <div className="h-7 w-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold shrink-0">
                {step.number}
              </div>
              <div>
                <p className="font-medium text-sm">{step.title}</p>
                <p className="text-sm text-muted-foreground">{step.description}</p>
              </div>
            </div>
          ))}
          <div className="mt-4 p-3 rounded-lg bg-muted/50 text-sm text-muted-foreground">
            <strong>💡 Tip:</strong> You can always add photos to a simple checklist later from the Seasonal Checklists page.
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
