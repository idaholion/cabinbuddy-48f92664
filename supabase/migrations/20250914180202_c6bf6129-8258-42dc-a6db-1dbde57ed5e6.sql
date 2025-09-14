-- Fix the backfill function to use the correct field name 'imageMarker' instead of 'marker'
CREATE OR REPLACE FUNCTION public.backfill_checklist_images()
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  checklist_record RECORD;
  item_record RECORD;
  extracted_image_url TEXT;
  marker_name TEXT;
  marker_names TEXT[];
  images_migrated INTEGER := 0;
BEGIN
  -- Loop through all custom checklists
  FOR checklist_record IN 
    SELECT id, organization_id, items, images
    FROM custom_checklists
  LOOP
    -- Process top-level images array
    IF checklist_record.images IS NOT NULL AND jsonb_array_length(checklist_record.images) > 0 THEN
      FOR extracted_image_url IN 
        SELECT value::text FROM jsonb_array_elements_text(checklist_record.images)
      LOOP
        -- Remove quotes from image URL
        extracted_image_url := trim(both '"' from extracted_image_url);
        
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
          extracted_image_url,
          COALESCE(substring(extracted_image_url from '[^/]*$'), 'unknown'),
          NULL,
          0,
          now(),
          now()
        )
        ON CONFLICT (organization_id, image_url) DO NOTHING;
        
        images_migrated := images_migrated + 1;
      END LOOP;
    END IF;
    
    -- Process individual checklist items - FIXED: Use 'imageMarker' instead of 'marker'
    IF checklist_record.items IS NOT NULL AND jsonb_array_length(checklist_record.items) > 0 THEN
      FOR item_record IN 
        SELECT 
          item->>'imageUrl' as single_image_url,
          item->>'imageMarker' as item_marker_name,  -- FIXED: Changed from 'marker' to 'imageMarker'
          item->'imageUrls' as image_urls_array
        FROM jsonb_array_elements(checklist_record.items) as item
      LOOP
        -- Process single imageUrl
        IF item_record.single_image_url IS NOT NULL AND item_record.single_image_url != '' THEN
          -- Handle comma-separated markers by taking the first one for single image
          IF item_record.item_marker_name IS NOT NULL THEN
            marker_names := string_to_array(item_record.item_marker_name, ',');
            marker_name := trim(marker_names[1]);
          ELSE
            marker_name := NULL;
          END IF;
          
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
            item_record.single_image_url,
            COALESCE(substring(item_record.single_image_url from '[^/]*$'), 'unknown'),
            marker_name,
            0,
            now(),
            now()
          )
          ON CONFLICT (organization_id, image_url) DO UPDATE SET
            marker_name = EXCLUDED.marker_name,
            updated_at = EXCLUDED.updated_at;
          
          images_migrated := images_migrated + 1;
        END IF;
        
        -- Process imageUrls array
        IF item_record.image_urls_array IS NOT NULL AND jsonb_array_length(item_record.image_urls_array) > 0 THEN
          -- Split markers by comma for multiple images
          IF item_record.item_marker_name IS NOT NULL THEN
            marker_names := string_to_array(item_record.item_marker_name, ',');
          ELSE
            marker_names := ARRAY[]::TEXT[];
          END IF;
          
          FOR i IN 0..jsonb_array_length(item_record.image_urls_array) - 1 LOOP
            extracted_image_url := trim(both '"' from (item_record.image_urls_array->>i));
            
            -- Use the corresponding marker name by index, or NULL if not available
            IF array_length(marker_names, 1) > i THEN
              marker_name := trim(marker_names[i + 1]); -- Array is 1-indexed
            ELSE
              marker_name := NULL;
            END IF;
            
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
              extracted_image_url,
              COALESCE(substring(extracted_image_url from '[^/]*$'), 'unknown'),
              marker_name,
              0,
              now(),
              now()
            )
            ON CONFLICT (organization_id, image_url) DO UPDATE SET
              marker_name = EXCLUDED.marker_name,
              updated_at = EXCLUDED.updated_at;
            
            images_migrated := images_migrated + 1;
          END LOOP;
        END IF;
      END LOOP;
    END IF;
  END LOOP;
  
  -- Update usage counts for all migrated images with proper WHERE clause
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
  updated_at = now()
  WHERE organization_id IN (
    SELECT DISTINCT organization_id FROM custom_checklists
  );
  
  RETURN images_migrated;
END;
$function$;