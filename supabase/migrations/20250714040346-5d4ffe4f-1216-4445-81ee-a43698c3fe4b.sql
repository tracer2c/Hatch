-- Insert default admin user (this will be created through the auth system)
-- We'll insert the auth user first, then the profile will be created by the trigger

-- Insert default admin user into auth.users (using the auth API later)
-- For now, let's just ensure we have the user profile and role ready

-- Insert default admin profile (assuming the auth user with this ID will be created)
INSERT INTO public.user_profiles (
  id, 
  company_id, 
  email, 
  first_name, 
  last_name,
  status
) VALUES (
  '00000000-0000-0000-0000-000000000002'::uuid,
  '00000000-0000-0000-0000-000000000001'::uuid,
  'admin@example.com',
  'Default',
  'Admin',
  'active'
) ON CONFLICT (id) DO NOTHING;

-- Assign admin role to default admin
INSERT INTO public.user_roles (
  user_id, 
  company_id, 
  role
) VALUES (
  '00000000-0000-0000-0000-000000000002'::uuid,
  '00000000-0000-0000-0000-000000000001'::uuid,
  'company_admin'
) ON CONFLICT (user_id, company_id, role) DO NOTHING;