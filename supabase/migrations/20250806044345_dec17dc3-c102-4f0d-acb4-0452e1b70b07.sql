-- Add HOI (Hatch of Incubated) and I/F dev. (Infertile/Fertile development) fields to fertility_analysis table
ALTER TABLE public.fertility_analysis 
ADD COLUMN hoi_percent numeric,
ADD COLUMN if_dev_percent numeric;