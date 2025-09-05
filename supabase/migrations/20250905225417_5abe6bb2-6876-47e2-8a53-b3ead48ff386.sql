-- Create function to migrate existing images from checklists to checklist_images table
CREATE OR REPLACE FUNCTION migrate_existing_checklist_images()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  checklist_record RECORD;
  item_record RECORD;
  image_url TEXT;
  marker_name TEXT;
  images_migrated INTEGER := 0;
BEGIN
  -- Loop through all custom checklists
  FOR checklist_record IN 
    SELECT id, organization_id, items, images
    FROM custom_checklists
  LOOP
    -- Process top-level images array
    IF checklist_record.images IS NOT NULL AND jsonb_array_length(checklist_record.images) > 0 THEN
      FOR image_url IN 
        SELECT value::text FROM jsonb_array_elements_text(checklist_record.images)
      LOOP
        -- Remove quotes from image URL
        image_url := trim(both '"' from image_url);
        
        -- Insert image if it doesn't exist
        INSERT INTO checklist_images (
          organization_id,
          image_url,
          original_filename,
          marker_name,
          usage_count,
          created_at,
          updated_at
        )
        VALUES (
          checklist_record.organization_id,
          image_url,
          COALESCE(substring(image_url from '[^/]*$'), 'unknown'),
          NULL,
          0, -- Will be updated later
          now(),
          now()
        )
        ON CONFLICT (organization_id, image_url) DO NOTHING;
        
        images_migrated := images_migrated + 1;
      END LOOP;
    END IF;
    
    -- Process individual checklist items
    IF checklist_record.items IS NOT NULL AND jsonb_array_length(checklist_record.items) > 0 THEN
      FOR item_record IN 
        SELECT 
          item->>'imageUrl' as image_url,
          item->>'marker' as marker_name,
          item->'imageUrls' as image_urls_array
        FROM jsonb_array_elements(checklist_record.items) as item
      LOOP
        -- Process single imageUrl
        IF item_record.image_url IS NOT NULL AND item_record.image_url != '' THEN
          INSERT INTO checklist_images (
            organization_id,
            image_url,
            original_filename,
            marker_name,
            usage_count,
            created_at,
            updated_at
          )
          VALUES (
            checklist_record.organization_id,
            item_record.image_url,
            COALESCE(substring(item_record.image_url from '[^/]*$'), 'unknown'),
            item_record.marker_name,
            0, -- Will be updated later
            now(),
            now()
          )
          ON CONFLICT (organization_id, image_url) DO NOTHING;
          
          images_migrated := images_migrated + 1;
        END IF;
        
        -- Process imageUrls array
        IF item_record.image_urls_array IS NOT NULL AND jsonb_array_length(item_record.image_urls_array) > 0 THEN
          FOR image_url IN 
            SELECT value::text FROM jsonb_array_elements_text(item_record.image_urls_array)
          LOOP
            -- Remove quotes from image URL
            image_url := trim(both '"' from image_url);
            
            INSERT INTO checklist_images (
              organization_id,
              image_url,
              original_filename,
              marker_name,
              usage_count,
              created_at,
              updated_at
            )
            VALUES (
              checklist_record.organization_id,
              image_url,
              COALESCE(substring(image_url from '[^/]*$'), 'unknown'),
              item_record.marker_name,
              0, -- Will be updated later
              now(),
              now()
            )
            ON CONFLICT (organization_id, image_url) DO NOTHING;
            
            images_migrated := images_migrated + 1;
          END LOOP;
        END IF;
      END LOOP;
    END IF;
  END LOOP;
  
  -- Update usage counts for all organizations
  UPDATE checklist_images 
  SET usage_count = (
    SELECT COUNT(*)
    FROM custom_checklists cc
    WHERE cc.organization_id = checklist_images.organization_id
    AND (
      -- Check top-level images array
      (cc.images IS NOT NULL AND cc.images::text LIKE '%' || checklist_images.image_url || '%')
      OR
      -- Check individual item imageUrls and imageUrl
      (cc.items IS NOT NULL AND cc.items::text LIKE '%' || checklist_images.image_url || '%')
    )
  ),
  updated_at = now();
  
  RETURN images_migrated;
END;
$function$;

-- Add unique constraint to prevent duplicate images per organization
ALTER TABLE checklist_images 
ADD CONSTRAINT IF NOT EXISTS checklist_images_org_url_unique 
UNIQUE (organization_id, image_url);

-- Run the migration function
SELECT migrate_existing_checklist_images() as images_migrated;