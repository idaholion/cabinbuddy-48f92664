-- Phase 2: give Richard admin access to the Master Template so it appears in his cabin switcher.
-- Not primary, so he still lands in Andrew Family Cabin by default.
INSERT INTO public.user_organizations (user_id, organization_id, role, is_primary)
SELECT 'df76de07-61a3-424d-a19f-adf56c0d940d', o.id, 'admin', false
FROM public.organizations o
WHERE o.is_template_source
  AND NOT EXISTS (SELECT 1 FROM public.user_organizations uo
                  WHERE uo.user_id = 'df76de07-61a3-424d-a19f-adf56c0d940d' AND uo.organization_id = o.id);

SELECT o.name, uo.role, uo.is_primary FROM public.user_organizations uo
JOIN public.organizations o ON o.id = uo.organization_id
WHERE uo.user_id = 'df76de07-61a3-424d-a19f-adf56c0d940d';
