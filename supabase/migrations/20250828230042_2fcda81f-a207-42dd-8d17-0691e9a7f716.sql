-- Insert sample QA monitoring data with safe numeric ranges
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
  -- Keep temperature below 100.00 to satisfy numeric(4,2)
  ROUND((RANDOM() * 1.8 + 98.0)::numeric, 2) AS temperature,
  ROUND((RANDOM() * 10 + 55)::numeric, 2) AS humidity,
  (CURRENT_DATE - (FLOOR(RANDOM() * 7))::int) AS check_date,
  ('08:00:00'::time + make_interval(mins => FLOOR(RANDOM()*600)))::time AS check_time,
  GREATEST(1, LEAST(21, (CURRENT_DATE - b.set_date)::int)) AS day_of_incubation,
  CASE 
    WHEN RANDOM() < 0.33 THEN 'John Smith'
    WHEN RANDOM() < 0.66 THEN 'Sarah Johnson'
    ELSE 'Mike Wilson'
  END AS inspector_name,
  CASE 
    WHEN RANDOM() < 0.1 THEN 'Temperature slightly elevated'
    WHEN RANDOM() < 0.2 THEN 'Humidity levels monitored'
    WHEN RANDOM() < 0.3 THEN 'Equipment check completed'
    ELSE NULL
  END AS notes,
  NOW() - (RANDOM() * INTERVAL '7 days') AS created_at
FROM public.batches b
WHERE NOT EXISTS (
  SELECT 1 FROM public.qa_monitoring qm WHERE qm.batch_id = b.id
)
LIMIT 20;