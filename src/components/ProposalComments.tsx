import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useOrganization } from '@/hooks/useOrganization';
import { useAuth } from '@/contexts/AuthContext';
import { MessageCircle, Send } from 'lucide-react';
import { format } from 'date-fns';

interface Comment {
  id: string;
  comment: string;
  user_id: string;
  created_at: string;
  user_email?: string;
}

interface ProposalCommentsProps {
  proposalId: string;
  proposalTitle: string;
}

export const ProposalComments = ({ proposalId, proposalTitle }: ProposalCommentsProps) => {
  const { organization } = useOrganization();
  const { user } = useAuth();
  const { toast } = useToast();
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (proposalId && organization?.id) {
      fetchComments();
    }
  }, [proposalId, organization?.id]);

  const fetchComments = async () => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('proposal_comments')
        .select('id, comment, user_id, created_at')
        .eq('proposal_id', proposalId)
        .eq('organization_id', organization?.id)
        .order('created_at', { ascending: true });

      if (error) throw error;

      setComments(data || []);
    } catch (error: any) {
      console.error('Error fetching comments:', error);
      toast({
        title: "Error",
        description: "Failed to load comments",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const submitComment = async () => {
    if (!newComment.trim()) return;

    try {
      setSubmitting(true);
      
      const { error } = await supabase
        .from('proposal_comments')
        .insert({
          proposal_id: proposalId,
          organization_id: organization?.id,
          user_id: user?.id,
          comment: newComment.trim()
        });

      if (error) throw error;

      setNewComment('');
      fetchComments();
      
      toast({
        title: "Success",
        description: "Comment added successfully",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to add comment",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const getInitials = (userId: string) => {
    return userId.slice(0, 2).toUpperCase();
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MessageCircle className="h-5 w-5" />
          Discussion: {proposalTitle}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Add new comment */}
        <div className="space-y-2">
          <Textarea
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder="Share your thoughts on this proposal..."
            className="min-h-[80px]"
          />
          <Button 
            onClick={submitComment} 
            disabled={submitting || !newComment.trim()}
            size="sm"
          >
            <Send className="h-4 w-4 mr-2" />
            {submitting ? "Adding..." : "Add Comment"}
          </Button>
        </div>

        {/* Comments list */}
        <div className="space-y-3">
          {loading ? (
            <p className="text-muted-foreground text-center py-4">Loading comments...</p>
          ) : comments.length === 0 ? (
            <p className="text-muted-foreground text-center py-4">
              No comments yet. Be the first to share your thoughts!
            </p>
          ) : (
            comments.map((comment) => (
              <div key={comment.id} className="flex gap-3 p-3 bg-muted/50 rounded-lg">
                <Avatar className="h-8 w-8">
                  <AvatarFallback className="text-xs">
                    {getInitials(comment.user_id)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-medium">
                      User {comment.user_id.slice(0, 8)}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {format(new Date(comment.created_at), 'MMM dd, yyyy HH:mm')}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                    {comment.comment}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
};