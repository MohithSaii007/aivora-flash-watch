CREATE TABLE IF NOT EXISTS public.control_room_emails (
  email text PRIMARY KEY,
  role public.app_role NOT NULL DEFAULT 'admin',
  note text,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.control_room_emails TO authenticated;
GRANT ALL ON public.control_room_emails TO service_role;
ALTER TABLE public.control_room_emails ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admins manage control room allowlist"
ON public.control_room_emails FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

INSERT INTO public.control_room_emails (email, role, note) VALUES
  ('goundarsmohith@gmail.com', 'admin', 'Team AIVORA'),
  ('prasadpandu9502@gmail.com', 'admin', 'Team AIVORA'),
  ('harshithamatam19@gmail.com', 'admin', 'Team AIVORA'),
  ('kavithamurgesh220@gmail.com', 'admin', 'Team AIVORA')
ON CONFLICT (email) DO NOTHING;

DROP POLICY IF EXISTS "claim own role" ON public.user_roles;

DELETE FROM public.user_roles ur
WHERE ur.role = 'admin'
  AND NOT EXISTS (
    SELECT 1 FROM auth.users u
    JOIN public.control_room_emails c ON lower(u.email) = lower(c.email)
    WHERE u.id = ur.user_id
  );

CREATE OR REPLACE FUNCTION public.assign_my_role()
RETURNS public.app_role
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
  u_email text;
  confirmed timestamptz;
  target public.app_role;
BEGIN
  IF uid IS NULL THEN
    RAISE EXCEPTION 'not authenticated';
  END IF;

  SELECT lower(email), email_confirmed_at INTO u_email, confirmed
  FROM auth.users WHERE id = uid;

  SELECT c.role INTO target
  FROM public.control_room_emails c
  WHERE lower(c.email) = u_email;

  IF target IS NULL OR confirmed IS NULL THEN
    target := 'community';
  END IF;

  DELETE FROM public.user_roles WHERE user_id = uid AND role <> target;
  INSERT INTO public.user_roles (user_id, role)
  VALUES (uid, target)
  ON CONFLICT DO NOTHING;

  RETURN target;
END;
$$;

GRANT EXECUTE ON FUNCTION public.assign_my_role() TO authenticated;