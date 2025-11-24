import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import type { Database } from '@/integrations/supabase/types';
import { secureSelect, secureInsert, secureUpdate, secureDelete, assertOrganizationOwnership, createOrganizationContext } from '@/lib/secure-queries';
import { useOrganizationContext } from './useOrganizationContext';

// Database types
type DbCustomChecklist = Database['public']['Tables']['custom_checklists']['Row'];
type DbCheckinSession = Database['public']['Tables']['checkin_sessions']['Row'];
type DbSurveyResponse = Database['public']['Tables']['survey_responses']['Row'];

export interface CustomChecklist {
  id: string;
  organization_id: string;
  checklist_type: string;
  items: any[];
  images?: any[];
  introductory_text?: string;
}

export interface CheckinSession {
  id: string;
  organization_id: string;
  user_id?: string;
  session_type: string;
  check_date: string;
  family_group?: string;
  guest_names?: string[];
  checklist_responses: Record<string, any>;
  notes?: string;
  completed_at?: string;
}

export interface SurveyResponse {
  id: string;
  organization_id: string;
  user_id?: string;
  family_group?: string;
  responses: Record<string, any>;
  created_at?: string;
}

// Type conversion helpers
const mapDbChecklistToCustomChecklist = (dbChecklist: DbCustomChecklist): CustomChecklist => ({
  id: dbChecklist.id,
  organization_id: dbChecklist.organization_id,
  checklist_type: dbChecklist.checklist_type,
  items: Array.isArray(dbChecklist.items) ? dbChecklist.items : [],
  images: Array.isArray(dbChecklist.images) ? dbChecklist.images : [],
  introductory_text: (dbChecklist as any).introductory_text || undefined
});

const mapDbSessionToCheckinSession = (dbSession: DbCheckinSession): CheckinSession => ({
  id: dbSession.id,
  organization_id: dbSession.organization_id,
  user_id: dbSession.user_id || undefined,
  session_type: dbSession.session_type,
  check_date: dbSession.check_date,
  family_group: dbSession.family_group || undefined,
  guest_names: dbSession.guest_names || undefined,
  checklist_responses: typeof dbSession.checklist_responses === 'object' ? dbSession.checklist_responses as Record<string, any> : {},
  notes: dbSession.notes || undefined,
  completed_at: dbSession.completed_at || undefined
});

const mapDbResponseToSurveyResponse = (dbResponse: DbSurveyResponse): SurveyResponse => ({
  id: dbResponse.id,
  organization_id: dbResponse.organization_id,
  user_id: dbResponse.user_id || undefined,
  family_group: dbResponse.family_group || undefined,
  responses: typeof dbResponse.responses === 'object' ? dbResponse.responses as Record<string, any> : {},
  created_at: dbResponse.created_at
});

// Custom hook for checklists
export const useCustomChecklists = () => {
  const [checklists, setChecklists] = useState<CustomChecklist[]>([]);
  const [loading, setLoading] = useState(true);
  const { activeOrganization } = useOrganizationContext();

  // Create organization context for secure queries
  const orgContext = activeOrganization ? createOrganizationContext(
    activeOrganization.organization_id,
    activeOrganization.is_test_organization
  ) : null;

  useEffect(() => {
    if (orgContext) {
      fetchChecklists();
    }
  }, [activeOrganization?.organization_id]);

  const fetchChecklists = async () => {
    if (!orgContext) return;

    try {
      const { data, error } = await secureSelect('custom_checklists', orgContext)
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Validate data ownership
      if (data) {
        assertOrganizationOwnership(data, orgContext);
      }
      
      const checklistsArray = (data || []).map(dbChecklist => 
        mapDbChecklistToCustomChecklist(dbChecklist)
      );
      
      setChecklists(checklistsArray);
    } catch (error) {
      console.error('Error fetching checklists:', error);
    } finally {
      setLoading(false);
    }
  };

  const saveChecklist = async (type: string, items: any[], images?: any[]) => {
    if (!orgContext) return;

    try {
      const existingChecklist = checklists.find(c => c.checklist_type === type);

      if (existingChecklist) {
        // Update existing
        const updateData: any = { items };
        if (images !== undefined) {
          updateData.images = images;
        }
        
        const { data, error } = await secureUpdate('custom_checklists', updateData, orgContext)
          .eq('id', existingChecklist.id)
          .select()
          .single();

        if (error) throw error;
        if (data) {
          const mappedChecklist = mapDbChecklistToCustomChecklist(data);
          setChecklists(prev => prev.map(c => c.id === existingChecklist.id ? mappedChecklist : c));
        }
      } else {
        // Create new
        const insertData: any = {
          checklist_type: type,
          items
        };
        if (images !== undefined) {
          insertData.images = images;
        }
        
        const { data, error } = await secureInsert('custom_checklists', insertData, orgContext)
          .select()
          .single();

        if (error) throw error;
        if (data) {
          const mappedChecklist = mapDbChecklistToCustomChecklist(data);
          setChecklists(prev => [mappedChecklist, ...prev]);
        }
      }

      toast({ title: `${type} checklist saved successfully!` });
    } catch (error) {
      console.error('Error saving checklist:', error);
      toast({ title: "Error saving checklist", variant: "destructive" });
    }
  };

  const deleteChecklist = async (id: string) => {
    if (!orgContext) return;

    try {
      const { error } = await secureDelete('custom_checklists', orgContext)
        .eq('id', id);

      if (error) throw error;
      
      // Remove from local state
      setChecklists(prev => prev.filter(c => c.id !== id));
      toast({ title: "Checklist deleted successfully!" });
    } catch (error) {
      console.error('Error deleting checklist:', error);
      toast({ title: "Error deleting checklist", variant: "destructive" });
    }
  };

  return {
    checklists,
    loading,
    saveChecklist,
    deleteChecklist,
    refetch: fetchChecklists
  };
};

// Custom hook for check-in sessions
export const useCheckinSessions = () => {
  const [sessions, setSessions] = useState<CheckinSession[]>([]);
  const [loading, setLoading] = useState(true);
  const { activeOrganization } = useOrganizationContext();

  // Create organization context for secure queries
  const orgContext = activeOrganization ? createOrganizationContext(
    activeOrganization.organization_id,
    activeOrganization.is_test_organization
  ) : null;

  useEffect(() => {
    if (orgContext) {
      fetchSessions();
    }
  }, [activeOrganization?.organization_id]);

  const fetchSessions = async () => {
    if (!orgContext) return;

    try {
      const { data, error } = await secureSelect('checkin_sessions', orgContext)
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Validate data ownership
      if (data) {
        assertOrganizationOwnership(data, orgContext);
      }

      const mappedSessions = (data || []).map(mapDbSessionToCheckinSession);
      setSessions(mappedSessions);
    } catch (error) {
      console.error('Error fetching check-in sessions:', error);
    } finally {
      setLoading(false);
    }
  };

  const createSession = async (sessionData: Omit<CheckinSession, 'id' | 'organization_id'>) => {
    if (!orgContext) return;

    try {
      const userId = (await supabase.auth.getUser()).data.user?.id;

      const { data, error } = await secureInsert('checkin_sessions', {
        ...sessionData,
        user_id: userId
      }, orgContext)
        .select()
        .single();

      if (error) throw error;
      if (data) {
        const mappedSession = mapDbSessionToCheckinSession(data);
        setSessions(prev => [mappedSession, ...prev]);
        toast({ title: "Check-in session saved successfully!" });
        return mappedSession;
      }
    } catch (error) {
      console.error('Error creating check-in session:', error);
      toast({ title: "Error saving check-in session", variant: "destructive" });
    }
  };

  const updateSession = async (id: string, updates: Partial<CheckinSession>) => {
    if (!orgContext) return;

    try {
      const { data, error } = await secureUpdate('checkin_sessions', updates, orgContext)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      if (data) {
        const mappedSession = mapDbSessionToCheckinSession(data);
        setSessions(prev => prev.map(session => session.id === id ? mappedSession : session));
        toast({ title: "Check-in session updated successfully!" });
      }
    } catch (error) {
      console.error('Error updating check-in session:', error);
      toast({ title: "Error updating check-in session", variant: "destructive" });
    }
  };

  return {
    sessions,
    loading,
    createSession,
    updateSession,
    refetch: fetchSessions
  };
};

// Custom hook for survey responses
export const useSurveyResponses = () => {
  const [responses, setResponses] = useState<SurveyResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const { activeOrganization } = useOrganizationContext();

  // Create organization context for secure queries
  const orgContext = activeOrganization ? createOrganizationContext(
    activeOrganization.organization_id,
    activeOrganization.is_test_organization
  ) : null;

  useEffect(() => {
    if (orgContext) {
      fetchResponses();
    }
  }, [activeOrganization?.organization_id]);

  const fetchResponses = async () => {
    if (!orgContext) return;

    try {
      const { data, error } = await secureSelect('survey_responses', orgContext)
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Validate data ownership
      if (data) {
        assertOrganizationOwnership(data, orgContext);
      }

      const mappedResponses = (data || []).map(mapDbResponseToSurveyResponse);
      setResponses(mappedResponses);
    } catch (error) {
      console.error('Error fetching survey responses:', error);
    } finally {
      setLoading(false);
    }
  };

  const createResponse = async (responseData: Omit<SurveyResponse, 'id' | 'organization_id'>) => {
    if (!orgContext) return;

    try {
      const userId = (await supabase.auth.getUser()).data.user?.id;

      const { data, error } = await secureInsert('survey_responses', {
        ...responseData,
        user_id: userId
      }, orgContext)
        .select()
        .single();

      if (error) throw error;
      if (data) {
        const mappedResponse = mapDbResponseToSurveyResponse(data);
        setResponses(prev => [mappedResponse, ...prev]);
        toast({ title: "Survey response saved successfully!" });
        return mappedResponse;
      }
    } catch (error) {
      console.error('Error creating survey response:', error);
      toast({ title: "Error saving survey response", variant: "destructive" });
    }
  };

  return {
    responses,
    loading,
    createResponse,
    refetch: fetchResponses
  };
};