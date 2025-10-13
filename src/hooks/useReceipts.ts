import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useOrganization } from '@/hooks/useOrganization';

interface ReceiptData {
  description: string;
  amount: number;
  date: string;
  family_group?: string;
  image_url?: string;
  image?: File;
}

export const useReceipts = () => {
  const { user } = useAuth();
  const { organization } = useOrganization();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [receipts, setReceipts] = useState<any[]>([]);

  const fetchReceipts = async () => {
    if (!user || !organization?.id) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('receipts')
        .select('*')
        .eq('organization_id', organization.id)
        .order('date', { ascending: false });

      if (error) {
        console.error('Error fetching receipts:', error);
        return;
      }

      setReceipts(data || []);
    } catch (error) {
      console.error('Error in fetchReceipts:', error);
    } finally {
      setLoading(false);
    }
  };

  const uploadReceiptImage = async (file: File): Promise<string> => {
    if (!user) throw new Error('User not authenticated');

    const fileExt = file.name.split('.').pop();
    const fileName = `${user.id}/${Date.now()}.${fileExt}`;
    
    const { data, error } = await supabase.storage
      .from('receipt-images')
      .upload(fileName, file);

    if (error) throw error;

    const { data: { publicUrl } } = supabase.storage
      .from('receipt-images')
      .getPublicUrl(fileName);

    return publicUrl;
  };

  const createReceipt = async (receiptData: ReceiptData) => {
    if (!user || !organization?.id) {
      toast({
        title: "Error",
        description: "You must be logged in and have an organization to create a receipt.",
        variant: "destructive",
      });
      return null;
    }

    setLoading(true);
    try {
      let imageUrl: string | undefined = receiptData.image_url;
      
      if (receiptData.image) {
        imageUrl = await uploadReceiptImage(receiptData.image);
      }

      // Auto-fetch family group if not provided
      let familyGroup = receiptData.family_group;
      if (!familyGroup) {
        const { data: userEmail } = await supabase.auth.getUser();
        const email = userEmail?.user?.email;
        
        if (email) {
          // Check if user is a lead
          const { data: leadGroup } = await supabase
            .from('family_groups')
            .select('name')
            .eq('organization_id', organization.id)
            .eq('lead_email', email)
            .maybeSingle();
          
          if (leadGroup) {
            familyGroup = leadGroup.name;
          } else {
            // Check if user is a host member
            const { data: allGroups } = await supabase
              .from('family_groups')
              .select('name, host_members')
              .eq('organization_id', organization.id);
            
            if (allGroups) {
              for (const group of allGroups) {
                const members = group.host_members as any[];
                if (members?.some((m: any) => m.email?.toLowerCase() === email.toLowerCase())) {
                  familyGroup = group.name;
                  break;
                }
              }
            }
          }
        }
      }

      const { data: newReceipt, error } = await supabase
        .from('receipts')
        .insert({
          description: receiptData.description,
          amount: receiptData.amount,
          date: receiptData.date,
          family_group: familyGroup,
          image_url: imageUrl,
          organization_id: organization.id,
          user_id: user.id
        })
        .select()
        .single();

      if (error) {
        console.error('Error creating receipt:', error);
        toast({
          title: "Error",
          description: "Failed to create receipt. Please try again.",
          variant: "destructive",
        });
        return null;
      }

      setReceipts(prev => [newReceipt, ...prev]);
      
      toast({
        title: "Success",
        description: "Receipt created successfully!",
      });

      return newReceipt;
    } catch (error) {
      console.error('Error in createReceipt:', error);
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

  const deleteReceipt = async (receiptId: string) => {
    if (!user || !organization?.id) {
      toast({
        title: "Error",
        description: "No organization found.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const receipt = receipts.find(r => r.id === receiptId);
      
      // Delete image from storage if exists
      if (receipt?.image_url) {
        const fileName = receipt.image_url.split('/').pop();
        if (fileName) {
          await supabase.storage
            .from('receipt-images')
            .remove([`${user.id}/${fileName}`]);
        }
      }

      const { error } = await supabase
        .from('receipts')
        .delete()
        .eq('id', receiptId)
        .eq('organization_id', organization.id);

      if (error) {
        console.error('Error deleting receipt:', error);
        toast({
          title: "Error",
          description: "Failed to delete receipt. Please try again.",
          variant: "destructive",
        });
        return;
      }

      setReceipts(prev => prev.filter(receipt => receipt.id !== receiptId));
      
      toast({
        title: "Success",
        description: "Receipt deleted successfully!",
      });
    } catch (error) {
      console.error('Error in deleteReceipt:', error);
      toast({
        title: "Error",
        description: "An unexpected error occurred.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (organization?.id) {
      fetchReceipts();
    }
  }, [organization?.id]);

  return {
    receipts,
    loading,
    createReceipt,
    deleteReceipt,
    refetchReceipts: fetchReceipts,
    uploadReceiptImage,
  };
};