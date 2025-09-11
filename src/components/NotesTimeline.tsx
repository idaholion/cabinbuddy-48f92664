import React from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { SharedNotesDialog } from '@/components/SharedNotesDialog';
import { LegacyNoteEditDialog } from '@/components/LegacyNoteEditDialog';
import { Edit, Trash2, ArrowRight, ExternalLink, Clock, User } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import type { AggregatedNote } from '@/hooks/useAggregatedNotes';
import type { SharedNote } from '@/hooks/useSharedNotes';

interface NotesTimelineProps {
  notes: AggregatedNote[];
  onDelete?: (id: string) => void;
  onDeleteLegacy?: (note: AggregatedNote) => Promise<any>;
  onUpdateLegacy?: (note: AggregatedNote, content: string) => Promise<any>;
  onConvertToShared?: (note: AggregatedNote) => void;
  onNavigateToSource: (path: string) => void;
  getSourceColor: (source: string) => string;
  getSourceIcon: (source: string) => string;
  getPriorityColor: (priority: string) => string;
  getStatusColor: (status: string) => string;
  getNavigationPath: (note: AggregatedNote) => string;
  isAdmin?: boolean;
  searchTerm?: string;
}

export const NotesTimeline: React.FC<NotesTimelineProps> = ({
  notes,
  onDelete,
  onDeleteLegacy,
  onUpdateLegacy,
  onConvertToShared,
  onNavigateToSource,
  getSourceColor,
  getSourceIcon,
  getPriorityColor,
  getStatusColor,
  getNavigationPath,
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

  const formatContextInfo = (note: AggregatedNote) => {
    switch (note.source) {
      case 'payments':
        return `${note.family_group} • ${note.payment_type?.replace('_', ' ')} • $${note.amount?.toFixed(2)}`;
      case 'recurring_bills':
        return `${note.bill_name} • ${note.frequency} • ${note.provider_name || 'No provider'}`;
      case 'checkin_sessions':
        return `${note.family_group} • ${note.date} • ${note.session_type}`;
      case 'shared_notes':
        return note.category ? `Category: ${note.category}` : '';
      default:
        return '';
    }
  };

  const getUserDisplayName = (note: AggregatedNote) => {
    // For now, show user attribution based on available data
    // This will be enhanced when user profile data is added to the hook
    if (note.user_display_name) return note.user_display_name;
    if (note.user_email) return note.user_email;
    if (note.created_by_user_id) return `User ${note.created_by_user_id.slice(0, 8)}...`;
    return 'Unknown User';
  };

  return (
    <div className="space-y-6">
      <div className="relative">
        {/* Timeline line */}
        <div className="absolute left-8 top-0 bottom-0 w-px bg-border" />
        
        {notes.map((note, index) => {
          const isSharedNote = note.source === 'shared_notes';
          const timeAgo = formatDistanceToNow(new Date(note.updated_at), { addSuffix: true });
          
          return (
            <div key={note.id} className="relative flex gap-4 pb-6">
              {/* Timeline dot */}
              <div className="relative z-10 flex-shrink-0">
                <div className={`w-4 h-4 rounded-full border-2 border-background ${getSourceColor(note.source).split(' ')[0]} flex items-center justify-center`}>
                  <div className="w-2 h-2 rounded-full bg-current" />
                </div>
              </div>
              
              {/* Note content */}
              <div className="flex-1 min-w-0">
                <div className="bg-card rounded-lg border p-4 shadow-sm hover:shadow-md transition-shadow">
                  {/* Header */}
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge 
                        variant="outline" 
                        className={`text-xs ${getSourceColor(note.source)} border`}
                      >
                        {getSourceIcon(note.source)} {note.sourceLabel}
                      </Badge>
                      
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
                      {!isSharedNote && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 px-2 text-xs"
                          onClick={() => onNavigateToSource(getNavigationPath(note))}
                        >
                          <ExternalLink className="h-3 w-3 mr-1" />
                          Source
                        </Button>
                      )}
                      
                      {isSharedNote ? (
                        <>
                          <SharedNotesDialog note={isSharedNote ? {
                            id: note.sourceId,
                            title: note.title,
                            content: note.content,
                            category: note.category || 'general',
                            tags: note.tags || [],
                            priority: note.priority || 'medium',
                            status: note.status || 'active',
                            created_at: note.created_at,
                            updated_at: note.updated_at,
                            organization_id: '',
                            created_by_user_id: note.created_by_user_id,
                            updated_by_user_id: note.created_by_user_id
                          } : undefined}>
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
                                    onClick={() => onDelete(note.sourceId)}
                                    className="text-base bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                  >
                                    Delete
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          )}
                        </>
                      ) : (
                        isAdmin && (
                          <div className="flex gap-1">
                            {onUpdateLegacy && (
                              <LegacyNoteEditDialog note={note} onUpdate={onUpdateLegacy}>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-7 w-7 p-0 hover:bg-muted"
                                >
                                  <Edit className="h-3 w-3" />
                                </Button>
                              </LegacyNoteEditDialog>
                            )}
                            
                            {onDeleteLegacy && (
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
                                      Are you sure you want to delete this note? This action cannot be undone.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel className="text-base">Cancel</AlertDialogCancel>
                                    <AlertDialogAction 
                                      onClick={() => onDeleteLegacy(note)}
                                      className="text-base bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                    >
                                      Delete
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            )}
                            
                            {onConvertToShared && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 px-2 text-xs"
                                onClick={() => onConvertToShared(note)}
                              >
                                <ArrowRight className="h-3 w-3 mr-1" />
                                Convert
                              </Button>
                            )}
                          </div>
                        )
                      )}
                    </div>
                  </div>
                  
                  {/* Title */}
                  <h3 className="font-semibold text-lg mb-2">
                    {highlightText(note.title, searchTerm)}
                  </h3>
                  
                  {/* Context info */}
                  {formatContextInfo(note) && (
                    <p className="text-sm text-muted-foreground mb-2">
                      {formatContextInfo(note)}
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