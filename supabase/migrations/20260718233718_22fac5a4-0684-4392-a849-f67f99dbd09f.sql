
ALTER TABLE public.reservations
  ADD COLUMN IF NOT EXISTS edited_by_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE public.checkin_sessions
  ADD COLUMN IF NOT EXISTS edited_by_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

CREATE OR REPLACE FUNCTION public.user_has_delegate_permission(
  _user_id uuid,
  _organization_id uuid,
  _family_group_name text,
  _permission text
) RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_email text;
  hm jsonb;
  member jsonb;
  idx int := 0;
BEGIN
  IF _user_id IS NULL OR _organization_id IS NULL OR _family_group_name IS NULL THEN
    RETURN false;
  END IF;

  SELECT email INTO user_email FROM auth.users WHERE id = _user_id;

  SELECT host_members INTO hm
  FROM family_groups
  WHERE organization_id = _organization_id
    AND name = _family_group_name;

  IF hm IS NULL OR jsonb_typeof(hm) <> 'array' THEN
    RETURN false;
  END IF;

  FOR member IN SELECT * FROM jsonb_array_elements(hm) LOOP
    IF (member->>'user_id' = _user_id::text)
       OR (user_email IS NOT NULL AND lower(coalesce(member->>'email','')) = lower(user_email))
    THEN
      IF idx = 0 THEN
        RETURN true;
      END IF;
      IF coalesce((member->>_permission)::boolean, false) THEN
        RETURN true;
      END IF;
    END IF;
    idx := idx + 1;
  END LOOP;

  RETURN false;
END;
$$;

GRANT EXECUTE ON FUNCTION public.user_has_delegate_permission(uuid, uuid, text, text) TO authenticated;

-- Backfill: temporarily disable the bulk-update guard so we can seed defaults
ALTER TABLE public.family_groups DISABLE TRIGGER USER;

UPDATE public.family_groups
SET host_members = (
  SELECT jsonb_agg(
    CASE
      WHEN jsonb_typeof(member) = 'object' THEN
        member
          || jsonb_build_object('canEditReservations', coalesce((member->>'canEditReservations')::boolean, true))
          || jsonb_build_object('canEditDailyFinal',   coalesce((member->>'canEditDailyFinal')::boolean, true))
          || jsonb_build_object('canEditStayHistory',  coalesce((member->>'canEditStayHistory')::boolean, true))
      ELSE member
    END
  )
  FROM jsonb_array_elements(host_members) AS member
)
WHERE host_members IS NOT NULL
  AND jsonb_typeof(host_members) = 'array';

ALTER TABLE public.family_groups ENABLE TRIGGER USER;
