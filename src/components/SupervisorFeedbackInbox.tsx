import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { MessageSquare, CheckCircle, Eye, Clock } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

interface FeedbackItem {
  id: string;
  organization_id: string | null;
  user_id: string | null;
  type: string;
  title: string;
  description: string;
  email: string | null;
  page: string | null;
  status: string;
  supervisor_notes: string | null;
  created_at: string;
  updated_at: string;
}

const statusColors: Record<string, string> = {
  new: 'destructive',
  reviewed: 'secondary',
  resolved: 'default',
};

const typeLabels: Record<string, string> = {
  bug: 'Bug Report',
  feature: 'Feature Request',
  improvement: 'Improvement',
  general: 'General',
  supervisor_request: 'Supervisor Request',
};

export const SupervisorFeedbackInbox = () => {
  const [feedback, setFeedback] = useState<FeedbackItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [notesInput, setNotesInput] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const fetchFeedback = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('feedback' as any)
        .select('*')
        .order('created_at', { ascending: false });

      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      }

      const { data, error } = await query;
      if (error) throw error;
      setFeedback((data as any[]) || []);
    } catch (error) {
      console.error('Failed to fetch feedback:', error);
      toast.error('Failed to load feedback');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFeedback();
  }, [statusFilter]);

  const updateFeedbackStatus = async (id: string, status: string, notes?: string) => {
    try {
      const updateData: any = { status };
      if (notes !== undefined) {
        updateData.supervisor_notes = notes;
      }

      const { error } = await supabase
        .from('feedback' as any)
        .update(updateData)
        .eq('id', id);

      if (error) throw error;
      toast.success(`Feedback marked as ${status}`);
      fetchFeedback();
      setExpandedId(null);
      setNotesInput('');
    } catch (error) {
      console.error('Failed to update feedback:', error);
      toast.error('Failed to update feedback');
    }
  };

  const newCount = feedback.filter(f => f.status === 'new').length;

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <p className="text-muted-foreground">Loading feedback...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Feedback Inbox
            {newCount > 0 && (
              <Badge variant="destructive">{newCount} new</Badge>
            )}
          </CardTitle>
          <CardDescription className="text-base">
            View and manage feedback submissions from users across all organizations.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-2">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px] text-base">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="new">New</SelectItem>
                <SelectItem value="reviewed">Reviewed</SelectItem>
                <SelectItem value="resolved">Resolved</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {feedback.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="text-base">No feedback submissions yet</p>
            </div>
          ) : (
            <div className="space-y-3">
              {feedback.map((item) => (
                <Card key={item.id} className="border">
                  <CardContent className="p-4 space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="font-semibold text-base">{item.title}</h4>
                          <Badge variant={statusColors[item.status] as any || 'outline'} className="text-xs">
                            {item.status}
                          </Badge>
                          <Badge variant="outline" className="text-xs">
                            {typeLabels[item.type] || item.type}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">{item.description}</p>
                        <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground flex-wrap">
                          <span>{format(new Date(item.created_at), 'MMM d, yyyy h:mm a')}</span>
                          {item.email && <span>Email: {item.email}</span>}
                          {item.page && <span>Page: {item.page}</span>}
                        </div>
                        {item.supervisor_notes && (
                          <div className="mt-2 p-2 bg-muted rounded text-sm">
                            <span className="font-medium">Notes: </span>{item.supervisor_notes}
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        {item.status === 'new' && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => updateFeedbackStatus(item.id, 'reviewed')}
                            title="Mark as reviewed"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        )}
                        {item.status !== 'resolved' && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setExpandedId(expandedId === item.id ? null : item.id);
                              setNotesInput(item.supervisor_notes || '');
                            }}
                            title="Add notes / resolve"
                          >
                            <CheckCircle className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </div>

                    {expandedId === item.id && (
                      <div className="pt-2 border-t space-y-2">
                        <Textarea
                          placeholder="Add supervisor notes..."
                          value={notesInput}
                          onChange={(e) => setNotesInput(e.target.value)}
                          rows={2}
                          className="text-base"
                        />
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            onClick={() => updateFeedbackStatus(item.id, 'resolved', notesInput)}
                          >
                            Resolve
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => updateFeedbackStatus(item.id, 'reviewed', notesInput)}
                          >
                            Save Notes
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => { setExpandedId(null); setNotesInput(''); }}
                          >
                            Cancel
                          </Button>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
