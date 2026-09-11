REVOKE ALL ON FUNCTION public.assign_my_role() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.assign_my_role() FROM anon;
GRANT EXECUTE ON FUNCTION public.assign_my_role() TO authenticated;