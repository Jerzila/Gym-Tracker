-- Add preferred units (metric / imperial). Existing users default to metric.
ALTER TABLE profiles
ADD COLUMN units TEXT DEFAULT 'metric';

UPDATE profiles
SET units = 'metric'
WHERE units IS NULL;

ALTER TABLE profiles
ALTER COLUMN units SET NOT NULL;

COMMENT ON COLUMN public.profiles.units IS 'Preferred units: metric (kg, cm) or imperial (lbs, ft/in).';
