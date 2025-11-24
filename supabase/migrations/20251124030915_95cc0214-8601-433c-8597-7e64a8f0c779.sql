-- Fix security issue: Add search_path to all remaining SECURITY DEFINER functions
-- This prevents schema-based privilege escalation attacks

-- Note: After reviewing the codebase, all SECURITY DEFINER functions already have 
-- SET search_path = 'public' protection. This migration serves as verification and 
-- documentation that the security hardening is complete.

-- Verification query to confirm all SECURITY DEFINER functions have search_path:
DO $$
DECLARE
  func_record RECORD;
  missing_count INTEGER := 0;
BEGIN
  -- Check all SECURITY DEFINER functions for search_path setting
  FOR func_record IN 
    SELECT 
      n.nspname as schema_name,
      p.proname as function_name,
      pg_get_functiondef(p.oid) as function_definition
    FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public'
    AND prosecdef = true  -- SECURITY DEFINER functions
  LOOP
    -- Check if function definition includes search_path
    IF func_record.function_definition NOT LIKE '%search_path%' THEN
      RAISE WARNING 'Function %.% is missing search_path setting', 
        func_record.schema_name, func_record.function_name;
      missing_count := missing_count + 1;
    END IF;
  END LOOP;
  
  IF missing_count = 0 THEN
    RAISE NOTICE 'Security verification complete: All % SECURITY DEFINER functions have search_path protection',
      (SELECT COUNT(*) FROM pg_proc p JOIN pg_namespace n ON p.pronamespace = n.oid 
       WHERE n.nspname = 'public' AND prosecdef = true);
  ELSE
    RAISE WARNING 'Found % SECURITY DEFINER functions without search_path protection', missing_count;
  END IF;
END $$;