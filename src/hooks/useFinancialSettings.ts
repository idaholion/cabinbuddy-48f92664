import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useOrganization } from '@/hooks/useOrganization';
import { secureSelect, secureInsert, secureUpdate, assertOrganizationOwnership, createOrganizationContext } from '@/lib/secure-queries';

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
  
  invoice_prefix?: string;
  next_invoice_number?: number;
  
  // Invoice automation settings
  invoice_email_subject?: string;
  invoice_email_body?: string;
  reminder_email_subject?: string;
  reminder_email_body?: string;
  reminder_7_days_enabled?: boolean;
  reminder_3_days_enabled?: boolean;
  reminder_1_day_enabled?: boolean;
  reminder_due_date_enabled?: boolean;
  overdue_reminder_interval_days?: number;
  email_delivery_enabled?: boolean;
  sms_delivery_enabled?: boolean;
  batch_send_enabled?: boolean;
  invoice_approval_required?: boolean;
  
  season_start_month?: number;
  season_start_day?: number;
  season_end_month?: number;
  season_end_day?: number;
  season_payment_deadline_offset_days?: number;
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
      const orgContext = createOrganizationContext(organization.id);
      const { data, error } = await secureSelect('reservation_settings', orgContext)
        .select('*')
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching financial settings:', error);
        return;
      }

      // Validate data ownership
      if (data) {
        assertOrganizationOwnership(data, orgContext);
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
          
          invoice_prefix: data.invoice_prefix || 'INV',
          next_invoice_number: data.next_invoice_number || 1,
          
          // Invoice automation settings
          invoice_email_subject: data.invoice_email_subject || '',
          invoice_email_body: data.invoice_email_body || '',
          reminder_email_subject: data.reminder_email_subject || '',
          reminder_email_body: data.reminder_email_body || '',
          reminder_7_days_enabled: data.reminder_7_days_enabled ?? true,
          reminder_3_days_enabled: data.reminder_3_days_enabled ?? true,
          reminder_1_day_enabled: data.reminder_1_day_enabled ?? true,
          reminder_due_date_enabled: data.reminder_due_date_enabled ?? true,
          overdue_reminder_interval_days: data.overdue_reminder_interval_days || 7,
          email_delivery_enabled: data.email_delivery_enabled ?? true,
          sms_delivery_enabled: data.sms_delivery_enabled ?? false,
          batch_send_enabled: data.batch_send_enabled ?? true,
          invoice_approval_required: data.invoice_approval_required ?? false,
          
          // Season configuration
          season_start_month: data.season_start_month,
          season_start_day: data.season_start_day,
          season_end_month: data.season_end_month,
          season_end_day: data.season_end_day,
          season_payment_deadline_offset_days: data.season_payment_deadline_offset_days,
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
        
        invoice_prefix: settingsData.invoice_prefix,
        next_invoice_number: settingsData.next_invoice_number,
        
        // Invoice automation settings
        invoice_email_subject: settingsData.invoice_email_subject,
        invoice_email_body: settingsData.invoice_email_body,
        reminder_email_subject: settingsData.reminder_email_subject,
        reminder_email_body: settingsData.reminder_email_body,
        reminder_7_days_enabled: settingsData.reminder_7_days_enabled,
        reminder_3_days_enabled: settingsData.reminder_3_days_enabled,
        reminder_1_day_enabled: settingsData.reminder_1_day_enabled,
        reminder_due_date_enabled: settingsData.reminder_due_date_enabled,
        overdue_reminder_interval_days: settingsData.overdue_reminder_interval_days,
        email_delivery_enabled: settingsData.email_delivery_enabled,
        sms_delivery_enabled: settingsData.sms_delivery_enabled,
        batch_send_enabled: settingsData.batch_send_enabled,
        invoice_approval_required: settingsData.invoice_approval_required,
      };

      const orgContext = createOrganizationContext(organization.id);
      const { data: existingSettings } = await secureSelect('reservation_settings', orgContext)
        .select('id')
        .single();

      if (existingSettings?.id) {
        // Update existing settings
        const { data: updatedSettings, error } = await secureUpdate('reservation_settings', dataToSave, orgContext)
          .eq('id', existingSettings.id)
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
        const { data: newSettings, error } = await secureInsert('reservation_settings', dataToSave, orgContext)
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