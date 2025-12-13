import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export const useAccessCodes = () => {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const validateAccessCode = async (code: string): Promise<boolean> => {
    if (!code || code.trim().length === 0) {
      return false;
    }

    try {
      setLoading(true);
      const { data, error } = await supabase.rpc('validate_trial_code', {
        p_code: code.trim().toUpperCase()
      });

      if (error) {
        console.error('Error validating access code:', error);
        return false;
      }

      return data === true;
    } catch (error) {
      console.error('Exception validating access code:', error);
      return false;
    } finally {
      setLoading(false);
    }
  };

  const consumeAccessCode = async (code: string, userId: string): Promise<boolean> => {
    if (!code || !userId) {
      return false;
    }

    try {
      const { data, error } = await supabase.rpc('consume_trial_code', {
        p_code: code.trim().toUpperCase(),
        p_user_id: userId
      });

      if (error) {
        console.error('Error consuming access code:', error);
        return false;
      }

      return data === true;
    } catch (error) {
      console.error('Exception consuming access code:', error);
      return false;
    }
  };

  const createAccessCode = async (notes?: string, expireDays?: number): Promise<string | null> => {
    try {
      setLoading(true);
      const { data, error } = await supabase.rpc('create_trial_code', {
        p_notes: notes || null,
        p_expires_days: expireDays || null
      });

      if (error) {
        console.error('Error creating access code:', error);
        toast({
          title: "Error",
          description: "Failed to create access code. Please try again.",
          variant: "destructive",
        });
        return null;
      }

      toast({
        title: "Success",
        description: `Access code ${data} created successfully!`,
      });

      return data;
    } catch (error) {
      console.error('Exception creating access code:', error);
      toast({
        title: "Error",
        description: "Failed to create access code. Please try again.",
        variant: "destructive",
      });
      return null;
    } finally {
      setLoading(false);
    }
  };

  const fetchAccessCodes = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('trial_access_codes')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching access codes:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Exception fetching access codes:', error);
      return [];
    } finally {
      setLoading(false);
    }
  };

  return {
    loading,
    validateAccessCode,
    consumeAccessCode,
    createAccessCode,
    fetchAccessCodes
  };
};
