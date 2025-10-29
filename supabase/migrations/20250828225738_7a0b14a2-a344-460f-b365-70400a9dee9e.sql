-- Add sample QA monitoring data for existing batches to enable analytics
-- Using only the columns that exist in the table structure
INSERT INTO public.qa_monitoring (
  batch_id,
  temperature,
  humidity,
  check_date,
  check_time,
  day_of_incubation,
  inspector_name,
  notes,
  created_at
) 
SELECT 
  b.id,
  -- Temperature between 99-101°F with some variation
  ROUND((RANDOM() * 2 + 99)::numeric, 1) as temperature,
  -- Humidity between 55-65% with some variation  
  ROUND((RANDOM() * 10 + 55)::numeric, 1) as humidity,
  -- Check date within the last week
  CURRENT_DATE - (RANDOM() * 7)::integer as check_date,
  -- Random check time during day hours
  ('08:00:00'::time + (RANDOM() * INTERVAL '10 hours'))::time as check_time,
  -- Day of incubation based on set date
  GREATEST(1, LEAST(21, (CURRENT_DATE - b.set_date)::integer)) as day_of_incubation,
  -- Sample inspector names
  CASE 
    WHEN RANDOM() < 0.33 THEN 'John Smith'
    WHEN RANDOM() < 0.66 THEN 'Sarah Johnson'
    ELSE 'Mike Wilson'
  END as inspector_name,
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