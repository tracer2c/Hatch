-- Create company enum types
CREATE TYPE public.subscription_type AS ENUM ('trial', 'basic', 'premium', 'enterprise');
CREATE TYPE public.company_status AS ENUM ('active', 'suspended', 'cancelled');
CREATE TYPE public.user_status AS ENUM ('active', 'inactive', 'pending');
CREATE TYPE public.user_role AS ENUM ('company_admin', 'operations_head', 'staff');

-- Create companies table
CREATE TABLE public.companies (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  domain TEXT NOT NULL UNIQUE,
  subscription_type subscription_type NOT NULL DEFAULT 'trial',
  status company_status NOT NULL DEFAULT 'active',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create user profiles table
CREATE TABLE public.user_profiles (
  id UUID NOT NULL PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  first_name TEXT,
  last_name TEXT,
  phone TEXT,
  avatar_url TEXT,
  status user_status NOT NULL DEFAULT 'active',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(email, company_id)
);

-- Create user roles table
CREATE TABLE public.user_roles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  role user_role NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, company_id, role)
);

-- Create default company for existing data
INSERT INTO public.companies (id, name, domain, subscription_type, status)
VALUES ('00000000-0000-0000-0000-000000000001', 'Default Company', 'default.com', 'enterprise', 'active');

-- Add company_id to existing tables
ALTER TABLE public.batches ADD COLUMN company_id UUID REFERENCES public.companies(id) DEFAULT '00000000-0000-0000-0000-000000000001';
ALTER TABLE public.machines ADD COLUMN company_id UUID REFERENCES public.companies(id) DEFAULT '00000000-0000-0000-0000-000000000001';
ALTER TABLE public.flocks ADD COLUMN company_id UUID REFERENCES public.companies(id) DEFAULT '00000000-0000-0000-0000-000000000001';
ALTER TABLE public.daily_checklist_items ADD COLUMN company_id UUID REFERENCES public.companies(id) DEFAULT '00000000-0000-0000-0000-000000000001';
ALTER TABLE public.sop_templates ADD COLUMN company_id UUID REFERENCES public.companies(id) DEFAULT '00000000-0000-0000-0000-000000000001';
ALTER TABLE public.alert_configs ADD COLUMN company_id UUID REFERENCES public.companies(id) DEFAULT '00000000-0000-0000-0000-000000000001';

-- Update existing tables to make company_id NOT NULL after setting defaults
ALTER TABLE public.batches ALTER COLUMN company_id SET NOT NULL;
ALTER TABLE public.machines ALTER COLUMN company_id SET NOT NULL;
ALTER TABLE public.flocks ALTER COLUMN company_id SET NOT NULL;
ALTER TABLE public.daily_checklist_items ALTER COLUMN company_id SET NOT NULL;
ALTER TABLE public.sop_templates ALTER COLUMN company_id SET NOT NULL;
ALTER TABLE public.alert_configs ALTER COLUMN company_id SET NOT NULL;

-- Enable RLS on new tables
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Create security definer function to check user roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role user_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles ur
    JOIN public.user_profiles up ON ur.user_id = up.id
    WHERE ur.user_id = _user_id
      AND ur.role = _role
  )
$$;

-- Create function to get user's company
CREATE OR REPLACE FUNCTION public.get_user_company(_user_id UUID)
RETURNS UUID
LANGUAGE SQL
STABLE
SECURITY DEFINER
AS $$
  SELECT up.company_id
  FROM public.user_profiles up
  WHERE up.id = _user_id
$$;

-- Create RLS policies for companies
CREATE POLICY "Users can view their own company" ON public.companies
  FOR SELECT USING (id = public.get_user_company(auth.uid()));

CREATE POLICY "Company admins can update their company" ON public.companies
  FOR UPDATE USING (
    id = public.get_user_company(auth.uid()) 
    AND public.has_role(auth.uid(), 'company_admin')
  );

-- Create RLS policies for user_profiles
CREATE POLICY "Users can view profiles in their company" ON public.user_profiles
  FOR SELECT USING (company_id = public.get_user_company(auth.uid()));

CREATE POLICY "Users can update their own profile" ON public.user_profiles
  FOR UPDATE USING (id = auth.uid());

CREATE POLICY "Company admins can insert new profiles" ON public.user_profiles
  FOR INSERT WITH CHECK (
    company_id = public.get_user_company(auth.uid())
    AND public.has_role(auth.uid(), 'company_admin')
  );

-- Create RLS policies for user_roles
CREATE POLICY "Users can view roles in their company" ON public.user_roles
  FOR SELECT USING (company_id = public.get_user_company(auth.uid()));

CREATE POLICY "Company admins can manage roles" ON public.user_roles
  FOR ALL USING (
    company_id = public.get_user_company(auth.uid())
    AND public.has_role(auth.uid(), 'company_admin')
  );

-- Update RLS policies for existing tables to include company isolation
DROP POLICY IF EXISTS "Allow all operations on batches" ON public.batches;
CREATE POLICY "Company users can access their batches" ON public.batches
  FOR ALL USING (company_id = public.get_user_company(auth.uid()));

DROP POLICY IF EXISTS "Allow all operations on machines" ON public.machines;
CREATE POLICY "Company users can access their machines" ON public.machines
  FOR ALL USING (company_id = public.get_user_company(auth.uid()));

DROP POLICY IF EXISTS "Allow all operations on flocks" ON public.flocks;
CREATE POLICY "Company users can access their flocks" ON public.flocks
  FOR ALL USING (company_id = public.get_user_company(auth.uid()));

DROP POLICY IF EXISTS "Allow all operations on daily_checklist_items" ON public.daily_checklist_items;
CREATE POLICY "Company users can access their checklist items" ON public.daily_checklist_items
  FOR ALL USING (company_id = public.get_user_company(auth.uid()));

DROP POLICY IF EXISTS "Allow all operations on sop_templates" ON public.sop_templates;
CREATE POLICY "Company users can access their SOP templates" ON public.sop_templates
  FOR ALL USING (company_id = public.get_user_company(auth.uid()));

DROP POLICY IF EXISTS "Allow all operations on alert_configs" ON public.alert_configs;
CREATE POLICY "Company users can access their alert configs" ON public.alert_configs
  FOR ALL USING (company_id = public.get_user_company(auth.uid()));

-- Create triggers for automatic timestamp updates
CREATE TRIGGER update_companies_updated_at
  BEFORE UPDATE ON public.companies
  FOR EACH ROW
  EXECUTE FUNCTION public.update_alert_updated_at_column();

CREATE TRIGGER update_user_profiles_updated_at
  BEFORE UPDATE ON public.user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_alert_updated_at_column();

-- Create function to handle new user registration
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
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
  
  -- Assign default role (staff)
  INSERT INTO public.user_roles (user_id, company_id, role)
  VALUES (NEW.id, target_company_id, 'staff');
  
  RETURN NEW;
END;
$$;

-- Create trigger for new user registration
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Create indexes for performance
CREATE INDEX idx_user_profiles_company_id ON public.user_profiles(company_id);
CREATE INDEX idx_user_roles_user_id ON public.user_roles(user_id);
CREATE INDEX idx_user_roles_company_id ON public.user_roles(company_id);
CREATE INDEX idx_batches_company_id ON public.batches(company_id);
CREATE INDEX idx_machines_company_id ON public.machines(company_id);
CREATE INDEX idx_flocks_company_id ON public.flocks(company_id);