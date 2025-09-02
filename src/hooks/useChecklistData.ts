import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import type { Database } from '@/integrations/supabase/types';

// Database types
type DbCustomChecklist = Database['public']['Tables']['custom_checklists']['Row'];
type DbCheckinSession = Database['public']['Tables']['checkin_sessions']['Row'];
type DbSurveyResponse = Database['public']['Tables']['survey_responses']['Row'];

export interface CustomChecklist {
  id: string;
  organization_id: string;
  checklist_type: 'arrival' | 'daily' | 'closing' | 'opening' | 'seasonal' | 'maintenance';
  items: any[];
  images?: any[];
}

export interface CheckinSession {
  id: string;
  organization_id: string;
  user_id?: string;
  session_type: 'arrival' | 'daily' | 'closing' | 'opening' | 'seasonal' | 'maintenance';
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
}

// Type conversion helpers
const mapDbChecklistToCustomChecklist = (dbChecklist: DbCustomChecklist): CustomChecklist => ({
  id: dbChecklist.id,
  organization_id: dbChecklist.organization_id,
  checklist_type: dbChecklist.checklist_type as 'arrival' | 'daily' | 'closing' | 'opening' | 'seasonal' | 'maintenance',
  items: Array.isArray(dbChecklist.items) ? dbChecklist.items : [],
  images: Array.isArray(dbChecklist.images) ? dbChecklist.images : []
});

const mapDbSessionToCheckinSession = (dbSession: DbCheckinSession): CheckinSession => ({
  id: dbSession.id,
  organization_id: dbSession.organization_id,
  user_id: dbSession.user_id || undefined,
  session_type: dbSession.session_type as 'arrival' | 'daily' | 'closing' | 'opening' | 'seasonal' | 'maintenance',
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
  responses: typeof dbResponse.responses === 'object' ? dbResponse.responses as Record<string, any> : {}
});

// Custom hook for checklists
export const useCustomChecklists = () => {
  const [checklists, setChecklists] = useState<Record<string, CustomChecklist>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchChecklists();
  }, []);

  const fetchChecklists = async () => {
    try {
      const { data, error } = await supabase
        .from('custom_checklists')
        .select('*');

      if (error) throw error;
      
      const checklistsMap = (data || []).reduce((acc, dbChecklist) => {
        const checklist = mapDbChecklistToCustomChecklist(dbChecklist);
        acc[checklist.checklist_type] = checklist;
        return acc;
      }, {} as Record<string, CustomChecklist>);
      
      setChecklists(checklistsMap);
    } catch (error) {
      console.error('Error fetching checklists:', error);
    } finally {
      setLoading(false);
    }
  };

  const saveChecklist = async (type: 'arrival' | 'daily' | 'closing' | 'opening' | 'seasonal' | 'maintenance', items: any[], images?: any[]) => {
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('organization_id')
        .eq('user_id', (await supabase.auth.getUser()).data.user?.id)
        .single();

      if (!profile?.organization_id) throw new Error('No organization found');

      const existingChecklist = checklists[type];

      if (existingChecklist) {
        // Update existing
        const updateData: any = { items };
        if (images !== undefined) {
          updateData.images = images;
        }
        
        const { data, error } = await supabase
          .from('custom_checklists')
          .update(updateData)
          .eq('id', existingChecklist.id)
          .select()
          .single();

        if (error) throw error;
        if (data) {
          const mappedChecklist = mapDbChecklistToCustomChecklist(data);
          setChecklists(prev => ({ ...prev, [type]: mappedChecklist }));
        }
      } else {
        // Create new
        const insertData: any = {
          organization_id: profile.organization_id,
          checklist_type: type,
          items
        };
        if (images !== undefined) {
          insertData.images = images;
        }
        
        const { data, error } = await supabase
          .from('custom_checklists')
          .insert(insertData)
          .select()
          .single();

        if (error) throw error;
        if (data) {
          const mappedChecklist = mapDbChecklistToCustomChecklist(data);
          setChecklists(prev => ({ ...prev, [type]: mappedChecklist }));
        }
      }

      toast({ title: `${type} checklist saved successfully!` });
    } catch (error) {
      console.error('Error saving checklist:', error);
      toast({ title: "Error saving checklist", variant: "destructive" });
    }
  };

  return {
    checklists,
    loading,
    saveChecklist,
    refetch: fetchChecklists
  };
};

// Custom hook for check-in sessions
export const useCheckinSessions = () => {
  const [sessions, setSessions] = useState<CheckinSession[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSessions();
  }, []);

  const fetchSessions = async () => {
    try {
      const { data, error } = await supabase
        .from('checkin_sessions')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      const mappedSessions = (data || []).map(mapDbSessionToCheckinSession);
      setSessions(mappedSessions);
    } catch (error) {
      console.error('Error fetching check-in sessions:', error);
    } finally {
      setLoading(false);
    }
  };

  const createSession = async (sessionData: Omit<CheckinSession, 'id' | 'organization_id'>) => {
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('organization_id')
        .eq('user_id', (await supabase.auth.getUser()).data.user?.id)
        .single();

      if (!profile?.organization_id) throw new Error('No organization found');

      const { data, error } = await supabase
        .from('checkin_sessions')
        .insert({
          ...sessionData,
          organization_id: profile.organization_id,
          user_id: (await supabase.auth.getUser()).data.user?.id
        })
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
    try {
      const { data, error } = await supabase
        .from('checkin_sessions')
        .update(updates)
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

  useEffect(() => {
    fetchResponses();
  }, []);

  const fetchResponses = async () => {
    try {
      const { data, error } = await supabase
        .from('survey_responses')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      const mappedResponses = (data || []).map(mapDbResponseToSurveyResponse);
      setResponses(mappedResponses);
    } catch (error) {
      console.error('Error fetching survey responses:', error);
    } finally {
      setLoading(false);
    }
  };

  const createResponse = async (responseData: Omit<SurveyResponse, 'id' | 'organization_id'>) => {
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('organization_id')
        .eq('user_id', (await supabase.auth.getUser()).data.user?.id)
        .single();

      if (!profile?.organization_id) throw new Error('No organization found');

      const { data, error } = await supabase
        .from('survey_responses')
        .insert({
          ...responseData,
          organization_id: profile.organization_id,
          user_id: (await supabase.auth.getUser()).data.user?.id
        })
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