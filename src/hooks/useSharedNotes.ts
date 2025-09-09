import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useRobustMultiOrganization } from '@/hooks/useRobustMultiOrganization';

export interface SharedNote {
  id: string;
  organization_id: string;
  title: string;
  content: string;
  category: string;
  tags: string[];
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'active' | 'archived' | 'draft';
  created_by_user_id: string | null;
  created_at: string;
  updated_at: string;
  updated_by_user_id: string | null;
}

export const useSharedNotes = () => {
  const [notes, setNotes] = useState<SharedNote[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const { activeOrganization } = useRobustMultiOrganization();

  const fetchNotes = async () => {
    if (!activeOrganization?.organization_id) return;

    try {
      setLoading(true);
  const { data, error } = await supabase
        .from('shared_notes')
        .select('*')
        .eq('organization_id', activeOrganization.organization_id)
        .order('updated_at', { ascending: false });

      if (error) throw error;
      setNotes((data || []) as SharedNote[]);
    } catch (error) {
      console.error('Error fetching notes:', error);
      toast({
        title: "Error",
        description: "Failed to load notes",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const createNote = async (noteData: Omit<SharedNote, 'id' | 'organization_id' | 'created_by_user_id' | 'created_at' | 'updated_at' | 'updated_by_user_id'>) => {
    if (!activeOrganization?.organization_id) return null;

    try {
      const { data, error } = await supabase
        .from('shared_notes')
        .insert({
          ...noteData,
          organization_id: activeOrganization.organization_id
        })
        .select()
        .single();

      if (error) throw error;

      setNotes(prev => [data as SharedNote, ...prev]);
      toast({
        title: "Success",
        description: "Note created successfully"
      });
      return data;
    } catch (error) {
      console.error('Error creating note:', error);
      toast({
        title: "Error",
        description: "Failed to create note",
        variant: "destructive"
      });
      return null;
    }
  };

  const updateNote = async (id: string, updates: Partial<SharedNote>) => {
    try {
      const { data, error } = await supabase
        .from('shared_notes')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      setNotes(prev => prev.map(note => note.id === id ? { ...note, ...data } as SharedNote : note));
      toast({
        title: "Success",
        description: "Note updated successfully"
      });
      return data;
    } catch (error) {
      console.error('Error updating note:', error);
      toast({
        title: "Error",
        description: "Failed to update note",
        variant: "destructive"
      });
      return null;
    }
  };

  const deleteNote = async (id: string) => {
    try {
      const { error } = await supabase
        .from('shared_notes')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setNotes(prev => prev.filter(note => note.id !== id));
      toast({
        title: "Success",
        description: "Note deleted successfully"
      });
      return true;
    } catch (error) {
      console.error('Error deleting note:', error);
      toast({
        title: "Error",
        description: "Failed to delete note",
        variant: "destructive"
      });
      return false;
    }
  };

  const filterNotes = (category?: string, tags?: string[], status?: string, priority?: string) => {
    return notes.filter(note => {
      if (category && note.category !== category) return false;
      if (status && note.status !== status) return false;
      if (priority && note.priority !== priority) return false;
      if (tags && tags.length > 0 && !tags.some(tag => note.tags.includes(tag))) return false;
      return true;
    });
  };

  useEffect(() => {
    fetchNotes();
  }, [activeOrganization?.organization_id]);

  return {
    notes,
    loading,
    createNote,
    updateNote,
    deleteNote,
    filterNotes,
    refetch: fetchNotes
  };
};