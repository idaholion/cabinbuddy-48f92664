import { useState, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';

export interface FeedbackData {
  type: 'bug' | 'feature' | 'improvement' | 'general';
  title: string;
  description: string;
  page: string;
  userAgent: string;
  timestamp: Date;
  userId?: string;
  email?: string;
}

export const useFeedback = () => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const submitFeedback = useCallback(async (feedback: Omit<FeedbackData, 'timestamp' | 'userAgent' | 'page'>) => {
    setIsSubmitting(true);
    
    try {
      const feedbackData: FeedbackData = {
        ...feedback,
        timestamp: new Date(),
        userAgent: navigator.userAgent,
        page: window.location.pathname,
      };

      // In a real application, you would send this to your backend
      console.log('Feedback submitted:', feedbackData);
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      toast({
        title: "Feedback submitted",
        description: "Thank you for your feedback! We'll review it soon.",
      });
      
      return true;
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to submit feedback. Please try again.",
        variant: "destructive",
      });
      return false;
    } finally {
      setIsSubmitting(false);
    }
  }, [toast]);

  return {
    submitFeedback,
    isSubmitting
  };
};