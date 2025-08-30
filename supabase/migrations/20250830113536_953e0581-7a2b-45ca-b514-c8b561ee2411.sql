-- Fix security issue: Restrict feedback creation and add abuse prevention
-- First, drop the overly permissive policy
DROP POLICY IF EXISTS "Anyone can create feedback" ON feedback;

-- Create a more secure policy that allows public feedback but with basic validation
CREATE POLICY "Public can create validated feedback" 
ON feedback 
FOR INSERT 
WITH CHECK (
  -- Ensure required fields are provided and not empty
  subject IS NOT NULL AND length(trim(subject)) > 0 AND
  message IS NOT NULL AND length(trim(message)) > 0 AND
  rating >= 1 AND rating <= 5 AND
  -- Optional: Limit message length to prevent abuse
  length(message) <= 2000 AND
  length(subject) <= 200 AND
  -- If customer info is provided, ensure it's reasonable
  (customer_name IS NULL OR length(trim(customer_name)) <= 100) AND
  (customer_email IS NULL OR length(trim(customer_email)) <= 254) AND
  (customer_phone IS NULL OR length(trim(customer_phone)) <= 20)
);

-- Add a policy to prevent reading customer personal data unless you're staff
DROP POLICY IF EXISTS "Staff can view feedback" ON feedback;

-- Create separate policies for different access levels
CREATE POLICY "Staff can view feedback content" 
ON feedback 
FOR SELECT 
USING (
  get_user_role(auth.uid()) = ANY (ARRAY['admin'::text, 'manager'::text, 'staff'::text])
);

-- Create a public policy that only allows viewing non-sensitive feedback data
-- This could be used for public feedback displays (without personal info)
CREATE POLICY "Public can view anonymous feedback stats" 
ON feedback 
FOR SELECT 
USING (
  -- Only allow access to non-sensitive fields in specific contexts
  -- This policy intentionally has no conditions as it will be used with specific column selection
  false -- Disabled for now - enable only if you need public read access
);

-- Add a function to validate email format if provided
CREATE OR REPLACE FUNCTION validate_email_format(email text) 
RETURNS boolean 
LANGUAGE plpgsql 
IMMUTABLE
AS $$
BEGIN
  -- Basic email validation
  RETURN email ~ '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$';
END;
$$;

-- Update the policy to include email validation
DROP POLICY "Public can create validated feedback" ON feedback;

CREATE POLICY "Public can create validated feedback" 
ON feedback 
FOR INSERT 
WITH CHECK (
  -- Ensure required fields are provided and not empty
  subject IS NOT NULL AND length(trim(subject)) > 0 AND
  message IS NOT NULL AND length(trim(message)) > 0 AND
  rating >= 1 AND rating <= 5 AND
  -- Limit message and subject length to prevent abuse
  length(message) <= 2000 AND
  length(subject) <= 200 AND
  -- If customer info is provided, ensure it's reasonable and valid
  (customer_name IS NULL OR (length(trim(customer_name)) > 0 AND length(trim(customer_name)) <= 100)) AND
  (customer_email IS NULL OR (length(trim(customer_email)) > 0 AND validate_email_format(customer_email))) AND
  (customer_phone IS NULL OR (length(trim(customer_phone)) > 0 AND length(trim(customer_phone)) <= 20))
);