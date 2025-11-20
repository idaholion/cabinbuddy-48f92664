import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useOrganization } from '@/hooks/useOrganization';
import { useToast } from '@/hooks/use-toast';
import { secureSelect, secureInsert, secureUpdate, secureDelete, createOrganizationContext } from '@/lib/secure-queries';

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
      const orgContext = createOrganizationContext(organization.id);
      const { data, error } = await secureSelect('documents', orgContext)
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
      
      console.log('Uploading document with fileName:', fileName);
      
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('documents')
        .upload(fileName, file);

      if (uploadError) {
        console.error('Upload error:', uploadError);
        throw uploadError;
      }

      console.log('Upload successful, storing file path:', fileName);

      // Insert document record with file path only
      const orgContext = createOrganizationContext(organization.id);
      const { data, error } = await secureInsert('documents', {
        uploaded_by_user_id: user.id,
        file_url: fileName, // Store only file path for private bucket
        file_size: file.size,
        file_type: file.type,
        ...documentData
      }, orgContext)
        .select()
        .single();

      if (error) {
        console.error('Database insert error:', error);
        throw error;
      }

      console.log('Document created in database:', data);

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
      const orgContext = createOrganizationContext(organization.id);
      const { data, error } = await secureInsert('documents', {
        uploaded_by_user_id: user.id,
        ...documentData
      }, orgContext)
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
      
      // Convert relative path to full URL
      const fullUrl = data.signedUrl.startsWith('http') 
        ? data.signedUrl 
        : `https://ftaxzdnrnhktzbcsejoy.supabase.co${data.signedUrl}`;
      
      return fullUrl;
    } catch (error) {
      console.error('Error creating signed URL:', error);
      throw error;
    }
  };

  const viewDocument = async (document: Document) => {
    console.log('Viewing document:', document);
    try {
      let url = document.file_url;
      console.log('Original file_url:', url);
      
      // If the file_url is a file path (not a full URL), generate a signed URL
      if (url && !url.startsWith('http')) {
        console.log('Generating signed URL for file path:', url);
        try {
          url = await getSignedUrl(url);
          console.log('Generated signed URL:', url);
        } catch (signedUrlError) {
          console.error('Failed to generate signed URL:', signedUrlError);
          toast({
            title: "Error",
            description: "Failed to generate access URL for document",
            variant: "destructive"
          });
          return;
        }
      } else if (url && url.includes('/storage/v1/object/public/documents/')) {
        // Handle legacy public URLs - extract file path and generate signed URL
        console.log('Converting legacy public URL to signed URL');
        const filePath = url.split('/storage/v1/object/public/documents/')[1];
        console.log('Extracted file path:', filePath);
        try {
          url = await getSignedUrl(filePath);
          console.log('Generated signed URL for legacy document:', url);
        } catch (signedUrlError) {
          console.error('Failed to generate signed URL for legacy document:', signedUrlError);
          toast({
            title: "Error",
            description: "Failed to generate access URL for legacy document",
            variant: "destructive"
          });
          return;
        }
      }
      
      if (url) {
        console.log('Opening URL:', url);
        
        // Try to open in new window, with fallback for popup blocking
        const newWindow = window.open(url, '_blank', 'noopener,noreferrer');
        
        if (!newWindow || newWindow.closed || typeof newWindow.closed == 'undefined') {
          console.log('Popup blocked, asking user for download');
          // Popup was blocked, ask user if they want to download
          const downloadConfirm = window.confirm(
            `Popup blocked! The document "${document.title}" cannot open in a new window.\n\nWould you like to download it instead?`
          );
          
          if (downloadConfirm) {
            const link = window.document.createElement('a');
            link.href = url;
            link.download = document.title || 'document';
            link.target = '_blank';
            link.rel = 'noopener noreferrer';
            window.document.body.appendChild(link);
            link.click();
            window.document.body.removeChild(link);
            
            toast({
              title: "Download Started",
              description: "Document download has begun",
            });
          }
        } else {
          console.log('Document opened in new window');
        }
      } else {
        console.error('No URL available to open');
        toast({
          title: "Error",
          description: "No file URL available for this document",
          variant: "destructive"
        });
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
        const orgContext = createOrganizationContext(organization?.id);
        const { error } = await secureUpdate('documents', { file_url: filePath }, orgContext)
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
      const orgContext = createOrganizationContext(organization?.id);
      const { error } = await secureDelete('documents', orgContext)
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
      const orgContext = createOrganizationContext(organization?.id);
      const { data, error } = await secureUpdate('documents', updates, orgContext)
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