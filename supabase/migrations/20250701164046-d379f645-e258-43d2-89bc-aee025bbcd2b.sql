
-- Create enum for machine types
CREATE TYPE public.machine_type AS ENUM ('setter', 'hatcher', 'combo');

-- Create enum for batch status
CREATE TYPE public.batch_status AS ENUM ('planned', 'setting', 'incubating', 'hatching', 'completed', 'cancelled');

-- Create enum for breed types
CREATE TYPE public.breed_type AS ENUM ('broiler', 'layer', 'breeder');

-- Create flocks table (master reference)
CREATE TABLE public.flocks (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    flock_number INTEGER NOT NULL UNIQUE,
    flock_name TEXT NOT NULL,
    house_number TEXT,
    age_weeks INTEGER NOT NULL,
    breed breed_type NOT NULL,
    arrival_date DATE NOT NULL,
    total_birds INTEGER,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create machines/incubators table
CREATE TABLE public.machines (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    machine_number TEXT NOT NULL UNIQUE,
    machine_type machine_type NOT NULL,
    capacity INTEGER NOT NULL,
    location TEXT,
    status TEXT DEFAULT 'available',
    last_maintenance DATE,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create batches table (critical link between flocks and machines)
CREATE TABLE public.batches (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    batch_number TEXT NOT NULL UNIQUE,
    flock_id UUID REFERENCES public.flocks(id) NOT NULL,
    machine_id UUID REFERENCES public.machines(id) NOT NULL,
    set_date DATE NOT NULL,
    expected_hatch_date DATE NOT NULL,
    actual_hatch_date DATE,
    total_eggs_set INTEGER NOT NULL,
    status batch_status NOT NULL DEFAULT 'planned',
    temperature_avg DECIMAL(4,2),
    humidity_avg DECIMAL(4,2),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create egg pack quality table to link to batches
CREATE TABLE public.egg_pack_quality (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    batch_id UUID REFERENCES public.batches(id) NOT NULL,
    sample_size INTEGER NOT NULL DEFAULT 100,
    grade_a INTEGER NOT NULL DEFAULT 0,
    grade_b INTEGER NOT NULL DEFAULT 0,
    grade_c INTEGER NOT NULL DEFAULT 0,
    cracked INTEGER NOT NULL DEFAULT 0,
    dirty INTEGER NOT NULL DEFAULT 0,
    small INTEGER NOT NULL DEFAULT 0,
    large INTEGER NOT NULL DEFAULT 0,
    weight_avg DECIMAL(5,2),
    shell_thickness_avg DECIMAL(4,2),
    inspector_name TEXT,
    inspection_date DATE NOT NULL DEFAULT CURRENT_DATE,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create fertility analysis table to link to batches
CREATE TABLE public.fertility_analysis (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    batch_id UUID REFERENCES public.batches(id) NOT NULL,
    analysis_date DATE NOT NULL DEFAULT CURRENT_DATE,
    sample_size INTEGER NOT NULL DEFAULT 648,
    fertile_eggs INTEGER NOT NULL,
    infertile_eggs INTEGER NOT NULL,
    early_dead INTEGER NOT NULL,
    late_dead INTEGER NOT NULL,
    cull_chicks INTEGER NOT NULL DEFAULT 0,
    fertility_percent DECIMAL(5,2) GENERATED ALWAYS AS ((fertile_eggs * 100.0) / sample_size) STORED,
    hatch_percent DECIMAL(5,2),
    hof_percent DECIMAL(5,2),
    technician_name TEXT,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create QA monitoring table to link to batches (multiple records per batch)
CREATE TABLE public.qa_monitoring (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    batch_id UUID REFERENCES public.batches(id) NOT NULL,
    check_date DATE NOT NULL DEFAULT CURRENT_DATE,
    check_time TIME NOT NULL DEFAULT CURRENT_TIME,
    day_of_incubation INTEGER NOT NULL,
    temperature DECIMAL(4,2) NOT NULL,
    humidity DECIMAL(4,2) NOT NULL,
    co2_level DECIMAL(5,2),
    turning_frequency INTEGER,
    ventilation_rate DECIMAL(5,2),
    candling_results TEXT,
    mortality_count INTEGER DEFAULT 0,
    inspector_name TEXT NOT NULL,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create residue analysis table to link to batches
CREATE TABLE public.residue_analysis (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    batch_id UUID REFERENCES public.batches(id) NOT NULL,
    analysis_date DATE NOT NULL DEFAULT CURRENT_DATE,
    total_residue_count INTEGER NOT NULL,
    unhatched_fertile INTEGER NOT NULL DEFAULT 0,
    pipped_not_hatched INTEGER NOT NULL DEFAULT 0,
    malformed_chicks INTEGER NOT NULL DEFAULT 0,
    contaminated_eggs INTEGER NOT NULL DEFAULT 0,
    residue_percent DECIMAL(5,2),
    lab_technician TEXT,
    microscopy_results TEXT,
    pathology_findings TEXT,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create indexes for better performance
CREATE INDEX idx_batches_flock_id ON public.batches(flock_id);
CREATE INDEX idx_batches_machine_id ON public.batches(machine_id);
CREATE INDEX idx_batches_set_date ON public.batches(set_date);
CREATE INDEX idx_batches_status ON public.batches(status);
CREATE INDEX idx_egg_pack_quality_batch_id ON public.egg_pack_quality(batch_id);
CREATE INDEX idx_fertility_analysis_batch_id ON public.fertility_analysis(batch_id);
CREATE INDEX idx_qa_monitoring_batch_id ON public.qa_monitoring(batch_id);
CREATE INDEX idx_qa_monitoring_check_date ON public.qa_monitoring(check_date);
CREATE INDEX idx_residue_analysis_batch_id ON public.residue_analysis(batch_id);

-- Enable Row Level Security (RLS) on all tables
ALTER TABLE public.flocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.machines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.egg_pack_quality ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fertility_analysis ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.qa_monitoring ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.residue_analysis ENABLE ROW LEVEL SECURITY;

-- Create RLS policies (allowing all operations for now - you can restrict later)
CREATE POLICY "Allow all operations on flocks" ON public.flocks FOR ALL USING (true);
CREATE POLICY "Allow all operations on machines" ON public.machines FOR ALL USING (true);
CREATE POLICY "Allow all operations on batches" ON public.batches FOR ALL USING (true);
CREATE POLICY "Allow all operations on egg_pack_quality" ON public.egg_pack_quality FOR ALL USING (true);
CREATE POLICY "Allow all operations on fertility_analysis" ON public.fertility_analysis FOR ALL USING (true);
CREATE POLICY "Allow all operations on qa_monitoring" ON public.qa_monitoring FOR ALL USING (true);
CREATE POLICY "Allow all operations on residue_analysis" ON public.residue_analysis FOR ALL USING (true);

-- Insert sample data for testing
INSERT INTO public.flocks (flock_number, flock_name, house_number, age_weeks, breed, arrival_date, total_birds) VALUES
(6367, 'Bertha Valley', 'H1', 56, 'broiler', '2024-01-15', 25000),
(6371, 'Jimmy Trawick', 'H2', 52, 'broiler', '2024-01-20', 22000),
(6374, 'Randall Trawick', 'H3', 49, 'broiler', '2024-01-25', 24000),
(6380, 'Jeff Vu', 'H4', 47, 'broiler', '2024-02-01', 23000);

INSERT INTO public.machines (machine_number, machine_type, capacity, location) VALUES
('INC-001', 'setter', 50000, 'Building A'),
('INC-002', 'setter', 50000, 'Building A'),
('HATCH-001', 'hatcher', 45000, 'Building B'),
('HATCH-002', 'hatcher', 45000, 'Building B'),
('COMBO-001', 'combo', 30000, 'Building C');
