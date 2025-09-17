-- Add new environmental alert types to the alert_type enum
ALTER TYPE alert_type ADD VALUE IF NOT EXISTS 'co2_level';
ALTER TYPE alert_type ADD VALUE IF NOT EXISTS 'ventilation_rate';
ALTER TYPE alert_type ADD VALUE IF NOT EXISTS 'turning_frequency';
ALTER TYPE alert_type ADD VALUE IF NOT EXISTS 'mortality_spike';
ALTER TYPE alert_type ADD VALUE IF NOT EXISTS 'hatch_approaching';
ALTER TYPE alert_type ADD VALUE IF NOT EXISTS 'batch_status_change';