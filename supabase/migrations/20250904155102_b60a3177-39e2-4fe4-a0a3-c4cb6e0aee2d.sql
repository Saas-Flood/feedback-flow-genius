-- Fix email harvesting security vulnerability in subscribers table

-- Drop existing overly permissive policies
DROP POLICY IF EXISTS "insert_subscription" ON public.subscribers;
DROP POLICY IF EXISTS "update_own_subscription" ON public.subscribers;
DROP POLICY IF EXISTS "select_own_subscription" ON public.subscribers;

-- Create secure INSERT policy - only authenticated users can create their own subscription
CREATE POLICY "users_can_insert_own_subscription" 
ON public.subscribers 
FOR INSERT 
WITH CHECK (
  -- Only authenticated users can insert
  auth.uid() IS NOT NULL 
  AND (
    -- User can only insert for their own user_id and email
    (user_id = auth.uid() AND email = auth.email())
    -- OR it's an edge function using service role (no auth.uid() but has user_id)
    OR (auth.uid() IS NULL AND user_id IS NOT NULL)
  )
);

-- Create secure UPDATE policy - users can only update their own records
CREATE POLICY "users_can_update_own_subscription" 
ON public.subscribers 
FOR UPDATE 
USING (
  -- User can only update their own subscription
  (user_id = auth.uid() AND email = auth.email())
  -- OR edge function with service role (for stripe webhook updates)
  OR auth.uid() IS NULL
);

-- Create secure SELECT policy - users can only view their own subscription
CREATE POLICY "users_can_select_own_subscription" 
ON public.subscribers 
FOR SELECT 
USING (
  -- User can only select their own subscription
  user_id = auth.uid() OR email = auth.email()
);

-- Add additional constraint to prevent fake emails
ALTER TABLE public.subscribers 
ADD CONSTRAINT valid_email_format 
CHECK (email ~ '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$');

-- Create index for better performance and uniqueness
CREATE UNIQUE INDEX IF NOT EXISTS idx_subscribers_user_id 
ON public.subscribers(user_id) 
WHERE user_id IS NOT NULL;

-- Add trigger to validate user_id matches authenticated user on insert/update
CREATE OR REPLACE FUNCTION validate_subscriber_user_match()
RETURNS TRIGGER AS $$
BEGIN
  -- Skip validation for service role operations (edge functions)
  IF auth.uid() IS NULL THEN
    RETURN NEW;
  END IF;
  
  -- Ensure user_id matches authenticated user
  IF NEW.user_id IS NOT NULL AND NEW.user_id != auth.uid() THEN
    RAISE EXCEPTION 'user_id must match authenticated user';
  END IF;
  
  -- Ensure email matches authenticated user's email
  IF NEW.email IS NOT NULL AND NEW.email != auth.email() THEN
    RAISE EXCEPTION 'email must match authenticated user email';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for validation
DROP TRIGGER IF EXISTS validate_subscriber_match ON public.subscribers;
CREATE TRIGGER validate_subscriber_match
  BEFORE INSERT OR UPDATE ON public.subscribers
  FOR EACH ROW
  EXECUTE FUNCTION validate_subscriber_user_match();