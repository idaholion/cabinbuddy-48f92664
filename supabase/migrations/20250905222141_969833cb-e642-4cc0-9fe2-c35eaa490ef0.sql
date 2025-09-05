-- Create centralized images table
CREATE TABLE public.checklist_images (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL,
  original_filename TEXT NOT NULL,
  image_url TEXT NOT NULL,
  marker_name TEXT,
  usage_count INTEGER NOT NULL DEFAULT 0,
  file_size BIGINT,
  content_type TEXT,
  uploaded_by_user_id UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.checklist_images ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their organization's images" 
ON public.checklist_images 
FOR SELECT 
USING (organization_id = get_user_organization_id());

CREATE POLICY "Users can create images for their organization" 
ON public.checklist_images 
FOR INSERT 
WITH CHECK (organization_id = get_user_organization_id());

CREATE POLICY "Users can update their organization's images" 
ON public.checklist_images 
FOR UPDATE 
USING (organization_id = get_user_organization_id());

CREATE POLICY "Users can delete their organization's images" 
ON public.checklist_images 
FOR DELETE 
USING (organization_id = get_user_organization_id());

CREATE POLICY "Supervisors can manage all images" 
ON public.checklist_images 
FOR ALL 
USING (is_supervisor());

-- Create function to update image usage counts
CREATE OR REPLACE FUNCTION public.update_image_usage_counts(p_organization_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Update usage counts for all images in the organization
  UPDATE checklist_images 
  SET usage_count = (
    SELECT COUNT(*)
    FROM custom_checklists cc
    WHERE cc.organization_id = p_organization_id
    AND (
      -- Check top-level images array
      (cc.images IS NOT NULL AND cc.images::text LIKE '%' || checklist_images.image_url || '%')
      OR
      -- Check individual item imageUrls
      (cc.items IS NOT NULL AND cc.items::text LIKE '%' || checklist_images.image_url || '%')
    )
  ),
  updated_at = now()
  WHERE organization_id = p_organization_id;
END;
$$;

-- Create function to replace image globally
CREATE OR REPLACE FUNCTION public.replace_image_globally(
  p_organization_id UUID,
  p_old_image_url TEXT,
  p_new_image_url TEXT
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  affected_checklists INTEGER := 0;
BEGIN
  -- Verify organization access
  IF NOT validate_organization_access(p_organization_id, 'replace_image') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Access denied');
  END IF;

  -- Update top-level images arrays
  UPDATE custom_checklists 
  SET images = (
    SELECT jsonb_agg(
      CASE 
        WHEN value::text = ('"' || p_old_image_url || '"') 
        THEN to_jsonb(p_new_image_url)
        ELSE value
      END
    )
    FROM jsonb_array_elements(COALESCE(images, '[]'::jsonb)) AS value
  ),
  updated_at = now()
  WHERE organization_id = p_organization_id 
    AND images IS NOT NULL
    AND images::text LIKE '%' || p_old_image_url || '%';

  GET DIAGNOSTICS affected_checklists = ROW_COUNT;

  -- Update individual item imageUrls
  UPDATE custom_checklists 
  SET items = (
    SELECT jsonb_agg(
      CASE 
        WHEN item ? 'imageUrls' THEN
          jsonb_set(
            item, 
            '{imageUrls}', 
            (
              SELECT jsonb_agg(
                CASE 
                  WHEN url::text = ('"' || p_old_image_url || '"') 
                  THEN to_jsonb(p_new_image_url)
                  ELSE url
                END
              )
              FROM jsonb_array_elements(COALESCE(item->'imageUrls', '[]'::jsonb)) AS url
            )
          )
        ELSE item
      END
    )
    FROM jsonb_array_elements(COALESCE(items, '[]'::jsonb)) AS item
  ),
  updated_at = now()
  WHERE organization_id = p_organization_id 
    AND items IS NOT NULL
    AND items::text LIKE '%' || p_old_image_url || '%';

  -- Update the images table
  UPDATE checklist_images 
  SET image_url = p_new_image_url, updated_at = now()
  WHERE organization_id = p_organization_id AND image_url = p_old_image_url;

  -- Refresh usage counts
  PERFORM update_image_usage_counts(p_organization_id);

  RETURN jsonb_build_object(
    'success', true, 
    'affected_checklists', affected_checklists,
    'message', 'Image replaced successfully'
  );
END;
$$;

-- Create function to safely delete image
CREATE OR REPLACE FUNCTION public.delete_image_safely(
  p_organization_id UUID,
  p_image_url TEXT,
  p_force_delete BOOLEAN DEFAULT false
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  usage_count INTEGER;
  affected_checklists INTEGER := 0;
BEGIN
  -- Verify organization access
  IF NOT validate_organization_access(p_organization_id, 'delete_image') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Access denied');
  END IF;

  -- Check current usage
  SELECT COUNT(*) INTO usage_count
  FROM custom_checklists cc
  WHERE cc.organization_id = p_organization_id
  AND (
    (cc.images IS NOT NULL AND cc.images::text LIKE '%' || p_image_url || '%')
    OR
    (cc.items IS NOT NULL AND cc.items::text LIKE '%' || p_image_url || '%')
  );

  -- If image is in use and not force delete, return usage info
  IF usage_count > 0 AND NOT p_force_delete THEN
    RETURN jsonb_build_object(
      'success', false, 
      'error', 'Image is currently in use',
      'usage_count', usage_count,
      'requires_force', true
    );
  END IF;

  -- Remove from top-level images arrays
  UPDATE custom_checklists 
  SET images = (
    SELECT jsonb_agg(value)
    FROM jsonb_array_elements(COALESCE(images, '[]'::jsonb)) AS value
    WHERE value::text != ('"' || p_image_url || '"')
  ),
  updated_at = now()
  WHERE organization_id = p_organization_id 
    AND images IS NOT NULL
    AND images::text LIKE '%' || p_image_url || '%';

  -- Remove from individual item imageUrls
  UPDATE custom_checklists 
  SET items = (
    SELECT jsonb_agg(
      CASE 
        WHEN item ? 'imageUrls' THEN
          jsonb_set(
            item, 
            '{imageUrls}', 
            (
              SELECT jsonb_agg(url)
              FROM jsonb_array_elements(COALESCE(item->'imageUrls', '[]'::jsonb)) AS url
              WHERE url::text != ('"' || p_image_url || '"')
            )
          )
        ELSE item
      END
    )
    FROM jsonb_array_elements(COALESCE(items, '[]'::jsonb)) AS item
  ),
  updated_at = now()
  WHERE organization_id = p_organization_id 
    AND items IS NOT NULL
    AND items::text LIKE '%' || p_image_url || '%';

  -- Remove from images table
  DELETE FROM checklist_images 
  WHERE organization_id = p_organization_id AND image_url = p_image_url;

  RETURN jsonb_build_object(
    'success', true, 
    'message', 'Image deleted successfully',
    'previous_usage_count', usage_count
  );
END;
$$;

-- Create trigger to update timestamps
CREATE OR REPLACE FUNCTION public.update_checklist_images_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_checklist_images_updated_at
  BEFORE UPDATE ON public.checklist_images
  FOR EACH ROW
  EXECUTE FUNCTION public.update_checklist_images_updated_at();