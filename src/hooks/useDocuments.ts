import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useOrganization } from '@/hooks/useOrganization';
import { useToast } from '@/hooks/use-toast';

export interface Document {
  id: string;
  organization_id: string;
  title: string;
  description?: string;
  category: string;
  file_url?: string;
  file_size?: number;
  file_type?: string;
  uploaded_by_user_id?: string;
  created_at: string;
  updated_at: string;
}

export const useDocuments = () => {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const { organization } = useOrganization();
  const { toast } = useToast();

  const fetchDocuments = async () => {
    if (!organization?.id) {
      setDocuments([]);
      setLoading(false);
      return;
    }
    
    try {
      const { data, error } = await supabase
        .from('documents')
        .select('*')
        .eq('organization_id', organization.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setDocuments(data || []);
    } catch (error) {
      console.error('Error fetching documents:', error);
      toast({
        title: "Error",
        description: "Failed to load documents",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const uploadDocument = async (file: File, documentData: {
    title: string;
    description?: string;
    category: string;
  }) => {
    if (!user || !organization?.id) return;

    try {
      // Upload file to storage
      const fileExt = file.name.split('.').pop();
      const fileName = `${organization.id}/${user.id}/${Date.now()}.${fileExt}`;
      
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('documents')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      // For private buckets, store the file path instead of public URL
      const filePath = fileName;

      // Insert document record
      const { data, error } = await supabase
        .from('documents')
        .insert({
          organization_id: organization.id,
          uploaded_by_user_id: user.id,
          file_url: filePath, // Store file path for private bucket
          file_size: file.size,
          file_type: file.type,
          ...documentData
        })
        .select()
        .single();

      if (error) throw error;

      setDocuments(prev => [data, ...prev]);
      toast({
        title: "Success",
        description: "Document uploaded successfully"
      });

      return data;
    } catch (error) {
      console.error('Error uploading document:', error);
      toast({
        title: "Error",
        description: "Failed to upload document",
        variant: "destructive"
      });
      throw error;
    }
  };

  const addDocumentLink = async (documentData: {
    title: string;
    description?: string;
    category: string;
    file_url: string;
  }) => {
    if (!user || !organization?.id) return;

    try {
      const { data, error } = await supabase
        .from('documents')
        .insert({
          organization_id: organization.id,
          uploaded_by_user_id: user.id,
          ...documentData
        })
        .select()
        .single();

      if (error) throw error;

      setDocuments(prev => [data, ...prev]);
      toast({
        title: "Success",
        description: "Document link added successfully"
      });

      return data;
    } catch (error) {
      console.error('Error adding document link:', error);
      toast({
        title: "Error",
        description: "Failed to add document link",
        variant: "destructive"
      });
      throw error;
    }
  };

  const getSignedUrl = async (filePath: string) => {
    try {
      const { data, error } = await supabase.storage
        .from('documents')
        .createSignedUrl(filePath, 3600); // 1 hour expiry

      if (error) throw error;
      return data.signedUrl;
    } catch (error) {
      console.error('Error creating signed URL:', error);
      throw error;
    }
  };

  const viewDocument = async (document: Document) => {
    try {
      let url = document.file_url;
      
      // If the file_url is a file path (not a full URL), generate a signed URL
      if (url && !url.startsWith('http')) {
        url = await getSignedUrl(url);
      } else if (url && url.includes('/storage/v1/object/public/documents/')) {
        // Handle legacy public URLs - extract file path and generate signed URL
        const filePath = url.split('/storage/v1/object/public/documents/')[1];
        url = await getSignedUrl(filePath);
      }
      
      if (url) {
        window.open(url, '_blank');
      }
    } catch (error) {
      console.error('Error viewing document:', error);
      toast({
        title: "Error",
        description: "Failed to open document",
        variant: "destructive"
      });
    }
  };

  const migrateExistingDocuments = async () => {
    try {
      const documentsToMigrate = documents.filter(doc => 
        doc.file_url && doc.file_url.includes('/storage/v1/object/public/documents/')
      );

      for (const doc of documentsToMigrate) {
        const filePath = doc.file_url!.split('/storage/v1/object/public/documents/')[1];
        
        // Update the document in the database
        const { error } = await supabase
          .from('documents')
          .update({ file_url: filePath })
          .eq('id', doc.id);

        if (!error) {
          // Update local state
          setDocuments(prev => prev.map(d => 
            d.id === doc.id ? { ...d, file_url: filePath } : d
          ));
        }
      }
    } catch (error) {
      console.error('Error migrating documents:', error);
    }
  };

  // Auto-migrate existing documents on load
  useEffect(() => {
    if (documents.length > 0) {
      migrateExistingDocuments();
    }
  }, [documents.length]);

  const deleteDocument = async (documentId: string) => {
    if (!user) return;

    try {
      const document = documents.find(d => d.id === documentId);
      if (!document) return;

      // Delete file from storage if it exists and is a file path
      if (document.file_url && !document.file_url.startsWith('http')) {
        await supabase.storage
          .from('documents')
          .remove([document.file_url]);
      }

      // Delete from database
      const { error } = await supabase
        .from('documents')
        .delete()
        .eq('id', documentId);

      if (error) throw error;

      setDocuments(prev => prev.filter(d => d.id !== documentId));
      toast({
        title: "Success",
        description: "Document deleted successfully"
      });
    } catch (error) {
      console.error('Error deleting document:', error);
      toast({
        title: "Error",
        description: "Failed to delete document",
        variant: "destructive"
      });
    }
  };

  const updateDocument = async (documentId: string, updates: Partial<Document>) => {
    try {
      const { data, error } = await supabase
        .from('documents')
        .update(updates)
        .eq('id', documentId)
        .select()
        .single();

      if (error) throw error;

      setDocuments(prev => prev.map(d => d.id === documentId ? data : d));
      toast({
        title: "Success",
        description: "Document updated successfully"
      });

      return data;
    } catch (error) {
      console.error('Error updating document:', error);
      toast({
        title: "Error",
        description: "Failed to update document",
        variant: "destructive"
      });
      throw error;
    }
  };

  useEffect(() => {
    fetchDocuments();
  }, [organization?.id]);

  return {
    documents,
    loading,
    uploadDocument,
    addDocumentLink,
    deleteDocument,
    updateDocument,
    viewDocument,
    getSignedUrl,
    refetch: fetchDocuments
  };
};