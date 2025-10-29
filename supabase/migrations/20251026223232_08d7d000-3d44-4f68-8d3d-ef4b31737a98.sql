-- Create Weight Tracking Table
CREATE TABLE weight_tracking (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id UUID NOT NULL REFERENCES batches(id) ON DELETE CASCADE,
  flock_id UUID REFERENCES flocks(id),
  machine_id UUID REFERENCES machines(id),
  check_date DATE NOT NULL DEFAULT CURRENT_DATE,
  day_of_incubation INTEGER NOT NULL,
  check_day TEXT,
  top_weight NUMERIC,
  middle_weight NUMERIC,
  bottom_weight NUMERIC,
  total_weight NUMERIC NOT NULL,
  percent_loss NUMERIC,
  target_loss_min NUMERIC,
  target_loss_max NUMERIC,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  company_id UUID NOT NULL REFERENCES companies(id) DEFAULT '00000000-0000-0000-0000-000000000001'::uuid,
  UNIQUE(batch_id, check_date, check_day)
);

CREATE INDEX idx_weight_tracking_batch ON weight_tracking(batch_id);
CREATE INDEX idx_weight_tracking_flock ON weight_tracking(flock_id);

-- Create Specific Gravity Table
CREATE TABLE specific_gravity_tests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id UUID REFERENCES batches(id) ON DELETE CASCADE,
  flock_id UUID NOT NULL REFERENCES flocks(id),
  test_date DATE NOT NULL DEFAULT CURRENT_DATE,
  age_weeks INTEGER NOT NULL,
  concentration TEXT,
  float_count INTEGER NOT NULL,
  sink_count INTEGER,
  sample_size INTEGER DEFAULT 100,
  float_percentage NUMERIC NOT NULL,
  standard_min NUMERIC,
  standard_max NUMERIC,
  difference NUMERIC,
  meets_standard BOOLEAN,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  company_id UUID NOT NULL REFERENCES companies(id) DEFAULT '00000000-0000-0000-0000-000000000001'::uuid
);

CREATE INDEX idx_specific_gravity_flock ON specific_gravity_tests(flock_id);
CREATE INDEX idx_specific_gravity_batch ON specific_gravity_tests(batch_id);

-- Enable RLS
ALTER TABLE weight_tracking ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Company users can access their weight tracking"
  ON weight_tracking FOR ALL
  USING (company_id = get_user_company(auth.uid()));

ALTER TABLE specific_gravity_tests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Company users can access their specific gravity tests"
  ON specific_gravity_tests FOR ALL
  USING (company_id = get_user_company(auth.uid()));