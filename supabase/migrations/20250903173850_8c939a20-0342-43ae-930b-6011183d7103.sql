-- Fix security warnings by setting search_path for all functions
ALTER FUNCTION public.schedule_residue_analysis() SET search_path = public;
ALTER FUNCTION public.update_alert_updated_at_column() SET search_path = public;
ALTER FUNCTION public.get_user_company(uuid) SET search_path = public;
ALTER FUNCTION public.has_role(uuid, user_role) SET search_path = public;