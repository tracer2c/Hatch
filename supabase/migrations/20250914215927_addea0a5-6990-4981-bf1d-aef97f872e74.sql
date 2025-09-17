-- Add new alert configuration defaults for environmental monitoring
INSERT INTO public.alert_configs (
  name,
  description,
  alert_type,
  company_id,
  is_enabled
) VALUES 
(
  'CO2 Level Monitoring',
  'Monitors CO2 levels to ensure proper ventilation and air quality',
  'co2_level',
  '00000000-0000-0000-0000-000000000001',
  true
),
(
  'Ventilation Rate Monitoring', 
  'Monitors ventilation rates to ensure proper air circulation',
  'ventilation_rate',
  '00000000-0000-0000-0000-000000000001',
  true
),
(
  'Turning Frequency Monitoring',
  'Monitors egg turning frequency to ensure proper development',
  'turning_frequency', 
  '00000000-0000-0000-0000-000000000001',
  true
),
(
  'Mortality Spike Detection',
  'Detects unusual increases in mortality rates',
  'mortality_spike',
  '00000000-0000-0000-0000-000000000001', 
  true
),
(
  'Hatch Date Approaching',
  'Alerts when batches are approaching their expected hatch date',
  'hatch_approaching',
  '00000000-0000-0000-0000-000000000001',
  true
),
(
  'Batch Status Changes',
  'Alerts when batches transition between different phases',
  'batch_status_change',
  '00000000-0000-0000-0000-000000000001',
  true
);

-- Add additional columns to alerts table for enhanced monitoring
ALTER TABLE public.alerts ADD COLUMN IF NOT EXISTS co2_level numeric;
ALTER TABLE public.alerts ADD COLUMN IF NOT EXISTS ventilation_rate numeric;
ALTER TABLE public.alerts ADD COLUMN IF NOT EXISTS turning_frequency integer;
ALTER TABLE public.alerts ADD COLUMN IF NOT EXISTS mortality_count integer;