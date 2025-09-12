import React from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { SharedNotesDialog } from '@/components/SharedNotesDialog';
import { Edit, Trash2, Clock, User } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import type { SharedNote } from '@/hooks/useSharedNotes';

interface NotesTimelineProps {
  notes: SharedNote[];
  onDelete?: (id: string) => void;
  getPriorityColor: (priority: string) => string;
  getStatusColor: (status: string) => string;
  isAdmin?: boolean;
  searchTerm?: string;
}

export const NotesTimeline: React.FC<NotesTimelineProps> = ({
  notes,
  onDelete,
  getPriorityColor,
  getStatusColor,
  isAdmin = false,
  searchTerm = ''
}) => {
  const highlightText = (text: string, searchTerm: string) => {
    if (!searchTerm.trim()) return text;
    
    const regex = new RegExp(`(${searchTerm})`, 'gi');
    const parts = text.split(regex);
    
    return parts.map((part, index) => 
      regex.test(part) ? (
        <mark key={index} className="bg-yellow-200 px-1 rounded">
          {part}
        </mark>
      ) : part
    );
  };

  const getUserDisplayName = (note: SharedNote) => {
    if (note.created_by_user_id) return `User ${note.created_by_user_id.slice(0, 8)}...`;
    return 'Unknown User';
  };

  return (
    <div className="space-y-6">
      <div className="relative">
        {/* Timeline line */}
        <div className="absolute left-8 top-0 bottom-0 w-px bg-border" />
        
        {notes.map((note, index) => {
          const timeAgo = formatDistanceToNow(new Date(note.updated_at), { addSuffix: true });
          
          return (
            <div key={note.id} className="relative flex gap-4 pb-6">
              {/* Timeline dot */}
              <div className="relative z-10 flex-shrink-0">
                <div className="w-4 h-4 rounded-full border-2 border-background bg-primary flex items-center justify-center">
                  <div className="w-2 h-2 rounded-full bg-current" />
                </div>
              </div>
              
              {/* Note content */}
              <div className="flex-1 min-w-0">
                <div className="bg-card rounded-lg border p-4 shadow-sm hover:shadow-md transition-shadow">
                  {/* Header */}
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex items-center gap-2 flex-wrap">
                      {note.priority && note.priority !== 'medium' && (
                        <Badge 
                          variant="outline"
                          className={`text-xs ${getPriorityColor(note.priority)}`}
                        >
                          {note.priority}
                        </Badge>
                      )}
                      
                      {note.status && note.status !== 'active' && (
                        <Badge 
                          variant="outline"
                          className={`text-xs ${getStatusColor(note.status)}`}
                        >
                          {note.status}
                        </Badge>
                      )}
                    </div>
                    
                    <div className="flex items-center gap-1 shrink-0">
                      <SharedNotesDialog note={note}>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0 hover:bg-muted"
                        >
                          <Edit className="h-3 w-3" />
                        </Button>
                      </SharedNotesDialog>
                      
                      {onDelete && isAdmin && (
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 w-7 p-0 hover:bg-destructive/10 hover:text-destructive"
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete Note</AlertDialogTitle>
                              <AlertDialogDescription className="text-base">
                                Are you sure you want to delete "{note.title}"? This action cannot be undone.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel className="text-base">Cancel</AlertDialogCancel>
                              <AlertDialogAction 
                                onClick={() => onDelete(note.id)}
                                className="text-base bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              >
                                Delete
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      )}
                    </div>
                  </div>
                  
                  {/* Title */}
                  <h3 className="font-semibold text-lg mb-2">
                    {highlightText(note.title, searchTerm)}
                  </h3>
                  
                  {/* Category */}
                  {note.category && (
                    <p className="text-sm text-muted-foreground mb-2">
                      Category: {note.category}
                    </p>
                  )}
                  
                  {/* Content */}
                  <div className="prose prose-sm max-w-none mb-3">
                    <p className="text-foreground whitespace-pre-wrap">
                      {highlightText(note.content, searchTerm)}
                    </p>
                  </div>
                  
                  {/* Tags */}
                  {note.tags && note.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-3">
                      {note.tags.map((tag, tagIndex) => (
                        <Badge key={tagIndex} variant="secondary" className="text-xs">
                          {highlightText(tag, searchTerm)}
                        </Badge>
                      ))}
                    </div>
                  )}
                  
                  {/* Footer */}
                  <div className="flex items-center gap-4 text-sm text-muted-foreground pt-2 border-t">
                    <div className="flex items-center gap-1">
                      <User className="h-3 w-3" />
                      <span>{highlightText(getUserDisplayName(note), searchTerm)}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      <span>{timeAgo}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};