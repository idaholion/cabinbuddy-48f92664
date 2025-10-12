-- First, remove duplicate profiles keeping only the most recent one per user_id
WITH ranked_profiles AS (
  SELECT id, user_id, 
    ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY updated_at DESC, created_at DESC) as rn
  FROM public.profiles
)
DELETE FROM public.profiles
WHERE id IN (
  SELECT id FROM ranked_profiles WHERE rn > 1
);

-- Now add the unique constraint
ALTER TABLE public.profiles 
ADD CONSTRAINT profiles_user_id_key UNIQUE (user_id);