import React, { useState } from 'react';
import { useSharedNotes } from '@/hooks/useSharedNotes';
import { useAggregatedNotes, type AggregatedNote } from '@/hooks/useAggregatedNotes';
import { SharedNotesDialog } from '@/components/SharedNotesDialog';
import { LegacyNoteEditDialog } from '@/components/LegacyNoteEditDialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { EmptyState } from '@/components/ui/empty-state';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Search, Edit, Trash2, StickyNote, Tag, Calendar, ArrowUpDown, ExternalLink, ArrowRight, FileText } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import { useOrganization } from '@/hooks/useOrganization';
import type { SharedNote } from '@/hooks/useSharedNotes';

export default function SharedNotes() {
  const { notes: sharedNotes, loading: sharedLoading, deleteNote } = useSharedNotes();
  const { 
    notes: aggregatedNotes, 
    loading: aggregatedLoading, 
    filterNotes, 
    getSourceIcon, 
    getSourceColor, 
    convertToSharedNote, 
    updateLegacyNote,
    deleteLegacyNote,
    getNavigationPath 
  } = useAggregatedNotes();
  const { organization } = useOrganization();
  
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [filterPriority, setFilterPriority] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterSource, setFilterSource] = useState<string>('all');
  const [filterFamilyGroup, setFilterFamilyGroup] = useState<string>('all');

  const loading = sharedLoading || aggregatedLoading;

  // Get current notes based on active tab
  const currentNotes = activeTab === 'shared' ? 
    sharedNotes.map(note => ({
      ...note,
      source: 'shared_notes' as const,
      sourceId: note.id,
      sourceLabel: 'Shared Note',
      id: `shared_${note.id}`
    } as AggregatedNote)) : 
    aggregatedNotes;

  const filteredNotes = filterNotes(
    filterSource === 'all' ? undefined : filterSource,
    filterCategory === 'all' ? undefined : filterCategory,
    undefined,
    filterStatus === 'all' ? undefined : filterStatus,
    filterPriority === 'all' ? undefined : filterPriority,
    filterFamilyGroup === 'all' ? undefined : filterFamilyGroup
  ).filter(note => 
    note.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    note.content.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (note.tags && note.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase())))
  ).filter(note => {
    if (activeTab === 'shared') return note.source === 'shared_notes';
    if (activeTab === 'all') return true;
    return note.source !== 'shared_notes';
  });

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'bg-red-100 text-red-700 border-red-200';
      case 'high': return 'bg-orange-100 text-orange-700 border-orange-200';
      case 'medium': return 'bg-yellow-100 text-yellow-700 border-yellow-200';
      case 'low': return 'bg-green-100 text-green-700 border-green-200';
      default: return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-700 border-green-200';
      case 'draft': return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'archived': return 'bg-gray-100 text-gray-700 border-gray-200';
      default: return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  // Get unique family groups for filtering
  const familyGroups = [...new Set(aggregatedNotes
    .map(note => note.family_group)
    .filter(Boolean)
  )].sort();

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            {activeTab === 'all' ? 'All Notes' : activeTab === 'shared' ? 'Shared Notes' : 'Legacy Notes'}
          </h1>
          <p className="text-muted-foreground text-base">
            {activeTab === 'all' 
              ? 'View all notes from across your organization'
              : activeTab === 'shared' 
                ? 'Organize and manage your organization\'s structured notes'
                : 'Notes from payments, bills, and check-in sessions'
            }
          </p>
        </div>
        <SharedNotesDialog>
          <Button className="text-base">
            <Plus className="h-4 w-4 mr-2" />
            Add Note
          </Button>
        </SharedNotesDialog>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="all" className="text-base">All Notes ({aggregatedNotes.length})</TabsTrigger>
          <TabsTrigger value="shared" className="text-base">Shared Notes ({sharedNotes.length})</TabsTrigger>
          <TabsTrigger value="legacy" className="text-base">Legacy Notes ({aggregatedNotes.filter(n => n.source !== 'shared_notes').length})</TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Search and Filters */}
      <div className="bg-muted/30 rounded-lg p-4 mb-6 space-y-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              placeholder="Search notes..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 text-base placeholder:text-base"
            />
          </div>
        </div>
        
        <div className="flex flex-wrap gap-4">
          {activeTab === 'all' && (
            <div className="min-w-[140px]">
              <Select value={filterSource} onValueChange={setFilterSource}>
                <SelectTrigger className="text-base">
                  <SelectValue placeholder="Source" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Sources</SelectItem>
                  <SelectItem value="shared_notes">📝 Shared Notes</SelectItem>
                  <SelectItem value="payments">💰 Payment Records</SelectItem>
                  <SelectItem value="recurring_bills">🧾 Recurring Bills</SelectItem>
                  <SelectItem value="checkin_sessions">🏠 Check-in Sessions</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
          
          <div className="min-w-[120px]">
            <Select value={filterCategory} onValueChange={setFilterCategory}>
              <SelectTrigger className="text-base">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                <SelectItem value="general">General</SelectItem>
                <SelectItem value="maintenance">Maintenance</SelectItem>
                <SelectItem value="cleaning">Cleaning</SelectItem>
                <SelectItem value="financial">Financial</SelectItem>
                <SelectItem value="rules">Rules</SelectItem>
                <SelectItem value="seasonal">Seasonal</SelectItem>
                <SelectItem value="emergency">Emergency</SelectItem>
                <SelectItem value="checkin">Check-in</SelectItem>
                <SelectItem value="checkout">Check-out</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          {familyGroups.length > 0 && (
            <div className="min-w-[140px]">
              <Select value={filterFamilyGroup} onValueChange={setFilterFamilyGroup}>
                <SelectTrigger className="text-base">
                  <SelectValue placeholder="Family Group" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Family Groups</SelectItem>
                  {familyGroups.map(group => (
                    <SelectItem key={group} value={group}>{group}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          
          {activeTab !== 'legacy' && (
            <>
              <div className="min-w-[120px]">
                <Select value={filterPriority} onValueChange={setFilterPriority}>
                  <SelectTrigger className="text-base">
                    <SelectValue placeholder="Priority" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Priorities</SelectItem>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="urgent">Urgent</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="min-w-[120px]">
                <Select value={filterStatus} onValueChange={setFilterStatus}>
                  <SelectTrigger className="text-base">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="archived">Archived</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Notes Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <LoadingSpinner size="lg" />
        </div>
      ) : filteredNotes.length === 0 ? (
        <EmptyState
          icon={<StickyNote className="h-6 w-6" />}
          title="No notes found"
          description={
            activeTab === 'shared' 
              ? "Create your first shared note to get started organizing your information."
              : activeTab === 'all'
                ? "No notes have been created yet across your organization."
                : "No legacy notes found from payments, bills, or check-in sessions."
          }
          action={activeTab === 'shared' ? {
            label: "Create Note",
            onClick: () => {
              // This will be handled by the SharedNotesDialog trigger
            }
          } : undefined}
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredNotes.map((note) => (
            <AggregatedNoteCard
              key={note.id}
              note={note}
              onDelete={note.source === 'shared_notes' ? deleteNote : undefined}
              onDeleteLegacy={note.source !== 'shared_notes' ? deleteLegacyNote : undefined}
              onUpdateLegacy={note.source !== 'shared_notes' ? updateLegacyNote : undefined}
              onConvertToShared={note.source !== 'shared_notes' ? convertToSharedNote : undefined}
              onNavigateToSource={(path) => navigate(path)}
              getSourceColor={getSourceColor}
              getSourceIcon={getSourceIcon}
              getPriorityColor={getPriorityColor}
              getStatusColor={getStatusColor}
              getNavigationPath={getNavigationPath}
              isAdmin={organization?.role === 'admin'}
            />
          ))}
        </div>
      )}
    </div>
  );
}

interface AggregatedNoteCardProps {
  note: AggregatedNote;
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
}

const AggregatedNoteCard: React.FC<AggregatedNoteCardProps> = ({ 
  note, 
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
  isAdmin = false
}) => {
  const isSharedNote = note.source === 'shared_notes';

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

  return (
    <Card className="h-full flex flex-col hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-start gap-2 mb-2">
          <Badge 
            variant="outline" 
            className={`text-xs ${getSourceColor(note.source)} border text-nowrap`}
          >
            {getSourceIcon(note.source)} {note.sourceLabel}
          </Badge>
          {!isSharedNote && (
            <Button
              variant="ghost"
              size="sm"
              className="h-6 px-2 text-xs ml-auto"
              onClick={() => onNavigateToSource(getNavigationPath(note))}
            >
              <ExternalLink className="h-3 w-3 mr-1" />
              View Source
            </Button>
          )}
        </div>
        
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="text-lg font-semibold line-clamp-2 flex-1">
            {note.title}
          </CardTitle>
          <div className="flex gap-1 shrink-0">
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
                    className="h-8 w-8 p-0 hover:bg-muted"
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                </SharedNotesDialog>
                
                {onDelete && (
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0 hover:bg-destructive/10 hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
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
              <>
                {/* Admin controls for legacy notes */}
                {isAdmin && onUpdateLegacy && (
                  <LegacyNoteEditDialog note={note} onUpdate={onUpdateLegacy}>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0 hover:bg-muted"
                      title="Edit note"
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                  </LegacyNoteEditDialog>
                )}
                
                {isAdmin && onDeleteLegacy && (
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0 hover:bg-destructive/10 hover:text-destructive"
                        title="Delete note"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete Note</AlertDialogTitle>
                        <AlertDialogDescription className="text-base">
                          Are you sure you want to delete this note? This will remove the note from the original record and cannot be undone.
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
                    className="h-8 px-2 text-xs"
                    onClick={() => onConvertToShared(note)}
                    title="Convert to shared note"
                  >
                    <ArrowRight className="h-3 w-3 mr-1" />
                    Convert
                  </Button>
                )}
              </>
            )}
          </div>
        </div>
        
        <div className="flex flex-wrap gap-2 mt-2">
          {note.status && (
            <Badge variant="outline" className={`text-xs ${getStatusColor(note.status)} border`}>
              {note.status}
            </Badge>
          )}
          {note.priority && (
            <Badge variant="outline" className={`text-xs ${getPriorityColor(note.priority)} border`}>
              {note.priority}
            </Badge>
          )}
          {note.category && (
            <Badge variant="outline" className="text-xs">
              {note.category}
            </Badge>
          )}
          {note.family_group && (
            <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700">
              {note.family_group}
            </Badge>
          )}
        </div>
        
        {formatContextInfo(note) && (
          <p className="text-sm text-muted-foreground mt-2 font-medium">
            {formatContextInfo(note)}
          </p>
        )}
      </CardHeader>
      
      <CardContent className="flex-1 flex flex-col">
        <p className="text-muted-foreground text-base mb-4 line-clamp-3 flex-1">
          {note.content}
        </p>
        
        {note.tags && note.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-4">
            {note.tags.slice(0, 3).map((tag, index) => (
              <Badge key={index} variant="secondary" className="text-xs">
                <Tag className="h-3 w-3 mr-1" />
                {tag}
              </Badge>
            ))}
            {note.tags.length > 3 && (
              <Badge variant="secondary" className="text-xs">
                +{note.tags.length - 3} more
              </Badge>
            )}
          </div>
        )}
        
        <div className="flex items-center gap-2 text-sm text-muted-foreground mt-auto">
          <Calendar className="h-4 w-4" />
          <span className="text-base">
            Updated {formatDistanceToNow(new Date(note.updated_at))} ago
          </span>
        </div>
      </CardContent>
    </Card>
  );
};