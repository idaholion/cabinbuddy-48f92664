import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form } from "@/components/ui/form";
import { FormInput, FormTextarea, FormSelect } from "@/components/ui/form-fields";
import { MessageSquare } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useFeedback } from "@/hooks/useFeedback";

const feedbackSchema = z.object({
  type: z.enum(['bug', 'feature', 'improvement', 'general']),
  title: z.string().min(5, "Title must be at least 5 characters"),
  description: z.string().min(10, "Description must be at least 10 characters"),
  email: z.string().email().optional().or(z.literal("")),
});

type FeedbackFormData = z.infer<typeof feedbackSchema>;

export const FeedbackButton = () => {
  const [open, setOpen] = useState(false);
  const { submitFeedback, isSubmitting } = useFeedback();
  
  const form = useForm<FeedbackFormData>({
    resolver: zodResolver(feedbackSchema),
    defaultValues: {
      type: 'general',
      title: '',
      description: '',
      email: '',
    },
  });

  const onSubmit = async (data: FeedbackFormData) => {
    const feedbackData = {
      type: data.type,
      title: data.title,
      description: data.description,
      email: data.email,
    };
    const success = await submitFeedback(feedbackData);
    if (success) {
      form.reset();
      setOpen(false);
    }
  };

  const feedbackTypes = [
    { value: 'bug', label: 'Bug Report' },
    { value: 'feature', label: 'Feature Request' },
    { value: 'improvement', label: 'Improvement Suggestion' },
    { value: 'general', label: 'General Feedback' },
  ];

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button 
          variant="outline" 
          size="sm"
          className="fixed bottom-4 right-4 z-50 shadow-lg"
        >
          <MessageSquare className="h-4 w-4 mr-2" />
          Feedback
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Send Feedback</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormSelect
              control={form.control}
              name="type"
              label="Feedback Type"
              options={feedbackTypes}
            />
            
            <FormInput
              control={form.control}
              name="title"
              label="Title"
              placeholder="Brief description of your feedback"
            />
            
            <FormTextarea
              control={form.control}
              name="description"
              label="Description"
              placeholder="Please provide details about your feedback..."
              rows={4}
            />
            
            <FormInput
              control={form.control}
              name="email"
              label="Email (optional)"
              type="email"
              placeholder="your.email@example.com"
              description="We'll only use this to follow up on your feedback"
            />
            
            <div className="flex justify-end space-x-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Submitting..." : "Submit Feedback"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};