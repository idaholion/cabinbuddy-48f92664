import { useState, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

export interface FeedbackData {
  type: 'bug' | 'feature' | 'improvement' | 'general' | 'supervisor_request';
  title: string;
  description: string;
  page: string;
  userAgent: string;
  timestamp: Date;
  userId?: string;
  email?: string;
  organizationId?: string;
}

export const useFeedback = () => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const submitFeedback = useCallback(async (feedback: Omit<FeedbackData, 'timestamp' | 'userAgent' | 'page'>) => {
    setIsSubmitting(true);
    
    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();

      const { error } = await supabase
        .from('feedback' as any)
        .insert({
          type: feedback.type,
          title: feedback.title,
          description: feedback.description,
          email: feedback.email || null,
          page: window.location.pathname,
          user_id: user?.id || null,
          organization_id: feedback.organizationId || null,
          status: 'new',
        } as any);

      if (error) throw error;
      
      toast({
        title: "Feedback submitted",
        description: "Thank you for your feedback! The supervisor will review it soon.",
      });
      
      return true;
    } catch (error) {
      console.error('Failed to submit feedback:', error);
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
