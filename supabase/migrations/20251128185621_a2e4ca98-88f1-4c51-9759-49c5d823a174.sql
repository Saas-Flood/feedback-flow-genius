-- Add Google Place ID column to feedback_form_settings
ALTER TABLE public.feedback_form_settings 
ADD COLUMN google_place_id text DEFAULT NULL;