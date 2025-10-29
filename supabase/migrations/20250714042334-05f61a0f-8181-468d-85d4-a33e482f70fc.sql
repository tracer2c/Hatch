-- Update the handle_new_user function to assign company_admin role by default
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
  company_domain TEXT;
  target_company_id UUID;
BEGIN
  -- Extract domain from email
  company_domain := split_part(NEW.email, '@', 2);
  
  -- Find company by domain
  SELECT id INTO target_company_id
  FROM public.companies
  WHERE domain = company_domain;
  
  -- If no company found, use default company
  IF target_company_id IS NULL THEN
    target_company_id := '00000000-0000-0000-0000-000000000001';
  END IF;
  
  -- Insert user profile
  INSERT INTO public.user_profiles (
    id, 
    company_id, 
    email, 
    first_name, 
    last_name
  ) VALUES (
    NEW.id,
    target_company_id,
    NEW.email,
    NEW.raw_user_meta_data ->> 'first_name',
    NEW.raw_user_meta_data ->> 'last_name'
  );
  
  -- Assign company_admin role by default (changed from staff)
  INSERT INTO public.user_roles (user_id, company_id, role)
  VALUES (NEW.id, target_company_id, 'company_admin');
  
  RETURN NEW;
END;
$function$;

-- Update all existing users from staff to company_admin
UPDATE public.user_roles 
SET role = 'company_admin' 
WHERE role = 'staff';