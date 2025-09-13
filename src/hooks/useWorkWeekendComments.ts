import { useState, useEffect } from 'react';
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from '@/contexts/AuthContext';
import { useOrganization } from '@/hooks/useOrganization';
import { useToast } from "@/hooks/use-toast";

interface WorkWeekendComment {
  id: string;
  work_weekend_id: string;
  user_id: string;
  commenter_name: string;
  commenter_email: string;
  commenter_family_group: string | null;
  comment: string;
  interest_level: 'interested' | 'not_available' | 'maybe' | 'general_comment';
  created_at: string;
  updated_at: string;
}

export const useWorkWeekendComments = (workWeekendId?: string) => {
  const { user } = useAuth();
  const { organization } = useOrganization();
  const { toast } = useToast();
  const [comments, setComments] = useState<WorkWeekendComment[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchComments = async () => {
    if (!workWeekendId || !organization?.id) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('work_weekend_comments')
        .select('*')
        .eq('work_weekend_id', workWeekendId)
        .eq('organization_id', organization.id)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Error fetching work weekend comments:', error);
        toast({
          title: "Error",
          description: "Failed to load comments",
          variant: "destructive",
        });
        return;
      }

      setComments(data as WorkWeekendComment[] || []);
    } catch (error) {
      console.error('Error fetching work weekend comments:', error);
    } finally {
      setLoading(false);
    }
  };

  const addComment = async (
    comment: string, 
    interestLevel: 'interested' | 'not_available' | 'maybe' | 'general_comment' = 'general_comment'
  ) => {
    if (!workWeekendId || !organization?.id || !user) return false;

    try {
      const userName = user.user_metadata?.first_name 
        ? `${user.user_metadata.first_name} ${user.user_metadata.last_name || ''}`.trim()
        : user.email || 'Unknown User';

      const { error } = await supabase
        .from('work_weekend_comments')
        .insert({
          work_weekend_id: workWeekendId,
          organization_id: organization.id,
          user_id: user.id,
          commenter_name: userName,
          commenter_email: user.email || '',
          comment,
          interest_level: interestLevel,
        });

      if (error) {
        console.error('Error adding comment:', error);
        toast({
          title: "Error",
          description: "Failed to add comment",
          variant: "destructive",
        });
        return false;
      }

      toast({
        title: "Comment Added",
        description: "Your comment has been posted successfully",
      });

      // Refresh comments
      await fetchComments();
      return true;
    } catch (error) {
      console.error('Error adding comment:', error);
      return false;
    }
  };

  const deleteComment = async (commentId: string) => {
    if (!organization?.id || !user) return false;

    try {
      const { error } = await supabase
        .from('work_weekend_comments')
        .delete()
        .eq('id', commentId)
        .eq('user_id', user.id) // Ensure user can only delete their own comments
        .eq('organization_id', organization.id);

      if (error) {
        console.error('Error deleting comment:', error);
        toast({
          title: "Error",
          description: "Failed to delete comment",
          variant: "destructive",
        });
        return false;
      }

      toast({
        title: "Comment Deleted",
        description: "Your comment has been removed",
      });

      // Refresh comments
      await fetchComments();
      return true;
    } catch (error) {
      console.error('Error deleting comment:', error);
      return false;
    }
  };

  // Set up real-time subscription for comments
  useEffect(() => {
    if (!workWeekendId || !organization?.id) return;

    const channel = supabase
      .channel(`work_weekend_comments_${workWeekendId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'work_weekend_comments',
          filter: `work_weekend_id=eq.${workWeekendId}`
        },
        () => {
          // Refresh comments when any change occurs
          fetchComments();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [workWeekendId, organization?.id]);

  useEffect(() => {
    fetchComments();
  }, [workWeekendId, organization?.id]);

  return {
    comments,
    loading,
    addComment,
    deleteComment,
    fetchComments,
  };
};