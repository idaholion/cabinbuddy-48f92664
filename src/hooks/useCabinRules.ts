import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useOrganization } from '@/hooks/useOrganization';
import { useToast } from '@/hooks/use-toast';

export interface CabinRule {
  id: string;
  section_type: string;
  section_title: string;
  content: any;
}

export const useCabinRules = () => {
  const [cabinRules, setCabinRules] = useState<CabinRule[]>([]);
  const [loading, setLoading] = useState(true);
  const { organization } = useOrganization();
  const { toast } = useToast();

  const defaultRules = [
    {
      section_type: 'general',
      section_title: 'General Rules',
      content: {
        items: [
          'No smoking inside the cabin. Smoking is permitted outside only.',
          'No pets allowed without prior approval from the administrator.',
          'Respect quiet hours from 10:00 PM to 8:00 AM.',
          'Maximum occupancy is strictly enforced for safety and insurance reasons.'
        ]
      }
    },
    {
      section_type: 'checkin_checkout',
      section_title: 'Check-in & Check-out',
      content: {
        checkin_time: '4:00 PM',
        checkin_note: 'Early check-in may be available upon request',
        checkout_time: '11:00 AM',
        checkout_note: 'Late check-out may incur additional fees'
      }
    },
    {
      section_type: 'guest_policy',
      section_title: 'Guest Policy',
      content: {
        items: [
          'All guests must be registered during booking.',
          'Unregistered guests may result in additional charges.',
          'Day visitors must be approved in advance.'
        ]
      }
    },
    {
      section_type: 'property_care',
      section_title: 'Property Care',
      content: {
        items: [
          'Please treat the cabin as you would your own home.',
          'Report any damages immediately to avoid charges.',
          'Replace any items you break or consume.',
          'Keep the cabin clean and tidy during your stay.'
        ]
      }
    },
    {
      section_type: 'cleaning_trash',
      section_title: 'Cleaning & Trash',
      content: {
        items: [
          'Clean up after yourself during your stay.',
          'Take out trash before departure.',
          'Load and run the dishwasher before leaving.',
          'Strip beds and place linens in laundry area.'
        ]
      }
    },
    {
      section_type: 'parking',
      section_title: 'Parking',
      content: {
        items: [
          'Designated parking spots only.',
          'No street parking allowed.',
          'Park responsibly to allow emergency vehicle access.'
        ]
      }
    },
    {
      section_type: 'amenities',
      section_title: 'Amenities',
      content: {
        items: [
          'WiFi password is posted in the main living area.',
          'Use hot tub responsibly - shower before use.',
          'Turn off all lights and appliances when leaving.'
        ]
      }
    },
    {
      section_type: 'emergency',
      section_title: 'Emergency Information',
      content: {
        emergency_services: '911',
        property_manager: '(555) 123-4567',
        local_hospital: '(555) 987-6543',
        procedures: [
          'Fire extinguisher and first aid kit are located in the kitchen.',
          'Emergency evacuation plan is posted near the main exit.'
        ]
      }
    },
    {
      section_type: 'violation_policy',
      section_title: 'Violation Policy',
      content: {
        policy: 'Violations of these rules may result in immediate removal from the property and forfeiture of all fees paid, as well as additional cleaning or damage charges.',
        agreement: 'By staying at this property, you agree to abide by all rules and policies listed above.'
      }
    }
  ];

  useEffect(() => {
    const fetchCabinRules = async () => {
      if (!organization?.id) return;

      try {
        const { data, error } = await supabase
          .from('cabin_rules')
          .select('*')
          .eq('organization_id', organization.id)
          .order('section_type');

        if (error) throw error;

        if (data.length === 0) {
          // Initialize with default rules
          await initializeDefaultRules();
        } else {
          setCabinRules(data);
        }
      } catch (error) {
        console.error('Error fetching cabin rules:', error);
        toast({
          title: "Error",
          description: "Failed to load cabin rules.",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchCabinRules();
  }, [organization?.id, toast]);

  const initializeDefaultRules = async () => {
    if (!organization?.id) return;

    try {
      const rulesWithOrgId = defaultRules.map(rule => ({
        ...rule,
        organization_id: organization.id
      }));

      const { data, error } = await supabase
        .from('cabin_rules')
        .insert(rulesWithOrgId)
        .select();

      if (error) throw error;

      setCabinRules(data);
    } catch (error) {
      console.error('Error initializing cabin rules:', error);
      toast({
        title: "Error",
        description: "Failed to initialize cabin rules.",
        variant: "destructive",
      });
    }
  };

  const updateCabinRule = async (id: string, updates: Partial<CabinRule>) => {
    if (!organization?.id) return;

    try {
      const { data, error } = await supabase
        .from('cabin_rules')
        .update(updates)
        .eq('id', id)
        .eq('organization_id', organization.id)
        .select()
        .single();

      if (error) throw error;

      setCabinRules(prev => prev.map(rule => 
        rule.id === id ? { ...rule, ...data } : rule
      ));

      toast({
        title: "Success",
        description: "Cabin rule updated successfully.",
      });

      return data;
    } catch (error) {
      console.error('Error updating cabin rule:', error);
      toast({
        title: "Error",
        description: "Failed to update cabin rule.",
        variant: "destructive",
      });
    }
  };

  const deleteCabinRule = async (id: string) => {
    if (!organization?.id) return;

    try {
      const { error } = await supabase
        .from('cabin_rules')
        .delete()
        .eq('id', id)
        .eq('organization_id', organization.id);

      if (error) throw error;

      setCabinRules(prev => prev.filter(rule => rule.id !== id));

      toast({
        title: "Success",
        description: "Cabin rule section deleted successfully.",
      });
    } catch (error) {
      console.error('Error deleting cabin rule:', error);
      toast({
        title: "Error",
        description: "Failed to delete cabin rule section.",
        variant: "destructive",
      });
    }
  };

  const createCabinRule = async (newRule: Omit<CabinRule, 'id'>) => {
    if (!organization?.id) return;

    try {
      const ruleWithOrgId = {
        ...newRule,
        organization_id: organization.id
      };

      const { data, error } = await supabase
        .from('cabin_rules')
        .insert(ruleWithOrgId)
        .select()
        .single();

      if (error) throw error;

      setCabinRules(prev => [...prev, data]);

      toast({
        title: "Success",
        description: "New cabin rule section created successfully.",
      });

      return data;
    } catch (error) {
      console.error('Error creating cabin rule:', error);
      toast({
        title: "Error",
        description: "Failed to create cabin rule section.",
        variant: "destructive",
      });
    }
  };

  return {
    cabinRules,
    loading,
    updateCabinRule,
    deleteCabinRule,
    createCabinRule,
    refetch: () => {
      if (organization?.id) {
        setLoading(true);
        // Re-trigger the useEffect
        setCabinRules([]);
      }
    }
  };
};