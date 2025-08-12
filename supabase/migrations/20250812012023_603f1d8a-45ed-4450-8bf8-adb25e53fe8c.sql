BEGIN;

-- Strengthen RLS on organizations: restrict policies to authenticated role explicitly
DROP POLICY IF EXISTS "Authenticated users can create organizations" ON public.organizations;
DROP POLICY IF EXISTS "Authenticated users can update their organization" ON public.organizations;
DROP POLICY IF EXISTS "Authenticated users can view their organization" ON public.organizations;
DROP POLICY IF EXISTS "Supervisors can manage all organizations" ON public.organizations;
DROP POLICY IF EXISTS "Supervisors can view all organizations" ON public.organizations;

-- Only authenticated users can create org rows
CREATE POLICY "Authenticated users can create organizations"
ON public.organizations
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Only authenticated users can update their own (primary) organization
CREATE POLICY "Authenticated users can update their organization"
ON public.organizations
FOR UPDATE
TO authenticated
USING (id = get_user_organization_id())
WITH CHECK (id = get_user_organization_id());

-- Only authenticated users can view their own (primary) organization
CREATE POLICY "Authenticated users can view their organization"
ON public.organizations
FOR SELECT
TO authenticated
USING (id = get_user_organization_id());

-- Supervisors (authenticated) can manage all organizations
CREATE POLICY "Supervisors can manage all organizations"
ON public.organizations
FOR ALL
TO authenticated
USING (is_supervisor())
WITH CHECK (is_supervisor());

-- Supervisors (authenticated) can view all organizations
CREATE POLICY "Supervisors can view all organizations"
ON public.organizations
FOR SELECT
TO authenticated
USING (is_supervisor());

COMMIT;