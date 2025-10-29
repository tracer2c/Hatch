-- Create SOP and Daily Checklist Schema
-- First, add the new alert type for checklist incomplete
ALTER TYPE public.alert_type ADD VALUE 'checklist_incomplete';

-- SOP Templates table - stores Standard Operating Procedure templates
CREATE TABLE public.sop_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL DEFAULT 'daily_checklist', -- 'daily_checklist', 'troubleshooting', 'training', 'maintenance'
  day_of_incubation INTEGER, -- NULL for general SOPs, specific day for day-specific procedures
  content JSONB, -- Structured content for complex SOPs
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Daily Checklist Items table - individual checklist items within SOPs
CREATE TABLE public.daily_checklist_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  sop_template_id UUID REFERENCES public.sop_templates(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  order_index INTEGER NOT NULL DEFAULT 0,
  is_required BOOLEAN NOT NULL DEFAULT true,
  applicable_days INTEGER[] NOT NULL DEFAULT '{1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21}', -- Days of incubation this applies to
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Checklist Completions table - tracks when checklist items are completed
CREATE TABLE public.checklist_completions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  checklist_item_id UUID REFERENCES public.daily_checklist_items(id) ON DELETE CASCADE NOT NULL,
  batch_id UUID REFERENCES public.batches(id) ON DELETE CASCADE NOT NULL,
  completed_by TEXT NOT NULL,
  completed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  day_of_incubation INTEGER NOT NULL,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  -- Ensure one completion per item per batch per day
  UNIQUE(checklist_item_id, batch_id, day_of_incubation)
);

-- Enable RLS on all tables
ALTER TABLE public.sop_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_checklist_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.checklist_completions ENABLE ROW LEVEL SECURITY;

-- Create RLS policies (allowing all operations for now)
CREATE POLICY "Allow all operations on sop_templates" ON public.sop_templates FOR ALL USING (true);
CREATE POLICY "Allow all operations on daily_checklist_items" ON public.daily_checklist_items FOR ALL USING (true);
CREATE POLICY "Allow all operations on checklist_completions" ON public.checklist_completions FOR ALL USING (true);

-- Create update triggers for updated_at columns
CREATE TRIGGER update_sop_templates_updated_at
  BEFORE UPDATE ON public.sop_templates
  FOR EACH ROW
  EXECUTE FUNCTION public.update_alert_updated_at_column();

CREATE TRIGGER update_daily_checklist_items_updated_at
  BEFORE UPDATE ON public.daily_checklist_items
  FOR EACH ROW
  EXECUTE FUNCTION public.update_alert_updated_at_column();

-- Create indexes for better performance
CREATE INDEX idx_sop_templates_category ON public.sop_templates(category);
CREATE INDEX idx_sop_templates_day_incubation ON public.sop_templates(day_of_incubation);
CREATE INDEX idx_daily_checklist_items_sop_template ON public.daily_checklist_items(sop_template_id);
CREATE INDEX idx_daily_checklist_items_applicable_days ON public.daily_checklist_items USING GIN(applicable_days);
CREATE INDEX idx_checklist_completions_batch_day ON public.checklist_completions(batch_id, day_of_incubation);
CREATE INDEX idx_checklist_completions_item ON public.checklist_completions(checklist_item_id);

-- Insert some sample SOP templates and checklist items
INSERT INTO public.sop_templates (title, description, category, day_of_incubation) VALUES
('Daily Incubation Checklist', 'Standard daily checks for incubating eggs', 'daily_checklist', NULL),
('Day 7 Candling Procedure', 'First candling and infertile egg removal', 'daily_checklist', 7),
('Day 14 Candling Procedure', 'Second candling procedure', 'daily_checklist', 14),
('Day 18 Transfer Procedure', 'Transfer eggs to hatcher', 'daily_checklist', 18);

-- Insert sample checklist items for daily routine
INSERT INTO public.daily_checklist_items (sop_template_id, title, description, order_index, applicable_days) 
SELECT 
  st.id,
  unnest(ARRAY[
    'Check Temperature Reading',
    'Check Humidity Level', 
    'Verify Turning Mechanism',
    'Check Ventilation System',
    'Record Mortality Count',
    'Clean and Sanitize Area',
    'Document Observations'
  ]),
  unnest(ARRAY[
    'Verify temperature is within optimal range (99.5°F)',
    'Ensure humidity is at proper level for incubation stage',
    'Confirm eggs are turning properly every 2 hours',
    'Check air circulation and ventilation rates',
    'Count and remove any dead embryos found',
    'Clean incubator surfaces and surrounding area',
    'Record any abnormal observations or concerns'
  ]),
  unnest(ARRAY[1, 2, 3, 4, 5, 6, 7]),
  '{1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21}'::integer[]
FROM public.sop_templates st 
WHERE st.title = 'Daily Incubation Checklist';

-- Insert Day 7 candling checklist items
INSERT INTO public.daily_checklist_items (sop_template_id, title, description, order_index, applicable_days)
SELECT 
  st.id,
  unnest(ARRAY[
    'Prepare Candling Equipment',
    'Candle All Eggs',
    'Mark Infertile Eggs',
    'Remove Clear Eggs',
    'Update Batch Records'
  ]),
  unnest(ARRAY[
    'Set up candling light and prepare workspace',
    'Examine each egg for development signs',
    'Mark eggs showing no development',
    'Remove and count infertile eggs',
    'Update batch fertility tracking records'
  ]),
  unnest(ARRAY[1, 2, 3, 4, 5]),
  '{7}'::integer[]
FROM public.sop_templates st 
WHERE st.title = 'Day 7 Candling Procedure';