import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useOrganization } from './useOrganization';
import { useToast } from '@/hooks/use-toast';

interface ChecklistImage {
  id: string;
  original_filename: string;
  image_url: string;
  marker_name?: string;
  usage_count: number;
  file_size?: number;
  content_type?: string;
  uploaded_by_user_id?: string;
  created_at: string;
  updated_at: string;
}

interface ImageUsageInfo {
  checklist_id: string;
  checklist_type: string;
  location: 'top_level' | 'item';
  item_text?: string;
}

interface RpcResponse {
  success: boolean;
  error?: string;
  affected_checklists?: number;
  usage_count?: number;
  requires_force?: boolean;
  message?: string;
  previous_usage_count?: number;
}

export const useImageLibrary = () => {
  const [images, setImages] = useState<ChecklistImage[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const { organization } = useOrganization();
  const { toast } = useToast();

  const fetchImages = async () => {
    if (!organization?.id) {
      return;
    }

    // CRITICAL FIX: Check auth state before making database calls
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      console.error('📸 [useImageLibrary] No authenticated session found');
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('checklist_images')
        .select('*')
        .eq('organization_id', organization.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('📸 [useImageLibrary] Error fetching images:', error);
        return;
      }

      setImages(data || []);
    } catch (error) {
      console.error('📸 [useImageLibrary] Exception fetching images:', error);
      toast({
        title: "Error",
        description: "Failed to fetch image library",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const updateUsageCounts = async () => {
    if (!organization?.id) return;

    try {
      const { error } = await supabase.rpc('update_image_usage_counts', {
        p_organization_id: organization.id
      });

      if (error) throw error;
      
      // Refresh images to get updated counts
      await fetchImages();
    } catch (error) {
      console.error('Error updating usage counts:', error);
    }
  };

  const getImageUsage = async (imageUrl: string): Promise<ImageUsageInfo[]> => {
    if (!organization?.id) return [];

    try {
      const { data: checklists, error } = await supabase
        .from('custom_checklists')
        .select('id, checklist_type, items, images')
        .eq('organization_id', organization.id);

      if (error) throw error;

      const usage: ImageUsageInfo[] = [];

      checklists?.forEach(checklist => {
        // Check top-level images
        if (checklist.images && Array.isArray(checklist.images)) {
          if (checklist.images.includes(imageUrl)) {
            usage.push({
              checklist_id: checklist.id,
              checklist_type: checklist.checklist_type,
              location: 'top_level'
            });
          }
        }

        // Check individual item imageUrls
        if (checklist.items && Array.isArray(checklist.items)) {
          checklist.items.forEach((item: any) => {
            if (item.imageUrls && Array.isArray(item.imageUrls)) {
              if (item.imageUrls.includes(imageUrl)) {
                usage.push({
                  checklist_id: checklist.id,
                  checklist_type: checklist.checklist_type,
                  location: 'item',
                  item_text: item.text || 'Unnamed item'
                });
              }
            }
          });
        }
      });

      return usage;
    } catch (error) {
      console.error('Error getting image usage:', error);
      return [];
    }
  };

  const replaceImageGlobally = async (oldImageUrl: string, newImageUrl: string) => {
    if (!organization?.id) return { success: false };

    try {
      const { data, error } = await supabase.rpc('replace_image_globally', {
        p_organization_id: organization.id,
        p_old_image_url: oldImageUrl,
        p_new_image_url: newImageUrl
      });

      if (error) throw error;

      const response = data as unknown as RpcResponse;
      if (response?.success) {
        toast({
          title: "Success",
          description: `Image replaced in ${response.affected_checklists} checklist(s)`,
        });
        await fetchImages();
        return { success: true, affectedChecklists: response.affected_checklists };
      } else {
        throw new Error(response?.error || 'Failed to replace image');
      }
    } catch (error) {
      console.error('Error replacing image:', error);
      toast({
        title: "Error",
        description: "Failed to replace image globally",
        variant: "destructive",
      });
      return { success: false };
    }
  };

  const deleteImageSafely = async (imageUrl: string, forceDelete = false) => {
    if (!organization?.id) return { success: false };

    try {
      const { data, error } = await supabase.rpc('delete_image_safely', {
        p_organization_id: organization.id,
        p_image_url: imageUrl,
        p_force_delete: forceDelete
      });

      if (error) throw error;

      const response = data as unknown as RpcResponse;
      if (response?.success) {
        toast({
          title: "Success",
          description: "Image deleted successfully",
        });
        await fetchImages();
        return { success: true };
      } else if (response?.requires_force) {
        return { 
          success: false, 
          requiresForce: true, 
          usageCount: response.usage_count 
        };
      } else {
        throw new Error(response?.error || 'Failed to delete image');
      }
    } catch (error) {
      console.error('Error deleting image:', error);
      toast({
        title: "Error",
        description: "Failed to delete image",
        variant: "destructive",
      });
      return { success: false };
    }
  };

  const addImageToLibrary = async (
    imageUrl: string, 
    originalFilename: string, 
    markerName?: string,
    fileSize?: number,
    contentType?: string
  ) => {
    if (!organization?.id) return;

    try {
      const { error } = await supabase
        .from('checklist_images')
        .insert({
          organization_id: organization.id,
          image_url: imageUrl,
          original_filename: originalFilename,
          marker_name: markerName,
          file_size: fileSize,
          content_type: contentType,
          uploaded_by_user_id: (await supabase.auth.getUser()).data.user?.id
        });

      if (error) throw error;
      
      await updateUsageCounts();
    } catch (error) {
      console.error('Error adding image to library:', error);
      toast({
        title: "Error",
        description: "Failed to add image to library",
        variant: "destructive",
      });
    }
  };

  const filteredImages = images.filter(image => {
    const searchLower = searchTerm.toLowerCase();
    return (
      image.original_filename.toLowerCase().includes(searchLower) ||
      image.marker_name?.toLowerCase().includes(searchLower) ||
      false
    );
  });

  useEffect(() => {
    fetchImages();
  }, [organization?.id]);

  return {
    images: filteredImages,
    loading,
    searchTerm,
    setSearchTerm,
    fetchImages,
    updateUsageCounts,
    getImageUsage,
    replaceImageGlobally,
    deleteImageSafely,
    addImageToLibrary,
    totalImages: images.length
  };
};