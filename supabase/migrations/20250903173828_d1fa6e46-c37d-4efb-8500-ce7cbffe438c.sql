-- Create storage bucket for data entry images
INSERT INTO storage.buckets (id, name, public) VALUES ('data-entry-images', 'data-entry-images', false);

-- Create storage policies for data entry images
CREATE POLICY "Users can view images in their company" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'data-entry-images' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can upload their own images" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'data-entry-images' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can update their own images" 
ON storage.objects 
FOR UPDATE 
USING (bucket_id = 'data-entry-images' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own images" 
ON storage.objects 
FOR DELETE 
USING (bucket_id = 'data-entry-images' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Create data_entry_images table
CREATE TABLE public.data_entry_images (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  record_type TEXT NOT NULL,
  record_id UUID NOT NULL,
  image_url TEXT NOT NULL,
  description TEXT,
  uploaded_by UUID REFERENCES auth.users(id),
  uploaded_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  company_id UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001'::uuid
);

-- Enable RLS on data_entry_images
ALTER TABLE public.data_entry_images ENABLE ROW LEVEL SECURITY;

-- Create policies for data_entry_images
CREATE POLICY "Company users can access their images" 
ON public.data_entry_images 
FOR ALL 
USING (company_id = get_user_company(auth.uid()));

-- Create custom_targets table
CREATE TABLE public.custom_targets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  target_type TEXT NOT NULL CHECK (target_type IN ('unit', 'flock', 'batch', 'global')),
  entity_id UUID,
  metric_name TEXT NOT NULL,
  target_value DECIMAL NOT NULL,
  effective_from DATE NOT NULL DEFAULT CURRENT_DATE,
  effective_to DATE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  company_id UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001'::uuid,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

-- Enable RLS on custom_targets
ALTER TABLE public.custom_targets ENABLE ROW LEVEL SECURITY;

-- Create policies for custom_targets
CREATE POLICY "Company users can access their targets" 
ON public.custom_targets 
FOR ALL 
USING (company_id = get_user_company(auth.uid()));

-- Create residue_analysis_schedule table
CREATE TABLE public.residue_analysis_schedule (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  batch_id UUID NOT NULL REFERENCES public.batches(id) ON DELETE CASCADE,
  scheduled_date DATE NOT NULL,
  due_date DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'overdue')),
  completed_at TIMESTAMP WITH TIME ZONE,
  completed_by UUID REFERENCES auth.users(id),
  notes TEXT,
  company_id UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001'::uuid,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on residue_analysis_schedule
ALTER TABLE public.residue_analysis_schedule ENABLE ROW LEVEL SECURITY;

-- Create policies for residue_analysis_schedule
CREATE POLICY "Company users can access their schedules" 
ON public.residue_analysis_schedule 
FOR ALL 
USING (company_id = get_user_company(auth.uid()));

-- Create function to auto-schedule residue analysis
CREATE OR REPLACE FUNCTION public.schedule_residue_analysis()
RETURNS TRIGGER AS $$
BEGIN
  -- Only schedule for batches that are setting or incubating
  IF NEW.status IN ('setting', 'incubating') AND OLD.status != NEW.status THEN
    INSERT INTO public.residue_analysis_schedule (
      batch_id,
      scheduled_date,
      due_date,
      company_id
    ) VALUES (
      NEW.id,
      NEW.set_date + INTERVAL '21 days',
      NEW.set_date + INTERVAL '23 days', -- 2 day grace period
      NEW.company_id
    )
    ON CONFLICT DO NOTHING;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for auto-scheduling
CREATE TRIGGER trigger_schedule_residue_analysis
  AFTER UPDATE ON public.batches
  FOR EACH ROW
  EXECUTE FUNCTION public.schedule_residue_analysis();

-- Create update trigger for timestamps
CREATE TRIGGER update_custom_targets_updated_at
  BEFORE UPDATE ON public.custom_targets
  FOR EACH ROW
  EXECUTE FUNCTION public.update_alert_updated_at_column();

CREATE TRIGGER update_residue_schedule_updated_at
  BEFORE UPDATE ON public.residue_analysis_schedule
  FOR EACH ROW
  EXECUTE FUNCTION public.update_alert_updated_at_column();