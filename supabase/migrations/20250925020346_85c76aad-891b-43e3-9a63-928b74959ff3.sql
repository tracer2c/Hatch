-- Add hatchability metrics to residue_analysis table
ALTER TABLE public.residue_analysis 
ADD COLUMN sample_size integer DEFAULT 648,
ADD COLUMN fertile_eggs integer DEFAULT 0,
ADD COLUMN hatch_percent numeric DEFAULT 0,
ADD COLUMN hof_percent numeric DEFAULT 0,
ADD COLUMN hoi_percent numeric DEFAULT 0,
ADD COLUMN if_dev_percent numeric DEFAULT 0;