import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useWorkWeekendComments } from '@/hooks/useWorkWeekendComments';
import { MessageSquare, User, Trash2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

interface WorkWeekendCommentsSectionProps {
  workWeekendId: string;
}

export const WorkWeekendCommentsSection = ({ workWeekendId }: WorkWeekendCommentsSectionProps) => {
  const { user } = useAuth();
  const { comments, loading, addComment, deleteComment } = useWorkWeekendComments(workWeekendId);
  const [newComment, setNewComment] = useState('');
  const [interestLevel, setInterestLevel] = useState<'interested' | 'not_available' | 'maybe' | 'general_comment'>('general_comment');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) return;

    const success = await addComment(newComment, interestLevel);
    if (success) {
      setNewComment('');
      setInterestLevel('general_comment');
    }
  };

  const getInterestBadge = (level: string) => {
    const variants = {
      interested: { variant: 'default' as const, color: 'bg-green-500', label: 'Interested' },
      not_available: { variant: 'secondary' as const, color: 'bg-red-500', label: 'Not Available' },
      maybe: { variant: 'outline' as const, color: 'bg-yellow-500', label: 'Maybe' },
      general_comment: { variant: 'outline' as const, color: 'bg-gray-500', label: 'Comment' },
    };
    
    const config = variants[level as keyof typeof variants] || variants.general_comment;
    
    return (
      <Badge variant={config.variant} className="text-xs">
        {config.label}
      </Badge>
    );
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const canDeleteComment = (commentUserId: string) => {
    return user?.id === commentUserId;
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MessageSquare className="h-5 w-5" />
          Comments & Interest ({comments.length})
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Add Comment Form */}
        <form onSubmit={handleSubmit} className="space-y-4 p-4 border rounded-lg bg-muted/50">
          <div className="space-y-2">
            <Label htmlFor="interest-level">Your Interest Level</Label>
            <Select 
              value={interestLevel} 
              onValueChange={(value) => setInterestLevel(value as typeof interestLevel)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="interested">✅ Interested in helping</SelectItem>
                <SelectItem value="maybe">❓ Maybe available</SelectItem>
                <SelectItem value="not_available">❌ Not available</SelectItem>
                <SelectItem value="general_comment">💬 General comment</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="comment">Your Comment</Label>
            <Textarea
              id="comment"
              placeholder="Share your thoughts, ask questions, or let us know if you can help..."
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              rows={3}
            />
          </div>

          <Button type="submit" disabled={!newComment.trim() || loading}>
            Post Comment
          </Button>
        </form>

        {/* Comments List */}
        <div className="space-y-3">
          {comments.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              No comments yet. Be the first to share your thoughts!
            </p>
          ) : (
            comments.map((comment) => (
              <div key={comment.id} className="border rounded-lg p-4 space-y-2">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium text-sm">{comment.commenter_name}</span>
                    {comment.commenter_family_group && (
                      <span className="text-xs text-muted-foreground">
                        ({comment.commenter_family_group})
                      </span>
                    )}
                    {getInterestBadge(comment.interest_level)}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">
                      {formatDate(comment.created_at)}
                    </span>
                    {canDeleteComment(comment.user_id) && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => deleteComment(comment.id)}
                        className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                </div>
                <p className="text-sm whitespace-pre-wrap">{comment.comment}</p>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
};