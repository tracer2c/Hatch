-- Fix search path security issues for existing functions
DROP FUNCTION IF EXISTS get_next_house_number(UUID);

-- Recreate the function with proper search path
CREATE OR REPLACE FUNCTION get_next_house_number(flock_uuid UUID)
RETURNS INTEGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    next_number INTEGER;
BEGIN
    -- Get the highest existing house number for this flock and increment by 1
    SELECT COALESCE(MAX(
        CAST(
            SPLIT_PART(
                SPLIT_PART(batch_number, '#', 2), 
                '-', 1
            ) AS INTEGER
        )
    ), 0) + 1 
    INTO next_number
    FROM public.batches b
    JOIN public.flocks f ON b.flock_id = f.id
    WHERE f.id = flock_uuid
    AND batch_number ~ '^.+#\d+(-\d+)?$'; -- Only count properly formatted house numbers
    
    RETURN next_number;
END;
$$;