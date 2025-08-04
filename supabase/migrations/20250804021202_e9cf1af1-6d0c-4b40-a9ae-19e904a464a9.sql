-- Create storage buckets for photos and receipts
INSERT INTO storage.buckets (id, name, public) VALUES ('photos', 'photos', true);
INSERT INTO storage.buckets (id, name, public) VALUES ('receipt-images', 'receipt-images', false);

-- Create photos table for photo metadata
CREATE TABLE public.photos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  organization_id UUID NOT NULL,
  image_url TEXT NOT NULL,
  caption TEXT,
  likes_count INTEGER NOT NULL DEFAULT 0,
  liked_by_users TEXT[] DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on photos table
ALTER TABLE public.photos ENABLE ROW LEVEL SECURITY;

-- Create comments table for photo comments
CREATE TABLE public.photo_comments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  photo_id UUID NOT NULL REFERENCES public.photos(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  organization_id UUID NOT NULL,
  comment TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on photo_comments table
ALTER TABLE public.photo_comments ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for photos
CREATE POLICY "Users can view their organization's photos" 
ON public.photos 
FOR SELECT 
USING (organization_id = get_user_organization_id());

CREATE POLICY "Users can create photos for their organization" 
ON public.photos 
FOR INSERT 
WITH CHECK (auth.uid() = user_id AND organization_id = get_user_organization_id());

CREATE POLICY "Users can update their own photos" 
ON public.photos 
FOR UPDATE 
USING (auth.uid() = user_id AND organization_id = get_user_organization_id());

CREATE POLICY "Users can delete their own photos" 
ON public.photos 
FOR DELETE 
USING (auth.uid() = user_id AND organization_id = get_user_organization_id());

-- Create RLS policies for photo comments
CREATE POLICY "Users can view their organization's photo comments" 
ON public.photo_comments 
FOR SELECT 
USING (organization_id = get_user_organization_id());

CREATE POLICY "Users can create comments for their organization" 
ON public.photo_comments 
FOR INSERT 
WITH CHECK (auth.uid() = user_id AND organization_id = get_user_organization_id());

CREATE POLICY "Users can update their own comments" 
ON public.photo_comments 
FOR UPDATE 
USING (auth.uid() = user_id AND organization_id = get_user_organization_id());

CREATE POLICY "Users can delete their own comments" 
ON public.photo_comments 
FOR DELETE 
USING (auth.uid() = user_id AND organization_id = get_user_organization_id());

-- Create storage policies for photos bucket
CREATE POLICY "Users can view their organization's photos" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'photos');

CREATE POLICY "Users can upload photos" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'photos' AND auth.uid() IS NOT NULL);

CREATE POLICY "Users can update their own photos" 
ON storage.objects 
FOR UPDATE 
USING (bucket_id = 'photos' AND auth.uid() IS NOT NULL);

CREATE POLICY "Users can delete their own photos" 
ON storage.objects 
FOR DELETE 
USING (bucket_id = 'photos' AND auth.uid() IS NOT NULL);

-- Create storage policies for receipt-images bucket
CREATE POLICY "Users can view their organization's receipt images" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'receipt-images' AND auth.uid() IS NOT NULL);

CREATE POLICY "Users can upload receipt images" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'receipt-images' AND auth.uid() IS NOT NULL);

CREATE POLICY "Users can update their own receipt images" 
ON storage.objects 
FOR UPDATE 
USING (bucket_id = 'receipt-images' AND auth.uid() IS NOT NULL);

CREATE POLICY "Users can delete their own receipt images" 
ON storage.objects 
FOR DELETE 
USING (bucket_id = 'receipt-images' AND auth.uid() IS NOT NULL);

-- Add supervisor policies for photos
CREATE POLICY "Supervisors can manage all photos" 
ON public.photos 
FOR ALL 
USING (is_supervisor());

CREATE POLICY "Supervisors can manage all photo comments" 
ON public.photo_comments 
FOR ALL 
USING (is_supervisor());

-- Create trigger for updating updated_at timestamp
CREATE TRIGGER update_photos_updated_at
BEFORE UPDATE ON public.photos
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();