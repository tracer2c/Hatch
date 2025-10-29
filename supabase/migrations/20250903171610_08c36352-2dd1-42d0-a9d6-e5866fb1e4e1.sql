-- Add PIP number field to residue_analysis table
ALTER TABLE public.residue_analysis 
ADD COLUMN pip_number integer NOT NULL DEFAULT 0;

-- Add 6 angle fields to qa_monitoring table for detailed angle measurements
ALTER TABLE public.qa_monitoring 
ADD COLUMN angle_top_left numeric,
ADD COLUMN angle_mid_left numeric, 
ADD COLUMN angle_bottom_left numeric,
ADD COLUMN angle_top_right numeric,
ADD COLUMN angle_mid_right numeric,
ADD COLUMN angle_bottom_right numeric;