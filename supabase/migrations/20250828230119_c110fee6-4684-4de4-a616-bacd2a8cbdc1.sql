-- Insert sample QA monitoring data with simplified time generation
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
  -- Temperature between 98-99.8 to satisfy numeric precision
  ROUND((RANDOM() * 1.8 + 98.0)::numeric, 2) AS temperature,
  -- Humidity between 55-65
  ROUND((RANDOM() * 10 + 55)::numeric, 2) AS humidity,
  -- Check date within last week
  (CURRENT_DATE - (FLOOR(RANDOM() * 7))::int) AS check_date,
  -- Simple time generation (8 AM to 6 PM)
  ('08:00:00'::time + (FLOOR(RANDOM() * 10) || ' hours')::interval) AS check_time,
  -- Day of incubation based on set date
  GREATEST(1, LEAST(21, (CURRENT_DATE - b.set_date)::int)) AS day_of_incubation,
  -- Sample inspector names
  CASE 
    WHEN RANDOM() < 0.33 THEN 'John Smith'
    WHEN RANDOM() < 0.66 THEN 'Sarah Johnson'
    ELSE 'Mike Wilson'
  END AS inspector_name,
  -- Optional notes
  CASE 
    WHEN RANDOM() < 0.1 THEN 'Temperature slightly elevated'
    WHEN RANDOM() < 0.2 THEN 'Humidity levels monitored'
    WHEN RANDOM() < 0.3 THEN 'Equipment check completed'
    ELSE NULL
  END AS notes,
  -- Spread creation times over last week
  NOW() - (RANDOM() * INTERVAL '7 days') AS created_at
FROM public.batches b
WHERE NOT EXISTS (
  SELECT 1 FROM public.qa_monitoring qm WHERE qm.batch_id = b.id
)
LIMIT 20;