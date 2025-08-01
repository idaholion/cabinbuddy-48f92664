import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useOrganization } from '@/hooks/useOrganization';

export interface FinancialSettings {
  billing_method: string;
  billing_amount: number;
  tax_rate?: number;
  cleaning_fee?: number;
  pet_fee?: number;
  damage_deposit?: number;
  preferred_payment_method?: string;
  payment_terms?: string;
  auto_invoicing?: boolean;
  late_fees_enabled?: boolean;
  late_fee_amount?: number;
  late_fee_grace_days?: number;
  cancellation_policy?: string;
  tax_id?: string;
  tax_jurisdiction?: string;
  
  venmo_handle?: string;
  paypal_email?: string;
  check_payable_to?: string;
  check_mailing_address?: string;
}

export const useFinancialSettings = () => {
  const { user } = useAuth();
  const { organization } = useOrganization();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [settings, setSettings] = useState<FinancialSettings | null>(null);

  const fetchFinancialSettings = async () => {
    if (!user || !organization?.id) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('reservation_settings')
        .select('*')
        .eq('organization_id', organization.id)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching financial settings:', error);
        return;
      }

      if (data) {
        setSettings({
          billing_method: data.financial_method || 'per-person-per-day',
          billing_amount: data.nightly_rate || 0,
          tax_rate: data.tax_rate || 0,
          cleaning_fee: data.cleaning_fee || 0,
          pet_fee: data.pet_fee || 0,
          damage_deposit: data.damage_deposit || 0,
          preferred_payment_method: data.preferred_payment_method || '',
          payment_terms: data.payment_terms || '',
          auto_invoicing: data.auto_invoicing || false,
          late_fees_enabled: data.late_fees_enabled || false,
          late_fee_amount: data.late_fee_amount || 0,
          late_fee_grace_days: data.late_fee_grace_days || 3,
          cancellation_policy: data.cancellation_policy || '',
          tax_id: data.tax_id || '',
          tax_jurisdiction: data.tax_jurisdiction || '',
          
          venmo_handle: data.venmo_handle || '',
          paypal_email: data.paypal_email || '',
          check_payable_to: data.check_payable_to || '',
          check_mailing_address: data.check_mailing_address || '',
        });
      }
    } catch (error) {
      console.error('Error in fetchFinancialSettings:', error);
    } finally {
      setLoading(false);
    }
  };

  const saveFinancialSettings = async (settingsData: Partial<FinancialSettings>) => {
    if (!user || !organization?.id) {
      toast({
        title: "Error",
        description: "You must be logged in and have an organization to save financial settings.",
        variant: "destructive",
      });
      return null;
    }

    setLoading(true);
    try {
      // Map financial settings to reservation_settings table fields
      const dataToSave = {
        organization_id: organization.id,
        financial_method: settingsData.billing_method,
        nightly_rate: settingsData.billing_amount,
        tax_rate: settingsData.tax_rate,
        cleaning_fee: settingsData.cleaning_fee,
        pet_fee: settingsData.pet_fee,
        damage_deposit: settingsData.damage_deposit,
        preferred_payment_method: settingsData.preferred_payment_method,
        payment_terms: settingsData.payment_terms,
        auto_invoicing: settingsData.auto_invoicing,
        late_fees_enabled: settingsData.late_fees_enabled,
        late_fee_amount: settingsData.late_fee_amount,
        late_fee_grace_days: settingsData.late_fee_grace_days,
        cancellation_policy: settingsData.cancellation_policy,
        tax_id: settingsData.tax_id,
        tax_jurisdiction: settingsData.tax_jurisdiction,
        
        venmo_handle: settingsData.venmo_handle,
        paypal_email: settingsData.paypal_email,
        check_payable_to: settingsData.check_payable_to,
        check_mailing_address: settingsData.check_mailing_address,
      };

      const { data: existingSettings } = await supabase
        .from('reservation_settings')
        .select('id')
        .eq('organization_id', organization.id)
        .single();

      if (existingSettings?.id) {
        // Update existing settings
        const { data: updatedSettings, error } = await supabase
          .from('reservation_settings')
          .update(dataToSave)
          .eq('id', existingSettings.id)
          .eq('organization_id', organization.id)
          .select()
          .single();

        if (error) {
          console.error('Error updating financial settings:', error);
          toast({
            title: "Error",
            description: "Failed to update financial settings. Please try again.",
            variant: "destructive",
          });
          return null;
        }

        setSettings(prev => ({ ...prev, ...settingsData } as FinancialSettings));
      } else {
        // Create new settings
        const { data: newSettings, error } = await supabase
          .from('reservation_settings')
          .insert(dataToSave)
          .select()
          .single();

        if (error) {
          console.error('Error creating financial settings:', error);
          toast({
            title: "Error",
            description: "Failed to save financial settings. Please try again.",
            variant: "destructive",
          });
          return null;
        }

        setSettings(prev => ({ ...prev, ...settingsData } as FinancialSettings));
      }

      toast({
        title: "Success",
        description: "Financial settings saved successfully!",
      });

      return settings;
    } catch (error) {
      console.error('Error in saveFinancialSettings:', error);
      toast({
        title: "Error",
        description: "An unexpected error occurred.",
        variant: "destructive",
      });
      return null;
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (organization?.id) {
      fetchFinancialSettings();
    }
  }, [organization?.id]);

  return {
    settings,
    loading,
    saveFinancialSettings,
    refetchFinancialSettings: fetchFinancialSettings,
  };
};