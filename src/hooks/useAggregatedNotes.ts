import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useRobustMultiOrganization } from '@/hooks/useRobustMultiOrganization';

export interface AggregatedNote {
  id: string;
  title: string;
  content: string;
  source: 'shared_notes' | 'payments' | 'recurring_bills' | 'checkin_sessions';
  sourceId: string;
  sourceLabel: string;
  category?: string;
  tags?: string[];
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  status?: 'active' | 'archived' | 'draft';
  created_at: string;
  updated_at: string;
  created_by_user_id?: string | null;
  // User attribution fields
  user_display_name?: string;
  user_email?: string;
  user_first_name?: string;
  user_last_name?: string;
  // Context-specific fields
  family_group?: string;
  amount?: number;
  date?: string;
  session_type?: string;
  payment_type?: string;
  bill_name?: string;
  provider_name?: string;
  frequency?: string;
}

export const useAggregatedNotes = () => {
  const [notes, setNotes] = useState<AggregatedNote[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const { activeOrganization } = useRobustMultiOrganization();

  const fetchAllNotes = async () => {
    if (!activeOrganization?.organization_id) return;

    try {
      setLoading(true);
      const orgId = activeOrganization.organization_id;

      // Fetch shared notes
      const { data: sharedNotes, error: sharedError } = await supabase
        .from('shared_notes')
        .select('*')
        .eq('organization_id', orgId);

      if (sharedError) throw sharedError;

      // Fetch payment notes
      const { data: payments, error: paymentsError } = await supabase
        .from('payments')
        .select('id, family_group, payment_type, amount, notes, created_at, updated_at, created_by_user_id, updated_by_user_id')
        .eq('organization_id', orgId)
        .not('notes', 'is', null)
        .neq('notes', '');

      if (paymentsError) throw paymentsError;

      // Fetch recurring bill notes
      const { data: recurringBills, error: billsError } = await supabase
        .from('recurring_bills')
        .select('id, name, provider_name, frequency, amount, notes, created_at, updated_at')
        .eq('organization_id', orgId)
        .not('notes', 'is', null)
        .neq('notes', '');

      if (billsError) throw billsError;

      // Fetch checkin session notes
      const { data: checkinSessions, error: checkinError } = await supabase
        .from('checkin_sessions')
        .select('id, family_group, session_type, check_date, notes, created_at, updated_at, user_id')
        .eq('organization_id', orgId)
        .not('notes', 'is', null)
        .neq('notes', '');

      if (checkinError) throw checkinError;

      // Transform and combine all notes
      const aggregatedNotes: AggregatedNote[] = [
        // Shared notes (already structured)
        ...(sharedNotes || []).map(note => ({
          id: `shared_${note.id}`,
          title: note.title,
          content: note.content,
          source: 'shared_notes' as const,
          sourceId: note.id,
          sourceLabel: 'Shared Note',
          category: note.category,
          tags: note.tags || [],
          priority: note.priority as 'low' | 'medium' | 'high' | 'urgent',
          status: note.status as 'active' | 'archived' | 'draft',
          created_at: note.created_at,
          updated_at: note.updated_at,
          created_by_user_id: note.created_by_user_id,
        })),

        // Payment notes
        ...(payments || []).map(payment => ({
          id: `payment_${payment.id}`,
          title: `Payment Note - ${payment.family_group}`,
          content: payment.notes || '',
          source: 'payments' as const,
          sourceId: payment.id,
          sourceLabel: 'Payment Record',
          category: 'financial',
          family_group: payment.family_group,
          amount: payment.amount,
          payment_type: payment.payment_type,
          created_at: payment.created_at,
          updated_at: payment.updated_at,
          created_by_user_id: payment.created_by_user_id,
        })),

        // Recurring bill notes
        ...(recurringBills || []).map(bill => ({
          id: `bill_${bill.id}`,
          title: `Bill Note - ${bill.name}`,
          content: bill.notes || '',
          source: 'recurring_bills' as const,
          sourceId: bill.id,
          sourceLabel: 'Recurring Bill',
          category: 'financial',
          bill_name: bill.name,
          provider_name: bill.provider_name || undefined,
          frequency: bill.frequency,
          amount: bill.amount || undefined,
          created_at: bill.created_at,
          updated_at: bill.updated_at,
        })),

        // Check-in session notes
        ...(checkinSessions || []).map(session => ({
          id: `checkin_${session.id}`,
          title: `${session.session_type === 'checkin' ? 'Check-in' : 'Check-out'} Note - ${session.family_group}`,
          content: session.notes || '',
          source: 'checkin_sessions' as const,
          sourceId: session.id,
          sourceLabel: session.session_type === 'checkin' ? 'Check-in Session' : 'Check-out Session',
          category: session.session_type === 'checkin' ? 'checkin' : 'checkout',
          family_group: session.family_group || undefined,
          session_type: session.session_type,
          date: session.check_date,
          created_at: session.created_at,
          updated_at: session.updated_at,
          created_by_user_id: session.user_id,
        }))
      ];

      // Sort by most recent first
      aggregatedNotes.sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());

      setNotes(aggregatedNotes);
    } catch (error) {
      console.error('Error fetching aggregated notes:', error);
      toast({
        title: "Error",
        description: "Failed to load notes",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const filterNotes = (
    source?: string,
    category?: string,
    tags?: string[],
    status?: string,
    priority?: string,
    familyGroup?: string
  ) => {
    return notes.filter(note => {
      if (source && source !== 'all' && note.source !== source) return false;
      if (category && category !== 'all' && note.category !== category) return false;
      if (status && status !== 'all' && note.status !== status) return false;
      if (priority && priority !== 'all' && note.priority !== priority) return false;
      if (familyGroup && familyGroup !== 'all' && note.family_group !== familyGroup) return false;
      if (tags && tags.length > 0 && note.tags && !tags.some(tag => note.tags!.includes(tag))) return false;
      return true;
    });
  };

  const getSourceIcon = (source: string) => {
    switch (source) {
      case 'shared_notes': return '📝';
      case 'payments': return '💰';
      case 'recurring_bills': return '🧾';
      case 'checkin_sessions': return '🏠';
      default: return '📄';
    }
  };

  const getSourceColor = (source: string) => {
    switch (source) {
      case 'shared_notes': return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'payments': return 'bg-green-100 text-green-700 border-green-200';
      case 'recurring_bills': return 'bg-purple-100 text-purple-700 border-purple-200';
      case 'checkin_sessions': return 'bg-orange-100 text-orange-700 border-orange-200';
      default: return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  const convertToSharedNote = async (note: AggregatedNote) => {
    if (!activeOrganization?.organization_id || note.source === 'shared_notes') return null;

    try {
      const { data, error } = await supabase
        .from('shared_notes')
        .insert({
          organization_id: activeOrganization.organization_id,
          title: note.title,
          content: note.content,
          category: note.category || 'general',
          tags: note.tags || [],
          priority: 'medium',
          status: 'active'
        })
        .select()
        .single();

      if (error) throw error;

      toast({
        title: "Success",
        description: "Note converted to shared note successfully"
      });

      // Refresh notes
      fetchAllNotes();
      return data;
    } catch (error) {
      console.error('Error converting note:', error);
      toast({
        title: "Error",
        description: "Failed to convert note to shared note",
        variant: "destructive"
      });
      return null;
    }
  };

  const updateLegacyNote = async (note: AggregatedNote, newContent: string) => {
    if (!activeOrganization?.organization_id || note.source === 'shared_notes') return null;

    try {
      let error;
      
      switch (note.source) {
        case 'payments':
          ({ error } = await supabase
            .from('payments')
            .update({ notes: newContent })
            .eq('id', note.sourceId)
            .eq('organization_id', activeOrganization.organization_id));
          break;
          
        case 'recurring_bills':
          ({ error } = await supabase
            .from('recurring_bills')
            .update({ notes: newContent })
            .eq('id', note.sourceId)
            .eq('organization_id', activeOrganization.organization_id));
          break;
          
        case 'checkin_sessions':
          ({ error } = await supabase
            .from('checkin_sessions')
            .update({ notes: newContent })
            .eq('id', note.sourceId)
            .eq('organization_id', activeOrganization.organization_id));
          break;
          
        default:
          throw new Error('Unsupported note source');
      }

      if (error) throw error;

      toast({
        title: "Success",
        description: "Note updated successfully"
      });

      // Refresh notes
      fetchAllNotes();
      return true;
    } catch (error) {
      console.error('Error updating legacy note:', error);
      toast({
        title: "Error",
        description: "Failed to update note",
        variant: "destructive"
      });
      return null;
    }
  };

  const deleteLegacyNote = async (note: AggregatedNote) => {
    if (!activeOrganization?.organization_id || note.source === 'shared_notes') return null;

    try {
      let error;
      
      switch (note.source) {
        case 'payments':
          ({ error } = await supabase
            .from('payments')
            .update({ notes: null })
            .eq('id', note.sourceId)
            .eq('organization_id', activeOrganization.organization_id));
          break;
          
        case 'recurring_bills':
          ({ error } = await supabase
            .from('recurring_bills')
            .update({ notes: null })
            .eq('id', note.sourceId)
            .eq('organization_id', activeOrganization.organization_id));
          break;
          
        case 'checkin_sessions':
          ({ error } = await supabase
            .from('checkin_sessions')
            .update({ notes: null })
            .eq('id', note.sourceId)
            .eq('organization_id', activeOrganization.organization_id));
          break;
          
        default:
          throw new Error('Unsupported note source');
      }

      if (error) throw error;

      toast({
        title: "Success",
        description: "Note deleted successfully"
      });

      // Refresh notes
      fetchAllNotes();
      return true;
    } catch (error) {
      console.error('Error deleting legacy note:', error);
      toast({
        title: "Error",
        description: "Failed to delete note",
        variant: "destructive"
      });
      return null;
    }
  };

  const getNavigationPath = (note: AggregatedNote) => {
    switch (note.source) {
      case 'payments':
        return '/financial-dashboard';
      case 'recurring_bills':
        return '/financial-dashboard';
      case 'checkin_sessions':
        return note.session_type === 'checkin' ? '/checkin' : '/checkout-list';
      case 'shared_notes':
        return '/shared-notes';
      default:
        return '/';
    }
  };

  useEffect(() => {
    fetchAllNotes();
  }, [activeOrganization?.organization_id]);

  return {
    notes,
    loading,
    filterNotes,
    getSourceIcon,
    getSourceColor,
    convertToSharedNote,
    updateLegacyNote,
    deleteLegacyNote,
    getNavigationPath,
    refetch: fetchAllNotes
  };
};