import React, { useState } from 'react';
import { useSharedNotes } from '@/hooks/useSharedNotes';
import { SharedNotesDialog } from '@/components/SharedNotesDialog';
import { NotesTimeline } from '@/components/NotesTimeline';
import { SearchInput } from '@/components/ui/search-input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { EmptyState } from '@/components/ui/empty-state';
import { Plus, StickyNote } from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';
import { useOrganization } from '@/hooks/useOrganization';
import type { SharedNote } from '@/hooks/useSharedNotes';

export default function SharedNotes() {
  const { notes: sharedNotes, loading, deleteNote, filterNotes } = useSharedNotes();
  const { organization } = useOrganization();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [filterPriority, setFilterPriority] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');

  const filteredNotes = filterNotes(
    filterCategory === 'all' ? undefined : filterCategory,
    undefined, // tags
    filterStatus === 'all' ? undefined : filterStatus,
    filterPriority === 'all' ? undefined : filterPriority
  ).filter(note => {
    const searchLower = searchTerm.toLowerCase();
    return (
      note.title.toLowerCase().includes(searchLower) ||
      note.content.toLowerCase().includes(searchLower) ||
      (note.tags && note.tags.some(tag => tag.toLowerCase().includes(searchLower)))
    );
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


  return (
    <div className="min-h-screen bg-cover bg-center bg-no-repeat" style={{backgroundImage: 'url(/lovable-uploads/45c3083f-46c5-4e30-a2f0-31a24ab454f4.png)'}}>
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <PageHeader 
          title="Shared Notes"
          subtitle="Organize and manage your organization's structured notes in chronological order"
          icon={StickyNote}
          backgroundImage={true}
        >
          <div className="flex justify-end">
            <SharedNotesDialog>
              <Button className="text-base">
                <Plus className="h-4 w-4 mr-2" />
                Add Note
              </Button>
            </SharedNotesDialog>
          </div>
        </PageHeader>


      {/* Search and Filters */}
      <div className="bg-muted/30 rounded-lg p-4 mb-6 space-y-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <SearchInput
              placeholder="Search notes, users, or content..."
              onSearch={setSearchTerm}
              className="text-base placeholder:text-base"
            />
          </div>
        </div>
        
        <div className="flex flex-wrap gap-4">
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
        </div>
      </div>

      {/* Notes Timeline */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <LoadingSpinner size="lg" />
        </div>
      ) : filteredNotes.length === 0 ? (
        <EmptyState
          icon={<StickyNote className="h-6 w-6" />}
          title="No notes found"
          description="Create your first shared note to get started organizing your information."
          action={{
            label: "Create Note",
            onClick: () => {
              // This will be handled by the SharedNotesDialog trigger
            }
          }}
        />
      ) : (
        <NotesTimeline
          notes={filteredNotes}
          onDelete={deleteNote}
          getPriorityColor={getPriorityColor}
          getStatusColor={getStatusColor}
          isAdmin={organization?.role === 'admin'}
          searchTerm={searchTerm}
        />
      )}
      </div>
    </div>
  );
}