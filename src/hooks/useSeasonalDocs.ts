import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useOrganization } from '@/hooks/useOrganization';
import { useToast } from '@/hooks/use-toast';
import { secureSelect, secureInsert, secureUpdate, secureDelete, assertOrganizationOwnership, createOrganizationContext } from '@/lib/secure-queries';

export interface SeasonalDocument {
  id: string;
  organization_id: string;
  season: string;
  title: string;
  description?: string;
  file_url?: string;
  external_url?: string;
  document_type: string;
  created_at: string;
  updated_at: string;
}

export const useSeasonalDocs = () => {
  const [seasonalDocs, setSeasonalDocs] = useState<SeasonalDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const { organization } = useOrganization();
  const { toast } = useToast();

  const fetchSeasonalDocs = async () => {
    if (!organization?.id) return;
    
    try {
      const orgContext = createOrganizationContext(organization.id);
      const { data, error } = await secureSelect('seasonal_documents', orgContext)
        .select('*')
        .order('season', { ascending: true });

      if (error) throw error;
      
      // Validate data ownership
      if (data) {
        assertOrganizationOwnership(data, orgContext);
      }
      
      setSeasonalDocs(data || []);
    } catch (error) {
      console.error('Error fetching seasonal documents:', error);
      toast({
        title: "Error",
        description: "Failed to load seasonal documents",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const uploadFile = async (file: File, season: string) => {
    if (!user || !organization?.id) return null;

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${organization.id}/${season}/${Date.now()}.${fileExt}`;
      
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('documents')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from('documents')
        .getPublicUrl(fileName);

      return urlData.publicUrl;
    } catch (error) {
      console.error('Error uploading file:', error);
      toast({
        title: "Error",
        description: "Failed to upload file",
        variant: "destructive"
      });
      throw error;
    }
  };

  const addSeasonalDoc = async (docData: {
    season: string;
    title: string;
    description?: string;
    file_url?: string;
    external_url?: string;
    document_type?: string;
    file?: File;
  }) => {
    if (!user || !organization?.id) return;

    try {
      let file_url = docData.file_url;
      
      // Upload file if provided
      if (docData.file) {
        file_url = await uploadFile(docData.file, docData.season);
      }

      const orgContext = createOrganizationContext(organization.id);
      const { data, error } = await secureInsert('seasonal_documents', {
        document_type: 'guide',
        ...docData,
        file_url
      }, orgContext)
        .select()
        .single();

      if (error) throw error;

      setSeasonalDocs(prev => [...prev, data].sort((a, b) => a.season.localeCompare(b.season)));
      toast({
        title: "Success",
        description: "Seasonal document added successfully"
      });

      return data;
    } catch (error) {
      console.error('Error adding seasonal document:', error);
      toast({
        title: "Error",
        description: "Failed to add seasonal document",
        variant: "destructive"
      });
      throw error;
    }
  };

  const updateSeasonalDoc = async (docId: string, updates: Partial<SeasonalDocument>) => {
    if (!organization?.id) return;

    try {
      const orgContext = createOrganizationContext(organization.id);
      const { data, error } = await secureUpdate('seasonal_documents', updates, orgContext)
        .eq('id', docId)
        .select()
        .single();

      if (error) throw error;

      setSeasonalDocs(prev => prev.map(d => d.id === docId ? data : d));
      toast({
        title: "Success",
        description: "Seasonal document updated successfully"
      });

      return data;
    } catch (error) {
      console.error('Error updating seasonal document:', error);
      toast({
        title: "Error",
        description: "Failed to update seasonal document",
        variant: "destructive"
      });
      throw error;
    }
  };

  const deleteSeasonalDoc = async (docId: string) => {
    if (!organization?.id) return;

    try {
      const orgContext = createOrganizationContext(organization.id);
      const { error } = await secureDelete('seasonal_documents', orgContext)
        .eq('id', docId);

      if (error) throw error;

      setSeasonalDocs(prev => prev.filter(d => d.id !== docId));
      toast({
        title: "Success",
        description: "Seasonal document deleted successfully"
      });
    } catch (error) {
      console.error('Error deleting seasonal document:', error);
      toast({
        title: "Error",
        description: "Failed to delete seasonal document",
        variant: "destructive"
      });
    }
  };

  const getDocumentsBySeasonPattern = (seasonPattern: string) => {
    return seasonalDocs.filter(doc => 
      doc.season.toLowerCase().includes(seasonPattern.toLowerCase())
    );
  };

  useEffect(() => {
    if (organization?.id) {
      fetchSeasonalDocs();
    }
  }, [organization?.id]);

  return {
    seasonalDocs,
    loading,
    addSeasonalDoc,
    updateSeasonalDoc,
    deleteSeasonalDoc,
    getDocumentsBySeasonPattern,
    uploadFile,
    refetch: fetchSeasonalDocs
  };
};