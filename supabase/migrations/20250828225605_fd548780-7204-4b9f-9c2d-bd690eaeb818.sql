-- Add sample QA monitoring data for existing batches to enable analytics
INSERT INTO public.qa_monitoring (
  batch_id,
  temperature,
  humidity, 
  temperature_alert,
  humidity_alert,
  sanitation_check,
  equipment_status,
  notes,
  created_at
) 
SELECT 
  b.id,
  -- Temperature between 99-101°F with some variation
  ROUND((RANDOM() * 2 + 99)::numeric, 1) as temperature,
  -- Humidity between 55-65% with some variation  
  ROUND((RANDOM() * 10 + 55)::numeric, 1) as humidity,
  -- 10% chance of temperature alert
  (RANDOM() < 0.1) as temperature_alert,
  -- 5% chance of humidity alert
  (RANDOM() < 0.05) as humidity_alert,
  -- 95% chance sanitation passes
  (RANDOM() < 0.95) as sanitation_check,
  -- 90% chance equipment is good
  CASE 
    WHEN RANDOM() < 0.9 THEN 'good'
    WHEN RANDOM() < 0.97 THEN 'maintenance_needed'
    ELSE 'critical'
  END as equipment_status,
  CASE 
    WHEN RANDOM() < 0.1 THEN 'Temperature slightly elevated'
    WHEN RANDOM() < 0.2 THEN 'Humidity levels monitored'
    WHEN RANDOM() < 0.3 THEN 'Equipment check completed'
    ELSE NULL
  END as notes,
  -- Create records spread over the last few days
  NOW() - (RANDOM() * INTERVAL '7 days') as created_at
FROM public.batches b
WHERE NOT EXISTS (
  SELECT 1 FROM public.qa_monitoring qm WHERE qm.batch_id = b.id
)
LIMIT 20;