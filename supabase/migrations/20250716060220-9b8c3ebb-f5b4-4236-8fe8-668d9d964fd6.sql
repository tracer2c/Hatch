-- Insert sample SOP templates
INSERT INTO public.sop_templates (title, description, category, day_of_incubation, content) VALUES
('Daily Environmental Monitoring', 'Complete daily monitoring of temperature, humidity, and ventilation systems', 'daily_checklist', NULL, '{"steps": ["Check temperature readings", "Verify humidity levels", "Inspect ventilation systems", "Document all readings"]}'),
('Day 7 Candling Procedure', 'Detailed procedure for candling eggs on day 7 to check fertility and development', 'daily_checklist', 7, '{"steps": ["Prepare candling equipment", "Remove eggs systematically", "Check for blood vessels and embryo development", "Mark clear/infertile eggs", "Record results"]}'),
('Day 18 Transfer Protocol', 'Protocol for transferring eggs from setter to hatcher on day 18', 'daily_checklist', 18, '{"steps": ["Prepare hatcher trays", "Stop egg turning", "Increase humidity to 65%", "Transfer eggs carefully", "Seal hatcher"]}'),
('Emergency Temperature Alert Response', 'Step-by-step response procedure for temperature alarms', 'troubleshooting', NULL, '{"steps": ["Check backup systems", "Verify sensor accuracy", "Contact maintenance", "Document incident"]}'),
('New Staff Training Checklist', 'Comprehensive training program for new incubation staff', 'training', NULL, '{"modules": ["Safety procedures", "Equipment operation", "Record keeping", "Emergency protocols"]}'),
('Weekly Equipment Maintenance', 'Regular maintenance schedule for incubation equipment', 'maintenance', NULL, '{"tasks": ["Clean air filters", "Calibrate sensors", "Check motor function", "Lubricate moving parts"]}'),
('Hatch Day Procedures', 'Complete procedures for managing hatch day operations', 'daily_checklist', 21, '{"steps": ["Monitor hatching progress", "Maintain optimal conditions", "Remove hatched chicks", "Count and record results"]}'),
('Monthly Calibration Protocol', 'Monthly calibration procedures for all monitoring equipment', 'maintenance', NULL, '{"procedures": ["Temperature sensor calibration", "Humidity sensor calibration", "Alarm system testing", "Backup system verification"]}');

-- Insert sample daily checklist items
INSERT INTO public.daily_checklist_items (title, description, order_index, is_required, applicable_days, sop_template_id) VALUES
('Check Temperature Reading', 'Verify incubator temperature is within optimal range (99.5°F ± 0.2°F)', 1, true, ARRAY[1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21], (SELECT id FROM sop_templates WHERE title = 'Daily Environmental Monitoring')),
('Monitor Humidity Levels', 'Check humidity levels: 55-60% for days 1-18, 65% for days 19-21', 2, true, ARRAY[1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21], (SELECT id FROM sop_templates WHERE title = 'Daily Environmental Monitoring')),
('Verify Egg Turning', 'Ensure automatic turning system is functioning (eggs should turn every 2 hours)', 3, true, ARRAY[1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18], NULL),
('Clean Water Reservoirs', 'Refill and clean humidity water reservoirs with fresh water', 4, true, ARRAY[1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21], NULL),
('Candling Inspection', 'Perform candling to check egg development and remove clear eggs', 5, true, ARRAY[7,14], (SELECT id FROM sop_templates WHERE title = 'Day 7 Candling Procedure')),
('Ventilation Check', 'Inspect air circulation and vent positioning for proper airflow', 6, true, ARRAY[1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21], (SELECT id FROM sop_templates WHERE title = 'Daily Environmental Monitoring')),
('Record Daily Readings', 'Document all temperature, humidity, and turning data in logbook', 7, true, ARRAY[1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21], NULL),
('Transfer to Hatcher', 'Move eggs from setter to hatcher, stop turning, increase humidity', 8, true, ARRAY[18], (SELECT id FROM sop_templates WHERE title = 'Day 18 Transfer Protocol')),
('Alarm System Test', 'Test all alarm systems and backup power supply', 9, false, ARRAY[1,7,14,21], NULL),
('Equipment Cleaning', 'Clean and sanitize incubator surfaces and equipment', 10, false, ARRAY[1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21], NULL),
('Hatch Management', 'Monitor hatching progress and remove chicks as they hatch', 11, true, ARRAY[19,20,21], (SELECT id FROM sop_templates WHERE title = 'Hatch Day Procedures'));