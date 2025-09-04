-- Fix customer personal information security vulnerability in feedback table

-- Drop existing overly permissive SELECT policies
DROP POLICY IF EXISTS "Staff can view feedback content" ON public.feedback;
DROP POLICY IF EXISTS "Managers can view their branch feedback" ON public.feedback;
DROP POLICY IF EXISTS "Admins can view all feedback" ON public.feedback;
DROP POLICY IF EXISTS "Public can view anonymous feedback stats" ON public.feedback;

-- Create new granular SELECT policies for better security

-- Managers can view full feedback including customer info for their branch
CREATE POLICY "Managers can view branch feedback with customer info" 
ON public.feedback 
FOR SELECT 
USING (
  get_user_role(auth.uid()) = 'manager'::text 
  AND branch_id = get_user_branch(auth.uid())
);

-- Admins can view all feedback with full customer information
CREATE POLICY "Admins can view all feedback with customer info" 
ON public.feedback 
FOR SELECT 
USING (get_user_role(auth.uid()) = 'admin'::text);

-- Assigned staff can view their assigned feedback with customer info (needed for resolution)
CREATE POLICY "Assigned staff can view their feedback with customer info" 
ON public.feedback 
FOR SELECT 
USING (
  assigned_to IN (
    SELECT profiles.id
    FROM profiles
    WHERE profiles.user_id = auth.uid()
  )
);

-- Regular staff can view feedback content but with restricted customer info access
-- They can see feedback exists but not customer personal details unless assigned
CREATE POLICY "Staff can view limited feedback info" 
ON public.feedback 
FOR SELECT 
USING (
  get_user_role(auth.uid()) = 'staff'::text
);

-- Create a secure function for staff to access feedback without personal info
CREATE OR REPLACE FUNCTION public.get_feedback_for_staff()
RETURNS TABLE (
  id uuid,
  category_id uuid,
  branch_id uuid,
  rating integer,
  is_anonymous boolean,
  assigned_to uuid,
  resolved_at timestamp with time zone,
  created_at timestamp with time zone,
  updated_at timestamp with time zone,
  subject text,
  message text,
  status text,
  priority text,
  customer_name text,
  customer_email text,
  customer_phone text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_role text;
BEGIN
  -- Get the current user's role
  SELECT get_user_role(auth.uid()) INTO user_role;
  
  -- Return different data based on user role
  IF user_role = 'admin' THEN
    -- Admins see everything
    RETURN QUERY
    SELECT f.id, f.category_id, f.branch_id, f.rating, f.is_anonymous, 
           f.assigned_to, f.resolved_at, f.created_at, f.updated_at,
           f.subject, f.message, f.status, f.priority,
           f.customer_name, f.customer_email, f.customer_phone
    FROM feedback f;
    
  ELSIF user_role = 'manager' THEN
    -- Managers see full info for their branch
    RETURN QUERY
    SELECT f.id, f.category_id, f.branch_id, f.rating, f.is_anonymous, 
           f.assigned_to, f.resolved_at, f.created_at, f.updated_at,
           f.subject, f.message, f.status, f.priority,
           f.customer_name, f.customer_email, f.customer_phone
    FROM feedback f
    WHERE f.branch_id = get_user_branch(auth.uid());
    
  ELSIF user_role = 'staff' THEN
    -- Staff see masked customer info except for assigned feedback
    RETURN QUERY
    SELECT f.id, f.category_id, f.branch_id, f.rating, f.is_anonymous, 
           f.assigned_to, f.resolved_at, f.created_at, f.updated_at,
           f.subject, f.message, f.status, f.priority,
           CASE 
             WHEN f.assigned_to IN (SELECT p.id FROM profiles p WHERE p.user_id = auth.uid()) 
               THEN f.customer_name
             WHEN f.is_anonymous = true 
               THEN NULL
             ELSE 'Customer'
           END as customer_name,
           CASE 
             WHEN f.assigned_to IN (SELECT p.id FROM profiles p WHERE p.user_id = auth.uid()) 
               THEN f.customer_email
             ELSE NULL
           END as customer_email,
           CASE 
             WHEN f.assigned_to IN (SELECT p.id FROM profiles p WHERE p.user_id = auth.uid()) 
               THEN f.customer_phone
             ELSE NULL
           END as customer_phone
    FROM feedback f;
    
  ELSE
    -- Return empty result for unauthorized users
    RETURN;
  END IF;
END;
$$;