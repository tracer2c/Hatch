
-- Add Embrex/HOI support fields to batches
ALTER TABLE public.batches
  ADD COLUMN IF NOT EXISTS eggs_injected integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS chicks_hatched integer NOT NULL DEFAULT 0;
