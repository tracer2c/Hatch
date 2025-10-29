-- Add mid_dead column to residue_analysis table
ALTER TABLE public.residue_analysis 
ADD COLUMN mid_dead integer NOT NULL DEFAULT 0;

-- Update existing records to ensure mid_dead has a value
UPDATE public.residue_analysis 
SET mid_dead = 0 
WHERE mid_dead IS NULL;