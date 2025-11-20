import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useOrganization } from '@/hooks/useOrganization';
import { useToast } from '@/hooks/use-toast';
import { secureSelect, secureInsert, secureUpdate, secureDelete, createOrganizationContext } from '@/lib/secure-queries';

export interface Photo {
  id: string;
  image_url: string;
  caption: string;
  likes_count: number;
  liked_by_users: string[];
  created_at: string;
  user_id: string;
  organization_id: string;
}

export interface PhotoComment {
  id: string;
  photo_id: string;
  comment: string;
  created_at: string;
  user_id: string;
  organization_id: string;
}

export const usePhotos = () => {
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const { organization } = useOrganization();
  const { toast } = useToast();

  const fetchPhotos = async () => {
    if (!organization?.id) return;
    
    try {
      const orgContext = createOrganizationContext(organization.id);
      const { data, error } = await secureSelect('photos', orgContext)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setPhotos(data || []);
    } catch (error) {
      console.error('Error fetching photos:', error);
      toast({
        title: "Error",
        description: "Failed to load photos",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const uploadPhoto = async (file: File, caption: string) => {
    if (!user || !organization?.id) return;

    try {
      // Upload image to storage
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/${Date.now()}.${fileExt}`;
      
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('photos')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('photos')
        .getPublicUrl(fileName);

      // Insert photo record
      const orgContext = createOrganizationContext(organization.id);
      const { data, error } = await secureInsert('photos', {
        user_id: user.id,
        image_url: publicUrl,
        caption
      }, orgContext)
        .select()
        .single();

      if (error) throw error;

      setPhotos(prev => [data, ...prev]);
      toast({
        title: "Success",
        description: "Photo uploaded successfully"
      });

      return data;
    } catch (error) {
      console.error('Error uploading photo:', error);
      toast({
        title: "Error",
        description: "Failed to upload photo",
        variant: "destructive"
      });
      throw error;
    }
  };

  const likePhoto = async (photoId: string) => {
    if (!user) return;

    try {
      const photo = photos.find(p => p.id === photoId);
      if (!photo) return;

      const hasLiked = photo.liked_by_users.includes(user.id);
      const newLikedBy = hasLiked 
        ? photo.liked_by_users.filter(id => id !== user.id)
        : [...photo.liked_by_users, user.id];

      const orgContext = createOrganizationContext(organization?.id);
      const { error } = await secureUpdate('photos', {
        likes_count: newLikedBy.length,
        liked_by_users: newLikedBy
      }, orgContext)
        .eq('id', photoId);

      if (error) throw error;

      setPhotos(prev => prev.map(p => 
        p.id === photoId 
          ? { ...p, likes_count: newLikedBy.length, liked_by_users: newLikedBy }
          : p
      ));
    } catch (error) {
      console.error('Error liking photo:', error);
      toast({
        title: "Error",
        description: "Failed to like photo",
        variant: "destructive"
      });
    }
  };

  const deletePhoto = async (photoId: string) => {
    if (!user) return;

    try {
      const photo = photos.find(p => p.id === photoId);
      if (!photo) return;

      // Delete from storage
      const fileName = photo.image_url.split('/').pop();
      if (fileName) {
        await supabase.storage
          .from('photos')
          .remove([`${user.id}/${fileName}`]);
      }

      // Delete from database
      const orgContext = createOrganizationContext(organization?.id);
      const { error } = await secureDelete('photos', orgContext)
        .eq('id', photoId);

      if (error) throw error;

      setPhotos(prev => prev.filter(p => p.id !== photoId));
      toast({
        title: "Success",
        description: "Photo deleted successfully"
      });
    } catch (error) {
      console.error('Error deleting photo:', error);
      toast({
        title: "Error",
        description: "Failed to delete photo",
        variant: "destructive"
      });
    }
  };

  useEffect(() => {
    fetchPhotos();
  }, [organization?.id]);

  return {
    photos,
    loading,
    uploadPhoto,
    likePhoto,
    deletePhoto,
    refetch: fetchPhotos
  };
};