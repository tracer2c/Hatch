-- Create enums for alert system
CREATE TYPE public.alert_type AS ENUM (
  'temperature',
  'humidity',
  'schedule_reminder',
  'critical_day',
  'machine_maintenance'
);

CREATE TYPE public.alert_severity AS ENUM (
  'info',
  'warning',
  'critical'
);

CREATE TYPE public.alert_status AS ENUM (
  'active',
  'acknowledged',
  'resolved',
  'dismissed'
);

-- Create alert configuration table
CREATE TABLE public.alert_configs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  alert_type alert_type NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  
  -- Temperature/Humidity thresholds
  min_temperature DECIMAL,
  max_temperature DECIMAL,
  min_humidity DECIMAL,
  max_humidity DECIMAL,
  
  -- Machine maintenance settings
  maintenance_hours_interval INTEGER,
  maintenance_days_interval INTEGER,
  
  -- Schedule reminders
  reminder_hours_before INTEGER DEFAULT 2,
  
  -- Critical day settings
  critical_days INTEGER[], -- Array of days like [7, 14, 18, 21]
  
  is_enabled BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create alerts table for triggered alerts
CREATE TABLE public.alerts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  alert_config_id UUID REFERENCES public.alert_configs(id) ON DELETE CASCADE,
  batch_id UUID REFERENCES public.batches(id) ON DELETE CASCADE,
  machine_id UUID REFERENCES public.machines(id) ON DELETE CASCADE,
  
  alert_type alert_type NOT NULL,
  severity alert_severity NOT NULL DEFAULT 'warning',
  status alert_status NOT NULL DEFAULT 'active',
  
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  
  -- Contextual data
  current_temperature DECIMAL,
  current_humidity DECIMAL,
  batch_day INTEGER,
  
  triggered_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  acknowledged_at TIMESTAMP WITH TIME ZONE,
  resolved_at TIMESTAMP WITH TIME ZONE,
  acknowledged_by TEXT,
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create notification preferences table
CREATE TABLE public.notification_preferences (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_email TEXT NOT NULL,
  
  -- Notification channels
  email_enabled BOOLEAN NOT NULL DEFAULT true,
  browser_enabled BOOLEAN NOT NULL DEFAULT true,
  
  -- Alert type subscriptions
  temperature_alerts BOOLEAN NOT NULL DEFAULT true,
  humidity_alerts BOOLEAN NOT NULL DEFAULT true,
  schedule_reminders BOOLEAN NOT NULL DEFAULT true,
  critical_day_alerts BOOLEAN NOT NULL DEFAULT true,
  maintenance_alerts BOOLEAN NOT NULL DEFAULT true,
  
  -- Timing preferences
  quiet_hours_start TIME,
  quiet_hours_end TIME,
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.alert_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;

-- Create RLS policies (allow all for now - can be restricted later based on auth)
CREATE POLICY "Allow all operations on alert_configs" ON public.alert_configs FOR ALL USING (true);
CREATE POLICY "Allow all operations on alerts" ON public.alerts FOR ALL USING (true);
CREATE POLICY "Allow all operations on notification_preferences" ON public.notification_preferences FOR ALL USING (true);

-- Create indexes for performance
CREATE INDEX idx_alerts_status ON public.alerts(status);
CREATE INDEX idx_alerts_severity ON public.alerts(severity);
CREATE INDEX idx_alerts_triggered_at ON public.alerts(triggered_at);
CREATE INDEX idx_alerts_batch_id ON public.alerts(batch_id);
CREATE INDEX idx_alerts_machine_id ON public.alerts(machine_id);

-- Insert default alert configurations
INSERT INTO public.alert_configs (
  alert_type, name, description, min_temperature, max_temperature, min_humidity, max_humidity
) VALUES 
  ('temperature', 'Incubator Temperature', 'Monitor optimal temperature range during incubation', 99.0, 101.0, null, null),
  ('humidity', 'Incubator Humidity', 'Monitor optimal humidity range during incubation', null, null, 55.0, 65.0);

INSERT INTO public.alert_configs (
  alert_type, name, description, critical_days
) VALUES 
  ('critical_day', 'Critical Incubation Days', 'Important milestones during incubation process', ARRAY[7, 14, 18, 21]);

INSERT INTO public.alert_configs (
  alert_type, name, description, maintenance_days_interval
) VALUES 
  ('machine_maintenance', 'Regular Machine Maintenance', 'Scheduled maintenance reminders', 30);

INSERT INTO public.alert_configs (
  alert_type, name, description, reminder_hours_before
) VALUES 
  ('schedule_reminder', 'Daily QA Checks', 'Remind for daily quality assurance checks', 2);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_alert_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for automatic timestamp updates
CREATE TRIGGER update_alert_configs_updated_at
  BEFORE UPDATE ON public.alert_configs
  FOR EACH ROW
  EXECUTE FUNCTION public.update_alert_updated_at_column();

CREATE TRIGGER update_alerts_updated_at
  BEFORE UPDATE ON public.alerts
  FOR EACH ROW
  EXECUTE FUNCTION public.update_alert_updated_at_column();

CREATE TRIGGER update_notification_preferences_updated_at
  BEFORE UPDATE ON public.notification_preferences
  FOR EACH ROW
  EXECUTE FUNCTION public.update_alert_updated_at_column();