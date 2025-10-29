-- Insert some sample alerts to demonstrate the system
-- First, get some batch and machine IDs for reference
DO $$ 
DECLARE
  batch_id_1 UUID;
  batch_id_2 UUID;
  machine_id_1 UUID;
BEGIN
  -- Get first available batch and machine IDs
  SELECT id INTO batch_id_1 FROM public.batches LIMIT 1;
  SELECT id INTO batch_id_2 FROM public.batches OFFSET 1 LIMIT 1;
  SELECT id INTO machine_id_1 FROM public.machines LIMIT 1;
  
  -- Only insert sample alerts if we have data to reference
  IF batch_id_1 IS NOT NULL THEN
    -- Temperature alert (critical)
    INSERT INTO public.alerts (
      alert_type, batch_id, severity, status, title, message, current_temperature, batch_day
    ) VALUES (
      'temperature', batch_id_1, 'critical', 'active', 
      'Critical Temperature Alert', 
      'Temperature has dropped to 97.2°F - immediate attention required',
      97.2, 12
    );
    
    -- Humidity alert (warning)
    INSERT INTO public.alerts (
      alert_type, batch_id, severity, status, title, message, current_humidity, batch_day
    ) VALUES (
      'humidity', batch_id_1, 'warning', 'active',
      'Humidity Level Warning',
      'Humidity at 68% - slightly above optimal range',
      68.0, 8
    );
    
    -- Critical day alert (info)
    INSERT INTO public.alerts (
      alert_type, batch_id, severity, status, title, message, batch_day
    ) VALUES (
      'critical_day', batch_id_1, 'info', 'active',
      'Day 7 Candling Due',
      'First candling and infertile egg removal scheduled for today',
      7
    );
  END IF;
  
  IF batch_id_2 IS NOT NULL THEN
    -- Schedule reminder
    INSERT INTO public.alerts (
      alert_type, batch_id, severity, status, title, message, batch_day
    ) VALUES (
      'schedule_reminder', batch_id_2, 'info', 'active',
      'Daily QA Check Reminder',
      'Daily quality assurance check is due in 2 hours',
      15
    );
  END IF;
  
  IF machine_id_1 IS NOT NULL THEN
    -- Machine maintenance alert
    INSERT INTO public.alerts (
      alert_type, machine_id, severity, status, title, message
    ) VALUES (
      'machine_maintenance', machine_id_1, 'warning', 'active',
      'Maintenance Due',
      'Scheduled maintenance is overdue by 3 days'
    );
  END IF;
END $$;