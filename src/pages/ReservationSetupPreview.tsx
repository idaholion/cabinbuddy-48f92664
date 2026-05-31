import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Eye, ArrowLeft, HelpCircle } from 'lucide-react';
import { useOrganizationContext } from '@/hooks/useOrganizationContext';
import { AllocationModelChooser } from '@/components/setup/AllocationModelChooser';
import { AllocationModelKey, PREVIEW_FAQS } from '@/components/setup/allocation-samples';

export default function ReservationSetupPreview() {
  const { getAllocationModel } = useOrganizationContext();

  // Map the org's stored model into our 3-tile space.
  // 'manual' and 'lottery' are legacy/edge — default them to 'rotating_selection' for preview.
  const stored = getAllocationModel();
  const currentModel: AllocationModelKey =
    stored === 'static_weeks'
      ? 'static_weeks'
      : stored === 'first_come_first_serve'
      ? 'first_come_first_serve'
      : 'rotating_selection';

  const [selectedModel, setSelectedModel] = useState<AllocationModelKey>(currentModel);

  return (
    <div className="container mx-auto max-w-6xl space-y-6 py-8 px-4">
      {/* Header banner */}
      <Alert className="border-primary/40 bg-primary/5">
        <Eye className="h-4 w-4" />
        <AlertTitle>Preview: New Allocation Model Chooser</AlertTitle>
        <AlertDescription className="flex flex-wrap items-center justify-between gap-3">
          <span>
            Nothing on this page saves to your organization. This is a sandbox so
            you can evaluate the new UI before we replace the live Reservation Setup.
          </span>
          <Link to="/reservation-setup">
            <Button variant="outline" size="sm">
              <ArrowLeft className="mr-1.5 h-4 w-4" />
              Back to Reservation Setup
            </Button>
          </Link>
        </AlertDescription>
      </Alert>

      {/* The chooser */}
      <AllocationModelChooser
        currentModel={currentModel}
        selectedModel={selectedModel}
        onSelect={setSelectedModel}
        readOnlyApply={true}
      />

      {/* FAQ strip */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <HelpCircle className="h-5 w-5 text-primary" />
            Common questions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Accordion type="single" collapsible className="w-full">
            {PREVIEW_FAQS.map((faq, i) => (
              <AccordionItem key={i} value={`faq-${i}`}>
                <AccordionTrigger className="text-left">{faq.q}</AccordionTrigger>
                <AccordionContent className="text-muted-foreground">
                  {faq.a}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </CardContent>
      </Card>
    </div>
  );
}
