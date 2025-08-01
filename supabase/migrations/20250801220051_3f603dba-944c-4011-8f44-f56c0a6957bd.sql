-- Add rvandrew@outlook.com as a supervisor
INSERT INTO public.supervisors (email, name, is_active)
VALUES ('rvandrew@outlook.com', 'Randy Andrews', true)
ON CONFLICT (email) DO UPDATE 
SET is_active = true, name = 'Randy Andrews';